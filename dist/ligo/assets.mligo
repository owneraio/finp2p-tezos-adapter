#if !ASSETS
#define ASSETS

#include "errors.mligo"
#include "fa2_types.mligo"
let get_balance (p : balance_of_param) (ledger : ledger) : operation =
  let to_balance (r : balance_of_request) =
    match Big_map.find_opt (r.token_id, r.owner) ledger with
    | None -> (failwith fa2_token_undefined : balance_of_response)
    | Some ba_balance -> { request = r; balance = ba_balance  } in
  let responses = List.map to_balance p.requests in
  Tezos.transaction responses 0mutez p.callback

let transfer (txs : transfer list) (validate_op : address -> address -> nat -> storage -> unit) (s : storage) : ledger =
  List.fold
    (fun ((l, tx) : (ledger * transfer)) ->
       List.fold
         (fun ((ll, dst) : (ledger * transfer_destination)) ->
            match Big_map.find_opt (dst.token_id, tx.from_) ll with
            | None -> (failwith fa2_insufficient_balance : ledger)
            | Some am ->
              if dst.amount = 0n
              then ll
              else
                (match is_nat (am - dst.amount) with
                 | None -> (failwith fa2_insufficient_balance : ledger)
                 | Some diff ->
                   let () =
                     validate_op tx.from_ Tezos.sender dst.token_id s in
                   let ll =
                     if diff = 0n
                     then Big_map.remove (dst.token_id, tx.from_) ll
                     else
                       Big_map.update (dst.token_id, tx.from_) (Some diff)
                         ll in
                   (match Big_map.find_opt (dst.token_id, dst.to_) ll with
                    | None ->
                      Big_map.add (dst.token_id, dst.to_) dst.amount ll
                    | Some am ->
                      Big_map.update (dst.token_id, dst.to_)
                        (Some (am + dst.amount)) ll))) tx.txs l) txs
    s.ledger

let update_operator (storage : operators_storage) (update : operator_update) : operators_storage =
  match update with
  | Add_operator update ->
    Big_map.update (update.owner, (update.operator, update.token_id))
      (Some ()) storage
  | Remove_operator update ->
    Big_map.remove (update.owner, (update.operator, update.token_id)) storage

let validate_update_operators_by_owner (update : operator_update) (updater : address) : unit =
  let op = match update with | Add_operator op -> op | Remove_operator op -> op in
  if op.owner = updater then () else failwith fa2_not_owner

let update_operators (storage : operators_storage) (ops : operator_update list) : operators_storage =
  List.fold
    (fun ((storage, update) : (operators_storage * operator_update)) ->
       let () = validate_update_operators_by_owner update Tezos.sender in
       update_operator storage update) ops storage

let default_operator_validator (owner : address) (operator : address) (token_id : nat) (s : storage) : unit =
  if owner = operator
  then ()
  else
  if Big_map.mem (owner, (operator, token_id)) s.operators
  then ()
  else (failwith fa2_not_operator : unit)

let fa2 ((param, storage) : (fa2 * storage)) : (operation list * storage) =
  match param with
  | Transfer txs ->
    let ledger = transfer txs default_operator_validator storage in
    (([] : operation list), { storage with ledger = ledger  })
  | Balance_of p -> let op = get_balance p storage.ledger in ([op], storage)
  | Update_operators ops ->
    let operators = update_operators storage.operators ops in
    let storage = { storage with operators = operators  } in
    (([] : operation list), storage)

#endif