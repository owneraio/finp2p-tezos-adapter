include Manager
include Assets

let main ((param, s) : param * storage) : operation list * storage =
  match param with
  | Admin p -> admin (p, s)
  | Manager p -> manager (p, s)
  | Assets p ->
      let () = fail_if_paused s in
      fa2 (p, s)

(* Views *)

let[@view] get_balance (((owner, token_id) : address * token_id), (s : storage))
    : token_amount =
  if not (Big_map.mem token_id s.token_metadata) then
    (failwith fa2_token_undefined : token_amount)
  else
    match Big_map.find_opt (owner, token_id) s.ledger with
    | None -> Amount 0n
    | Some b -> b
