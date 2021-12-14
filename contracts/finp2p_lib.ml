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

(* let bytes_conv_map : (nat, bytes * string) map =
 *   Map.literal
 *     [
 *       (0n, (0x00h, "00"));
 *       (1n, (0x01h, "01"));
 *       (2n, (0x02h, "02"));
 *       (3n, (0x03h, "03"));
 *       (4n, (0x04h, "04"));
 *       (5n, (0x05h, "05"));
 *       (6n, (0x06h, "06"));
 *       (7n, (0x07h, "07"));
 *       (8n, (0x08h, "08"));
 *       (9n, (0x09h, "09"));
 *       (10n, (0x0ah, "0a"));
 *       (11n, (0x0bh, "0b"));
 *       (12n, (0x0ch, "0c"));
 *       (13n, (0x0dh, "0d"));
 *       (14n, (0x0eh, "0e"));
 *       (15n, (0x0fh, "0f"));
 *       (16n, (0x10h, "10"));
 *       (17n, (0x11h, "11"));
 *       (18n, (0x12h, "12"));
 *       (19n, (0x13h, "13"));
 *       (20n, (0x14h, "14"));
 *       (21n, (0x15h, "15"));
 *       (22n, (0x16h, "16"));
 *       (23n, (0x17h, "17"));
 *       (24n, (0x18h, "18"));
 *       (25n, (0x19h, "19"));
 *       (26n, (0x1ah, "1a"));
 *       (27n, (0x1bh, "1b"));
 *       (28n, (0x1ch, "1c"));
 *       (29n, (0x1dh, "1d"));
 *       (30n, (0x1eh, "1e"));
 *       (31n, (0x1fh, "1f"));
 *       (32n, (0x20h, "20"));
 *       (33n, (0x21h, "21"));
 *       (34n, (0x22h, "22"));
 *       (35n, (0x23h, "23"));
 *       (36n, (0x24h, "24"));
 *       (37n, (0x25h, "25"));
 *       (38n, (0x26h, "26"));
 *       (39n, (0x27h, "27"));
 *       (40n, (0x28h, "28"));
 *       (41n, (0x29h, "29"));
 *       (42n, (0x2ah, "2a"));
 *       (43n, (0x2bh, "2b"));
 *       (44n, (0x2ch, "2c"));
 *       (45n, (0x2dh, "2d"));
 *       (46n, (0x2eh, "2e"));
 *       (47n, (0x2fh, "2f"));
 *       (48n, (0x30h, "30"));
 *       (49n, (0x31h, "31"));
 *       (50n, (0x32h, "32"));
 *       (51n, (0x33h, "33"));
 *       (52n, (0x34h, "34"));
 *       (53n, (0x35h, "35"));
 *       (54n, (0x36h, "36"));
 *       (55n, (0x37h, "37"));
 *       (56n, (0x38h, "38"));
 *       (57n, (0x39h, "39"));
 *       (58n, (0x3ah, "3a"));
 *       (59n, (0x3bh, "3b"));
 *       (60n, (0x3ch, "3c"));
 *       (61n, (0x3dh, "3d"));
 *       (62n, (0x3eh, "3e"));
 *       (63n, (0x3fh, "3f"));
 *       (64n, (0x40h, "40"));
 *       (65n, (0x41h, "41"));
 *       (66n, (0x42h, "42"));
 *       (67n, (0x43h, "43"));
 *       (68n, (0x44h, "44"));
 *       (69n, (0x45h, "45"));
 *       (70n, (0x46h, "46"));
 *       (71n, (0x47h, "47"));
 *       (72n, (0x48h, "48"));
 *       (73n, (0x49h, "49"));
 *       (74n, (0x4ah, "4a"));
 *       (75n, (0x4bh, "4b"));
 *       (76n, (0x4ch, "4c"));
 *       (77n, (0x4dh, "4d"));
 *       (78n, (0x4eh, "4e"));
 *       (79n, (0x4fh, "4f"));
 *       (80n, (0x50h, "50"));
 *       (81n, (0x51h, "51"));
 *       (82n, (0x52h, "52"));
 *       (83n, (0x53h, "53"));
 *       (84n, (0x54h, "54"));
 *       (85n, (0x55h, "55"));
 *       (86n, (0x56h, "56"));
 *       (87n, (0x57h, "57"));
 *       (88n, (0x58h, "58"));
 *       (89n, (0x59h, "59"));
 *       (90n, (0x5ah, "5a"));
 *       (91n, (0x5bh, "5b"));
 *       (92n, (0x5ch, "5c"));
 *       (93n, (0x5dh, "5d"));
 *       (94n, (0x5eh, "5e"));
 *       (95n, (0x5fh, "5f"));
 *       (96n, (0x60h, "60"));
 *       (97n, (0x61h, "61"));
 *       (98n, (0x62h, "62"));
 *       (99n, (0x63h, "63"));
 *       (100n, (0x64h, "64"));
 *       (101n, (0x65h, "65"));
 *       (102n, (0x66h, "66"));
 *       (103n, (0x67h, "67"));
 *       (104n, (0x68h, "68"));
 *       (105n, (0x69h, "69"));
 *       (106n, (0x6ah, "6a"));
 *       (107n, (0x6bh, "6b"));
 *       (108n, (0x6ch, "6c"));
 *       (109n, (0x6dh, "6d"));
 *       (110n, (0x6eh, "6e"));
 *       (111n, (0x6fh, "6f"));
 *       (112n, (0x70h, "70"));
 *       (113n, (0x71h, "71"));
 *       (114n, (0x72h, "72"));
 *       (115n, (0x73h, "73"));
 *       (116n, (0x74h, "74"));
 *       (117n, (0x75h, "75"));
 *       (118n, (0x76h, "76"));
 *       (119n, (0x77h, "77"));
 *       (120n, (0x78h, "78"));
 *       (121n, (0x79h, "79"));
 *       (122n, (0x7ah, "7a"));
 *       (123n, (0x7bh, "7b"));
 *       (124n, (0x7ch, "7c"));
 *       (125n, (0x7dh, "7d"));
 *       (126n, (0x7eh, "7e"));
 *       (127n, (0x7fh, "7f"));
 *       (128n, (0x80h, "80"));
 *       (129n, (0x81h, "81"));
 *       (130n, (0x82h, "82"));
 *       (131n, (0x83h, "83"));
 *       (132n, (0x84h, "84"));
 *       (133n, (0x85h, "85"));
 *       (134n, (0x86h, "86"));
 *       (135n, (0x87h, "87"));
 *       (136n, (0x88h, "88"));
 *       (137n, (0x89h, "89"));
 *       (138n, (0x8ah, "8a"));
 *       (139n, (0x8bh, "8b"));
 *       (140n, (0x8ch, "8c"));
 *       (141n, (0x8dh, "8d"));
 *       (142n, (0x8eh, "8e"));
 *       (143n, (0x8fh, "8f"));
 *       (144n, (0x90h, "90"));
 *       (145n, (0x91h, "91"));
 *       (146n, (0x92h, "92"));
 *       (147n, (0x93h, "93"));
 *       (148n, (0x94h, "94"));
 *       (149n, (0x95h, "95"));
 *       (150n, (0x96h, "96"));
 *       (151n, (0x97h, "97"));
 *       (152n, (0x98h, "98"));
 *       (153n, (0x99h, "99"));
 *       (154n, (0x9ah, "9a"));
 *       (155n, (0x9bh, "9b"));
 *       (156n, (0x9ch, "9c"));
 *       (157n, (0x9dh, "9d"));
 *       (158n, (0x9eh, "9e"));
 *       (159n, (0x9fh, "9f"));
 *       (160n, (0xa0h, "a0"));
 *       (161n, (0xa1h, "a1"));
 *       (162n, (0xa2h, "a2"));
 *       (163n, (0xa3h, "a3"));
 *       (164n, (0xa4h, "a4"));
 *       (165n, (0xa5h, "a5"));
 *       (166n, (0xa6h, "a6"));
 *       (167n, (0xa7h, "a7"));
 *       (168n, (0xa8h, "a8"));
 *       (169n, (0xa9h, "a9"));
 *       (170n, (0xaah, "aa"));
 *       (171n, (0xabh, "ab"));
 *       (172n, (0xach, "ac"));
 *       (173n, (0xadh, "ad"));
 *       (174n, (0xaeh, "ae"));
 *       (175n, (0xafh, "af"));
 *       (176n, (0xb0h, "b0"));
 *       (177n, (0xb1h, "b1"));
 *       (178n, (0xb2h, "b2"));
 *       (179n, (0xb3h, "b3"));
 *       (180n, (0xb4h, "b4"));
 *       (181n, (0xb5h, "b5"));
 *       (182n, (0xb6h, "b6"));
 *       (183n, (0xb7h, "b7"));
 *       (184n, (0xb8h, "b8"));
 *       (185n, (0xb9h, "b9"));
 *       (186n, (0xbah, "ba"));
 *       (187n, (0xbbh, "bb"));
 *       (188n, (0xbch, "bc"));
 *       (189n, (0xbdh, "bd"));
 *       (190n, (0xbeh, "be"));
 *       (191n, (0xbfh, "bf"));
 *       (192n, (0xc0h, "c0"));
 *       (193n, (0xc1h, "c1"));
 *       (194n, (0xc2h, "c2"));
 *       (195n, (0xc3h, "c3"));
 *       (196n, (0xc4h, "c4"));
 *       (197n, (0xc5h, "c5"));
 *       (198n, (0xc6h, "c6"));
 *       (199n, (0xc7h, "c7"));
 *       (200n, (0xc8h, "c8"));
 *       (201n, (0xc9h, "c9"));
 *       (202n, (0xcah, "ca"));
 *       (203n, (0xcbh, "cb"));
 *       (204n, (0xcch, "cc"));
 *       (205n, (0xcdh, "cd"));
 *       (206n, (0xceh, "ce"));
 *       (207n, (0xcfh, "cf"));
 *       (208n, (0xd0h, "d0"));
 *       (209n, (0xd1h, "d1"));
 *       (210n, (0xd2h, "d2"));
 *       (211n, (0xd3h, "d3"));
 *       (212n, (0xd4h, "d4"));
 *       (213n, (0xd5h, "d5"));
 *       (214n, (0xd6h, "d6"));
 *       (215n, (0xd7h, "d7"));
 *       (216n, (0xd8h, "d8"));
 *       (217n, (0xd9h, "d9"));
 *       (218n, (0xdah, "da"));
 *       (219n, (0xdbh, "db"));
 *       (220n, (0xdch, "dc"));
 *       (221n, (0xddh, "dd"));
 *       (222n, (0xdeh, "de"));
 *       (223n, (0xdfh, "df"));
 *       (224n, (0xe0h, "e0"));
 *       (225n, (0xe1h, "e1"));
 *       (226n, (0xe2h, "e2"));
 *       (227n, (0xe3h, "e3"));
 *       (228n, (0xe4h, "e4"));
 *       (229n, (0xe5h, "e5"));
 *       (230n, (0xe6h, "e6"));
 *       (231n, (0xe7h, "e7"));
 *       (232n, (0xe8h, "e8"));
 *       (233n, (0xe9h, "e9"));
 *       (234n, (0xeah, "ea"));
 *       (235n, (0xebh, "eb"));
 *       (236n, (0xech, "ec"));
 *       (237n, (0xedh, "ed"));
 *       (238n, (0xeeh, "ee"));
 *       (239n, (0xefh, "ef"));
 *       (240n, (0xf0h, "f0"));
 *       (241n, (0xf1h, "f1"));
 *       (242n, (0xf2h, "f2"));
 *       (243n, (0xf3h, "f3"));
 *       (244n, (0xf4h, "f4"));
 *       (245n, (0xf5h, "f5"));
 *       (246n, (0xf6h, "f6"));
 *       (247n, (0xf7h, "f7"));
 *       (248n, (0xf8h, "f8"));
 *       (249n, (0xf9h, "f9"));
 *       (250n, (0xfah, "fa"));
 *       (251n, (0xfbh, "fb"));
 *       (252n, (0xfch, "fc"));
 *       (253n, (0xfdh, "fd"));
 *       (254n, (0xfeh, "fe"));
 *       (255n, (0xffh, "ff"));
 *     ] *)

