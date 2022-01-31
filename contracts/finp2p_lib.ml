include Errors
include Utils
include Finp2p_proxy_types
include Finp2p_conv_maps

(* let max_uint64 = 18446744073709551615n *)
let max_uint64 () : nat =
  [%Michelson ({| { DROP; PUSH nat 18446744073709551615 } |} : unit -> nat)] ()
  [@@inline]

(* Concat with lists, which is not supported by Ligo *)

let concat_bytes : bytes list -> bytes =
  [%Michelson ({| { CONCAT } |} : bytes list -> bytes)]

let concat_string : string list -> string =
  [%Michelson ({| { CONCAT } |} : string list -> string)]

(* For Debug
 * let failwith_bytes (b : bytes list) : bytes =
 *   [%Michelson ({| { FAILWITH } |} : bytes list -> bytes)] b
 *   [@@inline] *)

let[@inline] nth_nat_byte (number : nat) (n : nat) : nat =
  (number lsr (n * 8n)) land (* 0xff *) 255n

let[@inline] uint8_to_byte (n : nat) =
  match Map.find_opt n bytes_conv_map with
  | None -> (failwith "" : bytes)
  | Some b -> b

let[@inline] uint4_to_hex_digit (n : nat) =
  match Map.find_opt n hexdigit_conv_map with
  | None -> (failwith "" : string)
  | Some s -> s

let[@inline] byte_to_hex (b : bytes) =
  match Map.find_opt b hexbytes_conv_map with
  | None -> (failwith "" : string)
  | Some s -> s

let nth_byte (number : nat) (n : nat) : bytes =
  uint8_to_byte (nth_nat_byte number n)

let[@inline] nat_to_uint64_big_endian (number : nat) : bytes =
  if number > max_uint64 () then (failwith "BAD_UINT64_NAT" : bytes)
  else
    concat_bytes
      [
        nth_byte number 7n;
        nth_byte number 6n;
        nth_byte number 5n;
        nth_byte number 4n;
        nth_byte number 3n;
        nth_byte number 2n;
        nth_byte number 1n;
        nth_byte number 0n;
      ]

(* Cannot be inside the next function because to_mligo moves type annotations *)
let rec nat_to_0x_hex_big_endian_rec ((number : nat), (acc : string)) : string =
  if number = 0n then String.concat "0x" acc
  else
    let last_uint4 = number land (* 0xf *) 15n in
    let hex_digit = uint4_to_hex_digit last_uint4 in
    let acc = String.concat hex_digit acc in
    let number = number lsr 4n in
    nat_to_0x_hex_big_endian_rec (number, acc)

let nat_to_0x_hex_big_endian (number : nat) : string =
  if number = 0n then "0x0" else nat_to_0x_hex_big_endian_rec (number, "")

let[@inline] timestamp_to_seconds_since_epoch (timestamp : timestamp) : nat =
  match is_nat (timestamp - (0 : timestamp)) with
  | None -> (failwith "" : nat)
  | Some s -> s

let timestamp_to_uint64_big_endian (timestamp : timestamp) : bytes =
  nat_to_uint64_big_endian (timestamp_to_seconds_since_epoch timestamp)

let timestamp_0x_hex_big_endian (timestamp : timestamp) : string =
  nat_to_0x_hex_big_endian (timestamp_to_seconds_since_epoch timestamp)

let drop_n_first_bytes (b : bytes) (n : nat) : bytes =
  let len = Bytes.length b in
  let rem_len =
    match is_nat (len - n) with
    | None -> (failwith "INVALID_DROP_N" : nat)
    | Some l -> l
  in
  Bytes.sub n rem_len b

let rec bytes_to_hex_rec
    ((n : nat), (acc : string), (b : bytes), (length_b : nat)) : string =
  if n >= length_b then acc
  else
    let nth_byte = Bytes.sub n 1n b in
    let nth_hex = byte_to_hex nth_byte in
    bytes_to_hex_rec (n + 1n, String.concat acc nth_hex, b, length_b)

let[@inline] bytes_to_hex (b : bytes) : string =
  bytes_to_hex_rec (0n, "", b, Bytes.length b)

