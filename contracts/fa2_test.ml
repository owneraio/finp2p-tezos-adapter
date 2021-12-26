open Mligo
open List
include Fa2

let src = Test.nth_bootstrap_account 0

let other = Test.nth_bootstrap_account 1

let initial_storage : storage =
  {
    auth_contract = src;
    (* TODO deploy auth *)
    paused = true;
    ledger = (Big_map.empty : ledger);
    operators = (Big_map.empty : operators_storage);
    token_metadata = (Big_map.empty : token_metadata_storage);
    total_supply = (Big_map.empty : total_supply_storage);
    max_token_id = 0n;
    metadata = (Big_map.empty : (string, bytes) big_map);
  }

let test_mint =
  let () = Test.set_source src in
  let (taddr, _, _) = Test.originate main initial_storage 0t in
  let contr = Test.to_contract taddr in
  (* let storage = Test.get_storage taddr in *)
  let mi_owners = [(src, 10n); (other, 10n)] in
  let mint_param =
    {
      mi_token_id = 12318n;
      mi_token_info = Some (Map.empty : (string, bytes) map);
      mi_owners;
    }
  in
  let () = Test.transfer_to_contract_exn contr (Manager (Mint mint_param)) 0t in
  let storage = Test.get_storage taddr in
  let () = assert (Big_map.find_opt (src, 12318n) storage.ledger = Some 10n) in
  let () =
    assert (Big_map.find_opt (src, 10n) storage.ledger = (None : nat option))
  in
  storage
