(** One of the specified `token_id`s is not defined within the FA2 contract *)
let fa2_token_undefined = "FA2_TOKEN_UNDEFINED"

(** A token owner does not have sufficient balance to transfer tokens from
    owner's account *)
let fa2_insufficient_balance = "FA2_INSUFFICIENT_BALANCE"

(** A transfer failed because of `operator_transfer_policy == No_transfer` *)
let fa2_tx_denied = "FA2_TX_DENIED"

(** A transfer failed because `operator_transfer_policy == Owner_transfer` and
    it is initiated not by the token owner *)
let fa2_not_owner = "FA2_NOT_OWNER"

(** A transfer failed because `operator_transfer_policy ==
    Owner_or_operator_transfer` and it is initiated neither by the token owner
    nor a permitted operator *)
let fa2_not_operator = "FA2_NOT_OPERATOR"

(** `update_operators` entrypoint is invoked and `operator_transfer_policy` is
    `No_transfer` or `Owner_transfer` *)
let fa2_operators_not_supported = "FA2_OPERATORS_UNSUPPORTED"

(** Receiver hook is invoked and failed. This error MUST be raised by the hook
    implementation *)
let fa2_receiver_hook_failed = "FA2_RECEIVER_HOOK_FAILED"

(** Sender hook is invoked and failed. This error MUST be raised by the hook
    implementation *)
let fa2_sender_hook_failed = "FA2_SENDER_HOOK_FAILED"

(** Receiver hook is required by the permission behavior, but is not implemented
    by a receiver contract *)
let fa2_receiver_hook_undefined = "FA2_RECEIVER_HOOK_UNDEFINED"

(** Sender hook is required by the permission behavior, but is not implemented
    by a sender contract *)
let fa2_sender_hook_undefined = "FA2_SENDER_HOOK_UNDEFINED"

(** A mint for a new contract reuses an existing token id *)
let fa2_token_already_exists = "FA2_TOKEN_ALREADY_EXISTS"

(** Action was rejected by Finp2p authorization contract *)
let unauthorized = "FINP2P_UNAUTHORIZED_ACTION"

(** Operation is in the past or is expired *)
let op_not_live = "FINP2P_PASSED_OR_EXPIRED_OPERATION"

(** Asset id does not correspond to a known FA2 token *)
let unknown_asset_id = "FINP2P_UNKNOWN_ASSET_ID"

(** Contract does not have the expected FA2 interface *)
let invalid_fa2_contract = "INVALID_FA2_CONTRACT"

(** Issuing of a new already existing asset *)
let asset_already_exists = "FINP2P_ASSET_ALREADY_EXISTS"

(** Invalid signature for asset operation *)
let invalid_signature = "FINP2P_INVALID_SIGNATURE"

let fa2_hold_already_exists = "FA2_HOLD_ALREADY_EXISTS"

let fa2_unknown_hold_id = "FA2_UNKNOWN_HOLD_ID"

let insufficient_spendable_balance = "FA2_INSUFFICIENT_SPENDABLE_BALANCE"

let hold_already_exists = "FINP2P_HOLD_ALREADY_EXISTS"

let unknown_hold_id = "FINP2P_UNKNOWN_HOLD_ID"
