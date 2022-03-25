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

type finp2p_hold_id =
  | Finp2p_hold_id of bytes 

type opaque =
  | Opaque of bytes 

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

type hold_ahg = [@layout:comb]  {
    nonce: finp2p_nonce ;
    asset_id: asset_id ;
    src_account: key ;
    dst_account: key ;
    amount: opaque }

type supported_hold_dst = [@layout:comb] 
  | FinId of key 
  | Tezos of key_hash 

type hold_dst = [@layout:comb] 
  | Supported of supported_hold_dst 
  | Other of opaque 

type hold_shg = [@layout:comb]  {
    asset_type: string ;
    asset_id: asset_id ;
    src_account_type: opaque ;
    src_account: opaque ;
    dst_account_type: string option ;
    dst_account: hold_dst option ;
    amount: token_amount ;
    expiration: nat }

type hold_tokens_param = [@layout:comb]  {
    hold_id: finp2p_hold_id ;
    ahg: hold_ahg ;
    shg: hold_shg ;
    signature: signature option }

type release_hold_param = [@layout:comb]  {
    hold_id: finp2p_hold_id ;
    asset_id: asset_id option ;
    amount: token_amount option ;
    src_account: key option ;
    dst: hold_dst option }

type rollback_hold_param = [@layout:comb]  {
    hold_id: finp2p_hold_id ;
    asset_id: asset_id option ;
    amount: token_amount option ;
    src_account: key option }

type finp2p_proxy_asset_param =
  | Transfer_tokens of transfer_tokens_param 
  | Create_asset of create_asset_param 
  | Issue_tokens of issue_tokens_param 
  | Redeem_tokens of redeem_tokens_param 
  | Release_hold of release_hold_param 
  | Rollback_hold of rollback_hold_param 

type update_fa2_token_param = (asset_id * fa2_token)

type operation_ttl = [@layout:comb]  {
  ttl: nat ;
  allowed_in_the_future: nat }

type register_external_param = (key * fa2_token * address option)

type fa2_transfer_param = [@layout:comb]  {
    token: fa2_token ;
    dst: address ;
    amount: token_amount }

type finp2p_proxy_admin_param =
  | Update_operation_ttl of operation_ttl 
  | Update_admins of address set 
  | Add_admins of address list 
  | Remove_admins of address list 
  | Update_fa2_token of update_fa2_token_param 
  | Register_external_address of register_external_param 
  | Fa2_transfer of fa2_transfer_param 

type finp2p_public_param =
  | Cleanup of operation_hash list 
  | Hold_tokens of hold_tokens_param 

type finp2p_proxy_param =
  | Finp2p_asset of finp2p_proxy_asset_param 
  | Finp2p_batch_asset of finp2p_proxy_asset_param list 
  | Finp2p_admin of finp2p_proxy_admin_param 
  | Finp2p_public of finp2p_public_param 

type fa2_native_hold_info =
  {
    fa2_hold_id: hold_id ;
    held_token: fa2_token ;
    fa2_fallback_dst: key }

type escrow_hold_info = [@layout:comb]  {
    held_token: fa2_token ;
    amount: token_amount ;
    src_account: key ;
    dst: supported_hold_dst option ;
    fallback_dst: key }

type hold_info =
  | FA2_hold of fa2_native_hold_info 
  | Escrow of escrow_hold_info 

type storage = [@layout:comb]  {
    operation_ttl: operation_ttl ;
    live_operations: (operation_hash, timestamp) big_map ;
    finp2p_assets: (asset_id, fa2_token) big_map ;
    admins: address set ;
    external_addresses: ((key * fa2_token), address) big_map ;
    next_token_ids: (address, token_id) big_map ;
    holds: (finp2p_hold_id, hold_info) big_map ;
    escrow_totals: ((key * fa2_token), token_amount) big_map }



#endif