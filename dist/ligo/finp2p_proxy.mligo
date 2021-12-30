#if !FINP2P_PROXY
#define FINP2P_PROXY

#include "errors.mligo"
#include "fa2_sig.mligo"
#include "finp2p_proxy_types.mligo"
#include "finp2p_lib.mligo"
let fail_not_admin (s : storage) =
  if not (Tezos.sender = s.admin) then (failwith unauthorized : unit)

let is_operation_expired (op_timestamp : timestamp) (s : storage) : bool =
  Tezos.now > (op_timestamp + (int s.operation_ttl.ttl))

let is_operation_live (op_timestamp : timestamp) (s : storage) : bool =
  (op_timestamp <= (Tezos.now + (int s.operation_ttl.allowed_in_the_future)))
  && (not (is_operation_expired op_timestamp s))

let address_of_key (k : key) : address =
  Tezos.address (Tezos.implicit_account (Crypto.hash_key k))

let transfer_tokens (p : transfer_tokens_param) (s : storage) : (operation * storage) =
  let () =
    if not (is_operation_live p.nonce.timestamp s)
    then (failwith op_not_live : unit) in
  let oph = check_transfer_tokens_signature p in
  let s =
    {
      s with
      live_operations = (Big_map.add oph p.nonce.timestamp s.live_operations)
    } in
  let fa2_token =
    match Big_map.find_opt p.asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let tr_amount = match p.amount with | Amount a -> a in
  let _x = nat_to_int64_big_endian tr_amount in
  let fa2_transfer =
    {
      from_ = (address_of_key p.src_account);
      txs =
        [{
          to_ = (address_of_key p.dst_account);
          token_id = fa2_token.id;
          amount = tr_amount 
        }]
    } in
  let transfer_ep = get_transfer_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction [fa2_transfer] 0tez transfer_ep in
  (relay_op, s)

let create_asset (p : create_asset_param) (s : storage) : (operation * storage) =
  let ({ address = ca_address; id = ca_id }, token_info) = p.new_token_info in
  let next_token_id = Big_map.find_opt ca_address s.next_token_ids in
  let token_id =
    match ca_id with
    | Some id -> id
    | None ->
      (match next_token_id with
       | Some id -> id
       | None ->
         (match (Tezos.call_view "get_max_token_id" () ca_address : 
                   nat option)
          with
          | None -> (failwith "CANNOT_COMPUTE_NEXT_TOKEN_ID" : nat)
          | Some id -> id + 1n)) in
  let fa2_token = { address = ca_address; id = token_id } in
  let (old_asset, finp2p_assets) =
    Big_map.get_and_update p.asset_id (Some fa2_token) s.finp2p_assets in
  let () =
    match old_asset with
    | Some _ -> (failwith asset_already_exists : unit)
    | None -> () in
  let fa2_mint =
    {
      token_id = fa2_token.id;
      token_info = (Some token_info);
      owners = ([] : (address * nat) list)
    } in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction fa2_mint 0tez mint_ep in
  let next_token_id =
    match next_token_id with
    | None -> token_id + 1n
    | Some id -> if token_id >= id then token_id + 1n else id in
  let next_token_ids = Big_map.add ca_address next_token_id s.next_token_ids in
  let s =
    { s with finp2p_assets = finp2p_assets ; next_token_ids = next_token_ids  } in
  (relay_op, s)

let issue_tokens (p : issue_tokens_param) (s : storage) : (operation * storage) =
  let () =
    if not (is_operation_live p.nonce.timestamp s)
    then (failwith op_not_live : unit) in
  let oph = check_issue_tokens_signature p in
  let live_operations = Big_map.add oph p.nonce.timestamp s.live_operations in
  let fa2_token =
    match Big_map.find_opt p.asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let issued_amount = match p.amount with | Amount a -> a in
  let fa2_mint =
    {
      token_id = fa2_token.id;
      token_info = (None : (string, bytes) map option);
      owners = [((address_of_key p.dst_account), issued_amount)]
    } in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction fa2_mint 0tez mint_ep in
  let s = { s with live_operations = live_operations  } in (relay_op, s)