let bytes_conv_map : (nat, bytes * string) map =
  [%Michelson
    ({| { DROP;
PUSH (map nat (pair bytes string)) { Elt 0 (Pair 0x00 "00");
Elt 1 (Pair 0x01 "01");
Elt 2 (Pair 0x02 "02");
Elt 3 (Pair 0x03 "03");
Elt 4 (Pair 0x04 "04");
Elt 5 (Pair 0x05 "05");
Elt 6 (Pair 0x06 "06");
Elt 7 (Pair 0x07 "07");
Elt 8 (Pair 0x08 "08");
Elt 9 (Pair 0x09 "09");
Elt 10 (Pair 0x0a "0a");
Elt 11 (Pair 0x0b "0b");
Elt 12 (Pair 0x0c "0c");
Elt 13 (Pair 0x0d "0d");
Elt 14 (Pair 0x0e "0e");
Elt 15 (Pair 0x0f "0f");
Elt 16 (Pair 0x10 "10");
Elt 17 (Pair 0x11 "11");
Elt 18 (Pair 0x12 "12");
Elt 19 (Pair 0x13 "13");
Elt 20 (Pair 0x14 "14");
Elt 21 (Pair 0x15 "15");
Elt 22 (Pair 0x16 "16");
Elt 23 (Pair 0x17 "17");
Elt 24 (Pair 0x18 "18");
Elt 25 (Pair 0x19 "19");
Elt 26 (Pair 0x1a "1a");
Elt 27 (Pair 0x1b "1b");
Elt 28 (Pair 0x1c "1c");
Elt 29 (Pair 0x1d "1d");
Elt 30 (Pair 0x1e "1e");
Elt 31 (Pair 0x1f "1f");
Elt 32 (Pair 0x20 "20");
Elt 33 (Pair 0x21 "21");
Elt 34 (Pair 0x22 "22");
Elt 35 (Pair 0x23 "23");
Elt 36 (Pair 0x24 "24");
Elt 37 (Pair 0x25 "25");
Elt 38 (Pair 0x26 "26");
Elt 39 (Pair 0x27 "27");
Elt 40 (Pair 0x28 "28");
Elt 41 (Pair 0x29 "29");
Elt 42 (Pair 0x2a "2a");
Elt 43 (Pair 0x2b "2b");
Elt 44 (Pair 0x2c "2c");
Elt 45 (Pair 0x2d "2d");
Elt 46 (Pair 0x2e "2e");
Elt 47 (Pair 0x2f "2f");
Elt 48 (Pair 0x30 "30");
Elt 49 (Pair 0x31 "31");
Elt 50 (Pair 0x32 "32");
Elt 51 (Pair 0x33 "33");
Elt 52 (Pair 0x34 "34");
Elt 53 (Pair 0x35 "35");
Elt 54 (Pair 0x36 "36");
Elt 55 (Pair 0x37 "37");
Elt 56 (Pair 0x38 "38");
Elt 57 (Pair 0x39 "39");
Elt 58 (Pair 0x3a "3a");
Elt 59 (Pair 0x3b "3b");
Elt 60 (Pair 0x3c "3c");
Elt 61 (Pair 0x3d "3d");
Elt 62 (Pair 0x3e "3e");
Elt 63 (Pair 0x3f "3f");
Elt 64 (Pair 0x40 "40");
Elt 65 (Pair 0x41 "41");
Elt 66 (Pair 0x42 "42");
Elt 67 (Pair 0x43 "43");
Elt 68 (Pair 0x44 "44");
Elt 69 (Pair 0x45 "45");
Elt 70 (Pair 0x46 "46");
Elt 71 (Pair 0x47 "47");
Elt 72 (Pair 0x48 "48");
Elt 73 (Pair 0x49 "49");
Elt 74 (Pair 0x4a "4a");
Elt 75 (Pair 0x4b "4b");
Elt 76 (Pair 0x4c "4c");
Elt 77 (Pair 0x4d "4d");
Elt 78 (Pair 0x4e "4e");
Elt 79 (Pair 0x4f "4f");
Elt 80 (Pair 0x50 "50");
Elt 81 (Pair 0x51 "51");
Elt 82 (Pair 0x52 "52");
Elt 83 (Pair 0x53 "53");
Elt 84 (Pair 0x54 "54");
Elt 85 (Pair 0x55 "55");
Elt 86 (Pair 0x56 "56");
Elt 87 (Pair 0x57 "57");
Elt 88 (Pair 0x58 "58");
Elt 89 (Pair 0x59 "59");
Elt 90 (Pair 0x5a "5a");
Elt 91 (Pair 0x5b "5b");
Elt 92 (Pair 0x5c "5c");
Elt 93 (Pair 0x5d "5d");
Elt 94 (Pair 0x5e "5e");
Elt 95 (Pair 0x5f "5f");
Elt 96 (Pair 0x60 "60");
Elt 97 (Pair 0x61 "61");
Elt 98 (Pair 0x62 "62");
Elt 99 (Pair 0x63 "63");
Elt 100 (Pair 0x64 "64");
Elt 101 (Pair 0x65 "65");
Elt 102 (Pair 0x66 "66");
Elt 103 (Pair 0x67 "67");
Elt 104 (Pair 0x68 "68");
Elt 105 (Pair 0x69 "69");
Elt 106 (Pair 0x6a "6a");
Elt 107 (Pair 0x6b "6b");
Elt 108 (Pair 0x6c "6c");
Elt 109 (Pair 0x6d "6d");
Elt 110 (Pair 0x6e "6e");
Elt 111 (Pair 0x6f "6f");
Elt 112 (Pair 0x70 "70");
Elt 113 (Pair 0x71 "71");
Elt 114 (Pair 0x72 "72");
Elt 115 (Pair 0x73 "73");
Elt 116 (Pair 0x74 "74");
Elt 117 (Pair 0x75 "75");
Elt 118 (Pair 0x76 "76");
Elt 119 (Pair 0x77 "77");
Elt 120 (Pair 0x78 "78");
Elt 121 (Pair 0x79 "79");
Elt 122 (Pair 0x7a "7a");
Elt 123 (Pair 0x7b "7b");
Elt 124 (Pair 0x7c "7c");
Elt 125 (Pair 0x7d "7d");
Elt 126 (Pair 0x7e "7e");
Elt 127 (Pair 0x7f "7f");
Elt 128 (Pair 0x80 "80");
Elt 129 (Pair 0x81 "81");
Elt 130 (Pair 0x82 "82");
Elt 131 (Pair 0x83 "83");
Elt 132 (Pair 0x84 "84");
Elt 133 (Pair 0x85 "85");
Elt 134 (Pair 0x86 "86");
Elt 135 (Pair 0x87 "87");
Elt 136 (Pair 0x88 "88");
Elt 137 (Pair 0x89 "89");
Elt 138 (Pair 0x8a "8a");
Elt 139 (Pair 0x8b "8b");
Elt 140 (Pair 0x8c "8c");
Elt 141 (Pair 0x8d "8d");
Elt 142 (Pair 0x8e "8e");
Elt 143 (Pair 0x8f "8f");
Elt 144 (Pair 0x90 "90");
Elt 145 (Pair 0x91 "91");
Elt 146 (Pair 0x92 "92");
Elt 147 (Pair 0x93 "93");
Elt 148 (Pair 0x94 "94");
Elt 149 (Pair 0x95 "95");
Elt 150 (Pair 0x96 "96");
Elt 151 (Pair 0x97 "97");
Elt 152 (Pair 0x98 "98");
Elt 153 (Pair 0x99 "99");
Elt 154 (Pair 0x9a "9a");
Elt 155 (Pair 0x9b "9b");
Elt 156 (Pair 0x9c "9c");
Elt 157 (Pair 0x9d "9d");
Elt 158 (Pair 0x9e "9e");
Elt 159 (Pair 0x9f "9f");
Elt 160 (Pair 0xa0 "a0");
Elt 161 (Pair 0xa1 "a1");
Elt 162 (Pair 0xa2 "a2");
Elt 163 (Pair 0xa3 "a3");
Elt 164 (Pair 0xa4 "a4");
Elt 165 (Pair 0xa5 "a5");
Elt 166 (Pair 0xa6 "a6");
Elt 167 (Pair 0xa7 "a7");
Elt 168 (Pair 0xa8 "a8");
Elt 169 (Pair 0xa9 "a9");
Elt 170 (Pair 0xaa "aa");
Elt 171 (Pair 0xab "ab");
Elt 172 (Pair 0xac "ac");
Elt 173 (Pair 0xad "ad");
Elt 174 (Pair 0xae "ae");
Elt 175 (Pair 0xaf "af");
Elt 176 (Pair 0xb0 "b0");
Elt 177 (Pair 0xb1 "b1");
Elt 178 (Pair 0xb2 "b2");
Elt 179 (Pair 0xb3 "b3");
Elt 180 (Pair 0xb4 "b4");
Elt 181 (Pair 0xb5 "b5");
Elt 182 (Pair 0xb6 "b6");
Elt 183 (Pair 0xb7 "b7");
Elt 184 (Pair 0xb8 "b8");
Elt 185 (Pair 0xb9 "b9");
Elt 186 (Pair 0xba "ba");
Elt 187 (Pair 0xbb "bb");
Elt 188 (Pair 0xbc "bc");
Elt 189 (Pair 0xbd "bd");
Elt 190 (Pair 0xbe "be");
Elt 191 (Pair 0xbf "bf");
Elt 192 (Pair 0xc0 "c0");
Elt 193 (Pair 0xc1 "c1");
Elt 194 (Pair 0xc2 "c2");
Elt 195 (Pair 0xc3 "c3");
Elt 196 (Pair 0xc4 "c4");
Elt 197 (Pair 0xc5 "c5");
Elt 198 (Pair 0xc6 "c6");
Elt 199 (Pair 0xc7 "c7");
Elt 200 (Pair 0xc8 "c8");
Elt 201 (Pair 0xc9 "c9");
Elt 202 (Pair 0xca "ca");
Elt 203 (Pair 0xcb "cb");
Elt 204 (Pair 0xcc "cc");
Elt 205 (Pair 0xcd "cd");
Elt 206 (Pair 0xce "ce");
Elt 207 (Pair 0xcf "cf");
Elt 208 (Pair 0xd0 "d0");
Elt 209 (Pair 0xd1 "d1");
Elt 210 (Pair 0xd2 "d2");
Elt 211 (Pair 0xd3 "d3");
Elt 212 (Pair 0xd4 "d4");
Elt 213 (Pair 0xd5 "d5");
Elt 214 (Pair 0xd6 "d6");
Elt 215 (Pair 0xd7 "d7");
Elt 216 (Pair 0xd8 "d8");
Elt 217 (Pair 0xd9 "d9");
Elt 218 (Pair 0xda "da");
Elt 219 (Pair 0xdb "db");
Elt 220 (Pair 0xdc "dc");
Elt 221 (Pair 0xdd "dd");
Elt 222 (Pair 0xde "de");
Elt 223 (Pair 0xdf "df");
Elt 224 (Pair 0xe0 "e0");
Elt 225 (Pair 0xe1 "e1");
Elt 226 (Pair 0xe2 "e2");
Elt 227 (Pair 0xe3 "e3");
Elt 228 (Pair 0xe4 "e4");
Elt 229 (Pair 0xe5 "e5");
Elt 230 (Pair 0xe6 "e6");
Elt 231 (Pair 0xe7 "e7");
Elt 232 (Pair 0xe8 "e8");
Elt 233 (Pair 0xe9 "e9");
Elt 234 (Pair 0xea "ea");
Elt 235 (Pair 0xeb "eb");
Elt 236 (Pair 0xec "ec");
Elt 237 (Pair 0xed "ed");
Elt 238 (Pair 0xee "ee");
Elt 239 (Pair 0xef "ef");
Elt 240 (Pair 0xf0 "f0");
Elt 241 (Pair 0xf1 "f1");
Elt 242 (Pair 0xf2 "f2");
Elt 243 (Pair 0xf3 "f3");
Elt 244 (Pair 0xf4 "f4");
Elt 245 (Pair 0xf5 "f5");
Elt 246 (Pair 0xf6 "f6");
Elt 247 (Pair 0xf7 "f7");
Elt 248 (Pair 0xf8 "f8");
Elt 249 (Pair 0xf9 "f9");
Elt 250 (Pair 0xfa "fa");
Elt 251 (Pair 0xfb "fb");
Elt 252 (Pair 0xfc "fc");
Elt 253 (Pair 0xfd "fd");
Elt 254 (Pair 0xfe "fe");
Elt 255 (Pair 0xff "ff") } } |}
      : unit -> (nat, bytes * string) map)]
    ()

