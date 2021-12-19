include Fa2_params

(* Storage *)

type ledger = (address * nat, nat) big_map [@@param Store]

type operators_storage = (address * (address * nat), unit) big_map
[@@param Store]

type operators_for_all_storage = (address * address, unit) big_map
[@@param Store]

type token_metadata_storage = (nat, nat * (string, bytes) map) big_map
[@@param Store]

type total_supply_storage = (nat, nat) big_map [@@param Store]

type storage = {
  auth_contract : address;
  paused : bool;
  ledger : ledger;
  operators : operators_storage;
  token_metadata : token_metadata_storage;
  total_supply : total_supply_storage;
  metadata : (string, bytes) big_map;
}
[@@comb]
