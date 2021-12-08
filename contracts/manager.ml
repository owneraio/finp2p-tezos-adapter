include Errors
include Admin

let mint (p : mint_param) (s : storage) : storage =
  let maybe_metadata = Big_map.find_opt p.mi_token_id s.token_metadata in
  let (supply, info) =
    match p.mi_token_info with
    | None -> (
        (* Existing token *)
        match maybe_metadata with
        | None -> (failwith fa2_token_undefined : nat * (string, bytes) map)
        | Some supply_info -> supply_info)
    | Some info -> (
        (* New token *)
        match maybe_metadata with
        | Some _ ->
            (failwith fa2_token_already_exists : nat * (string, bytes) map)
        | None -> (0n, info))
  in
  let (ledger, supply) =
    List.fold_left
      (fun (((ledger, supply), (owner, mint_amount)) :
             (ledger * nat) * (address * nat)) ->
        let new_balance =
          match Big_map.find_opt (p.mi_token_id, owner) ledger with
          | None -> mint_amount
          | Some balance -> balance + mint_amount
        in
        let ledger = Big_map.add (p.mi_token_id, owner) new_balance ledger in
        let supply = supply + mint_amount in
        (ledger, supply))
      (s.ledger, supply)
      p.mi_owners
  in
  let token_metadata =
    Big_map.add p.mi_token_id (supply, info) s.token_metadata
  in
  {s with token_metadata; ledger}

let burn (p : burn_param) (s : storage) : storage =
  let id = p.bu_token_id in
  let ledger =
    List.fold_left
      (fun ((ledger, (owner, burn_amount)) : ledger * (address * nat)) ->
        let balance =
          match Big_map.find_opt (id, owner) ledger with
          | None -> 0n
          | Some balance -> balance
        in
        match is_nat (balance - burn_amount) with
        | None -> (failwith fa2_insufficient_balance : ledger)
        | Some new_balance ->
            if new_balance = 0n then Big_map.remove (id, owner) ledger
            else Big_map.add (id, owner) new_balance ledger)
      s.ledger
      p.bu_owners
  in
  {s with ledger}

let manager ((param, s) : manager * storage) : operation list * storage =
  let s = match param with Mint p -> mint p s | Burn p -> burn p s in
  (([] : operation list), s)
