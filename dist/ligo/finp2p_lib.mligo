#if !FINP2P_LIB
#define FINP2P_LIB

#include "errors.mligo"
#include "finp2p_proxy_types.mligo"
#include "finp2p_conv_maps.mligo"
[@inline]
let max_int64 () : nat =
  ([%Michelson ({| { DROP; PUSH nat 9223372036854775807 } |} : unit -> nat)])
    ()

let concat_bytes  : bytes list -> bytes =
  [%Michelson ({| { CONCAT } |} : bytes list -> bytes)]

let concat_string  : string list -> string =
  [%Michelson ({| { CONCAT } |} : string list -> string)]


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
let nat_to_int64_big_endian (number : nat) : bytes =
  if number > (max_int64 ())
  then (failwith "BAD_INT64_NAT" : bytes)
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

let timestamp_to_int64_big_endian (timestamp : timestamp) : bytes =
  let seconds_since_epoch =
    match is_nat (timestamp - (0 : timestamp)) with
    | None -> (failwith "" : nat)
    | Some s -> s in
  nat_to_int64_big_endian seconds_since_epoch

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

let public_key_to_hex_string_bytes (k : key) : bytes =
  let k_bytes = drop_n_first_bytes (Bytes.pack k) 7n in
  let k_hex = bytes_to_hex k_bytes in string_to_bytes k_hex

let amount_to_bytes (a : token_amount) : bytes =
  match a with | Amount a -> string_to_bytes (nat_to_0x_hex_big_endian a)

let encode_tranfer_tokens_payload (p : transfer_tokens_param) =
  let { nonce = tt_nonce; asset_id = tt_asset_id; src_account = tt_src_account;
        dst_account = tt_dst_account; amount = tt_amount; shg = tt_shg;
        signature = _ }
    = p in
  let nonce =
    Bytes.concat tt_nonce.nonce
      (timestamp_to_int64_big_endian tt_nonce.timestamp) in
  let operation = string_to_bytes "transfer" in
  let assetType = string_to_bytes "finp2p" in
  let assetId = match tt_asset_id with | Asset_id id -> id in
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
      (timestamp_to_int64_big_endian it_nonce.timestamp) in
  let operation = string_to_bytes "issue" in
  let assetType = string_to_bytes "finp2p" in
  let assetId = match it_asset_id with | Asset_id id -> id in
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
      (timestamp_to_int64_big_endian rt_nonce.timestamp) in
  let operation = string_to_bytes "redeem" in
  let assetId = match rt_asset_id with | Asset_id id -> id in
  let quantity = amount_to_bytes rt_amount in
  concat_bytes [nonce; operation; assetId; quantity]

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

#endif