include Fa2_params

type auth_param = {
  sender : address;
  sender_is_operator : bool;
  fa2_address : address;
  parameters : param;
}
[@@comb] [@@param Authorize]

type update_accredited_param =
  | Add_accredited of (address * bytes)
  | Remove_accredited of address
[@@param Update_accredited]


type auth_main_param =
  | Authorize of auth_param
  | Update_accredited of update_accredited_param
[@@entry Main]
