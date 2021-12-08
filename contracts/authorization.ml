include Errors
include Auth_types

(* Inintial authorization logic *)
let auth_authorize ((param, s) : auth_param * auth_storage) :
    operation list * auth_storage =
  let () =
    match param.action with
    | Admin_action ->
        if not (param.sender = s.auth_admin) then (failwith unauthorized : unit)
    | _ ->
        if not (Big_map.mem param.sender s.auth_accredited) then
          (failwith unauthorized : unit)
  in
  (([] : operation list), s)

let fail_not_admin (s : storage) =
  if not (Tezos.sender None = s.auth_storage.auth_admin) then
    (failwith unauthorized : unit)

let add_accredited (addr : address) (data : bytes) (s : storage) : storage =
  let auth_accredited = Big_map.add addr data s.auth_storage.auth_accredited in
  {s with auth_storage = {s.auth_storage with auth_accredited}}

let remove_accredited (addr : address) (s : storage) : storage =
  let auth_accredited = Big_map.remove addr s.auth_storage.auth_accredited in
  {s with auth_storage = {s.auth_storage with auth_accredited}}

let update_admin (auth_admin : address) (s : storage) : storage =
  {s with auth_storage = {s.auth_storage with auth_admin}}

let update_auth_logic
    (auth_authorize :
      auth_param * auth_storage -> operation list * auth_storage) (s : storage)
    : storage =
  {s with auth_authorize}

let admin (param : auth_admin_param) (s : storage) : storage =
  let () = fail_not_admin s in
  match param with
  | Add_accredited (addr, data) -> add_accredited addr data s
  | Remove_accredited addr -> remove_accredited addr s
  | Update_admin addr -> update_admin addr s
  | Update_auth_logic f -> update_auth_logic f s

let main ((param, s) : auth_main_param * storage) : operation list * storage =
  match param with
  | Authorize p ->
      let (ops, auth_storage) = s.auth_authorize (p, s.auth_storage) in
      (ops, {s with auth_storage})
  | Auth_admin p ->
      let s = admin p s in
      (([] : operation list), s)
