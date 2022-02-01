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

let address_of_key (k : key) : address =
  Tezos.address (Tezos.implicit_account None (Crypto.hash_key k))

let transfer_tokens (p : transfer_tokens_param) (s : storage) :
    operation list * storage =
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
      tr_src = address_of_key p.tt_src_account;
      tr_txs =
        [
          {
            tr_dst = address_of_key p.tt_dst_account;
            tr_token_id = fa2_token.id;
            tr_amount = p.tt_amount;
          };
        ];
    }
  in
  let transfer_ep = get_transfer_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None [fa2_transfer] 0t transfer_ep in
  ([relay_op], s)

let create_asset (p : create_asset_param) (s : storage) :
    operation list * storage =
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
  ([relay_op], s)

let issue_tokens (p : issue_tokens_param) (s : storage) :
    operation list * storage =
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
      mi_owners = [(address_of_key p.it_dst_account, p.it_amount)];
    }
  in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_mint 0t mint_ep in
  let s = {s with live_operations} in
  ([relay_op], s)

let redeem_tokens (p : redeem_tokens_param) (s : storage) :
    operation list * storage =
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
      bu_owners = [(address_of_key p.rt_src_account, p.rt_amount)];
    }
  in
  let burn_ep = get_burn_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_burn 0t burn_ep in
  ([relay_op], s)

let hold_tokens (p : hold_tokens_param) (s : storage) : operation list * storage
    =
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
  let fa2_hold_id =
    match
      (Tezos.call_view None "get_max_hold_id" () fa2_token.address
        : hold_id option)
    with
    | None -> (failwith "CANNOT_COMPUTE_NEXT_HOLD_ID" : hold_id)
    | Some (Hold_id id) -> Hold_id (id + 1n)
  in
  (* Register hold id *)
  let (old_hold_id, holds) =
    Big_map.get_and_update
      p.ht_hold_id
      (Some {fa2_hold_id; held_asset = p.ht_asset_id})
      s.holds
  in
  let () =
    match old_hold_id with
    | Some _ -> (failwith hold_already_exists : unit)
    | None -> ()
  in
  let s = {s with live_operations; holds} in
  let ho_dst =
    match p.ht_dst_account with
    | None -> None
    | Some dst -> Some (address_of_key dst)
  in
  let fa2_hold =
    {
      ho_hold_id = fa2_hold_id;
      ho_token_id = fa2_token.id;
      ho_amount = p.ht_amount;
      ho_src = address_of_key p.ht_src_account;
      ho_dst;
    }
  in
  let hold_ep = get_hold_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_hold 0t hold_ep in
  ([relay_op], s)

