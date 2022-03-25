#if !MANAGER
#define MANAGER

#include "errors.mligo"
#include "admin.mligo"
#include "assets.mligo"
#include "fa2_params.mligo"
#include "fa2_common.mligo"
let mint (p : mint_param) (s : storage) : storage =
  let token_id = p.token_id in
  let token_metadata =
    match p.token_info with
    | None -> let () = check_token_exists token_id s in s.token_metadata
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
    | None -> Amount 0n
    | Some supply -> supply in
  let (ledger, supply) =
    List.fold_left
      (fun
        (((ledger, supply), (owner, mint_amount)) :
           ((ledger * token_amount) * (address * token_amount)))
        ->
          let new_balance =
            match Big_map.find_opt (owner, token_id) ledger with
            | None -> mint_amount
            | Some old_balance -> add_amount old_balance mint_amount in
          let ledger = Big_map.add (owner, token_id) new_balance ledger in
          let supply = add_amount supply mint_amount in (ledger, supply))
      (s.ledger, supply) p.owners in
  let total_supply = Big_map.add token_id supply s.total_supply in
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
  let () = check_token_exists id s in
  let (ledger, burnt) =
    List.fold_left
      (fun
        (((ledger, burnt), (owner, burn_amount)) :
           ((ledger * token_amount) * (address * token_amount)))
        ->
          let old_balance =
            match Big_map.find_opt (owner, id) ledger with
            | None -> Amount 0n
            | Some old_balance -> old_balance in
          match sub_amount old_balance burn_amount with
          | None ->
            (failwith fa2_insufficient_balance : (ledger * token_amount))
          | Some new_balance ->
            let () = check_hold owner id new_balance s in
            let ledger =
              if new_balance = (Amount 0n)
              then Big_map.remove (owner, id) ledger
              else Big_map.add (owner, id) new_balance ledger in
            (ledger, (add_amount burnt burn_amount))) (s.ledger, (Amount 0n))
      p.owners in
  let total_supply =
    match Big_map.find_opt id s.total_supply with
    | None -> s.total_supply
    | Some supply ->
      let supply =
        match sub_amount supply burnt with
        | None -> None
        | Some (Amount sup) -> if sup = 0n then None else Some (Amount sup) in
      Big_map.update id supply s.total_supply in
  { s with ledger = ledger ; total_supply = total_supply  }

let rollback (r : rollback_param) (s : storage) : (storage * (token_amount * hold)) =
  let { hold_id; amount = amount_; token_id; src } = r in
  let h =
    match Big_map.find_opt hold_id s.holds with
    | None -> (failwith fa2_unknown_hold_id : hold)
    | Some h -> h in
  let () =
    match token_id with
    | None -> ()
    | Some token_id ->
      if token_id <> h.token_id then failwith "UNEXPECTED_HOLD_TOKEN_ID" in
  let () =
    match src with
    | None -> ()
    | Some src -> if src <> h.src then failwith "UNEXPECTED_HOLD_SOURCE" in
  let rollback_amount = match amount_ with | None -> h.amount | Some a -> a in
  let new_hold =
    match sub_amount h.amount rollback_amount with
    | None -> (failwith fa2_insufficient_hold : hold option)
    | Some a -> if a = (Amount 0n) then None else Some { h with amount = a } in
  let holds = Big_map.update hold_id new_hold s.holds in
  let total_on_hold =
    match Big_map.find_opt (h.src, h.token_id) s.holds_totals with
    | None -> Amount 0n
    | Some total -> total in
  let new_total_on_hold =
    match sub_amount total_on_hold rollback_amount with
    | None -> None
    | Some total -> if total = (Amount 0n) then None else Some total in
  let holds_totals =
    Big_map.update (h.src, h.token_id) new_total_on_hold s.holds_totals in
  ({ s with holds = holds ; holds_totals = holds_totals  },
   (rollback_amount, h))

let release (e : release_param) (s : storage) : storage =
  let { hold_id = hold_id_; amount = amount_; token_id = token_id_; src = src_;
        dst }
    = e in
  let (s, (tr_amount, hold)) =
    rollback
      { hold_id = hold_id_; amount = amount_; token_id = token_id_; src = src_
      } s in
  let tr_dst =
    match (dst, hold.dst) with
    | (None, None) -> (failwith "NO_DESTINATION_RELEASE_HOLD" : address)
    | (Some dst, None) -> dst
    | (None, Some dst) -> dst
    | (Some dst, Some hold_dst) ->
      if dst <> hold_dst
      then (failwith "UNEXPECTED_RELEASE_HOLD_DESTINATION" : address)
      else dst in
  let tr_src = hold.src in
  let tr_token_id = hold.token_id in
  let fa2_transfer =
    {
      from_ = tr_src ;
      txs = [{ to_ = tr_dst ; token_id = tr_token_id ; amount = tr_amount  }]
    } in
  let ledger = transfer [fa2_transfer] s in { s with ledger = ledger  }

let manager ((param, s) : (manager_params * storage)) : (operation list * storage) =
  let s =
    match param with
    | Mint p -> mint p s
    | Burn p -> burn p s
    | Rollback p -> let (s, _) = rollback p s in s
    | Release p -> release p s in
  (([] : operation list), s)

#endif