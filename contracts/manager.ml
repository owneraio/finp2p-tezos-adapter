include Errors
include Admin

let mint (s : storage) (p : mint_param) : storage =
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

let burn_tokens (s : storage) (id : nat) (owners : (address * nat) list) :
    storage =
  let ledger =
    List.fold
      (fun ((l, (owner, amo)) : ledger * (address * nat)) ->
        match Big_map.find_opt (id, owner) l with
        | None -> (failwith fa2_insufficient_balance : ledger)
        | Some am -> (
            match is_nat (am - amo) with
            | None -> (failwith fa2_insufficient_balance : ledger)
            | Some d ->
                if d = 0n then Big_map.remove (id, owner) l
                else Big_map.update (id, owner) (Some d) l))
      owners
      s.ledger
  in
  {s with ledger}

let burn (s : storage) (p : burn_param) : storage =
  burn_tokens s p.bu_token_id p.bu_owners

let manager ((param, s) : manager * storage) : operation list * storage =
  let s = match param with Mint p -> mint s p | Burn p -> burn s p in
  (([] : operation list), s)
