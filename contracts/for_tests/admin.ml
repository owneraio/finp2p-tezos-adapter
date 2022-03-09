include Errors
include Fa2_types

let update_auth_contract (s : storage) (auth_contract : address) : storage =
  let modified_permissions_json =
    (* {"operator":"owner-or-operator","receiver":"owner-no-hook","sender":"owner-no-hook","custom":{"tag":"finp2p2_authorization","config-api":""}} *)
    0x7b226f70657261746f72223a226f776e65722d6f722d6f70657261746f72222c227265636569766572223a226f776e65722d6e6f2d686f6f6b222c2273656e646572223a226f776e65722d6e6f2d686f6f6b222c22637573746f6d223a7b22746167223a2266696e703270325f617574686f72697a6174696f6e222c22636f6e6669672d617069223a22227d7dh
  in
  (* Erase contract address in custom.config-api to indicate it was updated *)
  let metadata =
    Big_map.add "permissions" modified_permissions_json s.metadata
  in
  {s with auth_contract; metadata}

let pause (s : storage) (paused : bool) : storage = {s with paused}

let fail_if_paused (a : storage) : unit =
  if a.paused then failwith "PAUSED" else ()

let update_token_metadata (token_id : token_id) (metadata : (string, bytes) map)
    (s : storage) : storage =
  let (old_metadata, token_metadata) =
    Big_map.get_and_update token_id (Some (token_id, metadata)) s.token_metadata
  in
  match old_metadata with
  | None -> (failwith fa2_token_undefined : storage)
  | Some _ -> {s with token_metadata}

let admin ((param, s) : admin_params * storage) : operation list * storage =
  let ops : operation list = [] in
  let s =
    match param with
    | Update_auth_contract new_contract -> update_auth_contract s new_contract
    | Update_token_metadata {utm_token_id; utm_metadata} ->
        update_token_metadata utm_token_id utm_metadata s
    | Pause paused -> pause s paused
  in
  (ops, s)
