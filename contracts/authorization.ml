include Auth_types

let main (param, s : auth_main_param * storage) : (operation list) * storage =
  let no_ops = ([]: operation list) in
  match param with
  | Authorize _p -> no_ops, s
  | Update_accredited _ -> no_ops, s
