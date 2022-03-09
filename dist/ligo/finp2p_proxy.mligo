#if !FINP2P_PROXY
#define FINP2P_PROXY

#include "errors.mligo"
#include "fa2_sig.mligo"
#include "finp2p_proxy_types.mligo"
#include "finp2p_lib.mligo"
[@inline]
let return_storage (s : storage) =
  (([] : operation list), s)

let fail_not_admin (s : storage) =
  if not (Set.mem Tezos.sender s.admins) then (failwith unauthorized : unit)

let is_operation_expired (op_timestamp : timestamp) (s : storage) : bool =
  Tezos.now > (op_timestamp + (int s.operation_ttl.ttl))

let is_operation_live (op_timestamp : timestamp) (s : storage) : bool =
  (op_timestamp <= (Tezos.now + (int s.operation_ttl.allowed_in_the_future)))
  && (not (is_operation_expired op_timestamp s))

let address_of_key (k : key) (fa2_token : fa2_token) (s : storage) : address =
  match Big_map.find_opt (k, fa2_token) s.external_addresses with
  | None -> Tezos.address (Tezos.implicit_account (Crypto.hash_key k))
  | Some addr -> addr

let transfer_tokens (p : transfer_tokens_param) (s : storage) : (operation * storage) =
  let () =
    if not (is_operation_live p.nonce.timestamp s)
    then (failwith op_not_live : unit) in
  let oph = check_transfer_tokens_signature p in
  let s =
    {
      s with
      live_operations = (Big_map.add oph p.nonce.timestamp s.live_operations)
    } in
  let fa2_token =
    match Big_map.find_opt p.asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let fa2_transfer =
    {
      from_ = (address_of_key p.src_account fa2_token s);
      txs =
        [{
          to_ = (address_of_key p.dst_account fa2_token s);
          token_id = fa2_token.id;
          amount = p.amount
        }]
    } in
  let transfer_ep = get_transfer_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction [fa2_transfer] 0tez transfer_ep in
  (relay_op, s)

let create_asset (p : create_asset_param) (s : storage) : (operation * storage) =
  let ({ address = ca_address; id = ca_id }, token_info) = p.new_token_info in
  let next_token_id = Big_map.find_opt ca_address s.next_token_ids in
  let token_id =
    match ca_id with
    | Some id -> id
    | None ->
      (match next_token_id with
       | Some id -> id
       | None ->
         (match (Tezos.call_view "get_max_token_id" () ca_address : 
                   token_id option)
          with
          | None -> (failwith "CANNOT_COMPUTE_NEXT_TOKEN_ID" : token_id)
          | Some (Token_id id) -> Token_id (id + 1n))) in
  let fa2_token = { address = ca_address; id = token_id } in
  let (old_asset, finp2p_assets) =
    Big_map.get_and_update p.asset_id (Some fa2_token) s.finp2p_assets in
  let () =
    match old_asset with
    | Some _ -> (failwith asset_already_exists : unit)
    | None -> () in
  let fa2_mint =
    {
      token_id = fa2_token.id;
      token_info = (Some token_info);
      owners = ([] : (address * token_amount) list)
    } in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction fa2_mint 0tez mint_ep in
  let next_token_id =
    let token_id_plus_1 = match token_id with | Token_id i -> Token_id (i + 1n) in
    match next_token_id with
    | None -> token_id_plus_1
    | Some id -> if token_id >= id then token_id_plus_1 else id in
  let next_token_ids = Big_map.add ca_address next_token_id s.next_token_ids in
  let s =
    { s with finp2p_assets = finp2p_assets ; next_token_ids = next_token_ids  } in
  (relay_op, s)

let issue_tokens (p : issue_tokens_param) (s : storage) : (operation * storage) =
  let () =
    if not (is_operation_live p.nonce.timestamp s)
    then (failwith op_not_live : unit) in
  let oph = check_issue_tokens_signature p in
  let live_operations = Big_map.add oph p.nonce.timestamp s.live_operations in
  let fa2_token =
    match Big_map.find_opt p.asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let fa2_mint =
    {
      token_id = fa2_token.id;
      token_info = (None : (string, bytes) map option);
      owners = [((address_of_key p.dst_account fa2_token s), p.amount)]
    } in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction fa2_mint 0tez mint_ep in
  let s = { s with live_operations = live_operations  } in (relay_op, s)

