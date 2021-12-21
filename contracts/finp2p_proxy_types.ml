type fa2_token = {address : address; id : nat} [@@comb]

type operation_hash = OpHash of bytes (* 32 *)

type asset_id = Asset_id of bytes

type finp2p_nonce = {nonce : bytes; (* 24 *) timestamp : timestamp} [@@comb]

type token_amount = Amount of nat

type transfer_tokens_param = {
  tt_nonce : finp2p_nonce;
  tt_asset_id : asset_id;
  tt_src_account : key;
  tt_dst_account : key;
  tt_amount : token_amount;
  tt_shg : bytes;
  (* 32 *)
  tt_signature : signature;
}
[@@comb] [@@param Transfer_tokens]

type create_asset_param = {
  ca_asset_id : asset_id;
  ca_new_token_info : fa2_token * (string, bytes) map;
}
[@@comb] [@@param Create_asset]

type issue_tokens_param = {
  it_nonce : finp2p_nonce;
  it_asset_id : asset_id;
  it_dst_account : key;
  it_amount : token_amount;
  it_shg : bytes;
  (* 32 *)
  it_signature : signature option;
}
[@@comb] [@@param Issue_tokens]

type redeem_tokens_param = {
  rt_nonce : finp2p_nonce;
  rt_asset_id : asset_id;
  rt_src_account : key;
  rt_amount : token_amount;
  rt_signature : signature;
}
[@@comb] [@@param Redeem_tokens]

type finp2p_proxy_asset_param =
  | Transfer_tokens of transfer_tokens_param
  | Create_asset of create_asset_param
  | Issue_tokens of issue_tokens_param
  | Redeem_tokens of redeem_tokens_param
[@@param Finp2p_asset]

type update_fa2_token_param = asset_id * fa2_token [@@param Update_fa2_token]

type operation_ttl = {ttl : nat; allowed_in_the_future : nat}
[@@comb] [@@param Update_operation_ttl]

type finp2p_proxy_admin_param =
  | Update_operation_ttl of operation_ttl
  | Update_admin of address
  | Update_fa2_token of update_fa2_token_param
[@@param Finp2p_asset]

type finp2p_proxy_param =
  | Finp2p_asset of finp2p_proxy_asset_param
  | Finp2p_batch_asset of finp2p_proxy_asset_param list
  | Finp2p_admin of finp2p_proxy_admin_param
  | Cleanup of operation_hash list
[@@param Main]

type storage = {
  operation_ttl : operation_ttl;
  (* in seconds *)
  live_operations : (operation_hash, timestamp) big_map;
  finp2p_assets : (asset_id, fa2_token) big_map;
  admin : address;
}
[@@comb] [@@store]
