include Errors
include Fa2_types

let[@inline] check_token_exists (id : token_id) (s : storage) : unit =
  if not (Big_map.mem id s.token_metadata) then
    (failwith fa2_token_undefined : unit)
