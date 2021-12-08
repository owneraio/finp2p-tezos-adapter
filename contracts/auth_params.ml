include Fa2_params

type authorizable_action =
  | Assets_action of fa2
  | Manage_action of manager
  | Admin_action
[@@comb] [@@param Authorize]

type auth_param = {
  sender : address;
  sender_is_operator : bool list list;
  fa2_address : address;
  action : authorizable_action;
}
[@@comb] [@@param Authorize]

type auth_storage = {
  auth_admin : address;
  auth_accredited : (address, bytes) big_map;
}
[@@param Store]

type auth_admin_param =
  | Add_accredited of (address * bytes)
  | Remove_accredited of address
  | Update_admin of address
  | Update_auth_logic of
      (auth_param * auth_storage -> operation list * auth_storage)
[@@param Auth_admin]

type auth_main_param =
  | Authorize of auth_param
  | Auth_admin of auth_admin_param
[@@entry Main]
