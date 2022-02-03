include Fa2_params

type fa2_token = {address : address; id : token_id} [@@comb]

type operation_hash = OpHash of bytes (* 32 *)

type asset_id = Asset_id of bytes

type finp2p_hold_id = Finp2p_hold_id of bytes

type finp2p_nonce = {nonce : bytes; (* 24 *) timestamp : timestamp} [@@comb]

type token_metadata = (string, bytes) map

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

type create_fa2_token = {ca_address : address; ca_id : token_id option} [@@comb]

type create_asset_param = {
  ca_asset_id : asset_id;
  ca_new_token_info : create_fa2_token * token_metadata;
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

type hold_tokens_param = {
  ht_hold_id : finp2p_hold_id;
  ht_asset_id : asset_id;
  ht_amount : token_amount;
  ht_src_account : key;
  ht_dst_account : key option;
  ht_expiration : timestamp;
  ht_nonce : finp2p_nonce;
  ht_ahg_wo_nonce : bytes;
  ht_signature : signature;
}
[@@comb] [@@param Hold_tokens]

type execute_hold_param = {
  eh_hold_id : finp2p_hold_id;
  eh_asset_id : asset_id option;
  eh_amount : token_amount option;
  eh_src_account : key option;
  eh_dst_account : key option;
}
[@@comb] [@@param Execute_hold]

type release_hold_param = {
  rh_hold_id : finp2p_hold_id;
  rh_asset_id : asset_id option;
  rh_amount : token_amount option;
  rh_src_account : key option;
}
[@@comb] [@@param Release_hold]

type finp2p_proxy_asset_param =
  | Transfer_tokens of transfer_tokens_param
  | Create_asset of create_asset_param
  | Issue_tokens of issue_tokens_param
  | Redeem_tokens of redeem_tokens_param
  | Hold_tokens of hold_tokens_param
  | Execute_hold of execute_hold_param
  | Release_hold of release_hold_param
[@@param Finp2p_asset]

type update_fa2_token_param = asset_id * fa2_token [@@param Update_fa2_token]

type operation_ttl = {ttl : nat; allowed_in_the_future : nat}
[@@comb] [@@param Update_operation_ttl]

type finp2p_proxy_admin_param =
  | Update_operation_ttl of operation_ttl
  | Update_admins of address set
  | Add_admins of address list
  | Remove_admins of address list
  | Update_fa2_token of update_fa2_token_param
[@@param Finp2p_asset]

type finp2p_proxy_param =
  | Finp2p_asset of finp2p_proxy_asset_param
  | Finp2p_batch_asset of finp2p_proxy_asset_param list
  | Finp2p_admin of finp2p_proxy_admin_param
  | Cleanup of operation_hash list
[@@param Main]

type hold_info = {fa2_hold_id : hold_id; held_token : fa2_token}

type storage = {
  operation_ttl : operation_ttl;
  (* in seconds *)
  live_operations : (operation_hash, timestamp) big_map;
  finp2p_assets : (asset_id, fa2_token) big_map;
  admins : address set;
  next_token_ids : (address, token_id) big_map;
  holds : (finp2p_hold_id, hold_info) big_map;
}
[@@comb] [@@store]