let redeem_tokens (p : redeem_tokens_param) (s : storage) : (operation * storage) =
  let () =
    if not (is_operation_live p.nonce.timestamp s)
    then (failwith op_not_live : unit) in
  let oph = check_redeem_tokens_signature p in
  let s =
    {
      s with
      live_operations = (Big_map.add oph p.nonce.timestamp s.live_operations)
    } in
  let fa2_token =
    match Big_map.find_opt p.asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let fa2_burn =
    {
      token_id = fa2_token.id;
      owners = [((address_of_key p.src_account fa2_token s), p.amount)]
    } in
  let burn_ep = get_burn_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction fa2_burn 0tez burn_ep in (relay_op, s)

let hold_tokens (p : hold_tokens_param) (s : storage) : (operation * storage) =
  let nonce_timestamp = p.ahg.nonce.timestamp in
  let asset_id = p.shg.asset_id in
  let amount_ = p.shg.amount in
  let shg_dst_account_type = p.shg.dst_account_type in
  let shg_dst_account = p.shg.dst_account in
  let seller = p.ahg.src_account in
  let buyer = p.ahg.dst_account in
  let () =
    if not (is_operation_live nonce_timestamp s)
    then (failwith op_not_live : unit) in
  let oph = check_hold_tokens_signature p in
  let live_operations = Big_map.add oph nonce_timestamp s.live_operations in
  let fa2_token =
    match Big_map.find_opt asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let hold_dst =
    match shg_dst_account_type with
    | None -> (None : supported_hold_dst option)
    | Some shg_dst_account_type ->
      if
        (shg_dst_account_type = "finId") ||
        (shg_dst_account_type = "cryptoWallet")
      then
        (match shg_dst_account with
         | None -> (None : supported_hold_dst option)
         | Some (Supported dst) -> Some dst
         | Some (Other _) -> Some (FinId seller))
      else Some (FinId seller) in
  let (op, hold_info, s) =
    match get_hold_entrypoint_opt fa2_token.address with
    | Some hold_ep ->
      let fa2_hold_id =
        match (Tezos.call_view "get_max_hold_id" () fa2_token.address : 
                 hold_id option)
        with
        | None -> (failwith "CANNOT_COMPUTE_NEXT_HOLD_ID" : hold_id)
        | Some (Hold_id id) -> Hold_id (id + 1n) in
      let hold_info =
        FA2_hold { fa2_hold_id = fa2_hold_id ; held_token = fa2_token } in
      let ho_dst =
        match hold_dst with
        | None -> (None : address option)
        | Some (Tezos pkh) -> Some (implicit_address pkh)
        | Some (FinId k) -> Some (address_of_key k fa2_token s) in
      let fa2_hold =
        {
          token_id = fa2_token.id;
          amount = amount_;
          src = (address_of_key buyer fa2_token s);
          dst = ho_dst 
        } in
      let relay_op =
        Tezos.transaction { id = (Some fa2_hold_id); hold = fa2_hold } 0tez
          hold_ep in
      (relay_op, hold_info, s)
    | None ->
      let hold_info =
        Escrow
          {
            held_token = fa2_token;
            amount = amount_;
            src_account = buyer;
            dst = hold_dst
          } in
      let total_in_escrow =
        match Big_map.find_opt (buyer, fa2_token) s.escrow_totals with
        | None -> amount_
        | Some total -> add_amount total amount_ in
      let s =
        {
          s with
          escrow_totals =
            (Big_map.add (buyer, fa2_token) total_in_escrow s.escrow_totals)
        } in
      let fa2_transfer_to_escrow =
        {
          from_ = (address_of_key buyer fa2_token s);
          txs =
            [{
              to_ = Tezos.self_address;
              token_id = fa2_token.id;
              amount = amount_
            }]
        } in
      let transfer_ep = get_transfer_entrypoint fa2_token.address in
      let relay_op =
        Tezos.transaction [fa2_transfer_to_escrow] 0tez transfer_ep in
      (relay_op, hold_info, s) in
  let (old_hold_id, holds) =
    Big_map.get_and_update p.hold_id (Some hold_info) s.holds in
  let () =
    match old_hold_id with
    | Some _ -> (failwith hold_already_exists : unit)
    | None -> () in
  let s = { s with live_operations = live_operations ; holds = holds  } in
  (op, s)