let bytes_conv_map1 : (nat, bytes) map =
  [%Michelson
    ({| { DROP;
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
Elt 255 0xff } } |}
      : unit -> (nat, bytes) map)]
    ()

let bytes_conv_map2 : (nat, string) map =
  [%Michelson
    ({| { DROP;
PUSH (map nat string) {
Elt 0 "00";
Elt 1 "01";
Elt 2 "02";
Elt 3 "03";
Elt 4 "04";
Elt 5 "05";
Elt 6 "06";
Elt 7 "07";
Elt 8 "08";
Elt 9 "09";
Elt 10 "0a";
Elt 11 "0b";
Elt 12 "0c";
Elt 13 "0d";
Elt 14 "0e";
Elt 15 "0f";
Elt 16 "10";
Elt 17 "11";
Elt 18 "12";
Elt 19 "13";
Elt 20 "14";
Elt 21 "15";
Elt 22 "16";
Elt 23 "17";
Elt 24 "18";
Elt 25 "19";
Elt 26 "1a";
Elt 27 "1b";
Elt 28 "1c";
Elt 29 "1d";
Elt 30 "1e";
Elt 31 "1f";
Elt 32 "20";
Elt 33 "21";
Elt 34 "22";
Elt 35 "23";
Elt 36 "24";
Elt 37 "25";
Elt 38 "26";
Elt 39 "27";
Elt 40 "28";
Elt 41 "29";
Elt 42 "2a";
Elt 43 "2b";
Elt 44 "2c";
Elt 45 "2d";
Elt 46 "2e";
Elt 47 "2f";
Elt 48 "30";
Elt 49 "31";
Elt 50 "32";
Elt 51 "33";
Elt 52 "34";
Elt 53 "35";
Elt 54 "36";
Elt 55 "37";
Elt 56 "38";
Elt 57 "39";
Elt 58 "3a";
Elt 59 "3b";
Elt 60 "3c";
Elt 61 "3d";
Elt 62 "3e";
Elt 63 "3f";
Elt 64 "40";
Elt 65 "41";
Elt 66 "42";
Elt 67 "43";
Elt 68 "44";
Elt 69 "45";
Elt 70 "46";
Elt 71 "47";
Elt 72 "48";
Elt 73 "49";
Elt 74 "4a";
Elt 75 "4b";
Elt 76 "4c";
Elt 77 "4d";
Elt 78 "4e";
Elt 79 "4f";
Elt 80 "50";
Elt 81 "51";
Elt 82 "52";
Elt 83 "53";
Elt 84 "54";
Elt 85 "55";
Elt 86 "56";
Elt 87 "57";
Elt 88 "58";
Elt 89 "59";
Elt 90 "5a";
Elt 91 "5b";
Elt 92 "5c";
Elt 93 "5d";
Elt 94 "5e";
Elt 95 "5f";
Elt 96 "60";
Elt 97 "61";
Elt 98 "62";
Elt 99 "63";
Elt 100 "64";
Elt 101 "65";
Elt 102 "66";
Elt 103 "67";
Elt 104 "68";
Elt 105 "69";
Elt 106 "6a";
Elt 107 "6b";
Elt 108 "6c";
Elt 109 "6d";
Elt 110 "6e";
Elt 111 "6f";
Elt 112 "70";
Elt 113 "71";
Elt 114 "72";
Elt 115 "73";
Elt 116 "74";
Elt 117 "75";
Elt 118 "76";
Elt 119 "77";
Elt 120 "78";
Elt 121 "79";
Elt 122 "7a";
Elt 123 "7b";
Elt 124 "7c";
Elt 125 "7d";
Elt 126 "7e";
Elt 127 "7f";
Elt 128 "80";
Elt 129 "81";
Elt 130 "82";
Elt 131 "83";
Elt 132 "84";
Elt 133 "85";
Elt 134 "86";
Elt 135 "87";
Elt 136 "88";
Elt 137 "89";
Elt 138 "8a";
Elt 139 "8b";
Elt 140 "8c";
Elt 141 "8d";
Elt 142 "8e";
Elt 143 "8f";
Elt 144 "90";
Elt 145 "91";
Elt 146 "92";
Elt 147 "93";
Elt 148 "94";
Elt 149 "95";
Elt 150 "96";
Elt 151 "97";
Elt 152 "98";
Elt 153 "99";
Elt 154 "9a";
Elt 155 "9b";
Elt 156 "9c";
Elt 157 "9d";
Elt 158 "9e";
Elt 159 "9f";
Elt 160 "a0";
Elt 161 "a1";
Elt 162 "a2";
Elt 163 "a3";
Elt 164 "a4";
Elt 165 "a5";
Elt 166 "a6";
Elt 167 "a7";
Elt 168 "a8";
Elt 169 "a9";
Elt 170 "aa";
Elt 171 "ab";
Elt 172 "ac";
Elt 173 "ad";
Elt 174 "ae";
Elt 175 "af";
Elt 176 "b0";
Elt 177 "b1";
Elt 178 "b2";
Elt 179 "b3";
Elt 180 "b4";
Elt 181 "b5";
Elt 182 "b6";
Elt 183 "b7";
Elt 184 "b8";
Elt 185 "b9";
Elt 186 "ba";
Elt 187 "bb";
Elt 188 "bc";
Elt 189 "bd";
Elt 190 "be";
Elt 191 "bf";
Elt 192 "c0";
Elt 193 "c1";
Elt 194 "c2";
Elt 195 "c3";
Elt 196 "c4";
Elt 197 "c5";
Elt 198 "c6";
Elt 199 "c7";
Elt 200 "c8";
Elt 201 "c9";
Elt 202 "ca";
Elt 203 "cb";
Elt 204 "cc";
Elt 205 "cd";
Elt 206 "ce";
Elt 207 "cf";
Elt 208 "d0";
Elt 209 "d1";
Elt 210 "d2";
Elt 211 "d3";
Elt 212 "d4";
Elt 213 "d5";
Elt 214 "d6";
Elt 215 "d7";
Elt 216 "d8";
Elt 217 "d9";
Elt 218 "da";
Elt 219 "db";
Elt 220 "dc";
Elt 221 "dd";
Elt 222 "de";
Elt 223 "df";
Elt 224 "e0";
Elt 225 "e1";
Elt 226 "e2";
Elt 227 "e3";
Elt 228 "e4";
Elt 229 "e5";
Elt 230 "e6";
Elt 231 "e7";
Elt 232 "e8";
Elt 233 "e9";
Elt 234 "ea";
Elt 235 "eb";
Elt 236 "ec";
Elt 237 "ed";
Elt 238 "ee";
Elt 239 "ef";
Elt 240 "f0";
Elt 241 "f1";
Elt 242 "f2";
Elt 243 "f3";
Elt 244 "f4";
Elt 245 "f5";
Elt 246 "f6";
Elt 247 "f7";
Elt 248 "f8";
Elt 249 "f9";
Elt 250 "fa";
Elt 251 "fb";
Elt 252 "fc";
Elt 253 "fd";
Elt 254 "fe";
Elt 255 "ff" } } |}
      : unit -> (nat, string) map)]
    ()