(*
Michelson encoding of ASCII strings:
+---------------+------+-----------------+
| Field         | Size | Value (example) |
+---------------+------+-----------------+
| Tag Micheline |    1 | 05              |
| Tag string    |    1 | 01              |
| Size string   |    4 | 00000006 (=S)   |
| String        | S= 6 | 46696e503250    |
+---------------+------+-----------------+

Example:
Tezos string:
  "FinP2P"
Hexadecimal ascii encoding of string (coincide with utf8 encoding for ascii
subset):
  46696e503250
Packed key (as with Bytes.pack):
  0x05010000000646696e503250
*)
let string_to_bytes (s : string) : bytes = drop_n_first_bytes (Bytes.pack s) 6n

(*
Michelson encoding of public keys (secp256k1):
+---------------+------+------------------------------------------------------+
| Field         | Size | Value (example)
+---------------+------+------------------------------------------------------+
| Tag Micheline |    1 | 05
| Tag bytes     |    1 | 0a
| Size key      |    4 | 00000022 = 34
| Secp256k1 tag |    1 | 01
| Public Key    |   33 | 02e6c73ddf68c94693de6aade4daa1c02a7c049de06a5a6613bbcd2329678a042b
+---------------+------+------------------------------------------------------+

Example:
Tezos secp256k1 key base 58:
  sppk7b4Gn2QNpCfDRJCrMDRYb3iS3wQDCTQNWc4y3qsReSMRDgCEzrq
Key in hexadecimal :
  0102e6c73ddf68c94693de6aade4daa1c02a7c049de06a5a6613bbcd2329678a042b
Packed key (as with Bytes.pack):
  0x050a000000220102e6c73ddf68c94693de6aade4daa1c02a7c049de06a5a6613bbcd2329678a042b
*)
let public_key_to_hex_string_bytes (k : key) : bytes =
  let k_bytes = drop_n_first_bytes (Bytes.pack k) 7n in
  let k_hex = bytes_to_hex k_bytes in
  string_to_bytes k_hex

let[@inline] amount_to_bytes (a : token_amount) : bytes =
  string_to_bytes (nat_to_0x_hex_big_endian (nat_amount a))

let encode_tranfer_tokens_payload (p : transfer_tokens_param) =
  let {
    tt_nonce;
    tt_asset_id;
    tt_src_account;
    tt_dst_account;
    tt_amount;
    tt_shg;
    tt_signature = _;
  } =
    p
  in
  let nonce =
    Bytes.concat
      tt_nonce.nonce
      (timestamp_to_uint64_big_endian tt_nonce.timestamp)
  in
  let operation = string_to_bytes "transfer" in
  let assetType = string_to_bytes "finp2p" in
  let assetId = match tt_asset_id with Asset_id id -> id in
  let accountType = string_to_bytes "finId" in
  let srcAccountType = accountType in
  let srcAccount = public_key_to_hex_string_bytes tt_src_account in
  let dstAccountType = accountType in
  let dstAccount = public_key_to_hex_string_bytes tt_dst_account in
  let amount_ = amount_to_bytes tt_amount in

  let asset_bytes_group =
    concat_bytes
      [
        nonce;
        operation;
        assetType;
        assetId;
        srcAccountType;
        srcAccount;
        dstAccountType;
        dstAccount;
        amount_;
      ]
  in
  let ahg = Crypto.blake2b asset_bytes_group in
  Bytes.concat ahg tt_shg

let encode_issue_tokens_payload (p : issue_tokens_param) =
  let {
    it_nonce;
    it_asset_id;
    it_dst_account;
    it_amount;
    it_shg;
    it_signature = _;
  } =
    p
  in
  let nonce =
    Bytes.concat
      it_nonce.nonce
      (timestamp_to_uint64_big_endian it_nonce.timestamp)
  in
  let operation = string_to_bytes "issue" in
  let assetType = string_to_bytes "finp2p" in
  let assetId = match it_asset_id with Asset_id id -> id in
  let dstAccountType = string_to_bytes "finId" in
  let dstAccount = public_key_to_hex_string_bytes it_dst_account in
  let amount_ = amount_to_bytes it_amount in

  let asset_bytes_group =
    concat_bytes
      [
        nonce; operation; assetType; assetId; dstAccountType; dstAccount; amount_;
      ]
  in
  let ahg = Crypto.blake2b asset_bytes_group in
  Bytes.concat ahg it_shg

