#if !FA2_TYPES
#define FA2_TYPES

#include "fa2_params.mligo"
type ledger = ((nat * address), nat) big_map

type operators_storage = ((address * (address * nat)), unit) big_map

type operators_for_all_storage = ((address * address), unit) big_map

type token_metadata_storage = (nat, (nat * (string, bytes) map)) big_map

type storage =
  {
    auth_contract: address ;
    pending_admin: address option ;
    paused: bool ;
    ledger: ledger ;
    operators: operators_storage ;
    token_metadata: token_metadata_storage ;
    metadata: (string, bytes) big_map }

#endif