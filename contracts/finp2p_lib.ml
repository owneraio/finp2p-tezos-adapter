include Errors
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

(* For Debug
 * let failwith_bytes (b : bytes list) : bytes =
 *   [%Michelson ({| { FAILWITH } |} : bytes list -> bytes)] b
 *   [@@inline] *)

(* int8 to bytes conversion maps *)

let bytes_conv_map : (nat, bytes) map =
  [%Michelson
    ({| {
DROP;
PUSH (map nat bytes) {
Elt 0 0x00;
Elt 1 0x01;
Elt 2 0x02;
Elt 3 0x03;
Elt 4 0x04;
Elt 5 0x05;
Elt 6 0x06;
Elt 7 0x07;
Elt 8 0x08;
Elt 9 0x09;
Elt 10 0x0a;
Elt 11 0x0b;
Elt 12 0x0c;
Elt 13 0x0d;
Elt 14 0x0e;
Elt 15 0x0f;
Elt 16 0x10;
Elt 17 0x11;
Elt 18 0x12;
Elt 19 0x13;
Elt 20 0x14;
Elt 21 0x15;
Elt 22 0x16;
Elt 23 0x17;
Elt 24 0x18;
Elt 25 0x19;
Elt 26 0x1a;
Elt 27 0x1b;
Elt 28 0x1c;
Elt 29 0x1d;
Elt 30 0x1e;
Elt 31 0x1f;
Elt 32 0x20;
Elt 33 0x21;
Elt 34 0x22;
Elt 35 0x23;
Elt 36 0x24;
Elt 37 0x25;
Elt 38 0x26;
Elt 39 0x27;
Elt 40 0x28;
Elt 41 0x29;
Elt 42 0x2a;
Elt 43 0x2b;
Elt 44 0x2c;
Elt 45 0x2d;
Elt 46 0x2e;
Elt 47 0x2f;
Elt 48 0x30;
Elt 49 0x31;
Elt 50 0x32;
Elt 51 0x33;
Elt 52 0x34;
Elt 53 0x35;
Elt 54 0x36;
Elt 55 0x37;
Elt 56 0x38;
Elt 57 0x39;
Elt 58 0x3a;
Elt 59 0x3b;
Elt 60 0x3c;
Elt 61 0x3d;
Elt 62 0x3e;
Elt 63 0x3f;
Elt 64 0x40;
Elt 65 0x41;
Elt 66 0x42;
Elt 67 0x43;
Elt 68 0x44;
Elt 69 0x45;
Elt 70 0x46;
Elt 71 0x47;
Elt 72 0x48;
Elt 73 0x49;
Elt 74 0x4a;
Elt 75 0x4b;
Elt 76 0x4c;
Elt 77 0x4d;
Elt 78 0x4e;
Elt 79 0x4f;
Elt 80 0x50;
Elt 81 0x51;
Elt 82 0x52;
Elt 83 0x53;
Elt 84 0x54;
Elt 85 0x55;
Elt 86 0x56;
Elt 87 0x57;
Elt 88 0x58;
Elt 89 0x59;
Elt 90 0x5a;
Elt 91 0x5b;
Elt 92 0x5c;
Elt 93 0x5d;
Elt 94 0x5e;
Elt 95 0x5f;
Elt 96 0x60;
Elt 97 0x61;
Elt 98 0x62;
Elt 99 0x63;
Elt 100 0x64;
Elt 101 0x65;
Elt 102 0x66;
Elt 103 0x67;
Elt 104 0x68;
Elt 105 0x69;
Elt 106 0x6a;
Elt 107 0x6b;
Elt 108 0x6c;
Elt 109 0x6d;
Elt 110 0x6e;
Elt 111 0x6f;
Elt 112 0x70;
Elt 113 0x71;
Elt 114 0x72;
Elt 115 0x73;
Elt 116 0x74;
Elt 117 0x75;
Elt 118 0x76;
Elt 119 0x77;
Elt 120 0x78;
Elt 121 0x79;
Elt 122 0x7a;
Elt 123 0x7b;
Elt 124 0x7c;
Elt 125 0x7d;
Elt 126 0x7e;
Elt 127 0x7f;
Elt 128 0x80;
Elt 129 0x81;
Elt 130 0x82;
Elt 131 0x83;
Elt 132 0x84;
Elt 133 0x85;
Elt 134 0x86;
Elt 135 0x87;
Elt 136 0x88;
Elt 137 0x89;
Elt 138 0x8a;
Elt 139 0x8b;
Elt 140 0x8c;
Elt 141 0x8d;
Elt 142 0x8e;
Elt 143 0x8f;
Elt 144 0x90;
Elt 145 0x91;
Elt 146 0x92;
Elt 147 0x93;
Elt 148 0x94;
Elt 149 0x95;
Elt 150 0x96;
Elt 151 0x97;
Elt 152 0x98;
Elt 153 0x99;
Elt 154 0x9a;
Elt 155 0x9b;
Elt 156 0x9c;
Elt 157 0x9d;
Elt 158 0x9e;
Elt 159 0x9f;
Elt 160 0xa0;
Elt 161 0xa1;
Elt 162 0xa2;
Elt 163 0xa3;
Elt 164 0xa4;
Elt 165 0xa5;
Elt 166 0xa6;
Elt 167 0xa7;
Elt 168 0xa8;
Elt 169 0xa9;
Elt 170 0xaa;
Elt 171 0xab;
Elt 172 0xac;
Elt 173 0xad;
Elt 174 0xae;
Elt 175 0xaf;
Elt 176 0xb0;
Elt 177 0xb1;
Elt 178 0xb2;
Elt 179 0xb3;
Elt 180 0xb4;
Elt 181 0xb5;
Elt 182 0xb6;
Elt 183 0xb7;
Elt 184 0xb8;
Elt 185 0xb9;
Elt 186 0xba;
Elt 187 0xbb;
Elt 188 0xbc;
Elt 189 0xbd;
Elt 190 0xbe;
Elt 191 0xbf;
Elt 192 0xc0;
Elt 193 0xc1;
Elt 194 0xc2;
Elt 195 0xc3;
Elt 196 0xc4;
Elt 197 0xc5;
Elt 198 0xc6;
Elt 199 0xc7;
Elt 200 0xc8;
Elt 201 0xc9;
Elt 202 0xca;
Elt 203 0xcb;
Elt 204 0xcc;
Elt 205 0xcd;
Elt 206 0xce;
Elt 207 0xcf;
Elt 208 0xd0;
Elt 209 0xd1;
Elt 210 0xd2;
Elt 211 0xd3;
Elt 212 0xd4;
Elt 213 0xd5;
Elt 214 0xd6;
Elt 215 0xd7;
Elt 216 0xd8;
Elt 217 0xd9;
Elt 218 0xda;
Elt 219 0xdb;
Elt 220 0xdc;
Elt 221 0xdd;
Elt 222 0xde;
Elt 223 0xdf;
Elt 224 0xe0;
Elt 225 0xe1;
Elt 226 0xe2;
Elt 227 0xe3;
Elt 228 0xe4;
Elt 229 0xe5;
Elt 230 0xe6;
Elt 231 0xe7;
Elt 232 0xe8;
Elt 233 0xe9;
Elt 234 0xea;
Elt 235 0xeb;
Elt 236 0xec;
Elt 237 0xed;
Elt 238 0xee;
Elt 239 0xef;
Elt 240 0xf0;
Elt 241 0xf1;
Elt 242 0xf2;
Elt 243 0xf3;
Elt 244 0xf4;
Elt 245 0xf5;
Elt 246 0xf6;
Elt 247 0xf7;
Elt 248 0xf8;
Elt 249 0xf9;
Elt 250 0xfa;
Elt 251 0xfb;
Elt 252 0xfc;
Elt 253 0xfd;
Elt 254 0xfe;
Elt 255 0xff;
} } |}
      : unit -> (nat, bytes) map)]
    ()

