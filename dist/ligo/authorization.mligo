#if !AUTHORIZATION
#define AUTHORIZATION

#include "errors.mligo"
#include "auth_types.mligo"
let auth_authorize ((param, s) : (auth_param * auth_storage)) : (operation list * auth_storage) =
  let () =
    let fa2_sender = param.sender in
    match param.action with
    | Assets_action (Balance_of _) -> ()
    | Admin_action ->
      if not (param.sender = s.admin) then (failwith unauthorized : unit)
    | _ ->
      (match Big_map.find_opt param.sender s.accredited with
       | None -> (failwith unauthorized : unit)
       | Some data ->
         if data = 0x00
         then ()
         else
         if data = 0x01
         then
           (match param.action with
            | Assets_action fa2 ->
              (match fa2 with
               | Transfer l ->
                 List.iter
                   (fun (t : transfer) ->
                      if not (t.from_ = fa2_sender)
                      then (failwith unauthorized : unit)) l
               | Update_operators l ->
                 List.iter
                   (fun (u : operator_update) ->
                      let operator_p =
                        match u with
                        | Add_operator p -> p
                        | Remove_operator p -> p in
                      if not (operator_p.owner = fa2_sender)
                      then (failwith unauthorized : unit)) l
               | Hold h ->
                 if not (h.hold.src = fa2_sender)
                 then (failwith unauthorized : unit)
               | Balance_of _ -> ())
            | _ -> (failwith unauthorized : unit))
         else (failwith unauthorized : unit)) in
  (([] : operation list), s)

let fail_not_admin (s : storage) =
  if not (Tezos.sender = s.storage.admin) then (failwith unauthorized : unit)

let add_accredited (addr : address) (data : bytes) (s : storage) : storage =
  let accredited = Big_map.add addr data s.storage.accredited in
  { s with storage = { s.storage with accredited = accredited  } }

let remove_accredited (addr : address) (s : storage) : storage =
  let accredited = Big_map.remove addr s.storage.accredited in
  { s with storage = { s.storage with accredited = accredited  } }

let update_admin (admin : address) (s : storage) : storage =
  { s with storage = { s.storage with admin = admin  } }

let update_auth_logic (auth_authorize :
                         (auth_param * auth_storage) -> (operation list * auth_storage)) (s : storage) : storage =
  { s with authorize = auth_authorize  }

let admin (param : auth_admin_param) (s : storage) : storage =
  let () = fail_not_admin s in
  match param with
  | Add_accredited (addr, data) -> add_accredited addr data s
  | Remove_accredited addr -> remove_accredited addr s
  | Update_admin addr -> update_admin addr s
  | Update_auth_logic f -> update_auth_logic f s

let main ((param, s) : (auth_main_param * storage)) : (operation list * storage) =
  match param with
  | Authorize p ->
    let (ops, auth_storage) = s.authorize (p, s.storage) in
    (ops, { s with storage = auth_storage  })
  | Auth_admin p -> let s = admin p s in (([] : operation list), s)

#endif