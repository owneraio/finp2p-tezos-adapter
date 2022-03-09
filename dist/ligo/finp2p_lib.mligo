#if !FINP2P_LIB
#define FINP2P_LIB

#include "errors.mligo"
#include "utils.mligo"
#include "finp2p_proxy_types.mligo"
#include "finp2p_conv_maps.mligo"
[@inline]
let max_uint64 () : nat =
  ([%Michelson ({| { DROP; PUSH nat 18446744073709551615 } |} : unit -> nat)])
    ()

let concat_bytes  : bytes list -> bytes =
  [%Michelson ({| { CONCAT } |} : bytes list -> bytes)]

let concat_string  : string list -> string =
  [%Michelson ({| { CONCAT } |} : string list -> string)]


[@inline]
let empty_bytes () : bytes =
  ([%Michelson ({|{ DROP; PUSH bytes 0x }|} : unit -> bytes)]) ()


[@inline]
let unwrap_asset_id (id : asset_id) : bytes =
  match id with | Asset_id id -> id


[@inline]
let unwrap_finp2p_hold_id (id : finp2p_hold_id) : bytes =
  match id with | Finp2p_hold_id id -> id


[@inline]
let unwrap_opaque (o : opaque) : bytes =
  match o with | Opaque o -> o


[@inline]
let nth_nat_byte (number : nat) (n : nat) : nat =
  (number lsr (n * 8n)) land 255n


[@inline]
let uint8_to_byte (n : nat) =
  match Map.find_opt n bytes_conv_map with
  | None -> (failwith "" : bytes)
  | Some b -> b


[@inline]
let uint4_to_hex_digit (n : nat) =
  match Map.find_opt n hexdigit_conv_map with
  | None -> (failwith "" : string)
  | Some s -> s


[@inline]
let byte_to_hex (b : bytes) =
  match Map.find_opt b hexbytes_conv_map with
  | None -> (failwith "" : string)
  | Some s -> s

let nth_byte (number : nat) (n : nat) : bytes =
  uint8_to_byte (nth_nat_byte number n)


[@inline]
let nat_to_uint64_big_endian (number : nat) : bytes =
  if number > (max_uint64 ())
  then (failwith "BAD_UINT64_NAT" : bytes)
  else
    concat_bytes
      [nth_byte number 7n;
       nth_byte number 6n;
       nth_byte number 5n;
       nth_byte number 4n;
       nth_byte number 3n;
       nth_byte number 2n;
       nth_byte number 1n;
       nth_byte number 0n]

let rec nat_to_0x_hex_big_endian_rec ((number : nat), (acc : string)) : string =
  if number = 0n
  then String.concat "0x" acc
  else
    (let last_uint4 = number land 15n in
     let hex_digit = uint4_to_hex_digit last_uint4 in
     let acc = String.concat hex_digit acc in
     let number = number lsr 4n in nat_to_0x_hex_big_endian_rec (number, acc))

let nat_to_0x_hex_big_endian (number : nat) : string =
  if number = 0n then "0x0" else nat_to_0x_hex_big_endian_rec (number, "")


[@inline]
let timestamp_to_seconds_since_epoch (timestamp : timestamp) : nat =
  match is_nat (timestamp - (0 : timestamp)) with
  | None -> (failwith "" : nat)
  | Some s -> s

let timestamp_to_uint64_big_endian (timestamp : timestamp) : bytes =
  nat_to_uint64_big_endian (timestamp_to_seconds_since_epoch timestamp)

let drop_n_first_bytes (b : bytes) (n : nat) : bytes =
  let len = Bytes.length b in
  let rem_len =
    match is_nat (len - n) with
    | None -> (failwith "INVALID_DROP_N" : nat)
    | Some l -> l in
  Bytes.sub n rem_len b

