#if !AUTH_PARAMS
#define AUTH_PARAMS

#include "fa2_params.mligo"
type authorizable_action = [@layout:comb] 
  | Assets_action of fa2 
  | Manage_action of manager 
  | Admin_action 

type auth_param = [@layout:comb]  {
    sender: address ;
    sender_is_operator: bool list list ;
    fa2_address: address ;
    action: authorizable_action }

type update_accredited_param =
  | Add_accredited of (address * bytes) 
  | Remove_accredited of address 

type auth_main_param =
  | Authorize of auth_param 
  | Update_accredited of update_accredited_param 

#endif