open Mligo
open List
include Fa2

let src = Test.nth_bootstrap_account 0
let other = Test.nth_bootstrap_account 1

let initial_storage : storage = {
  admin = src;
  pending_admin = (None : address option);
  paused = true;
  ledger = (Big_map.empty : ((nat * address), nat) big_map);
  operators = (Big_map.empty : operators_storage);
  operators_for_all = (Big_map.empty : operators_for_all_storage);
  next_token_id = 0n;
  token_metadata = (Big_map.empty : (nat, nat * (string, bytes) map) big_map);
  metadata = (Big_map.empty : (string, bytes) big_map)
}

let next_token_id (storage : storage) =
  storage.next_token_id

let test_mint =
  let () = Test.set_source src in
  let (taddr, _, _) = Test.originate main initial_storage 0t in
  let contr = Test.to_contract taddr in
  let storage = Test.get_storage taddr in
  let mi_owners = [ src, 10n; other, 10n ] in
  let mi_token_id = next_token_id storage in
  let quantity = List.fold (fun ((acc, (_, am)) : nat * (address * nat)) -> acc + am) mi_owners 0n in
  let mint_param = {
    mi_token_id;
    mi_token_info = (Map.empty : (string, bytes) map);
    mi_owners
  } in
  let () = Test.transfer_to_contract_exn contr (Manager (Mint_tokens mint_param) ) 0t in
  let storage = Test.get_storage taddr in
  let () = assert (next_token_id storage = mi_token_id + quantity) in
  let () = assert (Big_map.find_opt (3n, src) storage.ledger = Some 1n) in
  let () = assert (Big_map.find_opt (10n, src) storage.ledger = (None : nat option)) in
  storage
