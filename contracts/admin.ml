open Mligo
include Types

let set_admin (s : storage) (a : address) : storage =
  { s with pending_admin = Some a }

let confirm_admin (s : storage) : storage =
  match s.pending_admin with
  | None -> (failwith "NO_PENDING_ADMIN" : storage)
  | Some pending ->
    if Tezos.sender None = pending then
      { s with pending_admin = (None : address option); admin = Tezos.sender None }
    else (failwith "NOT_A_PENDING_ADMIN" : storage)

let pause (s : storage) (paused : bool) : storage =
  { s with paused }

let fail_if_not_admin (a : storage) : unit =
  if Tezos.sender None <> a.admin then failwith "NOT_AN_ADMIN" else ()

let fail_if_paused (a : storage) : unit =
  if a.paused then failwith "PAUSED" else ()

let admin (param, s : admin * storage) : (operation list) * storage =
  let ops : operation list = [] in
  let s = match param with
    | Set_admin new_admin ->
      let () = fail_if_not_admin s in
      set_admin s new_admin
    | Confirm_admin -> confirm_admin s
    | Pause paused ->
      let () = fail_if_not_admin s in
      pause s paused in
  (ops, s)
