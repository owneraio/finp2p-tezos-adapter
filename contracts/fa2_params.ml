(* Fa2 *)

type token_id = Token_id of nat

type token_amount = Amount of nat

let[@inline] nat_amount (a : token_amount) : nat = match a with Amount a -> a

let[@inline] add_amount (a1 : token_amount) (a2 : token_amount) : token_amount =
  Amount (nat_amount a1 + nat_amount a2)

let[@inline] sub_amount (a1 : token_amount) (a2 : token_amount) :
    token_amount option =
  match is_nat (nat_amount a1 - nat_amount a2) with
  | None -> None
  | Some n -> Some (Amount n)

let[@inline] nat_token_id (i : token_id) : nat = match i with Token_id i -> i

let[@inline] succ_token_id (i : token_id) : token_id =
  match i with Token_id i -> Token_id (i + 1n)

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

type manager = Mint of mint_param | Burn of burn_param [@@entry Tokens]

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