let redeem_tokens (p : redeem_tokens_param) (s : storage) : (operation * storage) =
  let () =
    if not (is_operation_live p.nonce.timestamp s)
    then (failwith op_not_live : unit) in
  let oph = check_redeem_tokens_signature p in
  let s =
    {
      s with
      live_operations = (Big_map.add oph p.nonce.timestamp s.live_operations)
    } in
  let fa2_token =
    match Big_map.find_opt p.asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let redeemed_amount = match p.amount with | Amount a -> a in
  let fa2_burn =
    {
      token_id = fa2_token.id;
      owners = [((address_of_key p.src_account), redeemed_amount)]
    } in
  let burn_ep = get_burn_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction fa2_burn 0tez burn_ep in (relay_op, s)

let update_operation_ttl (operation_ttl : operation_ttl) (s : storage) =
  { s with operation_ttl = operation_ttl  }

let update_admin (admin : address) (s : storage) =
  { s with admin = admin  }

let update_fa2_token ((asset_id : asset_id), (fa2 : fa2_token)) (s : storage) =
  let () = check_fa2_contract fa2.address in
  let (old_next_token_id, next_token_ids) =
    Big_map.get_and_update fa2.address (Some (fa2.id + 1n)) s.next_token_ids in
  let next_token_ids =
    match old_next_token_id with
    | None -> next_token_ids
    | Some id -> if id > fa2.id then s.next_token_ids else next_token_ids in
  {
    s with
    finp2p_assets = (Big_map.add asset_id fa2 s.finp2p_assets);
    next_token_ids = next_token_ids 
  }

let cleanup (ops : operation_hash list) (s : storage) : storage =
  let live_operations =
    List.fold_left
      (fun
        ((live_operations : (operation_hash, timestamp) big_map),
         (oph : operation_hash))
        ->
          match Big_map.find_opt oph live_operations with
          | None -> live_operations
          | Some op_timestamp ->
            if is_operation_expired op_timestamp s
            then Big_map.remove oph live_operations
            else live_operations) s.live_operations ops in
  { s with live_operations = live_operations  }

let finp2p_asset (p : finp2p_proxy_asset_param) (s : storage) : (operation * storage) =
  match p with
  | Transfer_tokens p -> transfer_tokens p s
  | Create_asset p -> create_asset p s
  | Issue_tokens p -> issue_tokens p s
  | Redeem_tokens p -> redeem_tokens p s

let finp2p_batch_asset (l : finp2p_proxy_asset_param list) (s : storage) : (operation list * storage) =
  List.fold_left
    (fun
      (((acc : operation list), (s : storage)),
       (p : finp2p_proxy_asset_param))
      -> let (op, s) = finp2p_asset p s in ((op :: acc), s))
    (([] : operation list), s) l

let finp2p_admin (p : finp2p_proxy_admin_param) (s : storage) : (operation list * storage) =
  let s =
    match p with
    | Update_operation_ttl p -> update_operation_ttl p s
    | Update_admin p -> update_admin p s
    | Update_fa2_token p -> update_fa2_token p s in
  (([] : operation list), s)

let main ((param, s) : (finp2p_proxy_param * storage)) : (operation list * storage) =
  match param with
  | Finp2p_asset p ->
    let () = fail_not_admin s in let (op, s) = finp2p_asset p s in ([op], s)
  | Finp2p_batch_asset p -> let () = fail_not_admin s in finp2p_batch_asset p s
  | Finp2p_admin p -> let () = fail_not_admin s in finp2p_admin p s
  | Cleanup ops -> let s = cleanup ops s in (([] : operation list), s)


[@view]
let get_asset_balance (((owner : key), (asset_id : asset_id)), (s : storage)) : nat =
  let owner = address_of_key owner in
  let fa2_token =
    match Big_map.find_opt asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  match (Tezos.call_view "get_balance" (owner, fa2_token.id) fa2_token.address : 
           nat option)
  with
  | None -> (failwith "UNAVAILBLE_ASSET_BALANCE" : nat)
  | Some b -> b

#endif