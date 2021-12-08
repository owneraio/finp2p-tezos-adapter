#if !MANAGER
#define MANAGER

#include "errors.mligo"
#include "admin.mligo"
let mint (p : mint_param) (s : storage) : storage =
  let maybe_metadata = Big_map.find_opt p.token_id s.token_metadata in
  let (supply, info) =
    match p.token_info with
    | None ->
      (match maybe_metadata with
       | None -> (failwith fa2_token_undefined : (nat * (string, bytes) map))
       | Some supply_info -> supply_info)
    | Some info ->
      (match maybe_metadata with
       | Some _ ->
         (failwith fa2_token_already_exists : (nat * (string, bytes) map))
       | None -> (0n, info)) in
  let (ledger, supply) =
    List.fold_left
      (fun
        (((ledger, supply), (owner, mint_amount)) :
           ((ledger * nat) * (address * nat)))
        ->
          let new_balance =
            match Big_map.find_opt (p.token_id, owner) ledger with
            | None -> mint_amount
            | Some old_balance -> old_balance + mint_amount in
          let ledger = Big_map.add (p.token_id, owner) new_balance ledger in
          let supply = supply + mint_amount in (ledger, supply))
      (s.ledger, supply) p.owners in
  let token_metadata = Big_map.add p.token_id (supply, info) s.token_metadata in
  { s with token_metadata = token_metadata ; ledger = ledger  }

let burn (p : burn_param) (s : storage) : storage =
  let id = p.token_id in
  let ledger =
    List.fold_left
      (fun ((ledger, (owner, burn_amount)) : (ledger * (address * nat))) ->
         let old_balance =
           match Big_map.find_opt (id, owner) ledger with
           | None -> 0n
           | Some old_balance -> old_balance in
         match is_nat (old_balance - burn_amount) with
         | None -> (failwith fa2_insufficient_balance : ledger)
         | Some new_balance ->
           if new_balance = 0n
           then Big_map.remove (id, owner) ledger
           else Big_map.add (id, owner) new_balance ledger) s.ledger p.owners in
  { s with ledger = ledger  }

let manager ((param, s) : (manager * storage)) : (operation list * storage) =
  let s = match param with | Mint p -> mint p s | Burn p -> burn p s in
  (([] : operation list), s)

#endif