let rec bytes_to_hex_rec ((n : nat), (acc : string), (b : bytes), (length_b : nat)) : string =
  if n >= length_b
  then acc
  else
    (let nth_byte = Bytes.sub n 1n b in
     let nth_hex = byte_to_hex nth_byte in
     bytes_to_hex_rec ((n + 1n), (String.concat acc nth_hex), b, length_b))


[@inline]
let bytes_to_hex (b : bytes) : string =
  bytes_to_hex_rec (0n, "", b, (Bytes.length b))

let string_to_bytes (s : string) : bytes =
  drop_n_first_bytes (Bytes.pack s) 6n

let key_hash_to_bytes (k : key_hash) : bytes =
  drop_n_first_bytes (Bytes.pack k) 6n

let public_key_to_hex_string_bytes (k : key) : bytes =
  let k_bytes = drop_n_first_bytes (Bytes.pack k) 7n in
  let k_hex = bytes_to_hex k_bytes in string_to_bytes k_hex


[@inline]
let amount_to_bytes (a : token_amount) : bytes =
  string_to_bytes (nat_to_0x_hex_big_endian (nat_amount a))

let encode_tranfer_tokens_payload (p : transfer_tokens_param) =
  let { nonce = tt_nonce; asset_id = tt_asset_id; src_account = tt_src_account;
        dst_account = tt_dst_account; amount = tt_amount; shg = tt_shg;
        signature = _ }
    = p in
  let nonce =
    Bytes.concat tt_nonce.nonce
      (timestamp_to_uint64_big_endian tt_nonce.timestamp) in
  let operation = string_to_bytes "transfer" in
  let assetType = string_to_bytes "finp2p" in
  let assetId = unwrap_asset_id tt_asset_id in
  let accountType = string_to_bytes "finId" in
  let srcAccountType = accountType in
  let srcAccount = public_key_to_hex_string_bytes tt_src_account in
  let dstAccountType = accountType in
  let dstAccount = public_key_to_hex_string_bytes tt_dst_account in
  let amount_ = amount_to_bytes tt_amount in
  let asset_bytes_group =
    concat_bytes
      [nonce;
       operation;
       assetType;
       assetId;
       srcAccountType;
       srcAccount;
       dstAccountType;
       dstAccount;
       amount_] in
  let ahg = Crypto.blake2b asset_bytes_group in Bytes.concat ahg tt_shg

let encode_issue_tokens_payload (p : issue_tokens_param) =
  let { nonce = it_nonce; asset_id = it_asset_id; dst_account = it_dst_account;
        amount = it_amount; shg = it_shg; signature = _ }
    = p in
  let nonce =
    Bytes.concat it_nonce.nonce
      (timestamp_to_uint64_big_endian it_nonce.timestamp) in
  let operation = string_to_bytes "issue" in
  let assetType = string_to_bytes "finp2p" in
  let assetId = unwrap_asset_id it_asset_id in
  let dstAccountType = string_to_bytes "finId" in
  let dstAccount = public_key_to_hex_string_bytes it_dst_account in
  let amount_ = amount_to_bytes it_amount in
  let asset_bytes_group =
    concat_bytes
      [nonce;
       operation;
       assetType;
       assetId;
       dstAccountType;
       dstAccount;
       amount_] in
  let ahg = Crypto.blake2b asset_bytes_group in Bytes.concat ahg it_shg

let encode_redeem_tokens_payload (p : redeem_tokens_param) =
  let { nonce = rt_nonce; asset_id = rt_asset_id; src_account = _;
        amount = rt_amount; signature = _ }
    = p in
  let nonce =
    Bytes.concat rt_nonce.nonce
      (timestamp_to_uint64_big_endian rt_nonce.timestamp) in
  let operation = string_to_bytes "redeem" in
  let assetId = unwrap_asset_id rt_asset_id in
  let quantity = amount_to_bytes rt_amount in
  concat_bytes [nonce; operation; assetId; quantity]

