include Errors
include Fa2_types
include Fa2_common

let[@inline] check_token_exists (id : token_id) (s : storage) : unit =
  if not (Big_map.mem id s.token_metadata) then
    (failwith fa2_token_undefined : unit)

let get_balance (p : balance_of_param) (s : storage) : operation =
  let to_balance (r : balance_of_request) =
    let () = check_token_exists r.ba_token_id s in
    let ba_balance =
      match Big_map.find_opt (r.ba_owner, r.ba_token_id) s.ledger with
      | None -> Amount 0n
      | Some ba_balance -> ba_balance
    in
    {ba_request = r; ba_balance}
  in
  let responses = List.map to_balance p.ba_requests in
  Tezos.transaction None responses 0u p.ba_callback

let transfer (txs : transfer list) (s : storage) : ledger =
  List.fold
    (fun ((ledger, tx) : ledger * transfer) ->
      List.fold
        (fun ((ledger, dst) : ledger * transfer_destination) ->
          let () = check_token_exists dst.tr_token_id s in
          let tr_amount = dst.tr_amount in
          if tr_amount = Amount 0n then ledger
          else
            let src_balance =
              match Big_map.find_opt (tx.tr_src, dst.tr_token_id) ledger with
              | None -> (failwith fa2_insufficient_balance : token_amount)
              | Some b -> b
            in
            let new_src_balance_opt =
              match sub_amount src_balance tr_amount with
              | None ->
                  (failwith fa2_insufficient_balance : token_amount option)
              | Some b ->
                  let () = check_hold tx.tr_src dst.tr_token_id b s in
                  if b = Amount 0n then None else Some b
            in
            let ledger =
              Big_map.update
                (tx.tr_src, dst.tr_token_id)
                new_src_balance_opt
                ledger
            in
            let new_dst_balance =
              match Big_map.find_opt (dst.tr_dst, dst.tr_token_id) ledger with
              | None -> tr_amount
              | Some b -> add_amount b tr_amount
            in
            Big_map.add (dst.tr_dst, dst.tr_token_id) new_dst_balance ledger)
        tx.tr_txs
        ledger)
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

let hold (h : hold_param) (s : storage) : storage =
  let {h_id = id; h_hold = h} = h in
  let hold_id =
    match id with
    | None -> succ_hold_id s.max_hold_id
    | Some id ->
        if id <= s.max_hold_id then (failwith fa2_hold_already_exists : hold_id)
        else id
  in
  let (already_hold, holds) = Big_map.get_and_update hold_id (Some h) s.holds in
  let () =
    match already_hold with
    | None -> ()
    | Some _ -> (failwith fa2_hold_already_exists : unit)
  in
  let total_on_hold =
    match Big_map.find_opt (h.ho_src, h.ho_token_id) s.holds_totals with
    | None -> h.ho_amount
    | Some total -> add_amount total h.ho_amount
  in
  let balance_src =
    match Big_map.find_opt (h.ho_src, h.ho_token_id) s.ledger with
    | None -> Amount 0n
    | Some b -> b
  in
  let () =
    if total_on_hold > balance_src then
      (failwith fa2_insufficient_balance : unit)
  in
  let holds_totals =
    Big_map.add (h.ho_src, h.ho_token_id) total_on_hold s.holds_totals
  in
  let max_hold_id = hold_id in
  {s with holds; holds_totals; max_hold_id}

let fa2 ((param, storage) : assets_params * storage) : operation list * storage
    =
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
  | Hold p ->
      let storage = hold p storage in
      (([] : operation list), storage)
