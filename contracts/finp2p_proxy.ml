include Errors
include Fa2_sig
include Finp2p_proxy_types
include Finp2p_lib

let fail_not_admin (s : storage) =
  if not (Set.mem (Tezos.sender None) s.admins) then
    (failwith unauthorized : unit)

let is_operation_expired (op_timestamp : timestamp) (s : storage) : bool =
  Tezos.now None > op_timestamp + int s.operation_ttl.ttl

let is_operation_live (op_timestamp : timestamp) (s : storage) : bool =
  op_timestamp <= Tezos.now None + int s.operation_ttl.allowed_in_the_future
  && not (is_operation_expired op_timestamp s)

let address_of_key (k : key) (fa2_token : fa2_token) (s : storage) : address =
  match Big_map.find_opt (k, fa2_token) s.external_addresses with
  | None ->
      (* This is a FinP2P internal key *)
      Tezos.address (Tezos.implicit_account None (Crypto.hash_key k))
  | Some addr ->
      (* This is a FinP2P for a user that registered their own external Tezos
         address, (for which they have the private key) *)
      addr

let transfer_tokens (p : transfer_tokens_param) (s : storage) :
    operation * storage =
  let () =
    if not (is_operation_live p.tt_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  let oph = check_transfer_tokens_signature p in
  let s =
    {
      s with
      live_operations = Big_map.add oph p.tt_nonce.timestamp s.live_operations;
    }
  in
  let fa2_token =
    match Big_map.find_opt p.tt_asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let fa2_transfer =
    {
      tr_src = address_of_key p.tt_src_account fa2_token s;
      tr_txs =
        [
          {
            tr_dst = address_of_key p.tt_dst_account fa2_token s;
            tr_token_id = fa2_token.id;
            tr_amount = p.tt_amount;
          };
        ];
    }
  in
  let transfer_ep = get_transfer_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None [fa2_transfer] 0t transfer_ep in
  (relay_op, s)

let create_asset (p : create_asset_param) (s : storage) : operation * storage =
  let ({ca_address; ca_id}, token_info) = p.ca_new_token_info in
  let next_token_id = Big_map.find_opt ca_address s.next_token_ids in
  let token_id =
    match ca_id with
    | Some id -> id
    | None -> (
        match next_token_id with
        | Some id -> id
        | None -> (
            match
              (Tezos.call_view None "get_max_token_id" () ca_address
                : token_id option)
            with
            | None -> (failwith "CANNOT_COMPUTE_NEXT_TOKEN_ID" : token_id)
            | Some (Token_id id) -> Token_id (id + 1n)))
  in
  let fa2_token = {address = ca_address; id = token_id} in
  (* Create new asset *)
  let (old_asset, finp2p_assets) =
    Big_map.get_and_update p.ca_asset_id (Some fa2_token) s.finp2p_assets
  in
  let () =
    match old_asset with
    | Some _ -> (failwith asset_already_exists : unit)
    | None -> ()
  in
  let fa2_mint =
    {
      mi_token_id = fa2_token.id;
      mi_token_info = Some token_info;
      mi_owners = ([] : (address * token_amount) list);
    }
  in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_mint 0t mint_ep in
  let next_token_id =
    let token_id_plus_1 =
      match token_id with Token_id i -> Token_id (i + 1n)
    in
    match next_token_id with
    | None -> token_id_plus_1
    | Some id -> if token_id >= id then token_id_plus_1 else id
  in
  let next_token_ids = Big_map.add ca_address next_token_id s.next_token_ids in
  let s = {s with finp2p_assets; next_token_ids} in
  (relay_op, s)

let issue_tokens (p : issue_tokens_param) (s : storage) : operation * storage =
  let () =
    if not (is_operation_live p.it_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  let oph = check_issue_tokens_signature p in
  let live_operations =
    Big_map.add oph p.it_nonce.timestamp s.live_operations
  in
  let fa2_token =
    match Big_map.find_opt p.it_asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let fa2_mint =
    {
      mi_token_id = fa2_token.id;
      mi_token_info = (None : (string, bytes) map option);
      mi_owners = [(address_of_key p.it_dst_account fa2_token s, p.it_amount)];
    }
  in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_mint 0t mint_ep in
  let s = {s with live_operations} in
  (relay_op, s)

let redeem_tokens (p : redeem_tokens_param) (s : storage) : operation * storage
    =
  let () =
    if not (is_operation_live p.rt_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  let oph = check_redeem_tokens_signature p in
  let s =
    {
      s with
      live_operations = Big_map.add oph p.rt_nonce.timestamp s.live_operations;
    }
  in
  let fa2_token =
    match Big_map.find_opt p.rt_asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let fa2_burn =
    {
      bu_token_id = fa2_token.id;
      bu_owners = [(address_of_key p.rt_src_account fa2_token s, p.rt_amount)];
    }
  in
  let burn_ep = get_burn_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_burn 0t burn_ep in
  (relay_op, s)

let hold_tokens (p : hold_tokens_param) (s : storage) : operation * storage =
  let () =
    if not (is_operation_live p.ht_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  let oph = check_hold_tokens_signature p in
  let live_operations =
    Big_map.add oph p.ht_nonce.timestamp s.live_operations
  in
  let fa2_token =
    match Big_map.find_opt p.ht_asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let (op, hold_info, s) =
    match get_hold_entrypoint_opt fa2_token.address with
    | Some hold_ep ->
        (* FA2 contract supports native hold *)
        let fa2_hold_id =
          match
            (Tezos.call_view None "get_max_hold_id" () fa2_token.address
              : hold_id option)
          with
          | None -> (failwith "CANNOT_COMPUTE_NEXT_HOLD_ID" : hold_id)
          | Some (Hold_id id) -> Hold_id (id + 1n)
        in
        let hold_info = FA2_hold {fa2_hold_id; held_token = fa2_token} in
        let ho_dst =
          if p.ht_lock_receipient then
            (* Lock the hold to the seller, i.e. the src account in the AHG *)
            Some (address_of_key p.ht_ahg_src_account fa2_token s)
          else (None : address option)
        in
        let fa2_hold =
          {
            ho_token_id = fa2_token.id;
            ho_amount = p.ht_amount;
            ho_src = address_of_key p.ht_owner_account fa2_token s;
            ho_dst;
          }
        in
        let relay_op =
          Tezos.transaction
            None
            {h_id = Some fa2_hold_id; h_hold = fa2_hold}
            0t
            hold_ep
        in
        (relay_op, hold_info, s)
    | None ->
        (* FA2 contract does not support native hold, use escrow to proxy *)
        let hold_info =
          Escrow
            {
              es_held_token = fa2_token;
              es_amount = p.ht_amount;
              es_src_account = p.ht_owner_account;
              es_dst_account =
                (if p.ht_lock_receipient then Some p.ht_ahg_src_account
                else (None : key option));
            }
        in
        (* Register total on hold *)
        let total_in_escrow =
          match
            Big_map.find_opt (p.ht_owner_account, fa2_token) s.escrow_totals
          with
          | None -> p.ht_amount
          | Some total -> add_amount total p.ht_amount
        in
        let s =
          {
            s with
            escrow_totals =
              Big_map.add
                (p.ht_owner_account, fa2_token)
                total_in_escrow
                s.escrow_totals;
          }
        in
        (* Escrow funds to proxy contract.
           Note: the proxy contract must be an operator of the source of the hold
           for the given FA2 token. *)
        let fa2_transfer_to_escrow =
          {
            tr_src = address_of_key p.ht_owner_account fa2_token s;
            tr_txs =
              [
                {
                  tr_dst = Tezos.self_address None;
                  tr_token_id = fa2_token.id;
                  tr_amount = p.ht_amount;
                };
              ];
          }
        in
        let transfer_ep = get_transfer_entrypoint fa2_token.address in
        let relay_op =
          Tezos.transaction None [fa2_transfer_to_escrow] 0t transfer_ep
        in
        (relay_op, hold_info, s)
  in
  (* Register hold id *)
  let (old_hold_id, holds) =
    Big_map.get_and_update p.ht_hold_id (Some hold_info) s.holds
  in
  let () =
    match old_hold_id with
    | Some _ -> (failwith hold_already_exists : unit)
    | None -> ()
  in
  let s = {s with live_operations; holds} in
  (op, s)

let unhold_aux (hold_id : finp2p_hold_id) (asset_id : asset_id option)
    (amount_ : token_amount option) (s : storage) : storage * hold_info =
  (* Preemptively remove hold from storage *)
  let (fa2_hold, cleaned_holds) =
    Big_map.get_and_update hold_id (None : hold_info option) s.holds
  in
  let hold_info =
    match fa2_hold with
    | None -> (failwith unknown_hold_id : hold_info)
    | Some info -> info
  in
  let held_token =
    match hold_info with
    | FA2_hold h -> h.held_token
    | Escrow e -> e.es_held_token
  in
  let () =
    match asset_id with
    | None -> ()
    | Some asset_id ->
        let expected_held_token =
          match Big_map.find_opt asset_id s.finp2p_assets with
          | None -> (failwith unknown_asset_id : fa2_token)
          | Some fa2_token -> fa2_token
        in
        if held_token <> expected_held_token then
          failwith "UNEXPECTED_HOLD_ASSET_ID"
  in
  let hold_amount =
    match hold_info with
    | FA2_hold {fa2_hold_id; held_token} -> (
        match
          (Tezos.call_view None "get_hold" fa2_hold_id held_token.address
            : hold option option)
        with
        | None -> (failwith fa2_unknown_hold_id : token_amount)
        | Some None -> (failwith fa2_unknown_hold_id : token_amount)
        | Some (Some fa2_hold) -> fa2_hold.ho_amount)
    | Escrow e -> e.es_amount
  in
  (* Only remove hold if full release/execution *)
  let holds =
    match amount_ with
    | None ->
        (* Full hold release/execution *)
        cleaned_holds
    | Some a ->
        if a = hold_amount then (* Full hold release/execution *)
          cleaned_holds
        else (* Partial hold release/execution *)
          s.holds
  in
  let escrow_totals =
    match hold_info with
    | FA2_hold _ -> s.escrow_totals
    | Escrow e ->
        let unescrow_amount =
          match amount_ with None -> hold_amount | Some a -> a
        in
        let escrow_total =
          match
            Big_map.find_opt (e.es_src_account, e.es_held_token) s.escrow_totals
          with
          | None -> Amount 0n (* Should not happen *)
          | Some total -> total
        in
        let new_escrow_total =
          match sub_amount escrow_total unescrow_amount with
          | None -> None (* Should not happen *)
          | Some total -> if total = Amount 0n then None else Some total
        in
        Big_map.update
          (e.es_src_account, e.es_held_token)
          new_escrow_total
          s.escrow_totals
  in
  let s = {s with holds; escrow_totals} in
  (s, hold_info)

let execute_hold (p : execute_hold_param) (s : storage) : operation * storage =
  let {
    eh_hold_id = hold_id;
    eh_asset_id = asset_id;
    eh_amount = amount_;
    eh_src_account = src_account;
    eh_dst_account = dst_account;
  } =
    p
  in
  let (s, hold_info) = unhold_aux hold_id asset_id amount_ s in
  let op =
    match hold_info with
    | FA2_hold {fa2_hold_id; held_token} ->
        (* Execute native hold on FA2 *)
        let execute_ep = get_execute_entrypoint held_token.address in
        let e_src =
          match src_account with
          | None -> None
          | Some k -> Some (address_of_key k held_token s)
        in
        let e_dst =
          match dst_account with
          | None -> None
          | Some k -> Some (address_of_key k held_token s)
        in
        Tezos.transaction
          None
          {
            e_hold_id = fa2_hold_id;
            e_amount = amount_;
            e_token_id = Some held_token.id;
            e_src;
            e_dst;
          }
          0t
          execute_ep
    | Escrow {es_held_token; es_amount; es_src_account = _; es_dst_account} ->
        let tr_dst_acc =
          match (dst_account, es_dst_account) with
          | (None, None) -> (failwith "NO_DESTINATION_EXECUTE_HOLD" : key)
          | (Some dst, None) -> dst
          | (None, Some dst) -> dst
          | (Some dst, Some escrow_dst) ->
              if dst <> escrow_dst then
                (failwith "UNEXPECTED_EXECUTE_HOLD_DESTINATION" : key)
              else dst
        in
        let tr_src = Tezos.self_address None in
        let tr_dst = address_of_key tr_dst_acc es_held_token s in
        let tr_amount = match amount_ with None -> es_amount | Some a -> a in
        let tr_token_id = es_held_token.id in
        let execute_transfer =
          {tr_src; tr_txs = [{tr_dst; tr_token_id; tr_amount}]}
        in
        let transfer_ep = get_transfer_entrypoint es_held_token.address in
        Tezos.transaction None [execute_transfer] 0t transfer_ep
  in
  (op, s)

let release_hold (p : release_hold_param) (s : storage) : operation * storage =
  let {
    rh_hold_id = hold_id;
    rh_asset_id = asset_id;
    rh_amount = amount_;
    rh_src_account = src_account;
  } =
    p
  in
  let (s, hold_info) = unhold_aux hold_id asset_id amount_ s in
  let op =
    match hold_info with
    | FA2_hold {fa2_hold_id; held_token} ->
        (* Release native hold on FA2 *)
        let release_ep = get_release_entrypoint held_token.address in
        let rl_src =
          match src_account with
          | None -> None
          | Some k -> Some (address_of_key k held_token s)
        in
        Tezos.transaction
          None
          {
            rl_hold_id = fa2_hold_id;
            rl_amount = amount_;
            rl_token_id = Some held_token.id;
            rl_src;
          }
          0t
          release_ep
    | Escrow {es_held_token; es_amount; es_src_account; es_dst_account = _} ->
        let tr_src = Tezos.self_address None in
        let tr_dst = address_of_key es_src_account es_held_token s in
        let tr_amount = match amount_ with None -> es_amount | Some a -> a in
        let tr_token_id = es_held_token.id in
        let release_transfer =
          {tr_src; tr_txs = [{tr_dst; tr_token_id; tr_amount}]}
        in
        let transfer_ep = get_transfer_entrypoint es_held_token.address in
        Tezos.transaction None [release_transfer] 0t transfer_ep
  in
  (op, s)

let finp2p_asset (p : finp2p_proxy_asset_param) (s : storage) :
    operation * storage =
  match p with
  | Transfer_tokens p -> transfer_tokens p s
  | Create_asset p -> create_asset p s
  | Issue_tokens p -> issue_tokens p s
  | Redeem_tokens p -> redeem_tokens p s
  | Hold_tokens p -> hold_tokens p s
  | Execute_hold p -> execute_hold p s
  | Release_hold p -> release_hold p s

let finp2p_batch_asset (l : finp2p_proxy_asset_param list) (s : storage) :
    operation list * storage =
  let (r_ops, s) =
    List.fold_left
      (fun ( ((acc : operation list), (s : storage)),
             (p : finp2p_proxy_asset_param) ) ->
        let (op, s) = finp2p_asset p s in
        (op :: acc, s))
      (([] : operation list), s)
      l
  in
  (rev r_ops, s)

let update_operation_ttl (operation_ttl : operation_ttl) (s : storage) =
  {s with operation_ttl}

let update_admins (admins : address set) (s : storage) =
  if Set.cardinal admins = 0n then (failwith "EMPTY_ADMIN_SET" : storage)
  else {s with admins}

let add_admins (admins : address list) (s : storage) =
  let admins =
    List.fold_left
      (fun ((admins : address set), (a : address)) -> Set.add a admins)
      s.admins
      admins
  in
  update_admins admins s

let remove_admins (admins : address list) (s : storage) =
  let admins =
    List.fold_left
      (fun ((admins : address set), (a : address)) -> Set.remove a admins)
      s.admins
      admins
  in
  update_admins admins s

let update_fa2_token ((asset_id : asset_id), (fa2 : fa2_token)) (s : storage) =
  (* Check that the contract has the correct interface *)
  let () = check_fa2_contract fa2.address in
  let (old_next_token_id, next_token_ids) =
    let next_id = match fa2.id with Token_id id -> Token_id (id + 1n) in
    Big_map.get_and_update fa2.address (Some next_id) s.next_token_ids
  in
  let next_token_ids =
    match old_next_token_id with
    | None ->
        (* New fa2 address *)
        next_token_ids
    | Some id ->
        if id > fa2.id then
          (* Next known id was greater than the one we registered *)
          s.next_token_ids
        else next_token_ids
  in
  {
    s with
    finp2p_assets = Big_map.add asset_id fa2 s.finp2p_assets;
    next_token_ids;
  }

let register_external_address
    ((k : key), (tok : fa2_token), (addr_opt : address option)) (s : storage) =
  {
    s with
    external_addresses = Big_map.update (k, tok) addr_opt s.external_addresses;
  }

(** This entry point removes expired operations (passed in argument) from the
    [live_operations] table *)
let cleanup (ops : operation_hash list) (s : storage) : storage =
  let live_operations =
    List.fold_left
      (fun ( (live_operations : (operation_hash, timestamp) big_map),
             (oph : operation_hash) ) ->
        match Big_map.find_opt oph live_operations with
        | None ->
            (* This operation is not known, ignore (don't fail) *)
            live_operations
        | Some op_timestamp ->
            if is_operation_expired op_timestamp s then
              (* Operation is expired, remove it because it cannot be relayed by
                 the proxy. No replay possible anymore. *)
              Big_map.remove oph live_operations
            else (* Operation is still live, ignore it *)
              live_operations)
      s.live_operations
      ops
  in
  {s with live_operations}

let finp2p_admin (p : finp2p_proxy_admin_param) (s : storage) :
    operation list * storage =
  let s =
    match p with
    | Update_operation_ttl p -> update_operation_ttl p s
    | Update_admins p -> update_admins p s
    | Add_admins p -> add_admins p s
    | Remove_admins p -> remove_admins p s
    | Update_fa2_token p -> update_fa2_token p s
    | Register_external_address p -> register_external_address p s
  in
  (([] : operation list), s)

let main ((param, s) : finp2p_proxy_param * storage) : operation list * storage
    =
  match param with
  | Finp2p_asset p ->
      let () = fail_not_admin s in
      let (op, s) = finp2p_asset p s in
      ([op], s)
  | Finp2p_batch_asset p ->
      let () = fail_not_admin s in
      finp2p_batch_asset p s
  | Finp2p_admin p ->
      let () = fail_not_admin s in
      finp2p_admin p s
  | Cleanup ops ->
      let s = cleanup ops s in
      (([] : operation list), s)

(* Views *)

let[@view] get_asset_balance
    (((owner : key), (asset_id : asset_id)), (s : storage)) : nat =
  let fa2_token =
    match Big_map.find_opt asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let owner = address_of_key owner fa2_token s in
  match
    (Tezos.call_view None "get_balance" (owner, fa2_token.id) fa2_token.address
      : nat option)
  with
  | None -> (failwith "NOT_FINP2P_FA2" : nat)
  | Some b -> b

let[@view] get_asset_balance_info
    (((owner : key), (asset_id : asset_id)), (s : storage)) : balance_info =
  let fa2_token =
    match Big_map.find_opt asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let owner = address_of_key owner fa2_token s in
  match
    (Tezos.call_view
       None
       "get_balance_info"
       (owner, fa2_token.id)
       fa2_token.address
      : balance_info option)
  with
  | None -> (failwith "NOT_FINP2P_FA2" : balance_info)
  | Some b -> b

let[@view] get_asset_hold (((owner : key), (asset_id : asset_id)), (s : storage))
    : token_amount =
  let fa2_token =
    match Big_map.find_opt asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let owner_addr = address_of_key owner fa2_token s in
  let native_hold =
    match
      (Tezos.call_view
         None
         "get_balance_info"
         (owner_addr, fa2_token.id)
         fa2_token.address
        : balance_info option)
    with
    | None -> Amount 0n
    | Some b -> b.on_hold
  in
  let escrow_hold =
    match Big_map.find_opt (owner, fa2_token) s.escrow_totals with
    | None -> Amount 0n
    | Some a -> a
  in
  add_amount native_hold escrow_hold
