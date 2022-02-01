include Errors
include Fa2_types

let[@inline] check_token_exists (id : token_id) (s : storage) : unit =
  if not (Big_map.mem id s.token_metadata) then
    (failwith fa2_token_undefined : unit)

let[@inline] check_hold (src : address) (token_id : token_id)
    (new_balance : token_amount) (s : storage) : unit =
  let total_on_hold =
    match Big_map.find_opt (src, token_id) s.holds_totals with
    | None -> Amount 0n
    | Some total -> total
  in
  if total_on_hold > new_balance then
    (failwith insufficient_spendable_balance : unit)
