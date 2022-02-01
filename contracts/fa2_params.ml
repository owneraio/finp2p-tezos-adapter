include Utils

(* Fa2 *)

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

type fa2 =
  | Transfer of transfer list
  | Balance_of of balance_of_param
  | Update_operators of operator_update list
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

type hold = {
  ho_hold_id : hold_id;
  ho_token_id : token_id;
  ho_amount : token_amount;
  ho_src : address;
  ho_dst : address option;
}
[@@comb] [@@param Hold_tokens]

type manager =
  | Mint of mint_param
  | Burn of burn_param
  | Hold of hold
  | Release of hold_id
[@@entry Manager]

(* Admin *)

type update_token_metadata_param = {
  utm_token_id : token_id;
  utm_metadata : (string, bytes) map;
}
[@@comb] [@@param Update_token_metadata]

type admin =
  | Update_auth_contract of address
  | Pause of bool
  | Update_token_metadata of update_token_metadata_param
[@@entry Admin]

(* Main *)

type param = Assets of fa2 | Admin of admin | Manager of manager
[@@entry Main]
