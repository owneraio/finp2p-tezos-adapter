#if !ASSETS
#define ASSETS

#include "errors.mligo"
#include "fa2_types.mligo"
[@inline]
let check_token_exists (id : token_id) (s : storage) : unit =
  if not (Big_map.mem id s.token_metadata)
  then (failwith fa2_token_undefined : unit)

let get_balance (p : balance_of_param) (s : storage) : operation =
  let to_balance (r : balance_of_request) =
    let () = check_token_exists r.token_id s in
    let ba_balance =
      match Big_map.find_opt (r.owner, r.token_id) s.ledger with
      | None -> Amount 0n
      | Some ba_balance -> ba_balance in
    { request = r; balance = ba_balance  } in
  let responses = List.map to_balance p.requests in
  Tezos.transaction responses 0mutez p.callback

let transfer (txs : transfer list) (s : storage) : ledger =
  List.fold
    (fun ((ledger, tx) : (ledger * transfer)) ->
       List.fold
         (fun ((ledger, dst) : (ledger * transfer_destination)) ->
            let () = check_token_exists dst.token_id s in
            let tr_amount = dst.amount in
            if tr_amount = (Amount 0n)
            then ledger
            else
              (let src_balance =
                 match Big_map.find_opt (tx.from_, dst.token_id) ledger with
                 | None -> (failwith fa2_insufficient_balance : token_amount)
                 | Some b -> b in
               let new_src_balance_opt =
                 match sub_amount src_balance tr_amount with
                 | None ->
                   (failwith fa2_insufficient_balance : token_amount option)
                 | Some b -> if b = (Amount 0n) then None else Some b in
               let ledger =
                 Big_map.update (tx.from_, dst.token_id) new_src_balance_opt
                   ledger in
               let new_dst_balance =
                 match Big_map.find_opt (dst.to_, dst.token_id) ledger with
                 | None -> tr_amount
                 | Some b -> add_amount b tr_amount in
               Big_map.add (dst.to_, dst.token_id) new_dst_balance ledger))
         tx.txs ledger) txs s.ledger

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

let fa2 ((param, storage) : (fa2 * storage)) : (operation list * storage) =
  match param with
  | Transfer txs ->
    let ledger = transfer txs storage in
    (([] : operation list), { storage with ledger = ledger  })
  | Balance_of p -> let op = get_balance p storage in ([op], storage)
  | Update_operators ops ->
    let operators = update_operators storage.operators ops in
    let storage = { storage with operators = operators  } in
    (([] : operation list), storage)

#endif