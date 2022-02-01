include Auth_params
include Manager
include Assets

let authorize (param : param) (s : storage) : operation =
  let auth_contract =
    match
      (Tezos.get_entrypoint_opt None "%authorize" s.auth_contract
        : (auth_param, _) contract option)
    with
    | None ->
        (failwith "INVALID_AUTHORIZATION_CONTRACT" : (auth_param, _) contract)
    | Some c -> c
  in
  let sender_is_operator =
    match param with
    | Assets (Transfer txs) ->
        List.map
          (fun (tx : transfer) ->
            List.map
              (fun (dst : transfer_destination) ->
                Big_map.mem
                  (tx.tr_src, (Tezos.sender None, dst.tr_token_id))
                  s.operators)
              tx.tr_txs)
          txs
    | Manager (Burn bu) ->
        [
          List.map
            (fun ((owner : address), (_amount : token_amount)) ->
              Big_map.mem
                (owner, (Tezos.sender None, bu.bu_token_id))
                s.operators)
            bu.bu_owners;
        ]
    | _ -> ([] : bool list list)
  in
  let action =
    match param with
    | Assets p -> Assets_action p
    | Manager p -> Manage_action p
    | Admin _ -> Admin_action
  in
  Tezos.transaction
    None
    {
      sender = Tezos.sender None;
      sender_is_operator;
      fa2_address = Tezos.self_address None;
      action;
    }
    0t
    auth_contract

let main ((param, s) : param * storage) : operation list * storage =
  let (ops, s) =
    match param with
    | Admin p -> admin (p, s)
    | Manager p -> manager (p, s)
    | Assets p ->
        let () = fail_if_paused s in
        fa2 (p, s)
  in
  (authorize param s :: ops, s)

(* Views *)

let[@view] get_balance (((owner, token_id) : address * token_id), (s : storage))
    : token_amount =
  if not (Big_map.mem token_id s.token_metadata) then
    (failwith fa2_token_undefined : token_amount)
  else
    match Big_map.find_opt (owner, token_id) s.ledger with
    | None -> Amount 0n
    | Some b -> b

let[@view] get_balance_info
    (((owner, token_id) : address * token_id), (s : storage)) : balance_info =
  if not (Big_map.mem token_id s.token_metadata) then
    (failwith fa2_token_undefined : balance_info)
  else
    let balance_ =
      match Big_map.find_opt (owner, token_id) s.ledger with
      | None -> Amount 0n
      | Some b -> b
    in
    let on_hold =
      match Big_map.find_opt (owner, token_id) s.holds_totals with
      | None -> Amount 0n
      | Some total -> total
    in
    {balance = balance_; on_hold}

let[@view] get_spendable_balance
    (((owner, token_id) : address * token_id), (s : storage)) : token_amount =
  if not (Big_map.mem token_id s.token_metadata) then
    (failwith fa2_token_undefined : token_amount)
  else
    let balance_ =
      match Big_map.find_opt (owner, token_id) s.ledger with
      | None -> Amount 0n
      | Some b -> b
    in
    let on_hold =
      match Big_map.find_opt (owner, token_id) s.holds_totals with
      | None -> Amount 0n
      | Some total -> total
    in
    match sub_amount balance_ on_hold with None -> Amount 0n | Some b -> b

let[@view] get_max_token_id ((), (s : storage)) : token_id = s.max_token_id

let[@view] get_max_hold_id ((), (s : storage)) : hold_id = s.max_hold_id

let[@view] get_hold ((id : hold_id), (s : storage)) : hold option =
  Big_map.find_opt id s.holds
