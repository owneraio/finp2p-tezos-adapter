#if !MANAGER
#define MANAGER

#include "errors.mligo"
#include "admin.mligo"
let mint (p : mint_param) (s : storage) : storage =
  let token_id = p.token_id in
  let token_metadata =
    match p.token_info with
    | None ->
      if not (Big_map.mem token_id s.token_metadata)
      then (failwith fa2_token_undefined : token_metadata_storage)
      else s.token_metadata
    | Some info ->
      let (old_metadata, token_metadata) =
        Big_map.get_and_update token_id (Some (token_id, info))
          s.token_metadata in
      (match old_metadata with
       | Some _ ->
         (failwith fa2_token_already_exists : token_metadata_storage)
       | None -> token_metadata) in
  let supply =
    match Big_map.find_opt token_id s.total_supply with
    | None -> 0n
    | Some (Amount supply) -> supply in
  let (ledger, supply) =
    List.fold_left
      (fun
        (((ledger, supply), (owner, mint_amount)) :
           ((ledger * nat) * (address * token_amount)))
        ->
          let mint_amount = match mint_amount with | Amount a -> a in
          let new_balance =
            match Big_map.find_opt (owner, token_id) ledger with
            | None -> mint_amount
            | Some (Amount old_balance) -> old_balance + mint_amount in
          let ledger = Big_map.add (owner, token_id) (Amount new_balance) ledger in
          let supply = supply + mint_amount in (ledger, supply))
      (s.ledger, supply) p.owners in
  let total_supply = Big_map.add token_id (Amount supply) s.total_supply in
  let max_token_id =
    if token_id > s.max_token_id then token_id else s.max_token_id in
  {
    s with
    token_metadata = token_metadata ;
    total_supply = total_supply ;
    ledger = ledger ;
    max_token_id = max_token_id 
  }

let burn (p : burn_param) (s : storage) : storage =
  let id = p.token_id in
  let (ledger, burnt) =
    List.fold_left
      (fun
        (((ledger, burnt), (owner, burn_amount)) :
           ((ledger * nat) * (address * token_amount)))
        ->
          let burn_amount = match burn_amount with | Amount a -> a in
          let old_balance =
            match Big_map.find_opt (owner, id) ledger with
            | None -> 0n
            | Some (Amount old_balance) -> old_balance in
          match is_nat (old_balance - burn_amount) with
          | None -> (failwith fa2_insufficient_balance : (ledger * nat))
          | Some new_balance ->
            let ledger =
              if new_balance = 0n
              then Big_map.remove (owner, id) ledger
              else Big_map.add (owner, id) (Amount new_balance) ledger in
            (ledger, (burnt + burn_amount))) (s.ledger, 0n) p.owners in
  let total_supply =
    match Big_map.find_opt id s.total_supply with
    | None -> s.total_supply
    | Some (Amount supply) ->
      let supply =
        match is_nat (supply - burnt) with
        | None -> None
        | Some sup -> if sup = 0n then None else Some (Amount sup) in
      Big_map.update id supply s.total_supply in
  { s with ledger = ledger ; total_supply = total_supply  }

let manager ((param, s) : (manager * storage)) : (operation list * storage) =
  let s = match param with | Mint p -> mint p s | Burn p -> burn p s in
  (([] : operation list), s)

#endif