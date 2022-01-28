include Fa2_params

(* Storage *)

type ledger = (address * token_id, token_amount) big_map [@@param Store]

type operators_storage = (address * (address * token_id), unit) big_map
[@@param Store]

type operators_for_all_storage = (address * address, unit) big_map
[@@param Store]

type token_metadata_storage = (token_id, token_id * (string, bytes) map) big_map
[@@param Store]

type total_supply_storage = (token_id, token_amount) big_map [@@param Store]

type storage = {
  auth_contract : address;
  paused : bool;
  ledger : ledger;
  operators : operators_storage;
  token_metadata : token_metadata_storage;
  total_supply : total_supply_storage;
  max_token_id : nat;
  metadata : (string, bytes) big_map;
}
[@@comb]
