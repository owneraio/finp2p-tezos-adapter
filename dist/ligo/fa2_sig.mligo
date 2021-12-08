#if !FA2_SIG
#define FA2_SIG

#include "errors.mligo"
#include "fa2_params.mligo"
let get_transfer_entrypoint (addr : address) : transfer list contract =
  match (Tezos.get_entrypoint_opt "%transfer" addr : transfer list contract
             option)
  with
  | None -> (failwith invalid_fa2_contract : transfer list contract)
  | Some c -> c

let get_mint_entrypoint (addr : address) : mint_param contract =
  match (Tezos.get_entrypoint_opt "%mint" addr : mint_param contract option)
  with
  | None -> (failwith invalid_fa2_contract : mint_param contract)
  | Some c -> c

let get_burn_entrypoint (addr : address) : burn_param contract =
  match (Tezos.get_entrypoint_opt "%burn" addr : burn_param contract option)
  with
  | None -> (failwith invalid_fa2_contract : burn_param contract)
  | Some c -> c

let check_fa2_contract (addr : address) : unit =
  let _ = get_transfer_entrypoint addr in
  let _ = get_mint_entrypoint addr in let _ = get_burn_entrypoint addr in ()

#endif