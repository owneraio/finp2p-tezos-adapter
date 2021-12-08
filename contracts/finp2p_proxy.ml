include Errors
include Fa2_sig
include Finp2p_proxy_types

let fail_not_admin (s : storage) =
  if not (Tezos.sender None = s.admin) then (failwith unauthorized : unit)

let transfer_tokens (_p : transfer_tokens_param) (s : storage) :
    operation list * storage =
  (* TODO *)
  (([] : operation list), s)

let issue_tokens (_p : issue_tokens_param) (s : storage) :
    operation list * storage =
  (* TODO *)
  (([] : operation list), s)

let redeem_tokens (_p : redeem_tokens_param) (s : storage) :
    operation list * storage =
  (* TODO *)
  (([] : operation list), s)

let update_operation_ttl (operation_ttl : nat) (s : storage) =
  {s with operation_ttl}

let update_admin (admin : address) (s : storage) = {s with admin}

let update_fa2_token ((asset_id : asset_id), (fa2 : fa2_token)) (s : storage) =
  (* Check that the contract has the correct interface *)
  let () =
    if not (is_fa2_contract fa2.address) then
      (failwith "INVALID_FA2_CONTRACT" : unit)
  in
  {s with finp2p_assets = Big_map.add asset_id fa2 s.finp2p_assets}

(** This entry point removes expired operations (passed in argument) from the
    [live_operations] table *)
let cleanup (ops : operation_hash list) (s : storage) : storage =
  let live_operations =
    List.fold_left
      (fun ( (live_operations : (operation_hash, timestamp) big_map),
             (oph : operation_hash) ) ->
        match Big_map.find_opt oph live_operations with
        | None ->
            (* This operation is not known, ignore (don't fail) *)
            live_operations
        | Some op_timestamp ->
            if Tezos.now None > op_timestamp + int s.operation_ttl then
              (* Operation is expired, remove it because it cannot be relayed by
                 the proxy. No replay possible anymore. *)
              Big_map.remove oph live_operations
            else (* Operation is still live, ignore it *)
              live_operations)
      s.live_operations
      ops
  in
  {s with live_operations}

let finp2p_asset (p : finp2p_proxy_asset_param) (s : storage) :
    operation list * storage =
  match p with
  | Transfer_tokens p -> transfer_tokens p s
  | Issue_tokens p -> issue_tokens p s
  | Redeem_tokens p -> redeem_tokens p s

let finp2p_admin (p : finp2p_proxy_admin_param) (s : storage) :
    operation list * storage =
  let s =
    match p with
    | Update_operation_ttl p -> update_operation_ttl p s
    | Update_admin p -> update_admin p s
    | Update_fa2_token p -> update_fa2_token p s
  in
  (([] : operation list), s)

let main ((param, s) : finp2p_proxy_param * storage) : operation list * storage
    =
  match param with
  | Finp2p_asset _p ->
      let () = fail_not_admin s in
      (([] : operation list), s)
  | Finp2p_admin _p ->
      let () = fail_not_admin s in
      (([] : operation list), s)
  | Cleanup ops ->
      let s = cleanup ops s in
      (([] : operation list), s)
