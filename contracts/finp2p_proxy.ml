include Errors
include Finp2p_proxy_types

let fail_not_admin (s : storage) =
  if not (Tezos.sender None = s.admin) then (failwith unauthorized : unit)

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

let main ((param, s) : finp2p_proxy_param * storage) : operation list * storage
    =
  match param with
  | Finp2p_asset _p -> (([] : operation list), s)
  | Finp2p_admin _p -> (([] : operation list), s)
  | Cleanup ops ->
      let s = cleanup ops s in
      (([] : operation list), s)
