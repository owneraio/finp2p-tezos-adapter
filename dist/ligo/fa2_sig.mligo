#if !FA2_SIG
#define FA2_SIG

#include "errors.mligo"
#include "fa2_params.mligo"
[@inline]
let get_transfer_entrypoint (addr : address) : transfer list contract =
  match (Tezos.get_entrypoint_opt "%transfer" addr : transfer list contract
             option)
  with
  | None -> (failwith invalid_fa2_contract : transfer list contract)
  | Some c -> c


[@inline]
let get_mint_entrypoint (addr : address) : mint_param contract =
  match (Tezos.get_entrypoint_opt "%mint" addr : mint_param contract option)
  with
  | None -> (failwith invalid_fa2_contract : mint_param contract)
  | Some c -> c


[@inline]
let get_burn_entrypoint (addr : address) : burn_param contract =
  match (Tezos.get_entrypoint_opt "%burn" addr : burn_param contract option)
  with
  | None -> (failwith invalid_fa2_contract : burn_param contract)
  | Some c -> c


[@inline]
let get_hold_entrypoint_opt (addr : address) : hold_param contract option =
  (Tezos.get_entrypoint_opt "%hold" addr : hold_param contract option)


[@inline]
let get_hold_entrypoint (addr : address) : hold_param contract =
  match get_hold_entrypoint_opt addr with
  | None -> (failwith invalid_fa2_contract : hold_param contract)
  | Some c -> c


[@inline]
let get_release_entrypoint (addr : address) : release_param contract =
  match (Tezos.get_entrypoint_opt "%release" addr : release_param contract
             option)
  with
  | None -> (failwith invalid_fa2_contract : release_param contract)
  | Some c -> c


[@inline]
let get_execute_entrypoint (addr : address) : execute_param contract =
  match (Tezos.get_entrypoint_opt "%execute" addr : execute_param contract
             option)
  with
  | None -> (failwith invalid_fa2_contract : execute_param contract)
  | Some c -> c


[@inline]
let check_fa2_contract (addr : address) : unit =
  let _ = get_transfer_entrypoint addr in ()

#endif