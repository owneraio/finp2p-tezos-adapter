include Errors
include Finp2p_proxy_types

let main ((param, s) : finp2p_proxy_param * storage) : operation list * storage
    =
  match param with
  | Finp2p_asset _p -> (([] : operation list), s)
  | Finp2p_admin _p -> (([] : operation list), s)
  | Cleanup _ops -> (([] : operation list), s)
