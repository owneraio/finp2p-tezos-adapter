
include Auth_params
include Manager
include Assets

let main (param, s : param * storage) : (operation list) * storage =
  let ops, s = match param with
  | Admin p -> admin (p, s)
  | Manager p -> manager (p, s)
  | Assets p ->
    let () = fail_if_paused s in
    fa2 (p, s)
  in
  let auth_contract =
    match (Tezos.get_entrypoint_opt None "%authorize" s.admin
           : (auth_param, _) contract option) with
    | None -> (failwith "INVALID_AUTHORIZATION_CONTRACT" : (auth_param, _) contract)
    | Some c ->  c
  in
  let sender_is_operator = match param with
    | Assets (Transfer txs) ->
      List.fold_left (fun ((ok : bool), (tx : transfer)) ->
          if not ok then false else
            List.fold_left (fun ((ok : bool), (dst : transfer_destination)) ->
                if not ok then false else
                  Big_map.mem
                    (tx.tr_src, (Tezos.sender None, dst.tr_token_id))
                    s.operators
              ) ok tx.tr_txs
        ) true txs
    | Manager (Burn bu) ->
      List.fold_left (fun ((ok : bool), ((owner : address), (_amount : nat))) ->
                if not ok then false else
                  Big_map.mem
                    (owner, (Tezos.sender None, bu.bu_token_id))
                    s.operators
        ) true bu.bu_owners      
    | _ -> false
  in
  let auth_op = Tezos.transaction None
      { sender = Tezos.sender None;
        sender_is_operator;
        fa2_address = Tezos.self_address None;
        parameters = param
      } 0t auth_contract in
  auth_op :: ops, s
