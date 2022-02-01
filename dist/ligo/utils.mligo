#if !UTILS
#define UTILS

type token_id =
  | Token_id of nat 

type hold_id =
  | Hold_id of nat 

type token_amount =
  | Amount of nat 


[@inline]
let nat_amount (a : token_amount) : nat =
  match a with | Amount a -> a


[@inline]
let add_amount (a1 : token_amount) (a2 : token_amount) : token_amount =
  Amount ((nat_amount a1) + (nat_amount a2))


[@inline]
let sub_amount (a1 : token_amount) (a2 : token_amount) : token_amount option =
  match is_nat ((nat_amount a1) - (nat_amount a2)) with
  | None -> None
  | Some n -> Some (Amount n)


[@inline]
let nat_token_id (i : token_id) : nat =
  match i with | Token_id i -> i


[@inline]
let succ_token_id (i : token_id) : token_id =
  match i with | Token_id i -> Token_id (i + 1n)


[@inline]
let succ_hold_id (i : hold_id) : hold_id =
  match i with | Hold_id i -> Hold_id (i + 1n)


[@inline]
let rev_append (l1 : operation list) (l2 : operation list) : operation list =
  List.fold_left (fun ((acc : operation list), (x : operation)) -> x :: acc) l2
    l1


[@inline]
let rev (l : operation list) : operation list =
  List.fold_left (fun ((acc : operation list), (x : operation)) -> x :: acc)
    ([] : operation list) l


[@inline]
let implicit_address (pkh : key_hash) : address =
  Tezos.address (Tezos.implicit_account pkh)

#endif