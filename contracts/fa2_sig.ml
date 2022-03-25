include Errors
include Fa2_params

let[@inline] get_transfer_entrypoint (addr : address) :
    (transfer list, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%transfer" addr
      : (transfer list, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (transfer list, _) contract)
  | Some c -> c

let[@inline] get_mint_entrypoint (addr : address) : (mint_param, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%mint" addr
      : (mint_param, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (mint_param, _) contract)
  | Some c -> c

let[@inline] get_burn_entrypoint (addr : address) : (burn_param, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%burn" addr
      : (burn_param, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (burn_param, _) contract)
  | Some c -> c

let[@inline] get_hold_entrypoint_opt (addr : address) :
    (hold_param, _) contract option =
  (Tezos.get_entrypoint_opt None "%hold" addr : (hold_param, _) contract option)

let[@inline] get_hold_entrypoint (addr : address) : (hold_param, _) contract =
  match get_hold_entrypoint_opt addr with
  | None -> (failwith invalid_fa2_contract : (hold_param, _) contract)
  | Some c -> c

let[@inline] get_rollback_entrypoint (addr : address) :
    (rollback_param, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%rollback" addr
      : (rollback_param, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (rollback_param, _) contract)
  | Some c -> c

let[@inline] get_release_entrypoint (addr : address) :
    (release_param, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%release" addr
      : (release_param, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (release_param, _) contract)
  | Some c -> c

(** Fails if the contract does not have at least the correct transfer
    entry-point *)
let[@inline] check_fa2_contract (addr : address) : unit =
  let _ = get_transfer_entrypoint addr in
  ()
