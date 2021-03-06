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
         (fun ((owner : address), (_amount : token_amount)) ->
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
let get_balance (((owner, token_id) : (address * token_id)), (s : storage)) : token_amount =
  if not (Big_map.mem token_id s.token_metadata)
  then (failwith fa2_token_undefined : token_amount)
  else
    (match Big_map.find_opt (owner, token_id) s.ledger with
     | None -> Amount 0n
     | Some b -> b)


[@view]
let get_balance_info (((owner, token_id) : (address * token_id)), (s : storage)) : balance_info =
  if not (Big_map.mem token_id s.token_metadata)
  then (failwith fa2_token_undefined : balance_info)
  else
    (let balance_ =
       match Big_map.find_opt (owner, token_id) s.ledger with
       | None -> Amount 0n
       | Some b -> b in
     let on_hold =
       match Big_map.find_opt (owner, token_id) s.holds_totals with
       | None -> Amount 0n
       | Some total -> total in
     { balance = balance_; on_hold = on_hold  })


[@view]
let get_spendable_balance (((owner, token_id) : (address * token_id)), (s : storage)) : token_amount =
  if not (Big_map.mem token_id s.token_metadata)
  then (failwith fa2_token_undefined : token_amount)
  else
    (let balance_ =
       match Big_map.find_opt (owner, token_id) s.ledger with
       | None -> Amount 0n
       | Some b -> b in
     let on_hold =
       match Big_map.find_opt (owner, token_id) s.holds_totals with
       | None -> Amount 0n
       | Some total -> total in
     match sub_amount balance_ on_hold with | None -> Amount 0n | Some b -> b)


[@view]
let get_max_token_id ((), (s : storage)) : token_id =
  s.max_token_id


[@view]
let get_max_hold_id ((), (s : storage)) : hold_id =
  s.max_hold_id


[@view]
let get_hold ((id : hold_id), (s : storage)) : hold option =
  Big_map.find_opt id s.holds

#endif