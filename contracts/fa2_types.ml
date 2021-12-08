include Fa2_params

(* Storage *)

type ledger = (nat * address, nat) big_map [@@param Store]
type operators_storage = ((address * (address * nat)), unit) big_map [@@param Store]
type operators_for_all_storage = ((address * address), unit) big_map [@@param Store]
type token_metadata_storage = (nat, nat * (string, bytes) map) big_map [@@param Store]

type storage = {
  auth_contract : address;
  pending_admin : address option;
  paused : bool;
  ledger : ledger;
  operators : operators_storage;
  operators_for_all : operators_for_all_storage; (* FIXME remove *)
  token_metadata : token_metadata_storage;
  next_token_id : nat;
  metadata : (string, bytes) big_map;
} [@@store]
