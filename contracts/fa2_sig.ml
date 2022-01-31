include Errors
include Fa2_params

let get_transfer_entrypoint (addr : address) : (transfer list, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%transfer" addr
      : (transfer list, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (transfer list, _) contract)
  | Some c -> c

let get_mint_entrypoint (addr : address) : (mint_param, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%mint" addr
      : (mint_param, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (mint_param, _) contract)
  | Some c -> c

let get_burn_entrypoint (addr : address) : (burn_param, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%burn" addr
      : (burn_param, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (burn_param, _) contract)
  | Some c -> c

let get_hold_entrypoint (addr : address) : (hold, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%hold" addr : (hold, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (hold, _) contract)
  | Some c -> c

let get_release_entrypoint (addr : address) : (hold_id, _) contract =
  match
    (Tezos.get_entrypoint_opt None "%release" addr
      : (hold_id, _) contract option)
  with
  | None -> (failwith invalid_fa2_contract : (hold_id, _) contract)
  | Some c -> c

(** Fails if the contract does not have at least the correct transfer
    entry-point *)
let check_fa2_contract (addr : address) : unit =
  let _ = get_transfer_entrypoint addr in
  ()