let unhold_aux (hold_id : finp2p_hold_id) (asset_id : asset_id option) (amount_ : token_amount option) (s : storage) : (storage * hold_info) =
  let (fa2_hold, cleaned_holds) =
    Big_map.get_and_update hold_id (None : hold_info option) s.holds in
  let hold_info =
    match fa2_hold with
    | None -> (failwith unknown_hold_id : hold_info)
    | Some info -> info in
  let held_token =
    match hold_info with
    | FA2_hold h -> h.held_token
    | Escrow e -> e.held_token in
  let () =
    match asset_id with
    | None -> ()
    | Some asset_id ->
      let expected_held_token =
        match Big_map.find_opt asset_id s.finp2p_assets with
        | None -> (failwith unknown_asset_id : fa2_token)
        | Some fa2_token -> fa2_token in
      if held_token <> expected_held_token
      then failwith "UNEXPECTED_HOLD_ASSET_ID" in
  let hold_amount =
    match hold_info with
    | FA2_hold { fa2_hold_id; held_token } ->
      (match (Tezos.call_view "get_hold" fa2_hold_id held_token.address : 
                hold option option)
       with
       | None -> (failwith fa2_unknown_hold_id : token_amount)
       | Some (None) -> (failwith fa2_unknown_hold_id : token_amount)
       | Some (Some fa2_hold) -> fa2_hold.amount)
    | Escrow e -> e.amount in
  let holds =
    match amount_ with
    | None -> cleaned_holds
    | Some a ->
      if a = hold_amount
      then cleaned_holds
      else
        (match hold_info with
         | FA2_hold _ -> s.holds
         | Escrow e ->
           let new_amount =
             match sub_amount e.amount a with
             | None -> (failwith fa2_insufficient_hold : token_amount)
             | Some a -> a in
           let hold_info = Escrow { e with amount = new_amount } in
           Big_map.add hold_id hold_info s.holds) in
  let escrow_totals =
    match hold_info with
    | FA2_hold _ -> s.escrow_totals
    | Escrow e ->
      let unescrow_amount =
        match amount_ with | None -> hold_amount | Some a -> a in
      let escrow_total =
        match Big_map.find_opt (e.src_account, e.held_token) s.escrow_totals
        with
        | None -> Amount 0n
        | Some total -> total in
      let new_escrow_total =
        match sub_amount escrow_total unescrow_amount with
        | None -> None
        | Some total -> if total = (Amount 0n) then None else Some total in
      Big_map.update (e.src_account, e.held_token) new_escrow_total
        s.escrow_totals in
  let s = { s with holds = holds ; escrow_totals = escrow_totals  } in
  (s, hold_info)


[@inline]
let address_of_dst (dst : supported_hold_dst option) (token : fa2_token) (s : storage) : address option =
  match dst with
  | None -> None
  | Some (Tezos pkh) -> Some (implicit_address pkh)
  | Some (FinId k) -> Some (address_of_key k token s)

let execute_hold (p : execute_hold_param) (s : storage) : (operation * storage) =
  let { hold_id; asset_id; amount = amount_; src_account; dst } = p in
  let (s, hold_info) = unhold_aux hold_id asset_id amount_ s in
  let op =
    match hold_info with
    | FA2_hold { fa2_hold_id; held_token } ->
      let execute_ep = get_execute_entrypoint held_token.address in
      let e_src =
        match src_account with
        | None -> None
        | Some k -> Some (address_of_key k held_token s) in
      let e_dst = address_of_dst dst held_token s in
      Tezos.transaction
        {
          hold_id = fa2_hold_id;
          amount = amount_;
          token_id = (Some held_token.id);
          src = e_src ;
          dst = e_dst 
        } 0tez execute_ep
    | Escrow
        { held_token = es_held_token; amount = es_amount;
          src_account = es_src_account; dst = es_dst }
      ->
      let dst_address = address_of_dst dst es_held_token s in
      let es_dst_address = address_of_dst es_dst es_held_token s in
      let tr_dst =
        match (dst_address, es_dst_address) with
        | (None, None) -> (failwith "NO_DESTINATION_EXECUTE_HOLD" : address)
        | (Some dst, None) -> dst
        | (None, Some dst) -> dst
        | (Some dst, Some escrow_dst) ->
          if dst <> escrow_dst
          then (failwith "UNEXPECTED_EXECUTE_HOLD_DESTINATION" : address)
          else dst in
      let () =
        match src_account with
        | None -> ()
        | Some src ->
          if src <> es_src_account then failwith "UNEXPECTED_HOLD_SOURCE" in
      let tr_src = Tezos.self_address in
      let tr_amount = match amount_ with | None -> es_amount | Some a -> a in
      let tr_token_id = es_held_token.id in
      let execute_transfer =
        {
          from_ = tr_src ;
          txs =
            [{ to_ = tr_dst ; token_id = tr_token_id ; amount = tr_amount  }]
        } in
      let transfer_ep = get_transfer_entrypoint es_held_token.address in
      Tezos.transaction [execute_transfer] 0tez transfer_ep in
  (op, s)

