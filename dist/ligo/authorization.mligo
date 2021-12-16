#if !AUTHORIZATION
#define AUTHORIZATION

#include "errors.mligo"
#include "auth_types.mligo"
let auth_authorize ((param, s) : (auth_param * auth_storage)) : (operation list * auth_storage) =
  let () =
    match param.action with
    | Admin_action ->
      if not (param.sender = s.admin) then (failwith unauthorized : unit)
    | _ ->
      if not (Big_map.mem param.sender s.accredited)
      then (failwith unauthorized : unit) in
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