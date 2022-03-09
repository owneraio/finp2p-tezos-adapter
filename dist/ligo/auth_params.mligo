#if !AUTH_PARAMS
#define AUTH_PARAMS

#include "fa2_params.mligo"
type authorizable_action = [@layout:comb] 
  | Assets_action of assets_params 
  | Manage_action of manager_params 
  | Admin_action 

type auth_param = [@layout:comb]  {
    sender: address ;
    sender_is_operator: bool list list ;
    fa2_address: address ;
    action: authorizable_action }

type auth_storage = [@layout:comb]  {
  admin: address ;
  accredited: (address, bytes) big_map }

type auth_admin_param =
  | Add_accredited of (address * bytes) 
  | Remove_accredited of address 
  | Update_admin of address 
  | Update_auth_logic of
      ((auth_param * auth_storage) -> (operation list * auth_storage)) 

type auth_main_param =
  | Authorize of auth_param 
  | Auth_admin of auth_admin_param 

#endif