open Mligo
include Types

let get_balance (p : balance_of_param) (ledger : ledger) : operation =
  let to_balance (r : balance_of_request) =
    match Big_map.find_opt (r.ba_token_id, r.ba_owner) ledger with
    | None -> (failwith fa2_token_undefined : balance_of_response)
    | Some ba_balance ->
      { ba_request = r; ba_balance } in
  let responses = List.map to_balance p.ba_requests in
  Tezos.transaction responses 0u p.ba_callback

let transfer (txs : transfer list) (validate_op : address -> address -> nat -> storage -> unit)
    (s : storage) : ledger =
  let make_transfer (l, tx : ledger * transfer) =
    List.fold (fun (ll, dst : ledger * transfer_destination) ->
        if dst.tr_amount = 0n then ll
        else if dst.tr_amount <> 1n then (failwith fa2_insufficient_balance : ledger)
        else match Big_map.find_opt (dst.tr_token_id, tx.tr_src) ll with
          | None -> (failwith fa2_insufficient_balance : ledger)
          | Some am ->
            match is_nat (am - dst.tr_amount) with
            | None -> (failwith fa2_insufficient_balance : ledger)
            | Some diff ->
              let () = validate_op tx.tr_src Tezos.sender dst.tr_token_id s in
              let ll = Big_map.update (dst.tr_token_id, tx.tr_src) (Some diff) ll in
              match Big_map.find_opt (dst.tr_token_id, dst.tr_dst) ll with
              | None -> Big_map.update (dst.tr_token_id, dst.tr_dst) (Some dst.tr_amount) ll
              | Some am -> Big_map.update (dst.tr_token_id, dst.tr_dst) (Some (am + dst.tr_amount)) ll)
      tx.tr_txs l in
  List.fold make_transfer txs s.ledger

let update_operator (storage : operator_storage) (update : operator_update)
    : operator_storage =
  match update with
  | Add_operator update ->
    Big_map.update (update.op_owner, (update.op_operator, update.op_token_id)) (Some ()) storage
  | Remove_operator update ->
    Big_map.remove (update.op_owner, (update.op_operator, update.op_token_id)) storage

let validate_update_operators_by_owner (update : operator_update) (updater : address)
  : unit =
  let op = match update with
    | Add_operator op -> op
    | Remove_operator op -> op in
  if op.op_owner = updater then () else failwith fa2_not_owner

let update_operators (storage : operator_storage) (ops : operator_update list)
  : operator_storage =
  let process_update (storage, update : operator_storage * operator_update) : operator_storage =
    let () = validate_update_operators_by_owner update Tezos.sender in
    update_operator storage update in
  List.fold process_update ops storage

let default_operator_validator (owner : address) (operator : address)
    (token_id : nat) (s : storage) : unit =
  if owner = operator then () (* transfer by the owner *)
  else if Big_map.mem (owner, operator) s.operators_for_all then () (* the company wallet is permitted *)
  else if Big_map.mem (owner, (operator, token_id)) s.operators then () (* the operator is permitted for the token_id *)
  else (failwith fa2_not_operator : unit) (* the operator is not permitted for the token_id *)

let update_operators_for_all (s : operator_for_all_storage) (l : operator_update_for_all list) : operator_for_all_storage =
  List.fold (fun (s, a : operator_for_all_storage * operator_update_for_all) ->
      match a with
      | Add_operator_for_all op -> Big_map.add (op, Tezos.sender) () s
      | Remove_operator_for_all op -> Big_map.remove (op, Tezos.sender) s) l s

let fa2 (param, storage : fa2 * storage) : (operation  list) * storage =
  match param with
  | Transfer txs ->
    let ledger =
      transfer txs default_operator_validator storage in
    ([] : operation list), { storage with ledger }
  | Balance_of p ->
    let op = get_balance p storage.ledger in
    [ op ], storage
  | Update_operators ops ->
    let operators = update_operators storage.operators ops in
    let storage = { storage with operators } in
    ([] : operation list), storage
  | Update_operators_for_all ops ->
    let operators_for_all = update_operators_for_all storage.operators_for_all ops in
    let storage = { storage with operators_for_all } in
    ([] : operation list), storage