let release_hold (p : release_hold_param) (s : storage) : (operation * storage) =
  let { hold_id; asset_id; amount = amount_; src_account } = p in
  let (s, hold_info) = unhold_aux hold_id asset_id amount_ s in
  let op =
    match hold_info with
    | FA2_hold { fa2_hold_id; held_token } ->
      let release_ep = get_release_entrypoint held_token.address in
      let rl_src =
        match src_account with
        | None -> None
        | Some k -> Some (address_of_key k held_token s) in
      Tezos.transaction
        {
          hold_id = fa2_hold_id;
          amount = amount_;
          token_id = (Some held_token.id);
          src = rl_src 
        } 0tez release_ep
    | Escrow
        { held_token = es_held_token; amount = es_amount;
          src_account = es_src_account; dst = _ }
      ->
      let () =
        match src_account with
        | None -> ()
        | Some src ->
          if src <> es_src_account then failwith "UNEXPECTED_HOLD_SOURCE" in
      let tr_src = Tezos.self_address in
      let tr_dst = address_of_key es_src_account es_held_token s in
      let tr_amount = match amount_ with | None -> es_amount | Some a -> a in
      let tr_token_id = es_held_token.id in
      let release_transfer =
        {
          from_ = tr_src ;
          txs =
            [{ to_ = tr_dst ; token_id = tr_token_id ; amount = tr_amount  }]
        } in
      let transfer_ep = get_transfer_entrypoint es_held_token.address in
      Tezos.transaction [release_transfer] 0tez transfer_ep in
  (op, s)

let finp2p_asset (p : finp2p_proxy_asset_param) (s : storage) : (operation * storage) =
  match p with
  | Transfer_tokens p -> transfer_tokens p s
  | Create_asset p -> create_asset p s
  | Issue_tokens p -> issue_tokens p s
  | Redeem_tokens p -> redeem_tokens p s
  | Execute_hold p -> execute_hold p s
  | Release_hold p -> release_hold p s

let finp2p_batch_asset (l : finp2p_proxy_asset_param list) (s : storage) : (operation list * storage) =
  let (r_ops, s) =
    List.fold_left
      (fun
        (((acc : operation list), (s : storage)),
         (p : finp2p_proxy_asset_param))
        -> let (op, s) = finp2p_asset p s in ((op :: acc), s))
      (([] : operation list), s) l in
  ((rev r_ops), s)

let update_operation_ttl (operation_ttl : operation_ttl) (s : storage) =
  { s with operation_ttl = operation_ttl  }

let update_admins (admins : address set) (s : storage) =
  if (Set.cardinal admins) = 0n
  then (failwith "EMPTY_ADMIN_SET" : storage)
  else { s with admins = admins  }

let add_admins (admins : address list) (s : storage) =
  let admins =
    List.fold_left
      (fun ((admins : address set), (a : address)) -> Set.add a admins)
      s.admins admins in
  update_admins admins s

let remove_admins (admins : address list) (s : storage) =
  let admins =
    List.fold_left
      (fun ((admins : address set), (a : address)) -> Set.remove a admins)
      s.admins admins in
  update_admins admins s

let update_fa2_token ((asset_id : asset_id), (fa2 : fa2_token)) (s : storage) =
  let () = check_fa2_contract fa2.address in
  let (old_next_token_id, next_token_ids) =
    let next_id = match fa2.id with | Token_id id -> Token_id (id + 1n) in
    Big_map.get_and_update fa2.address (Some next_id) s.next_token_ids in
  let next_token_ids =
    match old_next_token_id with
    | None -> next_token_ids
    | Some id -> if id > fa2.id then s.next_token_ids else next_token_ids in
  {
    s with
    finp2p_assets = (Big_map.add asset_id fa2 s.finp2p_assets);
    next_token_ids = next_token_ids 
  }

