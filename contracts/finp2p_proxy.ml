include Errors
include Fa2_sig
include Finp2p_proxy_types
include Finp2p_lib

let fail_not_admin (s : storage) =
  if not (Tezos.sender None = s.admin) then (failwith unauthorized : unit)

let is_operation_expired (op_timestamp : timestamp) (s : storage) : bool =
  Tezos.now None > op_timestamp + int s.operation_ttl

let is_operation_live (op_timestamp : timestamp) (s : storage) : bool =
  op_timestamp >= Tezos.now None && not (is_operation_expired op_timestamp s)

let address_of_key (k : key) : address =
  Tezos.address (Tezos.implicit_account None (Crypto.hash_key k))

let transfer_tokens (p : transfer_tokens_param) (s : storage) :
    operation list * storage =
  let () =
    if not (is_operation_live p.tt_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  (* TODO: hash operation *)
  let oph = OpHash (Bytes.pack p (* XXX: placeholder *)) in
  (* TODO: check_signature *)
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
  ([relay_op], s)

let issue_tokens (p : issue_tokens_param) (s : storage) :
    operation list * storage =
  let () =
    if not (is_operation_live p.it_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  (* TODO: hash operation *)
  let oph = OpHash (Bytes.pack p (* XXX: placeholder *)) in
  (* TODO: check_signature *)
  let s =
    {
      s with
      live_operations = Big_map.add oph p.it_nonce.timestamp s.live_operations;
    }
  in
  let (fa2_token, mi_token_info) =
    match p.it_new_token_info with
    | None -> (
        (* Issuing more of an existing asset *)
        match Big_map.find_opt p.it_asset_id s.finp2p_assets with
        | None ->
            (failwith unknown_asset_id : fa2_token * (string, bytes) map option)
        | Some fa2_token -> (fa2_token, (None : (string, bytes) map option)))
    | Some (fa2_token, token_info) -> (
        (* Issuing new asset *)
        match Big_map.find_opt p.it_asset_id s.finp2p_assets with
        | Some _ ->
            (failwith asset_already_exists
              : fa2_token * (string, bytes) map option)
        | None -> (fa2_token, Some token_info))
  in
  let issued_amount = match p.it_amount with Amount a -> a in
  let fa2_mint =
    {
      mi_token_id = fa2_token.id;
      mi_token_info;
      mi_owners = [(address_of_key p.it_dst_account, issued_amount)];
    }
  in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_mint 0t mint_ep in
  ([relay_op], s)

let redeem_tokens (p : redeem_tokens_param) (s : storage) :
    operation list * storage =
  let () =
    if not (is_operation_live p.rt_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  (* TODO: hash operation *)
  let oph = OpHash (Bytes.pack p (* XXX: placeholder *)) in
  (* TODO: check_signature *)
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
  ([relay_op], s)

let update_operation_ttl (operation_ttl : nat) (s : storage) =
  {s with operation_ttl}

let update_admin (admin : address) (s : storage) = {s with admin}

let update_fa2_token ((asset_id : asset_id), (fa2 : fa2_token)) (s : storage) =
  (* Check that the contract has the correct interface *)
  let () = check_fa2_contract fa2.address in
  {s with finp2p_assets = Big_map.add asset_id fa2 s.finp2p_assets}

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
    operation list * storage =
  match p with
  | Transfer_tokens p -> transfer_tokens p s
  | Issue_tokens p -> issue_tokens p s
  | Redeem_tokens p -> redeem_tokens p s

let finp2p_admin (p : finp2p_proxy_admin_param) (s : storage) :
    operation list * storage =
  let s =
    match p with
    | Update_operation_ttl p -> update_operation_ttl p s
    | Update_admin p -> update_admin p s
    | Update_fa2_token p -> update_fa2_token p s
  in
  (([] : operation list), s)

let main ((param, s) : finp2p_proxy_param * storage) : operation list * storage
    =
  match param with
  | Finp2p_asset p ->
      let () = fail_not_admin s in
      finp2p_asset p s
  | Finp2p_admin p ->
      let () = fail_not_admin s in
      finp2p_admin p s
  | Cleanup ops ->
      let s = cleanup ops s in
      (([] : operation list), s)