let nat_to_byte (n : nat) =
  match Map.find_opt n bytes_conv_map1 with
  | None -> (failwith "" : bytes)
  | Some b -> b

let nat_to_hex_byte (n : nat) =
  match Map.find_opt n bytes_conv_map2 with
  | None -> (failwith "" : string)
  | Some s -> s

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

let check_transfer_tokens_signature (_p : transfer_tokens_param) :
    operation_hash =
  (* let payload = encode_tranfer_tokens_payload p in
   * if not (Crypto.check p.tt_src_account p.tt_signature payload) then *)
  (failwith invalid_signature : operation_hash)
(* else OpHash (Crypto.blake2b payload) *)

let check_issue_tokens_signature (_p : issue_tokens_param) : operation_hash =
  (failwith invalid_signature : operation_hash)

(* let payload = encode_issue_tokens_payload p in *)
(* let () = *)
(* match p.it_signature with
 * | None -> (\* skip signature check *\) ()
 * | Some signature ->
 *     if not (Crypto.check p.it_dst_account signature payload) then *)
(*   (failwith invalid_signature : unit)
 * in
 * OpHash (Crypto.blake2b payload) *)

let check_redeem_tokens_signature (_p : redeem_tokens_param) : operation_hash =
  (* let payload = encode_redeem_tokens_payload p in
   * if not (Crypto.check p.rt_src_account p.rt_signature payload) then *)
  (failwith invalid_signature : operation_hash)
(* else OpHash (Crypto.blake2b payload) *)
