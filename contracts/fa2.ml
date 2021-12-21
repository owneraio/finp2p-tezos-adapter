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
            (fun ((owner : address), (_amount : nat)) ->
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

let[@view] get_balance (((owner, token_id) : address * nat), (s : storage)) :
    nat =
  if not (Big_map.mem token_id s.token_metadata) then
    (failwith fa2_token_undefined : nat)
  else
    match Big_map.find_opt (owner, token_id) s.ledger with
    | None -> 0n
    | Some b -> b
