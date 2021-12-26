include Errors
include Fa2_types

let get_balance (p : balance_of_param) (s : storage) : operation =
  let to_balance (r : balance_of_request) =
    if not (Big_map.mem r.ba_token_id s.token_metadata) then
      (failwith fa2_token_undefined : balance_of_response)
    else
      let ba_balance =
        match Big_map.find_opt (r.ba_owner, r.ba_token_id) s.ledger with
        | None -> 0n
        | Some ba_balance -> ba_balance
      in
      {ba_request = r; ba_balance}
  in
  let responses = List.map to_balance p.ba_requests in
  Tezos.transaction None responses 0u p.ba_callback

let transfer (txs : transfer list) (s : storage) : ledger =
  List.fold
    (fun ((l, tx) : ledger * transfer) ->
      List.fold
        (fun ((ll, dst) : ledger * transfer_destination) ->
          match Big_map.find_opt (tx.tr_src, dst.tr_token_id) ll with
          | None -> (failwith fa2_insufficient_balance : ledger)
          | Some am -> (
              if dst.tr_amount = 0n then ll
              else
                match is_nat (am - dst.tr_amount) with
                | None -> (failwith fa2_insufficient_balance : ledger)
                | Some diff -> (
                    let ll =
                      if diff = 0n then
                        Big_map.remove (tx.tr_src, dst.tr_token_id) ll
                      else
                        Big_map.update
                          (tx.tr_src, dst.tr_token_id)
                          (Some diff)
                          ll
                    in
                    match Big_map.find_opt (dst.tr_dst, dst.tr_token_id) ll with
                    | None ->
                        Big_map.add
                          (dst.tr_dst, dst.tr_token_id)
                          dst.tr_amount
                          ll
                    | Some am ->
                        Big_map.update
                          (dst.tr_dst, dst.tr_token_id)
                          (Some (am + dst.tr_amount))
                          ll)))
        tx.tr_txs
        l)
    txs
    s.ledger

let update_operator (storage : operators_storage) (update : operator_update) :
    operators_storage =
  match update with
  | Add_operator update ->
      Big_map.update
        (update.op_owner, (update.op_operator, update.op_token_id))
        (Some ())
        storage
  | Remove_operator update ->
      Big_map.remove
        (update.op_owner, (update.op_operator, update.op_token_id))
        storage

let validate_update_operators_by_owner (update : operator_update)
    (updater : address) : unit =
  let op =
    match update with Add_operator op -> op | Remove_operator op -> op
  in
  if op.op_owner = updater then () else failwith fa2_not_owner

let update_operators (storage : operators_storage) (ops : operator_update list)
    : operators_storage =
  List.fold
    (fun ((storage, update) : operators_storage * operator_update) ->
      let () = validate_update_operators_by_owner update (Tezos.sender None) in
      update_operator storage update)
    ops
    storage

let fa2 ((param, storage) : fa2 * storage) : operation list * storage =
  match param with
  | Transfer txs ->
      let ledger = transfer txs storage in
      (([] : operation list), {storage with ledger})
  | Balance_of p ->
      let op = get_balance p storage in
      ([op], storage)
  | Update_operators ops ->
      let operators = update_operators storage.operators ops in
      let storage = {storage with operators} in
      (([] : operation list), storage)
