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

(** Fails if the contract does not have the correct interface, i.e. the
    entry-points that we use in the proxy:
    - transfer
    - mint
    - burn
*)
let check_fa2_contract (addr : address) : unit =
  let _ = get_transfer_entrypoint addr in
  let _ = get_mint_entrypoint addr in
  let _ = get_burn_entrypoint addr in
  ()
