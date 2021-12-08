#if !ADMIN
#define ADMIN

#include "fa2_types.mligo"
let update_auth_contract (s : storage) (auth_contract : address) : storage =
  { s with auth_contract = auth_contract  }

let pause (s : storage) (paused : bool) : storage =
  { s with paused = paused  }

let fail_if_paused (a : storage) : unit =
  if a.paused then failwith "PAUSED" else ()

let admin ((param, s) : (admin * storage)) : (operation list * storage) =
  let ops : operation list = [] in
  let s =
    match param with
    | Update_auth_contract new_contract -> update_auth_contract s new_contract
    | Pause paused -> pause s paused in
  (ops, s)

#endif