let execute_hold (p : execute_hold_param) (s : storage) :
    operation list * storage =
  (* Remove hold from storage *)
  (* TODO: do we need to keep until expiration date? *)
  (* TODO: do we need to keep for records? *)
  let (hold_to_execute, holds) =
    Big_map.get_and_update p.eh_hold_id (None : hold_info option) s.holds
  in
  let s = {s with holds} in
  let {fa2_hold_id; held_asset} =
    match hold_to_execute with
    | None -> (failwith unknown_hold_id : hold_info)
    | Some h -> h
  in
  let fa2_token =
    match Big_map.find_opt held_asset s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let fa2_hold =
    match
      (Tezos.call_view None "get_hold" fa2_hold_id fa2_token.address
        : hold option option)
    with
    | None -> (failwith fa2_unknown_hold_id : hold)
    | Some None -> (failwith fa2_unknown_hold_id : hold)
    | Some (Some h) -> h
  in
  (* Checks *)
  let () =
    match p.eh_asset_id with
    | None -> ()
    | Some asset_id ->
        if asset_id <> held_asset then failwith "UNEXPECTED_EXECUTE_HOLD_ASSET"
  in
  let () =
    match p.eh_amount with
    | None -> ()
    | Some amt ->
        if amt <> fa2_hold.ho_amount then
          failwith "UNEXPECTED_EXECUTE_HOLD_AMOUNT"
  in
  let tr_amount = fa2_hold.ho_amount in
  let () =
    match p.eh_src_account with
    | None -> ()
    | Some account ->
        if address_of_key account <> fa2_hold.ho_src then
          failwith "UNEXPECTED_EXECUTE_HOLD_SOURCE"
  in
  let dst =
    match (p.eh_dst_account, fa2_hold.ho_dst) with
    | (None, None) -> (failwith "NO_DESTINATION_EXECUTE_HOLD" : address)
    | (Some account, None) -> address_of_key account
    | (None, Some dst) -> dst
    | (Some account, Some dst) ->
        if address_of_key account <> dst then
          (failwith "UNEXPECTED_EXECUTE_HOLD_DESTINATION" : address)
        else dst
  in
  (* Release hold and transfer tokens on FA2 *)
  let release_ep = get_release_entrypoint fa2_token.address in
  let relay_op1 = Tezos.transaction None fa2_hold_id 0t release_ep in
  let fa2_transfer =
    {
      tr_src = fa2_hold.ho_src;
      tr_txs = [{tr_dst = dst; tr_token_id = fa2_token.id; tr_amount}];
    }
  in
  let transfer_ep = get_transfer_entrypoint fa2_token.address in
  let relay_op2 = Tezos.transaction None [fa2_transfer] 0t transfer_ep in
  ([relay_op1; relay_op2], s)

let release_hold (p : release_hold_param) (s : storage) :
    operation list * storage =
  (* Remove hold from storage *)
  (* TODO: do we need to keep until expiration date? *)
  (* TODO: do we need to keep for records? *)
  let (hold_to_release, holds) =
    Big_map.get_and_update p.rh_hold_id (None : hold_info option) s.holds
  in
  let s = {s with holds} in
  let {fa2_hold_id; held_asset} =
    match hold_to_release with
    | None -> (failwith unknown_hold_id : hold_info)
    | Some h -> h
  in
  let fa2_token =
    match Big_map.find_opt held_asset s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let fa2_hold =
    match
      (Tezos.call_view None "get_hold" fa2_hold_id fa2_token.address
        : hold option option)
    with
    | None -> (failwith fa2_unknown_hold_id : hold)
    | Some None -> (failwith fa2_unknown_hold_id : hold)
    | Some (Some h) -> h
  in
  (* Checks *)
  let () =
    match p.rh_asset_id with
    | None -> ()
    | Some asset_id ->
        if asset_id <> held_asset then failwith "UNEXPECTED_RELEASE_ASSET"
  in
  let () =
    match p.rh_amount with
    | None -> ()
    | Some amt ->
        if amt <> fa2_hold.ho_amount then failwith "UNEXPECTED_RELEASE_AMOUNT"
  in
  let () =
    match p.rh_src_account with
    | None -> ()
    | Some account ->
        if address_of_key account <> fa2_hold.ho_src then
          failwith "UNEXPECTED_RELEASE_SOURCE"
  in
  (* Release corresponding on hold FA2 *)
  let release_ep = get_release_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_hold_id 0t release_ep in
  ([relay_op], s)

let finp2p_asset (p : finp2p_proxy_asset_param) (s : storage) :
    operation list * storage =
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
        let (ops, s) = finp2p_asset p s in
        (rev_append ops acc, s))
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
  in
  (([] : operation list), s)

let main ((param, s) : finp2p_proxy_param * storage) : operation list * storage
    =
  match param with
  | Finp2p_asset p ->
      let () = fail_not_admin s in
      let (ops, s) = finp2p_asset p s in
      (ops, s)
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
  let owner = address_of_key owner in
  let fa2_token =
    match Big_map.find_opt asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  match
    (Tezos.call_view None "get_balance" (owner, fa2_token.id) fa2_token.address
      : nat option)
  with
  | None -> (failwith "UNAVAILBLE_ASSET_BALANCE" : nat)
  | Some b -> b
