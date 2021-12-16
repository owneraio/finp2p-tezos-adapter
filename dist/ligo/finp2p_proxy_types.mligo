#if !FINP2P_PROXY_TYPES
#define FINP2P_PROXY_TYPES

type fa2_token = [@layout:comb]  {
  address: address ;
  id: nat }

type operation_hash =
  | OpHash of bytes 

type asset_id =
  | Asset_id of bytes 

type finp2p_nonce = [@layout:comb]  {
  nonce: bytes ;
  timestamp: timestamp }

type token_amount =
  | Amount of nat 

type transfer_tokens_param = [@layout:comb]  {
    nonce: finp2p_nonce ;
    asset_id: asset_id ;
    src_account: key ;
    dst_account: key ;
    amount: token_amount ;
    shg: bytes ;
    signature: signature }

type issue_tokens_param = [@layout:comb]  {
    nonce: finp2p_nonce ;
    asset_id: asset_id ;
    dst_account: key ;
    amount: token_amount ;
    shg: bytes ;
    signature: signature option ;
    new_token_info: (fa2_token * (string, bytes) map) option }

type redeem_tokens_param = [@layout:comb]  {
    nonce: finp2p_nonce ;
    asset_id: asset_id ;
    src_account: key ;
    amount: token_amount ;
    signature: signature }

type finp2p_proxy_asset_param =
  | Transfer_tokens of transfer_tokens_param 
  | Issue_tokens of issue_tokens_param 
  | Redeem_tokens of redeem_tokens_param 

type update_fa2_token_param = (asset_id * fa2_token)

type finp2p_proxy_admin_param =
  | Update_operation_ttl of nat 
  | Update_admin of address 
  | Update_fa2_token of update_fa2_token_param 

type finp2p_proxy_param =
  | Finp2p_asset of finp2p_proxy_asset_param 
  | Finp2p_batch_asset of finp2p_proxy_asset_param list 
  | Finp2p_admin of finp2p_proxy_admin_param 
  | Cleanup of operation_hash list 

type storage =
  {
    operation_ttl: nat ;
    live_operations: (operation_hash, timestamp) big_map ;
    finp2p_assets: (asset_id, fa2_token) big_map ;
    admin: address }

#endif