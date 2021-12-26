#if !FA2_TYPES
#define FA2_TYPES

#include "fa2_params.mligo"
type ledger = ((address * nat), nat) big_map

type operators_storage = ((address * (address * nat)), unit) big_map

type operators_for_all_storage = ((address * address), unit) big_map

type token_metadata_storage = (nat, (nat * (string, bytes) map)) big_map

type total_supply_storage = (nat, nat) big_map

type storage = [@layout:comb]  {
    auth_contract: address ;
    paused: bool ;
    ledger: ledger ;
    operators: operators_storage ;
    token_metadata: token_metadata_storage ;
    total_supply: total_supply_storage ;
    max_token_id: nat ;
    metadata: (string, bytes) big_map }



#endif