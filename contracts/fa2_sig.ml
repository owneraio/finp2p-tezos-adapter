include Fa2_params

(** Returns [true] if the contract has the correct interface, i.e. the
    entry-points that we use in the proxy:
    - transfer
    - mint
    - burn
*)
let is_fa2_contract (addr : address) : bool =
  match
    (Tezos.get_entrypoint_opt None "%transfer" addr
      : (transfer list, _) contract option)
  with
  | None -> false
  | Some _ -> (
      match
        (Tezos.get_entrypoint_opt None "%mint" addr
          : (mint_param, _) contract option)
      with
      | None -> false
      | Some _ -> (
          match
            (Tezos.get_entrypoint_opt None "%burn" addr
              : (burn_param, _) contract option)
          with
          | None -> false
          | Some _ -> true))
