#if !FA2_PARAMS
#define FA2_PARAMS

type token_id =
  | Token_id of nat 

type token_amount =
  | Amount of nat 

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

type fa2 =
  | Transfer of transfer list 
  | Balance_of of balance_of_param 
  | Update_operators of operator_update list 

type mint_param = [@layout:comb]  {
    token_id: token_id ;
    token_info: (string, bytes) map option ;
    owners: (address * token_amount) list }

type burn_param = [@layout:comb]  {
    token_id: token_id ;
    owners: (address * token_amount) list }

type manager =
  | Mint of mint_param 
  | Burn of burn_param 

type update_token_metadata_param = [@layout:comb]  {
    token_id: token_id ;
    metadata: (string, bytes) map }

type admin =
  | Update_auth_contract of address 
  | Pause of bool 
  | Update_token_metadata of update_token_metadata_param 

type param =
  | Assets of fa2 
  | Admin of admin 
  | Manager of manager 

#endif