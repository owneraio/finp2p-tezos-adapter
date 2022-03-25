include Fa2_params

type fa2_token = {address : address; id : token_id} [@@comb]

type operation_hash = OpHash of bytes (* 32 *)

type asset_id = Asset_id of bytes

type finp2p_hold_id = Finp2p_hold_id of bytes

type opaque = Opaque of bytes

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

type hold_ahg = {
  ahg_nonce : finp2p_nonce;
  ahg_asset_id : asset_id;
  ahg_src_account : key;
  ahg_dst_account : key;
  ahg_amount : opaque;
}
[@@comb]

type supported_hold_dst = FinId of key | Tezos of key_hash [@@comb]

type hold_dst = Supported of supported_hold_dst | Other of opaque [@@comb]

type hold_shg = {
  shg_asset_type : string;
  shg_asset_id : asset_id;
  shg_src_account_type : opaque;
  shg_src_account : opaque;
  shg_dst_account_type : string option;
  shg_dst_account : hold_dst option;
  shg_amount : token_amount;
  shg_expiration : nat; (* timespan in seconds *)
}
[@@comb]

type hold_tokens_param = {
  ht_hold_id : finp2p_hold_id;
  ht_ahg : hold_ahg;
  ht_shg : hold_shg;
  ht_signature : signature option;
}
[@@comb] [@@param Hold_tokens]

type release_hold_param = {
  eh_hold_id : finp2p_hold_id;
  eh_asset_id : asset_id option;
  eh_amount : token_amount option;
  eh_src_account : key option;
  eh_dst : hold_dst option;
}
[@@comb] [@@param Release_hold]

type rollback_hold_param = {
  rh_hold_id : finp2p_hold_id;
  rh_asset_id : asset_id option;
  rh_amount : token_amount option;
  rh_src_account : key option;
}
[@@comb] [@@param Rollback_hold]

type finp2p_proxy_asset_param =
  | Transfer_tokens of transfer_tokens_param
  | Create_asset of create_asset_param
  | Issue_tokens of issue_tokens_param
  | Redeem_tokens of redeem_tokens_param
  | Release_hold of release_hold_param
  | Rollback_hold of rollback_hold_param
[@@param Finp2p_asset]

type update_fa2_token_param = asset_id * fa2_token [@@param Update_fa2_token]

type operation_ttl = {
  ttl : nat; (* in seconds *)
  allowed_in_the_future : nat; (* in seconds *)
}
[@@comb] [@@param Update_operation_ttl]

type register_external_param = key * fa2_token * address option
[@@param Register_external_address]

type fa2_transfer_param = {
  ftr_token : fa2_token;
  ftr_dst : address;
  ftr_amount : token_amount;
}
[@@comb] [@@param Register_external_address]

type finp2p_proxy_admin_param =
  | Update_operation_ttl of operation_ttl
  | Update_admins of address set
  | Add_admins of address list
  | Remove_admins of address list
  | Update_fa2_token of update_fa2_token_param
  | Register_external_address of register_external_param
  | Fa2_transfer of fa2_transfer_param
[@@param Finp2p_asset]

type finp2p_public_param =
  | Cleanup of operation_hash list
  | Hold_tokens of hold_tokens_param
[@@param Finp2p_public]

type finp2p_proxy_param =
  | Finp2p_asset of finp2p_proxy_asset_param
  | Finp2p_batch_asset of finp2p_proxy_asset_param list
  | Finp2p_admin of finp2p_proxy_admin_param
  | Finp2p_public of finp2p_public_param
[@@param Main]

type fa2_native_hold_info = {
  fa2_hold_id : hold_id;
  held_token : fa2_token;
  fa2_fallback_dst : key;
}

type escrow_hold_info = {
  es_held_token : fa2_token;
  es_amount : token_amount;
  es_src_account : key;
  es_dst : supported_hold_dst option;
  es_fallback_dst : key;
}
[@@comb]

type hold_info = FA2_hold of fa2_native_hold_info | Escrow of escrow_hold_info

type storage = {
  operation_ttl : operation_ttl;
  live_operations : (operation_hash, timestamp) big_map;
  finp2p_assets : (asset_id, fa2_token) big_map;
  admins : address set;
  external_addresses : (key * fa2_token, address) big_map;
  next_token_ids : (address, token_id) big_map;
  holds : (finp2p_hold_id, hold_info) big_map;
  escrow_totals : (key * fa2_token, token_amount) big_map;
}
[@@comb] [@@store]
