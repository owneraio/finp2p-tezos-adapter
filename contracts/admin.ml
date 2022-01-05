include Errors
include Fa2_types

let update_auth_contract (s : storage) (auth_contract : address) : storage =
  {s with auth_contract}

let pause (s : storage) (paused : bool) : storage = {s with paused}

let fail_if_paused (a : storage) : unit =
  if a.paused then failwith "PAUSED" else ()

let update_token_metadata (token_id : nat) (metadata : (string, bytes) map)
    (s : storage) : storage =
  let (old_metadata, token_metadata) =
    Big_map.get_and_update token_id (Some (token_id, metadata)) s.token_metadata
  in
  match old_metadata with
  | None -> (failwith fa2_token_undefined : storage)
  | Some _ -> {s with token_metadata}

let admin ((param, s) : admin * storage) : operation list * storage =
  let ops : operation list = [] in
  let s =
    match param with
    | Update_auth_contract new_contract -> update_auth_contract s new_contract
    | Update_token_metadata {utm_token_id; utm_metadata} ->
        update_token_metadata utm_token_id utm_metadata s
    | Pause paused -> pause s paused
  in
  (ops, s)
