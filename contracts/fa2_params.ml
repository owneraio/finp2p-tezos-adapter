include Utils

(* Fa2 *)

type balance_info = {balance : token_amount; on_hold : token_amount}

type transfer_destination = {
  tr_dst : address; [@key "to_"]
  tr_token_id : token_id;
  tr_amount : token_amount;
}
[@@comb] [@@param Transfer]

type transfer = {
  tr_src : address; [@key "from_"]
  tr_txs : transfer_destination list;
}
[@@comb] [@@param Transfer]

type balance_of_request = {ba_owner : address; ba_token_id : token_id} [@@comb]

type balance_of_response = {
  ba_request : balance_of_request;
  ba_balance : token_amount;
}
[@@comb]

type balance_of_param = {
  ba_requests : balance_of_request list;
  ba_callback : (balance_of_response list, unit) contract;
}
[@@comb]

type operator_param = {
  op_owner : address;
  op_operator : address;
  op_token_id : token_id;
}
[@@comb] [@@param Update_operators]

type operator_update =
  | Add_operator of operator_param
  | Remove_operator of operator_param
[@@param Update_operators]

type operator_update_for_all =
  | Add_operator_for_all of address
  | Remove_operator_for_all of address
[@@param Update_operators_all]

type hold = {
  ho_token_id : token_id;
  ho_amount : token_amount;
  ho_src : address;
  ho_dst : address option;
      (* TODO: we may want to remove ho_dst if never used in FA2 *)
}
[@@comb] [@@param Hold_tokens]
(* TODO: we may wanto to add an expiration date if we want to use it *)

type hold_param = {h_id : hold_id option; h_hold : hold}

type assets_params =
  | Transfer of transfer list
  | Balance_of of balance_of_param
  | Update_operators of operator_update list
  | Hold of hold_param
[@@entry Assets]

(* Manager *)

type mint_param = {
  mi_token_id : token_id;
  mi_token_info : (string, bytes) map option;
  mi_owners : (address * token_amount) list;
}
[@@comb] [@@param Mint_tokens]

type burn_param = {
  bu_token_id : token_id;
  bu_owners : (address * token_amount) list;
}
[@@comb] [@@param Burn_tokens]

type rollback_param = {
  rl_hold_id : hold_id;
  rl_amount : token_amount option;
  rl_token_id : token_id option;
  rl_src : address option;
}
[@@comb] [@@param Rollback]

type release_param = {
  e_hold_id : hold_id;
  e_amount : token_amount option;
  e_token_id : token_id option;
  e_src : address option;
  e_dst : address option;
}
[@@comb] [@@param Rollback]

type manager_params =
  | Mint of mint_param
  | Burn of burn_param
  | Rollback of rollback_param
  | Release of release_param
[@@entry Manager]

(* Admin *)

type update_token_metadata_param = {
  utm_token_id : token_id;
  utm_metadata : (string, bytes) map;
}
[@@comb] [@@param Update_token_metadata]

type admin_params =
  | Update_auth_contract of address
  | Pause of bool
  | Update_token_metadata of update_token_metadata_param
[@@entry Admin]

(* Main *)

type param =
  | Assets of assets_params
  | Admin of admin_params
  | Manager of manager_params
[@@entry Main]
