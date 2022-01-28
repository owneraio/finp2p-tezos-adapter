#if !FA2_TYPES
#define FA2_TYPES

#include "fa2_params.mligo"
type ledger = ((address * token_id), token_amount) big_map

type operators_storage = ((address * (address * token_id)), unit) big_map

type operators_for_all_storage = ((address * address), unit) big_map

type token_metadata_storage =
  (token_id, (token_id * (string, bytes) map)) big_map

type total_supply_storage = (token_id, token_amount) big_map

type storage = [@layout:comb]  {
    auth_contract: address ;
    paused: bool ;
    ledger: ledger ;
    operators: operators_storage ;
    token_metadata: token_metadata_storage ;
    total_supply: total_supply_storage ;
    max_token_id: token_id ;
    metadata: (string, bytes) big_map }



#endif