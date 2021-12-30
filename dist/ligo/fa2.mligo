#if !FA2
#define FA2

#include "auth_params.mligo"
#include "manager.mligo"
#include "assets.mligo"
let authorize (param : param) (s : storage) : operation =
  let auth_contract =
    match (Tezos.get_entrypoint_opt "%authorize" s.auth_contract : auth_param
               contract
               option)
    with
    | None -> (failwith "INVALID_AUTHORIZATION_CONTRACT" : auth_param contract)
    | Some c -> c in
  let sender_is_operator =
    match param with
    | Assets (Transfer txs) ->
      List.map
        (fun (tx : transfer) ->
           List.map
             (fun (dst : transfer_destination) ->
                Big_map.mem (tx.from_, (Tezos.sender, dst.token_id))
                  s.operators) tx.txs) txs
    | Manager (Burn bu) ->
      [List.map
         (fun ((owner : address), (_amount : nat)) ->
            Big_map.mem (owner, (Tezos.sender, bu.token_id)) s.operators)
         bu.owners]
    | _ -> ([] : bool list list) in
  let action =
    match param with
    | Assets p -> Assets_action p
    | Manager p -> Manage_action p
    | Admin _ -> Admin_action in
  Tezos.transaction
    {
      sender = Tezos.sender;
      sender_is_operator = sender_is_operator ;
      fa2_address = Tezos.self_address;
      action = action 
    } 0tez auth_contract

let main ((param, s) : (param * storage)) : (operation list * storage) =
  let (ops, s) =
    match param with
    | Admin p -> admin (p, s)
    | Manager p -> manager (p, s)
    | Assets p -> let () = fail_if_paused s in fa2 (p, s) in
  (((authorize param s) :: ops), s)


[@view]
let get_balance (((owner, token_id) : (address * nat)), (s : storage)) : nat =
  if not (Big_map.mem token_id s.token_metadata)
  then (failwith fa2_token_undefined : nat)
  else
    (match Big_map.find_opt (owner, token_id) s.ledger with
     | None -> 0n
     | Some b -> b)


[@view]
let get_max_token_id ((), (s : storage)) : nat =
  s.max_token_id

#endif