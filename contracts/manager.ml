include Errors
include Admin
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
            let () = check_hold owner id new_balance s in
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

let hold (h : hold) (s : storage) : storage =
  let hold_id = h.ho_hold_id in
  let (already_hold, holds) = Big_map.get_and_update hold_id (Some h) s.holds in
  let () =
    match already_hold with
    | None -> ()
    | Some _ -> (failwith fa2_hold_already_exists : unit)
  in
  let total_on_hold =
    match Big_map.find_opt (h.ho_src, h.ho_token_id) s.holds_totals with
    | None -> h.ho_amount
    | Some total -> add_amount total h.ho_amount
  in
  let balance_src =
    match Big_map.find_opt (h.ho_src, h.ho_token_id) s.ledger with
    | None -> Amount 0n
    | Some b -> b
  in
  let () =
    if total_on_hold > balance_src then
      (failwith fa2_insufficient_balance : unit)
  in
  let holds_totals =
    Big_map.add (h.ho_src, h.ho_token_id) total_on_hold s.holds_totals
  in
  let max_hold_id =
    if hold_id > s.max_hold_id then hold_id else s.max_hold_id
  in
  {s with holds; holds_totals; max_hold_id}

let release (hold_id : hold_id) (s : storage) : storage =
  let (existed, holds) =
    Big_map.get_and_update hold_id (None : hold option) s.holds
  in
  let h =
    match existed with None -> (failwith unknown_hold_id : hold) | Some h -> h
  in
  let total_on_hold =
    match Big_map.find_opt (h.ho_src, h.ho_token_id) s.holds_totals with
    | None -> Amount 0n
    | Some total -> total
  in
  let new_total_on_hold =
    match sub_amount total_on_hold h.ho_amount with
    | None -> None
    | Some total -> if total = Amount 0n then None else Some total
  in
  let holds_totals =
    Big_map.update (h.ho_src, h.ho_token_id) new_total_on_hold s.holds_totals
  in
  {s with holds; holds_totals}

let manager ((param, s) : manager * storage) : operation list * storage =
  let s =
    match param with
    | Mint p -> mint p s
    | Burn p -> burn p s
    | Hold p -> hold p s
    | Release p -> release p s
  in
  (([] : operation list), s)
