type token_id = Token_id of nat

type hold_id = Hold_id of nat

type token_amount = Amount of nat

let[@inline] nat_amount (a : token_amount) : nat = match a with Amount a -> a

let[@inline] add_amount (a1 : token_amount) (a2 : token_amount) : token_amount =
  Amount (nat_amount a1 + nat_amount a2)

let[@inline] sub_amount (a1 : token_amount) (a2 : token_amount) :
    token_amount option =
  match is_nat (nat_amount a1 - nat_amount a2) with
  | None -> None
  | Some n -> Some (Amount n)

let[@inline] nat_token_id (i : token_id) : nat = match i with Token_id i -> i

let[@inline] succ_token_id (i : token_id) : token_id =
  match i with Token_id i -> Token_id (i + 1n)

let[@inline] succ_hold_id (i : hold_id) : hold_id =
  match i with Hold_id i -> Hold_id (i + 1n)

(* Polymorphism doesn't work with mligo.
   Instantiated version for type operation. *)
let[@inline] rev_append (l1 : operation list) (l2 : operation list) :
    operation list =
  List.fold_left
    (fun ((acc : operation list), (x : operation)) -> x :: acc)
    l2
    l1

let[@inline] rev (l : operation list) : operation list =
  List.fold_left
    (fun ((acc : operation list), (x : operation)) -> x :: acc)
    ([] : operation list)
    l
