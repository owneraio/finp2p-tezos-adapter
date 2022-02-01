#if !FA2_PARAMS
#define FA2_PARAMS

#include "utils.mligo"
type balance_info = {
  balance: token_amount ;
  on_hold: token_amount }

type transfer_destination = [@layout:comb]  {
    to_: address ;
    token_id: token_id ;
    amount: token_amount }

type transfer = [@layout:comb]  {
  from_: address ;
  txs: transfer_destination list }

type balance_of_request = [@layout:comb]  {
  owner: address ;
  token_id: token_id }

type balance_of_response = [@layout:comb]  {
    request: balance_of_request ;
    balance: token_amount }

type balance_of_param = [@layout:comb]  {
    requests: balance_of_request list ;
    callback: balance_of_response list contract }

type operator_param = [@layout:comb]  {
    owner: address ;
    operator: address ;
    token_id: token_id }

type operator_update =
  | Add_operator of operator_param 
  | Remove_operator of operator_param 

type operator_update_for_all =
  | Add_operator_for_all of address 
  | Remove_operator_for_all of address 

type hold = [@layout:comb]  {
    token_id: token_id ;
    amount: token_amount ;
    src: address ;
    dst: address option }

type hold_param = {
  id: hold_id option ;
  hold: hold }

type assets_params =
  | Transfer of transfer list 
  | Balance_of of balance_of_param 
  | Update_operators of operator_update list 
  | Hold of hold_param 

type mint_param = [@layout:comb]  {
    token_id: token_id ;
    token_info: (string, bytes) map option ;
    owners: (address * token_amount) list }

type burn_param = [@layout:comb]  {
    token_id: token_id ;
    owners: (address * token_amount) list }

type release_param = [@layout:comb]  {
    hold_id: hold_id ;
    amount: token_amount option ;
    token_id: token_id option ;
    src: address option }

type execute_param = [@layout:comb]  {
    hold_id: hold_id ;
    amount: token_amount option ;
    token_id: token_id option ;
    src: address option ;
    dst: address option }

type manager_params =
  | Mint of mint_param 
  | Burn of burn_param 
  | Release of release_param 
  | Execute of execute_param 

type update_token_metadata_param = [@layout:comb]  {
    token_id: token_id ;
    metadata: (string, bytes) map }

type admin_params =
  | Update_auth_contract of address 
  | Pause of bool 
  | Update_token_metadata of update_token_metadata_param 

type param =
  | Assets of assets_params 
  | Admin of admin_params 
  | Manager of manager_params 

#endif