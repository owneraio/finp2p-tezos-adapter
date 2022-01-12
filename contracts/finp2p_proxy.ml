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
  let tr_amount = match p.tt_amount with Amount a -> a in
  let _x = nat_to_int64_big_endian tr_amount in
  let fa2_transfer =
    {
      tr_src = address_of_key p.tt_src_account;
      tr_txs =
        [
          {
            tr_dst = address_of_key p.tt_dst_account;
            tr_token_id = fa2_token.id;
            tr_amount;
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
                : nat option)
            with
            | None -> (failwith "CANNOT_COMPUTE_NEXT_TOKEN_ID" : nat)
            | Some id -> id + 1n))
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
      mi_owners = ([] : (address * nat) list);
    }
  in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_mint 0t mint_ep in
  let next_token_id =
    match next_token_id with
    | None -> token_id + 1n
    | Some id -> if token_id >= id then token_id + 1n else id
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
  let issued_amount = match p.it_amount with Amount a -> a in
  let fa2_mint =
    {
      mi_token_id = fa2_token.id;
      mi_token_info = (None : (string, bytes) map option);
      mi_owners = [(address_of_key p.it_dst_account, issued_amount)];
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
  let redeemed_amount = match p.rt_amount with Amount a -> a in
  let fa2_burn =
    {
      bu_token_id = fa2_token.id;
      bu_owners = [(address_of_key p.rt_src_account, redeemed_amount)];
    }
  in
  let burn_ep = get_burn_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_burn 0t burn_ep in
  (relay_op, s)

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
    Big_map.get_and_update fa2.address (Some (fa2.id + 1n)) s.next_token_ids
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

let finp2p_asset (p : finp2p_proxy_asset_param) (s : storage) :
    operation * storage =
  match p with
  | Transfer_tokens p -> transfer_tokens p s
  | Create_asset p -> create_asset p s
  | Issue_tokens p -> issue_tokens p s
  | Redeem_tokens p -> redeem_tokens p s

let finp2p_batch_asset (l : finp2p_proxy_asset_param list) (s : storage) :
    operation list * storage =
  List.fold_left
    (fun ( ((acc : operation list), (s : storage)),
           (p : finp2p_proxy_asset_param) ) ->
      let (op, s) = finp2p_asset p s in
      (op :: acc, s))
    (([] : operation list), s)
    l

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
