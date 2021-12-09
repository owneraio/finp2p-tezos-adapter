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
