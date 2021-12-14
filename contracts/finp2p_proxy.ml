include Errors
include Fa2_sig
include Finp2p_proxy_types
include Finp2p_lib

let fail_not_admin (s : storage) =
  if not (Tezos.sender None = s.admin) then (failwith unauthorized : unit)

let is_operation_expired (op_timestamp : timestamp) (s : storage) : bool =
  Tezos.now None > op_timestamp + int s.operation_ttl

let is_operation_live (op_timestamp : timestamp) (s : storage) : bool =
  op_timestamp >= Tezos.now None && not (is_operation_expired op_timestamp s)

let address_of_key (k : key) : address =
  Tezos.address (Tezos.implicit_account None (Crypto.hash_key k))

let transfer_tokens (p : transfer_tokens_param) (s : storage) :
    operation list * storage =
  let () =
    if not (is_operation_live p.tt_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  let oph = check_transfer_tokens_signature p in
  let s =
    {
      s with
      live_operations = Big_map.add oph p.tt_nonce.timestamp s.live_operations;
    }
  in
  let fa2_token =
    match Big_map.find_opt p.tt_asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let tr_amount = match p.tt_amount with Amount a -> a in
  let _x = nat_to_int64_big_endian tr_amount in
  let fa2_transfer =
    {
      tr_src = address_of_key p.tt_src_account;
      tr_txs =
        [
          {
            tr_dst = address_of_key p.tt_dst_account;
            tr_token_id = fa2_token.id;
            tr_amount;
          };
        ];
    }
  in
  let transfer_ep = get_transfer_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None [fa2_transfer] 0t transfer_ep in
  ([relay_op], s)

let issue_tokens (p : issue_tokens_param) (s : storage) :
    operation list * storage =
  let () =
    if not (is_operation_live p.it_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  let oph = check_issue_tokens_signature p in
  let s =
    {
      s with
      live_operations = Big_map.add oph p.it_nonce.timestamp s.live_operations;
    }
  in
  let (fa2_token, mi_token_info) =
    match p.it_new_token_info with
    | None -> (
        (* Issuing more of an existing asset *)
        match Big_map.find_opt p.it_asset_id s.finp2p_assets with
        | None ->
            (failwith unknown_asset_id : fa2_token * (string, bytes) map option)
        | Some fa2_token -> (fa2_token, (None : (string, bytes) map option)))
    | Some (fa2_token, token_info) -> (
        (* Issuing new asset *)
        match Big_map.find_opt p.it_asset_id s.finp2p_assets with
        | Some _ ->
            (failwith asset_already_exists
              : fa2_token * (string, bytes) map option)
        | None -> (fa2_token, Some token_info))
  in
  let issued_amount = match p.it_amount with Amount a -> a in
  let fa2_mint =
    {
      mi_token_id = fa2_token.id;
      mi_token_info;
      mi_owners = [(address_of_key p.it_dst_account, issued_amount)];
    }
  in
  let mint_ep = get_mint_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_mint 0t mint_ep in
  ([relay_op], s)

let redeem_tokens (p : redeem_tokens_param) (s : storage) :
    operation list * storage =
  let () =
    if not (is_operation_live p.rt_nonce.timestamp s) then
      (failwith op_not_live : unit)
  in
  let oph = check_redeem_tokens_signature p in
  let s =
    {
      s with
      live_operations = Big_map.add oph p.rt_nonce.timestamp s.live_operations;
    }
  in
  let fa2_token =
    match Big_map.find_opt p.rt_asset_id s.finp2p_assets with
    | None -> (failwith unknown_asset_id : fa2_token)
    | Some fa2_token -> fa2_token
  in
  let redeemed_amount = match p.rt_amount with Amount a -> a in
  let fa2_burn =
    {
      bu_token_id = fa2_token.id;
      bu_owners = [(address_of_key p.rt_src_account, redeemed_amount)];
    }
  in
  let burn_ep = get_burn_entrypoint fa2_token.address in
  let relay_op = Tezos.transaction None fa2_burn 0t burn_ep in
  ([relay_op], s)

let update_operation_ttl (operation_ttl : nat) (s : storage) =
  {s with operation_ttl}

let update_admin (admin : address) (s : storage) = {s with admin}

let update_fa2_token ((asset_id : asset_id), (fa2 : fa2_token)) (s : storage) =
  (* Check that the contract has the correct interface *)
  let () = check_fa2_contract fa2.address in
  {s with finp2p_assets = Big_map.add asset_id fa2 s.finp2p_assets}

(** This entry point removes expired operations (passed in argument) from the
    [live_operations] table *)
let cleanup (ops : operation_hash list) (s : storage) : storage =
  let live_operations =
    List.fold_left
      (fun ( (live_operations : (operation_hash, timestamp) big_map),
             (oph : operation_hash) ) ->
        match Big_map.find_opt oph live_operations with
        | None ->
            (* This operation is not known, ignore (don't fail) *)
            live_operations
        | Some op_timestamp ->
            if is_operation_expired op_timestamp s then
              (* Operation is expired, remove it because it cannot be relayed by
                 the proxy. No replay possible anymore. *)
              Big_map.remove oph live_operations
            else (* Operation is still live, ignore it *)
              live_operations)
      s.live_operations
      ops
  in
  {s with live_operations}

let finp2p_asset (p : finp2p_proxy_asset_param) (s : storage) :
    operation list * storage =
  match p with
  | Transfer_tokens p -> transfer_tokens p s
  | Issue_tokens p -> issue_tokens p s
  | Redeem_tokens p -> redeem_tokens p s

let finp2p_admin (p : finp2p_proxy_admin_param) (s : storage) :
    operation list * storage =
  let s =
    match p with
    | Update_operation_ttl p -> update_operation_ttl p s
    | Update_admin p -> update_admin p s
    | Update_fa2_token p -> update_fa2_token p s
  in
  (([] : operation list), s)

let main ((param, s) : finp2p_proxy_param * storage) : operation list * storage
    =
  match param with
  | Finp2p_asset p ->
      let () = fail_not_admin s in
      finp2p_asset p s
  | Finp2p_admin p ->
      let () = fail_not_admin s in
      finp2p_admin p s
  | Cleanup ops ->
      let s = cleanup ops s in
      (([] : operation list), s)

type storage = {h : bytes (* byte_conv_map : (nat, bytes * string) map *)}
[@@store]

let finp2p_encode ((p : finp2p_proxy_asset_param), (_s : storage)) :
    operation list * storage =
  ( ([] : operation list),
    let h =
      match p with
      | Transfer_tokens p ->
          encode_tranfer_tokens_payload p (* s.byte_conv_map *)
      | Issue_tokens p -> encode_issue_tokens_payload p (* s.byte_conv_map *)
      | Redeem_tokens p -> encode_redeem_tokens_payload p
      (* s.byte_conv_map *)
    in
    {h} )

let init : storage =
  {
    h =
      0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000h
      (* byte_conv_map = *)
      (* Map.literal
       *   [
       *     (0n, (0x00h, "00"));
       *     (1n, (0x01h, "01"));
       *     (2n, (0x02h, "02"));
       *     (3n, (0x03h, "03"));
       *     (4n, (0x04h, "04"));
       *     (5n, (0x05h, "05"));
       *     (6n, (0x06h, "06"));
       *     (7n, (0x07h, "07"));
       *     (8n, (0x08h, "08"));
       *     (9n, (0x09h, "09"));
       *     (10n, (0x0ah, "0a"));
       *     (11n, (0x0bh, "0b"));
       *     (12n, (0x0ch, "0c"));
       *     (13n, (0x0dh, "0d"));
       *     (14n, (0x0eh, "0e"));
       *     (15n, (0x0fh, "0f"));
       *     (16n, (0x10h, "10"));
       *     (17n, (0x11h, "11"));
       *     (18n, (0x12h, "12"));
       *     (19n, (0x13h, "13"));
       *     (20n, (0x14h, "14"));
       *     (21n, (0x15h, "15"));
       *     (22n, (0x16h, "16"));
       *     (23n, (0x17h, "17"));
       *     (24n, (0x18h, "18"));
       *     (25n, (0x19h, "19"));
       *     (26n, (0x1ah, "1a"));
       *     (27n, (0x1bh, "1b"));
       *     (28n, (0x1ch, "1c"));
       *     (29n, (0x1dh, "1d"));
       *     (30n, (0x1eh, "1e"));
       *     (31n, (0x1fh, "1f"));
       *     (32n, (0x20h, "20"));
       *     (33n, (0x21h, "21"));
       *     (34n, (0x22h, "22"));
       *     (35n, (0x23h, "23"));
       *     (36n, (0x24h, "24"));
       *     (37n, (0x25h, "25"));
       *     (38n, (0x26h, "26"));
       *     (39n, (0x27h, "27"));
       *     (40n, (0x28h, "28"));
       *     (41n, (0x29h, "29"));
       *     (42n, (0x2ah, "2a"));
       *     (43n, (0x2bh, "2b"));
       *     (44n, (0x2ch, "2c"));
       *     (45n, (0x2dh, "2d"));
       *     (46n, (0x2eh, "2e"));
       *     (47n, (0x2fh, "2f"));
       *     (48n, (0x30h, "30"));
       *     (49n, (0x31h, "31"));
       *     (50n, (0x32h, "32"));
       *     (51n, (0x33h, "33"));
       *     (52n, (0x34h, "34"));
       *     (53n, (0x35h, "35"));
       *     (54n, (0x36h, "36"));
       *     (55n, (0x37h, "37"));
       *     (56n, (0x38h, "38"));
       *     (57n, (0x39h, "39"));
       *     (58n, (0x3ah, "3a"));
       *     (59n, (0x3bh, "3b"));
       *     (60n, (0x3ch, "3c"));
       *     (61n, (0x3dh, "3d"));
       *     (62n, (0x3eh, "3e"));
       *     (63n, (0x3fh, "3f"));
       *     (64n, (0x40h, "40"));
       *     (65n, (0x41h, "41"));
       *     (66n, (0x42h, "42"));
       *     (67n, (0x43h, "43"));
       *     (68n, (0x44h, "44"));
       *     (69n, (0x45h, "45"));
       *     (70n, (0x46h, "46"));
       *     (71n, (0x47h, "47"));
       *     (72n, (0x48h, "48"));
       *     (73n, (0x49h, "49"));
       *     (74n, (0x4ah, "4a"));
       *     (75n, (0x4bh, "4b"));
       *     (76n, (0x4ch, "4c"));
       *     (77n, (0x4dh, "4d"));
       *     (78n, (0x4eh, "4e"));
       *     (79n, (0x4fh, "4f"));
       *     (80n, (0x50h, "50"));
       *     (81n, (0x51h, "51"));
       *     (82n, (0x52h, "52"));
       *     (83n, (0x53h, "53"));
       *     (84n, (0x54h, "54"));
       *     (85n, (0x55h, "55"));
       *     (86n, (0x56h, "56"));
       *     (87n, (0x57h, "57"));
       *     (88n, (0x58h, "58"));
       *     (89n, (0x59h, "59"));
       *     (90n, (0x5ah, "5a"));
       *     (91n, (0x5bh, "5b"));
       *     (92n, (0x5ch, "5c"));
       *     (93n, (0x5dh, "5d"));
       *     (94n, (0x5eh, "5e"));
       *     (95n, (0x5fh, "5f"));
       *     (96n, (0x60h, "60"));
       *     (97n, (0x61h, "61"));
       *     (98n, (0x62h, "62"));
       *     (99n, (0x63h, "63"));
       *     (100n, (0x64h, "64"));
       *     (101n, (0x65h, "65"));
       *     (102n, (0x66h, "66"));
       *     (103n, (0x67h, "67"));
       *     (104n, (0x68h, "68"));
       *     (105n, (0x69h, "69"));
       *     (106n, (0x6ah, "6a"));
       *     (107n, (0x6bh, "6b"));
       *     (108n, (0x6ch, "6c"));
       *     (109n, (0x6dh, "6d"));
       *     (110n, (0x6eh, "6e"));
       *     (111n, (0x6fh, "6f"));
       *     (112n, (0x70h, "70"));
       *     (113n, (0x71h, "71"));
       *     (114n, (0x72h, "72"));
       *     (115n, (0x73h, "73"));
       *     (116n, (0x74h, "74"));
       *     (117n, (0x75h, "75"));
       *     (118n, (0x76h, "76"));
       *     (119n, (0x77h, "77"));
       *     (120n, (0x78h, "78"));
       *     (121n, (0x79h, "79"));
       *     (122n, (0x7ah, "7a"));
       *     (123n, (0x7bh, "7b"));
       *     (124n, (0x7ch, "7c"));
       *     (125n, (0x7dh, "7d"));
       *     (126n, (0x7eh, "7e"));
       *     (127n, (0x7fh, "7f"));
       *     (128n, (0x80h, "80"));
       *     (129n, (0x81h, "81"));
       *     (130n, (0x82h, "82"));
       *     (131n, (0x83h, "83"));
       *     (132n, (0x84h, "84"));
       *     (133n, (0x85h, "85"));
       *     (134n, (0x86h, "86"));
       *     (135n, (0x87h, "87"));
       *     (136n, (0x88h, "88"));
       *     (137n, (0x89h, "89"));
       *     (138n, (0x8ah, "8a"));
       *     (139n, (0x8bh, "8b"));
       *     (140n, (0x8ch, "8c"));
       *     (141n, (0x8dh, "8d"));
       *     (142n, (0x8eh, "8e"));
       *     (143n, (0x8fh, "8f"));
       *     (144n, (0x90h, "90"));
       *     (145n, (0x91h, "91"));
       *     (146n, (0x92h, "92"));
       *     (147n, (0x93h, "93"));
       *     (148n, (0x94h, "94"));
       *     (149n, (0x95h, "95"));
       *     (150n, (0x96h, "96"));
       *     (151n, (0x97h, "97"));
       *     (152n, (0x98h, "98"));
       *     (153n, (0x99h, "99"));
       *     (154n, (0x9ah, "9a"));
       *     (155n, (0x9bh, "9b"));
       *     (156n, (0x9ch, "9c"));
       *     (157n, (0x9dh, "9d"));
       *     (158n, (0x9eh, "9e"));
       *     (159n, (0x9fh, "9f"));
       *     (160n, (0xa0h, "a0"));
       *     (161n, (0xa1h, "a1"));
       *     (162n, (0xa2h, "a2"));
       *     (163n, (0xa3h, "a3"));
       *     (164n, (0xa4h, "a4"));
       *     (165n, (0xa5h, "a5"));
       *     (166n, (0xa6h, "a6"));
       *     (167n, (0xa7h, "a7"));
       *     (168n, (0xa8h, "a8"));
       *     (169n, (0xa9h, "a9"));
       *     (170n, (0xaah, "aa"));
       *     (171n, (0xabh, "ab"));
       *     (172n, (0xach, "ac"));
       *     (173n, (0xadh, "ad"));
       *     (174n, (0xaeh, "ae"));
       *     (175n, (0xafh, "af"));
       *     (176n, (0xb0h, "b0"));
       *     (177n, (0xb1h, "b1"));
       *     (178n, (0xb2h, "b2"));
       *     (179n, (0xb3h, "b3"));
       *     (180n, (0xb4h, "b4"));
       *     (181n, (0xb5h, "b5"));
       *     (182n, (0xb6h, "b6"));
       *     (183n, (0xb7h, "b7"));
       *     (184n, (0xb8h, "b8"));
       *     (185n, (0xb9h, "b9"));
       *     (186n, (0xbah, "ba"));
       *     (187n, (0xbbh, "bb"));
       *     (188n, (0xbch, "bc"));
       *     (189n, (0xbdh, "bd"));
       *     (190n, (0xbeh, "be"));
       *     (191n, (0xbfh, "bf"));
       *     (192n, (0xc0h, "c0"));
       *     (193n, (0xc1h, "c1"));
       *     (194n, (0xc2h, "c2"));
       *     (195n, (0xc3h, "c3"));
       *     (196n, (0xc4h, "c4"));
       *     (197n, (0xc5h, "c5"));
       *     (198n, (0xc6h, "c6"));
       *     (199n, (0xc7h, "c7"));
       *     (200n, (0xc8h, "c8"));
       *     (201n, (0xc9h, "c9"));
       *     (202n, (0xcah, "ca"));
       *     (203n, (0xcbh, "cb"));
       *     (204n, (0xcch, "cc"));
       *     (205n, (0xcdh, "cd"));
       *     (206n, (0xceh, "ce"));
       *     (207n, (0xcfh, "cf"));
       *     (208n, (0xd0h, "d0"));
       *     (209n, (0xd1h, "d1"));
       *     (210n, (0xd2h, "d2"));
       *     (211n, (0xd3h, "d3"));
       *     (212n, (0xd4h, "d4"));
       *     (213n, (0xd5h, "d5"));
       *     (214n, (0xd6h, "d6"));
       *     (215n, (0xd7h, "d7"));
       *     (216n, (0xd8h, "d8"));
       *     (217n, (0xd9h, "d9"));
       *     (218n, (0xdah, "da"));
       *     (219n, (0xdbh, "db"));
       *     (220n, (0xdch, "dc"));
       *     (221n, (0xddh, "dd"));
       *     (222n, (0xdeh, "de"));
       *     (223n, (0xdfh, "df"));
       *     (224n, (0xe0h, "e0"));
       *     (225n, (0xe1h, "e1"));
       *     (226n, (0xe2h, "e2"));
       *     (227n, (0xe3h, "e3"));
       *     (228n, (0xe4h, "e4"));
       *     (229n, (0xe5h, "e5"));
       *     (230n, (0xe6h, "e6"));
       *     (231n, (0xe7h, "e7"));
       *     (232n, (0xe8h, "e8"));
       *     (233n, (0xe9h, "e9"));
       *     (234n, (0xeah, "ea"));
       *     (235n, (0xebh, "eb"));
       *     (236n, (0xech, "ec"));
       *     (237n, (0xedh, "ed"));
       *     (238n, (0xeeh, "ee"));
       *     (239n, (0xefh, "ef"));
       *     (240n, (0xf0h, "f0"));
       *     (241n, (0xf1h, "f1"));
       *     (242n, (0xf2h, "f2"));
       *     (243n, (0xf3h, "f3"));
       *     (244n, (0xf4h, "f4"));
       *     (245n, (0xf5h, "f5"));
       *     (246n, (0xf6h, "f6"));
       *     (247n, (0xf7h, "f7"));
       *     (248n, (0xf8h, "f8"));
       *     (249n, (0xf9h, "f9"));
       *     (250n, (0xfah, "fa"));
       *     (251n, (0xfbh, "fb"));
       *     (252n, (0xfch, "fc"));
       *     (253n, (0xfdh, "fd"));
       *     (254n, (0xfeh, "fe"));
       *     (255n, (0xffh, "ff"));
       *   ]; *);
  }
