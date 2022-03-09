#if !FINP2P_PROXY_TYPES
#define FINP2P_PROXY_TYPES

#include "fa2_params.mligo"
type fa2_token = [@layout:comb]  {
  address: address ;
  id: token_id }

type operation_hash =
  | OpHash of bytes 

type asset_id =
  | Asset_id of bytes 

type finp2p_nonce = [@layout:comb]  {
  nonce: bytes ;
  timestamp: timestamp }

type token_metadata = (string, bytes) map

type transfer_tokens_param = [@layout:comb]  {
    nonce: finp2p_nonce ;
    asset_id: asset_id ;
    src_account: key ;
    dst_account: key ;
    amount: token_amount ;
    shg: bytes ;
    signature: signature }

type create_fa2_token = [@layout:comb]  {
  address: address ;
  id: token_id option }

type create_asset_param = [@layout:comb]  {
    asset_id: asset_id ;
    new_token_info: (create_fa2_token * token_metadata) }

type issue_tokens_param = [@layout:comb]  {
    nonce: finp2p_nonce ;
    asset_id: asset_id ;
    dst_account: key ;
    amount: token_amount ;
    shg: bytes ;
    signature: signature option }

type redeem_tokens_param = [@layout:comb]  {
    nonce: finp2p_nonce ;
    asset_id: asset_id ;
    src_account: key ;
    amount: token_amount ;
    signature: signature }

type finp2p_proxy_asset_param =
  | Transfer_tokens of transfer_tokens_param 
  | Create_asset of create_asset_param 
  | Issue_tokens of issue_tokens_param 
  | Redeem_tokens of redeem_tokens_param 

type update_fa2_token_param = (asset_id * fa2_token)

type operation_ttl = [@layout:comb]  {
  ttl: nat ;
  allowed_in_the_future: nat }

type finp2p_proxy_admin_param =
  | Update_operation_ttl of operation_ttl 
  | Update_admins of address set 
  | Add_admins of address list 
  | Remove_admins of address list 
  | Update_fa2_token of update_fa2_token_param 

type finp2p_proxy_param =
  | Finp2p_asset of finp2p_proxy_asset_param 
  | Finp2p_batch_asset of finp2p_proxy_asset_param list 
  | Finp2p_admin of finp2p_proxy_admin_param 
  | Cleanup of operation_hash list 

type storage = [@layout:comb]  {
    operation_ttl: operation_ttl ;
    live_operations: (operation_hash, timestamp) big_map ;
    finp2p_assets: (asset_id, fa2_token) big_map ;
    admins: address set ;
    next_token_ids: (address, token_id) big_map }



#endif