let encode_redeem_tokens_payload (p : redeem_tokens_param) =
  let {rt_nonce; rt_asset_id; rt_src_account = _; rt_amount; rt_signature = _} =
    p
  in
  let nonce =
    Bytes.concat
      rt_nonce.nonce
      (timestamp_to_uint64_big_endian rt_nonce.timestamp)
  in
  let operation = string_to_bytes "redeem" in
  let assetId = match rt_asset_id with Asset_id id -> id in
  let quantity = amount_to_bytes rt_amount in
  concat_bytes [nonce; operation; assetId; quantity]

let encode_hold_tokens_payload (p : hold_tokens_param) =
  let {
    ht_hold_id = _;
    ht_asset_id;
    ht_amount;
    ht_src_account;
    ht_dst_account;
    ht_expiration;
    ht_nonce;
    ht_ahg_wo_nonce;
    ht_signature = _;
  } =
    p
  in
  (* AHG *)
  let nonce =
    Bytes.concat
      ht_nonce.nonce
      (timestamp_to_uint64_big_endian ht_nonce.timestamp)
  in
  let asset_bytes_group = Bytes.concat nonce ht_ahg_wo_nonce in
  let ahg = Crypto.blake2b asset_bytes_group in
  (* SHG *)
  let assetType = string_to_bytes "finp2p" in
  let assetId = match ht_asset_id with Asset_id id -> id in
  let accountType = string_to_bytes "finId" in
  let srcAccountType = accountType in
  let srcAccount = public_key_to_hex_string_bytes ht_src_account in
  let amount_ = amount_to_bytes ht_amount in
  let expiry = string_to_bytes (timestamp_0x_hex_big_endian ht_expiration) in

  let dst_info =
    match ht_dst_account with
    | None ->
        (* Cannot write empty bytes 0x in mligo *)
        [%Michelson ({|{ DROP; PUSH bytes 0x }|} : unit -> bytes)] ()
    | Some dst_account ->
        let dstAccountType = accountType in
        (* XXX escrow, wallet ? *)
        let dstAccount = public_key_to_hex_string_bytes dst_account in
        Bytes.concat dstAccountType dstAccount
  in

  let settlement_bytes_group =
    concat_bytes
      [
        assetType; assetId; srcAccountType; srcAccount; dst_info; amount_; expiry;
      ]
  in
  let shg = Crypto.blake2b settlement_bytes_group in
  Bytes.concat ahg shg

let check_transfer_tokens_signature (p : transfer_tokens_param) : operation_hash
    =
  let payload = encode_tranfer_tokens_payload p in
  if not (Crypto.check p.tt_src_account p.tt_signature payload) then
    (failwith invalid_signature : operation_hash)
  else OpHash (Crypto.blake2b payload)

let check_issue_tokens_signature (p : issue_tokens_param) : operation_hash =
  let payload = encode_issue_tokens_payload p in
  let () =
    match p.it_signature with
    | None -> (* skip signature check *) ()
    | Some signature ->
        if not (Crypto.check p.it_dst_account signature payload) then
          (failwith invalid_signature : unit)
  in
  OpHash (Crypto.blake2b payload)

let check_redeem_tokens_signature (p : redeem_tokens_param) : operation_hash =
  let payload = encode_redeem_tokens_payload p in
  if not (Crypto.check p.rt_src_account p.rt_signature payload) then
    (failwith invalid_signature : operation_hash)
  else OpHash (Crypto.blake2b payload)

let check_hold_tokens_signature (p : hold_tokens_param) : operation_hash =
  let payload = encode_hold_tokens_payload p in
  if not (Crypto.check p.ht_src_account p.ht_signature payload) then
    (failwith invalid_signature : operation_hash)
  else OpHash (Crypto.blake2b payload)
