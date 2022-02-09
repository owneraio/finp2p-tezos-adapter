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

(* Cannot write empty bytes 0x in mligo *)
let[@inline] empty_bytes () : bytes =
  [%Michelson ({|{ DROP; PUSH bytes 0x }|} : unit -> bytes)] ()

let[@inline] unwrap_asset_id (id : asset_id) : bytes =
  match id with Asset_id id -> id

let[@inline] unwrap_finp2p_hold_id (id : finp2p_hold_id) : bytes =
  match id with Finp2p_hold_id id -> id

let[@inline] unwrap_opaque (o : opaque) : bytes = match o with Opaque o -> o

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
Michelson encoding of publick key hash:
+---------------+------+-------------------------------------------+
| Field         | Size | Value (example)
+---------------+------+-------------------------------------------+
| Tag Micheline |    1 | 05
| Tag bytes     |    1 | 0a
| Size bytes    |    4 | 00000015
| Bytes         |   21 | 012df062995efb728506f005bc5b4ac437291c722e
+---------------+------+-------------------------------------------+

First byte (in Bytes field) is for curve:
  - 00 -> tz1
  - 01 -> tz2
  - 02 -> tz3
We keep it.
*)
let key_hash_to_bytes (k : key_hash) : bytes =
  drop_n_first_bytes (Bytes.pack k) 6n

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
  let assetId = unwrap_asset_id tt_asset_id in
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
  let assetId = unwrap_asset_id it_asset_id in
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
  let assetId = unwrap_asset_id rt_asset_id in
  let quantity = amount_to_bytes rt_amount in
  concat_bytes [nonce; operation; assetId; quantity]

let encode_hold_tokens_payload (p : hold_tokens_param) =
  (* AHG *)
  let asset_bytes_group =
    let {ahg_nonce; ahg_asset_id; ahg_src_account; ahg_dst_account; ahg_amount}
        =
      p.ht_ahg
    in
    let nonce =
      Bytes.concat
        ahg_nonce.nonce
        (timestamp_to_uint64_big_endian ahg_nonce.timestamp)
    in
    let assetId = unwrap_asset_id ahg_asset_id in
    let finId = string_to_bytes "finId" in
    let srcAccount = public_key_to_hex_string_bytes ahg_src_account in
    let dstAccount = public_key_to_hex_string_bytes ahg_dst_account in
    let amount_ = unwrap_opaque ahg_amount in
    concat_bytes
      [
        nonce;
        string_to_bytes "transfer";
        string_to_bytes "finp2p";
        assetId;
        finId;
        srcAccount;
        finId;
        dstAccount;
        amount_;
      ]
  in
  let ahg = Crypto.blake2b asset_bytes_group in
  (* SHG *)
  let settlement_bytes_group =
    let {
      shg_asset_type;
      shg_asset_id;
      shg_src_account_type;
      shg_src_account;
      shg_dst_account_type;
      shg_dst_account;
      shg_amount;
      shg_expiration;
    } =
      p.ht_shg
    in
    let assetType = string_to_bytes shg_asset_type in
    let assetId = unwrap_asset_id shg_asset_id in
    let srcAccountType = unwrap_opaque shg_src_account_type in
    let srcAccount = unwrap_opaque shg_src_account in
    let dstAccountType =
      match shg_dst_account_type with
      | None -> empty_bytes ()
      | Some t -> string_to_bytes t
    in
    let dstAccount =
      match shg_dst_account with
      | None -> empty_bytes ()
      | Some (Other dst) -> unwrap_opaque dst
      | Some (Supported (FinId k)) -> public_key_to_hex_string_bytes k
      | Some (Supported (Tezos pkh)) -> key_hash_to_bytes pkh
    in
    let amount_ = amount_to_bytes shg_amount in
    let expiry = string_to_bytes (timestamp_0x_hex_big_endian shg_expiration) in
    concat_bytes
      [
        assetType;
        assetId;
        srcAccountType;
        srcAccount;
        dstAccountType;
        dstAccount;
        amount_;
        expiry;
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
  let buyer = p.ht_ahg.ahg_dst_account in
  if not (Crypto.check buyer p.ht_signature payload) then
    (failwith invalid_signature : operation_hash)
  else OpHash (Crypto.blake2b payload)