let encode_hold_tokens_payload (p : hold_tokens_param) =
  let asset_bytes_group =
    let { nonce = ahg_nonce; asset_id = ahg_asset_id;
          src_account = ahg_src_account; dst_account = ahg_dst_account;
          amount = ahg_amount }
      = p.ahg in
    let nonce =
      Bytes.concat ahg_nonce.nonce
        (timestamp_to_uint64_big_endian ahg_nonce.timestamp) in
    let assetId = unwrap_asset_id ahg_asset_id in
    let finId = string_to_bytes "finId" in
    let srcAccount = public_key_to_hex_string_bytes ahg_src_account in
    let dstAccount = public_key_to_hex_string_bytes ahg_dst_account in
    let amount_ = unwrap_opaque ahg_amount in
    concat_bytes
      [nonce;
       string_to_bytes "transfer";
       string_to_bytes "finp2p";
       assetId;
       finId;
       srcAccount;
       finId;
       dstAccount;
       amount_] in
  let ahg = Crypto.blake2b asset_bytes_group in
  let settlement_bytes_group =
    let { asset_type = shg_asset_type; asset_id = shg_asset_id;
          src_account_type = shg_src_account_type;
          src_account = shg_src_account;
          dst_account_type = shg_dst_account_type;
          dst_account = shg_dst_account; amount = shg_amount;
          expiration = shg_expiration }
      = p.shg in
    let assetType = string_to_bytes shg_asset_type in
    let assetId = unwrap_asset_id shg_asset_id in
    let srcAccountType = unwrap_opaque shg_src_account_type in
    let srcAccount = unwrap_opaque shg_src_account in
    let dstAccountType =
      match shg_dst_account_type with
      | None -> empty_bytes ()
      | Some t -> string_to_bytes t in
    let dstAccount =
      match shg_dst_account with
      | None -> empty_bytes ()
      | Some (Other dst) -> unwrap_opaque dst
      | Some (Supported (FinId k)) -> public_key_to_hex_string_bytes k
      | Some (Supported (Tezos pkh)) -> key_hash_to_bytes pkh in
    let amount_ = amount_to_bytes shg_amount in
    let expiry = string_to_bytes (nat_to_0x_hex_big_endian shg_expiration) in
    concat_bytes
      [assetType;
       assetId;
       srcAccountType;
       srcAccount;
       dstAccountType;
       dstAccount;
       amount_;
       expiry] in
  let shg = Crypto.blake2b settlement_bytes_group in Bytes.concat ahg shg

let check_transfer_tokens_signature (p : transfer_tokens_param) : operation_hash =
  let payload = encode_tranfer_tokens_payload p in
  if not (Crypto.check p.src_account p.signature payload)
  then (failwith invalid_signature : operation_hash)
  else OpHash (Crypto.blake2b payload)

let check_issue_tokens_signature (p : issue_tokens_param) : operation_hash =
  let payload = encode_issue_tokens_payload p in
  let () =
    match p.signature with
    | None -> ()
    | Some signature ->
      if not (Crypto.check p.dst_account signature payload)
      then (failwith invalid_signature : unit) in
  OpHash (Crypto.blake2b payload)

let check_redeem_tokens_signature (p : redeem_tokens_param) : operation_hash =
  let payload = encode_redeem_tokens_payload p in
  if not (Crypto.check p.src_account p.signature payload)
  then (failwith invalid_signature : operation_hash)
  else OpHash (Crypto.blake2b payload)

let check_hold_tokens_signature (p : hold_tokens_param) : operation_hash =
  let buyer = p.ahg.dst_account in
  let payload = encode_hold_tokens_payload p in
  let () =
    match p.signature with
    | None ->
      if Tezos.sender <> (implicit_address (Crypto.hash_key buyer))
      then (failwith unauthorized : unit)
    | Some signature ->
      if not (Crypto.check buyer signature payload)
      then (failwith invalid_signature : unit) in
  OpHash (Crypto.blake2b payload)

#endif