let hexdigit_conv_map : (nat, string) map =
  [%Michelson
    ({| {
DROP;
PUSH (map nat string) {
Elt 0 "0";
Elt 1 "1";
Elt 2 "2";
Elt 3 "3";
Elt 4 "4";
Elt 5 "5";
Elt 6 "6";
Elt 7 "7";
Elt 8 "8";
Elt 9 "9";
Elt 10 "a";
Elt 11 "b";
Elt 12 "c";
Elt 13 "d";
Elt 14 "e";
Elt 15 "f";
} } |}
      : unit -> (nat, string) map)]
    ()

let nth_nat_byte (number : nat) (n : nat) : nat =
  (number lsr (n * 8n)) land (* 0xff *) 255n

let nth_nat_hex_digit (number : nat) (n : nat) : nat =
  (number lsr (n * 4n)) land (* 0xf *) 15n

let uint8_to_byte (n : nat) =
  match Map.find_opt n bytes_conv_map with
  | None -> (failwith "" : bytes)
  | Some b -> b

let uint4_to_hex_digit (n : nat) =
  match Map.find_opt n hexdigit_conv_map with
  | None -> (failwith "" : string)
  | Some s -> s

let nth_byte (number : nat) (n : nat) : bytes =
  uint8_to_byte (nth_nat_byte number n)

let nth_hex_digit (number : nat) (n : nat) : string =
  uint4_to_hex_digit (nth_nat_hex_digit number n)

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

(* Cannot be inside the next function because to_mligo moves type annotations *)
let rec nat_to_0x_hex_int64_big_endian_rec
    ((number : nat), (n : nat), (acc : string list)) : string =
  let hex_digit = nth_hex_digit number n in
  let acc =
    if hex_digit = "0" then
      match acc with
      | [] -> (* prefix "0" *) acc
      | _ -> (* "0" in the middle *) hex_digit :: acc
    else hex_digit :: acc
  in
  match is_nat (n - 1n) with
  | None ->
      let digits =
        List.fold_left
          (fun ((acc : string list), (h : string)) -> h :: acc)
          ([] : string list)
          acc
      in
      concat_string ("0x" :: digits)
  | Some n -> nat_to_0x_hex_int64_big_endian_rec (number, n, acc)

let nat_to_0x_hex_int64_big_endian (number : nat) : string =
  if number > max_int64 () then (failwith "BAD_INT64_NAT" : string)
  else if number = 0n then "0x0"
  else nat_to_0x_hex_int64_big_endian_rec (number, 15n, ([] : string list))

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
let public_key_to_bytes (k : key) : bytes = drop_n_first_bytes (Bytes.pack k) 7n

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
  let assetType = string_to_bytes "finp2p" in
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
      (timestamp_to_int64_big_endian it_nonce.timestamp)
  in
  let operation = string_to_bytes "issue" in
  let assetType = string_to_bytes "finp2p" in
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
