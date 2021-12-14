#!/usr/bin/env ocaml

let rec gen_dicho fmt l n =
  if l >= n then Printf.printf (fmt ^^ "\n") l l
  else
    let m = (n + l) / 2 in
    Printf.printf "if n <= %dn then\n" m ;
    gen_dicho fmt l m ;
    Printf.printf "else\n" ;
    gen_dicho fmt (m + 1) n

let () =
  Printf.printf "(* Dichotomies generated with script/gen_finp2p_conv.ml *)\n\n" ;
  Printf.printf "let nat_to_byte_conv (n : nat) : bytes * string = \n" ;
  gen_dicho "(0x%02xh, \"0x%02x\")" 0 255 ;
  (* Printf.printf "\n\n" ;
   * Printf.printf "let nat_to_hex_byte (n : nat) : string= \n" ;
   * gen_dicho "\"0x%02x\"" 0 255 ; *)
  Printf.printf "%!"
