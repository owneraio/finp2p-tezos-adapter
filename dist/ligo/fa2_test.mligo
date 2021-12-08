#if !FA2_TEST
#define FA2_TEST

#include "fa2.mligo"
let src  =
  Test.nth_bootstrap_account 0

let other  =
  Test.nth_bootstrap_account 1

let initial_storage  : storage =
  {
    auth_contract = src;
    pending_admin = (None : address option);
    paused = true;
    ledger = (Big_map.empty : ((nat * address), nat) big_map);
    operators = (Big_map.empty : operators_storage);
    token_metadata =
      (Big_map.empty : (nat, (nat * (string, bytes) map)) big_map);
    metadata = (Big_map.empty : (string, bytes) big_map)
  }

let test_mint  =
  let () = Test.set_source src in
  let (taddr, _, _) = Test.originate main initial_storage 0tez in
  let contr = Test.to_contract taddr in
  let mi_owners = [(src, 10n); (other, 10n)] in
  let mint_param =
    {
      token_id = 12318n;
      token_info = (Some (Map.empty : (string, bytes) map));
      owners = mi_owners 
    } in
  let () = Test.transfer_to_contract_exn contr (Manager (Mint mint_param)) 0tez in
  let storage = Test.get_storage taddr in
  let () =
    assert ((Big_map.find_opt (12318n, src) storage.ledger) = (Some 10n)) in
  let () =
    assert ((Big_map.find_opt (10n, src) storage.ledger) = (None : nat option)) in
  storage

#endif