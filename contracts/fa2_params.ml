(* Fa2 *)

type transfer_destination = {
  tr_dst : address; [@key "to_"]
  tr_token_id : nat;
  tr_amount : nat;
}
[@@comb] [@@param Transfer]

type transfer = {
  tr_src : address; [@key "from_"]
  tr_txs : transfer_destination list;
}
[@@comb] [@@param Transfer]

type balance_of_request = {ba_owner : address; ba_token_id : nat} [@@comb]

type balance_of_response = {ba_request : balance_of_request; ba_balance : nat}
[@@comb]

type balance_of_param = {
  ba_requests : balance_of_request list;
  ba_callback : (balance_of_response list, unit) contract;
}
[@@comb]

type operator_param = {
  op_owner : address;
  op_operator : address;
  op_token_id : nat;
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
  mi_token_id : nat;
  mi_token_info : (string, bytes) map option;
  mi_owners : (address * nat) list;
}
[@@comb] [@@param Mint_tokens]

type burn_param = {bu_token_id : nat; bu_owners : (address * nat) list}
[@@comb] [@@param Burn_tokens]

type manager = Mint of mint_param | Burn of burn_param [@@entry Tokens]

(* Admin *)

type admin = Update_auth_contract of address | Pause of bool [@@entry Admin]

(* Main *)

type param = Assets of fa2 | Admin of admin | Manager of manager
[@@entry Main]