let register_external_address ((k : key), (tok : fa2_token), (addr_opt : address option)) (s : storage) =
  {
    s with
    external_addresses =
      (Big_map.update (k, tok) addr_opt s.external_addresses)
  }

let cleanup (ops : operation_hash list) (s : storage) : storage =
  let live_operations =
    List.fold_left
      (fun
        ((live_operations : (operation_hash, timestamp) big_map),
         (oph : operation_hash))
        ->
          match Big_map.find_opt oph live_operations with
          | None -> live_operations
          | Some op_timestamp ->
            if is_operation_expired op_timestamp s
            then Big_map.remove oph live_operations
            else live_operations) s.live_operations ops in
  { s with live_operations = live_operations  }

let fa2_transfer (p : fa2_transfer_param) (s : storage) : (operation list * storage) =
  let transfer =
    {
      from_ = Tezos.self_address;
      txs = [{ to_ = p.dst; token_id = p.token.id; amount = p.amount }]
    } in
  let transfer_ep = get_transfer_entrypoint p.token.address in
  let op = Tezos.transaction [transfer] 0tez transfer_ep in ([op], s)

let finp2p_admin (p : finp2p_proxy_admin_param) (s : storage) : (operation list * storage) =
  match p with
  | Update_operation_ttl p -> return_storage (update_operation_ttl p s)
  | Update_admins p -> return_storage (update_admins p s)
  | Add_admins p -> return_storage (add_admins p s)
  | Remove_admins p -> return_storage (remove_admins p s)
  | Update_fa2_token p -> return_storage (update_fa2_token p s)
  | Register_external_address p ->
    return_storage (register_external_address p s)
  | Fa2_transfer p -> fa2_transfer p s

let finp2p_public (p : finp2p_public_param) (s : storage) : (operation list * storage) =
  match p with
  | Cleanup ops -> let s = cleanup ops s in (([] : operation list), s)
  | Hold_tokens p ->
    let buyer = p.ahg.dst_account in
    let () =
      if Tezos.sender <> (implicit_address (Crypto.hash_key buyer))
      then fail_not_admin s in
    let (op, s) = hold_tokens p s in ([op], s)

let main ((param, s) : (finp2p_proxy_param * storage)) : (operation list * storage) =
  match param with
  | Finp2p_asset p ->
    let () = fail_not_admin s in let (op, s) = finp2p_asset p s in ([op], s)
  | Finp2p_batch_asset p -> let () = fail_not_admin s in finp2p_batch_asset p s
  | Finp2p_admin p -> let () = fail_not_admin s in finp2p_admin p s
  | Finp2p_public p -> finp2p_public p s


[@view]
let get_asset_balance (((owner : key), (asset_id : asset_id)), (s : storage)) : nat =
  let fa2_token =
    match Big_map.find_opt asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let owner = address_of_key owner fa2_token s in
  match (Tezos.call_view "get_balance" (owner, fa2_token.id) fa2_token.address : 
           nat option)
  with
  | None -> (failwith "NOT_FINP2P_FA2" : nat)
  | Some b -> b


[@view]
let get_asset_balance_info (((owner : key), (asset_id : asset_id)), (s : storage)) : balance_info =
  let fa2_token =
    match Big_map.find_opt asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let owner = address_of_key owner fa2_token s in
  match (Tezos.call_view "get_balance_info" (owner, fa2_token.id)
           fa2_token.address : balance_info option)
  with
  | None -> (failwith "NOT_FINP2P_FA2" : balance_info)
  | Some b -> b


[@view]
let get_asset_hold (((owner : key), (asset_id : asset_id)), (s : storage)) : token_amount =
  let fa2_token =
    match Big_map.find_opt asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token in
  let owner_addr = address_of_key owner fa2_token s in
  let native_hold =
    match (Tezos.call_view "get_balance_info" (owner_addr, fa2_token.id)
             fa2_token.address : balance_info option)
    with
    | None -> Amount 0n
    | Some b -> b.on_hold in
  let escrow_hold =
    match Big_map.find_opt (owner, fa2_token) s.escrow_totals with
    | None -> Amount 0n
    | Some a -> a in
  add_amount native_hold escrow_hold

#endif