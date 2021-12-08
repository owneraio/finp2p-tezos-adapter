include Errors
include Admin

let mint (s : storage) (p : mint_param) : storage =
  (* FIXME can mint any id > or existing *)
  if s.next_token_id = p.mi_token_id then
    let (ledger, supply) =
      List.fold
        (fun (((l, supply), (owner, amo)) : (ledger * nat) * (address * nat)) ->
          (Big_map.add (p.mi_token_id, owner) amo l, supply + amo))
        p.mi_owners
        (s.ledger, 0n)
    in
    let token_metadata =
      Big_map.add p.mi_token_id (supply, p.mi_token_info) s.token_metadata
    in
    let next_token_id = s.next_token_id + 1n in
    {s with token_metadata; ledger; next_token_id}
  else (failwith "INVALID_TOKEN_ID" : storage)

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
