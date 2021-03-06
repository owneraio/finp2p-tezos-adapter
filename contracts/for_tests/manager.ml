include Errors
include Admin
include Assets
include Fa2_params
include Fa2_common

let mint (p : mint_param) (s : storage) : storage =
  let token_id = p.mi_token_id in
  let token_metadata =
    match p.mi_token_info with
    | None ->
        (* Existing token *)
        let () = check_token_exists token_id s in
        s.token_metadata
    | Some info -> (
        (* New token *)
        let (old_metadata, token_metadata) =
          Big_map.get_and_update
            token_id
            (Some (token_id, info))
            s.token_metadata
        in
        match old_metadata with
        | Some _ -> (failwith fa2_token_already_exists : token_metadata_storage)
        | None -> token_metadata)
  in
  let supply =
    match Big_map.find_opt token_id s.total_supply with
    | None -> Amount 0n
    | Some supply -> supply
  in
  let (ledger, supply) =
    List.fold_left
      (fun (((ledger, supply), (owner, mint_amount)) :
             (ledger * token_amount) * (address * token_amount)) ->
        let new_balance =
          match Big_map.find_opt (owner, token_id) ledger with
          | None -> mint_amount
          | Some old_balance -> add_amount old_balance mint_amount
        in
        let ledger = Big_map.add (owner, token_id) new_balance ledger in
        let supply = add_amount supply mint_amount in
        (ledger, supply))
      (s.ledger, supply)
      p.mi_owners
  in
  let total_supply = Big_map.add token_id supply s.total_supply in
  let max_token_id =
    if token_id > s.max_token_id then token_id else s.max_token_id
  in
  {s with token_metadata; total_supply; ledger; max_token_id}

let burn (p : burn_param) (s : storage) : storage =
  let id = p.bu_token_id in
  let () = check_token_exists id s in
  let (ledger, burnt) =
    List.fold_left
      (fun (((ledger, burnt), (owner, burn_amount)) :
             (ledger * token_amount) * (address * token_amount)) ->
        let old_balance =
          match Big_map.find_opt (owner, id) ledger with
          | None -> Amount 0n
          | Some old_balance -> old_balance
        in
        match sub_amount old_balance burn_amount with
        | None -> (failwith fa2_insufficient_balance : ledger * token_amount)
        | Some new_balance ->
            let ledger =
              if new_balance = Amount 0n then Big_map.remove (owner, id) ledger
              else Big_map.add (owner, id) new_balance ledger
            in
            (ledger, add_amount burnt burn_amount))
      (s.ledger, Amount 0n)
      p.bu_owners
  in
  let total_supply =
    match Big_map.find_opt id s.total_supply with
    | None -> s.total_supply
    | Some supply ->
        let supply =
          match sub_amount supply burnt with
          | None -> (* Should not happen *) None
          | Some (Amount sup) -> if sup = 0n then None else Some (Amount sup)
        in
        Big_map.update id supply s.total_supply
  in
  {s with ledger; total_supply}

let manager ((param, s) : manager_params * storage) : operation list * storage =
  let s = match param with Mint p -> mint p s | Burn p -> burn p s in
  (([] : operation list), s)
