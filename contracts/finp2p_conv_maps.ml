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

let hexbytes_conv_map =
  [%Michelson
    ({| {
DROP;
PUSH (map bytes string) {
Elt 0x00 "00";
Elt 0x01 "01";
Elt 0x02 "02";
Elt 0x03 "03";
Elt 0x04 "04";
Elt 0x05 "05";
Elt 0x06 "06";
Elt 0x07 "07";
Elt 0x08 "08";
Elt 0x09 "09";
Elt 0x0a "0a";
Elt 0x0b "0b";
Elt 0x0c "0c";
Elt 0x0d "0d";
Elt 0x0e "0e";
Elt 0x0f "0f";
Elt 0x10 "10";
Elt 0x11 "11";
Elt 0x12 "12";
Elt 0x13 "13";
Elt 0x14 "14";
Elt 0x15 "15";
Elt 0x16 "16";
Elt 0x17 "17";
Elt 0x18 "18";
Elt 0x19 "19";
Elt 0x1a "1a";
Elt 0x1b "1b";
Elt 0x1c "1c";
Elt 0x1d "1d";
Elt 0x1e "1e";
Elt 0x1f "1f";
Elt 0x20 "20";
Elt 0x21 "21";
Elt 0x22 "22";
Elt 0x23 "23";
Elt 0x24 "24";
Elt 0x25 "25";
Elt 0x26 "26";
Elt 0x27 "27";
Elt 0x28 "28";
Elt 0x29 "29";
Elt 0x2a "2a";
Elt 0x2b "2b";
Elt 0x2c "2c";
Elt 0x2d "2d";
Elt 0x2e "2e";
Elt 0x2f "2f";
Elt 0x30 "30";
Elt 0x31 "31";
Elt 0x32 "32";
Elt 0x33 "33";
Elt 0x34 "34";
Elt 0x35 "35";
Elt 0x36 "36";
Elt 0x37 "37";
Elt 0x38 "38";
Elt 0x39 "39";
Elt 0x3a "3a";
Elt 0x3b "3b";
Elt 0x3c "3c";
Elt 0x3d "3d";
Elt 0x3e "3e";
Elt 0x3f "3f";
Elt 0x40 "40";
Elt 0x41 "41";
Elt 0x42 "42";
Elt 0x43 "43";
Elt 0x44 "44";
Elt 0x45 "45";
Elt 0x46 "46";
Elt 0x47 "47";
Elt 0x48 "48";
Elt 0x49 "49";
Elt 0x4a "4a";
Elt 0x4b "4b";
Elt 0x4c "4c";
Elt 0x4d "4d";
Elt 0x4e "4e";
Elt 0x4f "4f";
Elt 0x50 "50";
Elt 0x51 "51";
Elt 0x52 "52";
Elt 0x53 "53";
Elt 0x54 "54";
Elt 0x55 "55";
Elt 0x56 "56";
Elt 0x57 "57";
Elt 0x58 "58";
Elt 0x59 "59";
Elt 0x5a "5a";
Elt 0x5b "5b";
Elt 0x5c "5c";
Elt 0x5d "5d";
Elt 0x5e "5e";
Elt 0x5f "5f";
Elt 0x60 "60";
Elt 0x61 "61";
Elt 0x62 "62";
Elt 0x63 "63";
Elt 0x64 "64";
Elt 0x65 "65";
Elt 0x66 "66";
Elt 0x67 "67";
Elt 0x68 "68";
Elt 0x69 "69";
Elt 0x6a "6a";
Elt 0x6b "6b";
Elt 0x6c "6c";
Elt 0x6d "6d";
Elt 0x6e "6e";
Elt 0x6f "6f";
Elt 0x70 "70";
Elt 0x71 "71";
Elt 0x72 "72";
Elt 0x73 "73";
Elt 0x74 "74";
Elt 0x75 "75";
Elt 0x76 "76";
Elt 0x77 "77";
Elt 0x78 "78";
Elt 0x79 "79";
Elt 0x7a "7a";
Elt 0x7b "7b";
Elt 0x7c "7c";
Elt 0x7d "7d";
Elt 0x7e "7e";
Elt 0x7f "7f";
Elt 0x80 "80";
Elt 0x81 "81";
Elt 0x82 "82";
Elt 0x83 "83";
Elt 0x84 "84";
Elt 0x85 "85";
Elt 0x86 "86";
Elt 0x87 "87";
Elt 0x88 "88";
Elt 0x89 "89";
Elt 0x8a "8a";
Elt 0x8b "8b";
Elt 0x8c "8c";
Elt 0x8d "8d";
Elt 0x8e "8e";
Elt 0x8f "8f";
Elt 0x90 "90";
Elt 0x91 "91";
Elt 0x92 "92";
Elt 0x93 "93";
Elt 0x94 "94";
Elt 0x95 "95";
Elt 0x96 "96";
Elt 0x97 "97";
Elt 0x98 "98";
Elt 0x99 "99";
Elt 0x9a "9a";
Elt 0x9b "9b";
Elt 0x9c "9c";
Elt 0x9d "9d";
Elt 0x9e "9e";
Elt 0x9f "9f";
Elt 0xa0 "a0";
Elt 0xa1 "a1";
Elt 0xa2 "a2";
Elt 0xa3 "a3";
Elt 0xa4 "a4";
Elt 0xa5 "a5";
Elt 0xa6 "a6";
Elt 0xa7 "a7";
Elt 0xa8 "a8";
Elt 0xa9 "a9";
Elt 0xaa "aa";
Elt 0xab "ab";
Elt 0xac "ac";
Elt 0xad "ad";
Elt 0xae "ae";
Elt 0xaf "af";
Elt 0xb0 "b0";
Elt 0xb1 "b1";
Elt 0xb2 "b2";
Elt 0xb3 "b3";
Elt 0xb4 "b4";
Elt 0xb5 "b5";
Elt 0xb6 "b6";
Elt 0xb7 "b7";
Elt 0xb8 "b8";
Elt 0xb9 "b9";
Elt 0xba "ba";
Elt 0xbb "bb";
Elt 0xbc "bc";
Elt 0xbd "bd";
Elt 0xbe "be";
Elt 0xbf "bf";
Elt 0xc0 "c0";
Elt 0xc1 "c1";
Elt 0xc2 "c2";
Elt 0xc3 "c3";
Elt 0xc4 "c4";
Elt 0xc5 "c5";
Elt 0xc6 "c6";
Elt 0xc7 "c7";
Elt 0xc8 "c8";
Elt 0xc9 "c9";
Elt 0xca "ca";
Elt 0xcb "cb";
Elt 0xcc "cc";
Elt 0xcd "cd";
Elt 0xce "ce";
Elt 0xcf "cf";
Elt 0xd0 "d0";
Elt 0xd1 "d1";
Elt 0xd2 "d2";
Elt 0xd3 "d3";
Elt 0xd4 "d4";
Elt 0xd5 "d5";
Elt 0xd6 "d6";
Elt 0xd7 "d7";
Elt 0xd8 "d8";
Elt 0xd9 "d9";
Elt 0xda "da";
Elt 0xdb "db";
Elt 0xdc "dc";
Elt 0xdd "dd";
Elt 0xde "de";
Elt 0xdf "df";
Elt 0xe0 "e0";
Elt 0xe1 "e1";
Elt 0xe2 "e2";
Elt 0xe3 "e3";
Elt 0xe4 "e4";
Elt 0xe5 "e5";
Elt 0xe6 "e6";
Elt 0xe7 "e7";
Elt 0xe8 "e8";
Elt 0xe9 "e9";
Elt 0xea "ea";
Elt 0xeb "eb";
Elt 0xec "ec";
Elt 0xed "ed";
Elt 0xee "ee";
Elt 0xef "ef";
Elt 0xf0 "f0";
Elt 0xf1 "f1";
Elt 0xf2 "f2";
Elt 0xf3 "f3";
Elt 0xf4 "f4";
Elt 0xf5 "f5";
Elt 0xf6 "f6";
Elt 0xf7 "f7";
Elt 0xf8 "f8";
Elt 0xf9 "f9";
Elt 0xfa "fa";
Elt 0xfb "fb";
Elt 0xfc "fc";
Elt 0xfd "fd";
Elt 0xfe "fe";
Elt 0xff "ff";
} } |}
      : unit -> (bytes, string) map)]
    ()