include Errors
include Finp2p_conv
include Finp2p_proxy_types

(* let max_int64 = 9223372036854775807n *)
let max_int64 () : nat =
  [%Michelson ({| { DROP; PUSH nat 9223372036854775807 } |} : unit -> nat)] ()
  [@@inline]

(* Concat with lists, which is not supported by Ligo *)

let concat_bytes : bytes list -> bytes =
  [%Michelson ({| { CONCAT } |} : bytes list -> bytes)]

let concat_string : string list -> string =
  [%Michelson ({| { CONCAT } |} : string list -> string)]

let nth_nat_byte (number : nat) (n : nat) : nat =
  (number lsr (n * 8n)) land 255n
(* 0xff *)

(* Maybe have the mappings nat -> byte in storage
   TODO: Check gas consumption for deserialization + exec *)

let nth_byte (number : nat) (n : nat) : bytes =
  nat_to_byte (nth_nat_byte number n)

let nth_hex_byte (number : nat) (n : nat) : string =
  nat_to_hex_byte (nth_nat_byte number n)

let nat_to_int64_big_endian (number : nat) : bytes =
  if number > max_int64 () then (failwith "BAD_INT64_NAT" : bytes)
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

let nat_to_0x_hex_int64_big_endian (number : nat) : string =
  if number > max_int64 () then (failwith "BAD_INT64_NAT" : string)
  else
    concat_string
      [
        "0x";
        nth_hex_byte number 7n;
        nth_hex_byte number 6n;
        nth_hex_byte number 5n;
        nth_hex_byte number 4n;
        nth_hex_byte number 3n;
        nth_hex_byte number 2n;
        nth_hex_byte number 1n;
        nth_hex_byte number 0n;
      ]

let timestamp_to_int64_big_endian (timestamp : timestamp) : bytes =
  let seconds_since_epoch =
    match is_nat (timestamp - (0 : timestamp)) with
    | None -> (failwith "" : nat)
    | Some s -> s
  in
  nat_to_int64_big_endian seconds_since_epoch

let drop_n_first_bytes (b : bytes) (n : nat) : bytes =
  let len = Bytes.length b in
  let rem_len =
    match is_nat (len - n) with
    | None -> (failwith "INVALID_DROP_N" : nat)
    | Some l -> l
  in
  Bytes.sub n rem_len b

(*
Michelson encoding of public keys (secp256k1):
+---------------+------+------------------------------------------------------+
| Field         | Size | Value (example)
+---------------+------+------------------------------------------------------+
| Tag Micheline |    1 | 05
| Tag bytes     |    1 | 0a
| Size key      |    4 | 00000022
| Public Key    |   33 | 0102e6c73ddf68c94693de6aade4daa1c02a7c049de06a5a6613bbcd2329678a042b
+---------------+------+------------------------------------------------------+

Example:
Tezos secp256k1 key base 58:
  sppk7b4Gn2QNpCfDRJCrMDRYb3iS3wQDCTQNWc4y3qsReSMRDgCEzrq
Key in hexadecimal :
  0102e6c73ddf68c94693de6aade4daa1c02a7c049de06a5a6613bbcd2329678a042b
Packed key (as with Bytes.pack):
  0x050a000000220102e6c73ddf68c94693de6aade4daa1c02a7c049de06a5a6613bbcd2329678a042b
*)
let public_key_to_bytes (k : key) : bytes = drop_n_first_bytes (Bytes.pack k) 6n

(*
Michelson encoding of ASCII strings:
+---------------+------+-----------------+
| Field         | Size | Value (example) |
+---------------+------+-----------------+
| Tag Micheline |    1 | 05              |
| Tag string    |    1 | 01              |
| Size string   |    4 | 00000006        |
| Public Key    |   33 | 46696e503250    |
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

let amount_to_bytes (a : token_amount) : bytes =
  match a with Amount a -> string_to_bytes (nat_to_0x_hex_int64_big_endian a)

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
      (timestamp_to_int64_big_endian tt_nonce.timestamp)
  in
  let operation = string_to_bytes "transfer" in
  let assetType = string_to_bytes "pinp2p" in
  let assetId = match tt_asset_id with Asset_id id -> id in
  let accountType = string_to_bytes "finId" in
  let srcAccountType = accountType in
  let srcAccount = public_key_to_bytes tt_src_account in
  let dstAccountType = accountType in
  let dstAccount = public_key_to_bytes tt_dst_account in
  let amount_ = amount_to_bytes tt_amount in

  let asset_bytes_group =
    concat_bytes
      [
        nonce;
        operation;
        assetType;
        assetId;
        accountType;
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
    it_new_token_info = _;
  } =
    p
  in
  let nonce =
    Bytes.concat
      it_nonce.nonce
      (timestamp_to_int64_big_endian it_nonce.timestamp)
  in
  let operation = string_to_bytes "issue" in
  let assetType = string_to_bytes "pinp2p" in
  let assetId = match it_asset_id with Asset_id id -> id in
  let dstAccountType = string_to_bytes "finId" in
  let dstAccount = public_key_to_bytes it_dst_account in
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
      (timestamp_to_int64_big_endian rt_nonce.timestamp)
  in
  let operation = string_to_bytes "redeem" in
  let assetId = match rt_asset_id with Asset_id id -> id in
  let quantity = amount_to_bytes rt_amount in
  concat_bytes [nonce; operation; assetId; quantity]

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
