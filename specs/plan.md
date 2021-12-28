# Tezos adapter for FinP2P

The purpose of this adapter is to allow FinP2P users to move assets deployed on
Tezos. The main constraint being that not all nodes of the FinP2P network have a
Tezos adapter and thus not all nodes can access the Tezos blockchain.

This document describes the smart contracts architecture of the FinP2P adapter
on the Tezos blockchain.

<a name="architecture"></a>

![Contracts architecture](images/finp2p_tezos_contracts.png)

## Design choice for assets

We will use the
[FA2](https://gitlab.com/tezos/tzip/-/blob/master/proposals/tzip-12/tzip-12.md)
standard to represent financial assets on Tezos. This is the latest standard and
now the most commonly used one for new projects. It is generally well supported
in the ecosystem (block-explorers, wallets, libraries, _etc._) and offers the
flexibility and extensibility that we seek.

In particular, it allows to represent _fungible_ assets, _non-fungible_ assets,
_semi-fungible_ assets (_i.e._ non-fungible assets, but each with a fixed amount
of fungible copies), and contracts with _multiple assets_.

Tokens are _owned_ by the Tezos address that correspond to the hash of the
public key of the user on the FinP2P network (we refer to this public key as
`finId` and to the hash as `finId_pkh` in the rest of the document).

For compliance with regulations, tokens on these asset contracts cannot be
transferred without restrictions.

We propose that all transfers go through a central **Authorization** contract
which allows, or not, the transfer to happen. In the first version (which we
call V1), this contract will contain a reference to a single proxy contract (see
below). For future-proofing, we plan to make part of this contract updatable.

This means that, in V1, users cannot sign asset transfer operations (the Tezos
operations) directly (they have to go through the proxy contract).

In V1, we also envision that we will only need one _mutli-asset_ contract to
handle all assets that will be issued on the FinP2P network. If the requirements
for this contract change later on, or if there are new kinds of asset that do
not fit in the implementation of the multi-asset FA2, we can always deploy new
(single- or multi-asset) FA2 contracts that will fit in the architecture.


### Stored information

To authorize operations on the FA2, it must store the address for the
**Authorization** contract. This address is **not** updatable as the
authorization contract can be updated in part.

It also needs to store the usual table for the ledger, the metadata, etc.

### Specs

The contract will have the following entry points:

- `transfer`
- `update_operators`
- `balance_of`
- `mint`
- `burn`
- Some extra administrative functions:
  - `pause`
  - `update_auth_contract`

#### Authorization policy

Actions that are concerned by this policy will produce a call to the
**Authorization** contract with:
- the action parameters (e.g. source, destination, amount, for a transfer)
- the caller (in our case this will be the proxy contract)
- the FA2 address

If this call fails, the whole action is reverted. Otherwise, the action is
executed (with the usual semantics).  Note that, for instance, we do not check
that the sender is the same address as the one that appears in the `from` field
of a transfer action (this is delegated to the authorization contract).

This authorization mechanism fits within the scope of [custom transfer
permission
policy](https://gitlab.com/tezos/tzip/-/blob/master/proposals/tzip-12/permissions-policy.md#customizing-transfer-permission-policy)
in the FA2 standard.

The FA2 contract metadata will contain a field `"permissions"` with the
following data (this is encoded as utf8 bytes in the storage of the contract,
but it will be displayed by block explorers and can possibly be used by
wallets).

```json
{
  "operator": "owner-or-operator",
  "receiver": "owner-no-hook",
  "sender": "owner-no-hook",
  "custom": {
    "tag": "finp2p2_authorization",
    "config-api": "address_of_authorization_contract" }
}
```

We use the `owner-or-operator` policy with an additional custom policy here but
note that we can also deploy specialized FA2 contracts with the `no-transfer`
policy if we want to completely prevent users from transferring tokens
directly, ever.

#### `transfer`

Transferring tokens will produce a call to the **Authorization** contract at the
entry point `authorize` with the parameter:

```ocaml
{ 
  sender = "KT1proxy";
  sender_is_operator = [[false]; ...];
  fa2_address = "KT1fa2X";
  action = Assets_action Transfer [
    { from_ = src_account_pkh; 
      txs = [ {to_ = dst_account_pkh ; token_id; amount}] };
    ...
  ] 
} 
```

#### `mint`

The mint entry point is not part of the standard but we propose that it takes a
list of assets to be minted (so as to be more efficient if the proxy changes and
allows for multiple mints at the same time).

```ocaml
type mint_param = {
  to_ : address;
  token_id : nat;
  amount : nat;
}

let mint
  (param, store : mint_param * storage) : (operation list * storage) = ...
```

Minting tokens will produce a call to the **Authorization** contract at the
entry point `authorize` with the parameter:

```ocaml
{ 
  sender = "KT1proxy";
  fa2_address = "KT1fa2X";
  sender_if_operator = [];
  action = Manage_action Mint [
    {to_ = dst_account_pkh ; token_id; amount};
    ...
  ] 
} 
```

The mint will create new tokens for the account `dst_account_pkh` (_i.e._ his
balance in this token will be incremented by `amount`).

#### `burn`

The burn entry point is not part of the standard but we propose that it takes a
list of assets to be burned (so as to be more efficient if the proxy changes and
allows for multiple burns at the same time).

```ocaml
type burn_param = {
  from_ : address;
  token_id : nat;
  amount : nat;
}

let burn
  (param, store : burn_param * storage) : (operation list * storage) = ...
```

Burning tokens will produce a call to the **Authorization** contract at the
entry point `authorize` with the parameter:

```ocaml
{ 
  sender = "KT1proxy";
  fa2_address = "KT1fa2X";
  sender_if_operator = [[false; ...]];
  action = Manage_action Burn [
    {from_ = src_account_pkh ; token_id; amount};
    ...
  ] 
} 
```

The burn will remove tokens from the account `src_account_pkh` (_i.e._ his
balance in this token will be decremented by `amount`).

### `update_operators`

The semantic of `update_operators` is the usual, but the authorization of who
can update operators for a user is handled by the **Authorization** contract.

> The standard does not specify who is permitted to update operators on behalf
> of the token owner. Depending on the business use case, the particular
> implementation of the FA2 contract MAY limit operator updates to a token owner
> (`owner == SENDER`) or be limited to an administrator.

In the V1, the update operator operation must be signed by the operator for it
to take effect and the information of "being an operator" is passed on to the
**Authorization** contract (in the field `sender_is_operator`) when one calls
either `transfer` or `burn`. In the authorization logic for the V1, this
information is not used (_i.e._ being an operator does not grant any additional
rights).

Note that a user having operators does not impact the contract in the V1.

### `balance_of`

This entry point implements the usual semantics:

> Gets the balance of multiple account/token pairs. Accepts a list of
> `balance_of_requests` and a callback contract callback which accepts a list of
> `balance_of_response` records.

### `update_auth_contract`

The address of the authorization contract can be changed, and this change must
be authorized by the old authorization contract (basically just checking that
the request comes from an administrator).


## Proxy contract

The **Proxy** contract for FinP2P assets is deployed once and for all to
interact with the FinP2P FA2 contracts. The role of this contract is to check
for payload signatures (and ensure safety properties) and forward/relay calls to
the FA2 asset contracts.

This contract does not need to be updatable _per se_, but it can be replaced
with a new one by changing references to its address in other contracts. In
fact, it is only necessary to update the address in the **Authorization**
contract as the latter acts as an extra indirection layer.

### Stored information

To operate correctly, the **Proxy** contract needs to keep track and maintain
the following information:

- an administrator address (updatable); only this administrator is allowed to
  call entry-points of the Proxy contract (with the exception of `cleanup`)
- a value `operation_ttl` in seconds that indicates how long an operation can be
  relayed depending on its timestamp (within the nonce); this value is updatable
  by an administrator and should match the retention policy of operations in the
  FinP2P network.
- a mapping of hashGroups to timestamps, called `live_opeations` which records
  (non-expired) operations that were relayed
- a mapping of FinP2P asset identifiers (of the form `<organization
  id>:<resource type>:<resource>`) to pairs of the form `(<KT1>, <id>)` where
  `<KT1>` is the address of the FA2 contract for this asset on Tezos and `<id>`
  is a natural number for this asset within the FA2 contract. Note that the
  FinP2P asset identifier is opaque to the **Proxy** contract (simply a byte
  sequence, as long as they are unique within FinP2P).

### Entry points

- `transfer_asset`
- `issue_asset`
- `redeem_asset`
- `cleanup`
- `update_administrator`
- `update_operation_ttl`
- `update_fa2_token`


#### Transfer Asset

```ocaml
type transfer_param = {
  nonce : { nonce :bytes; (* 24 bytes *)
            timestamp : timestamp };
  asset_id : bytes;
  src_account : public_key;
  dst_account : public_key;
  amount : nat;
  shg : bytes; (* 32 bytes hash, for settlement hash group *)
  signature : signature;
}

let transfer_asset 
  (param, store : transfer_param * storage) : (operation list * storage)
= ...
```

This Tezos operation must be signed/injected by an administrator.

##### Signed Payload

> See [API reference](https://finp2p-docs.ownera.io/reference/transfertoken) and
> [DLT spec](https://finp2p-docs.ownera.io/reference/transfer-1).

hashGroups = hash('BLAKE2B', [AHG, SHG]);

Signature = sign(sender private secp256k1 key, hashGroups)

###### Asset Hash Group (AHG) structure

AHG = hash('BLAKE2B', [fields by order]);

| order | value | type | comment |
|--|--|--|--|
| 1 | nonce           | []byte  |  |
| 2 | operation       | utf8 string  | "transfer" |
| 3 | assetType       | utf8 string  | "finp2p" |
| 4 | assetId         | utf8 string  | unique identifier of the asset |
| 5 | srcAccountType  | utf8 string  | "finId" |
| 6 | srcAccount      | utf8 string  | source account finId address  |
| 7 | dstAccountType  | utf8 string  | "finId" |
| 8 | dstAccount      | utf8 string  | destination account finId address  |
| 9 | amount          | utf8 string  | hex representation of the transfer amount |

###### Settlement Hash Group (SHG) structure

SHG = hash('BLAKE2B', [fields by order]);

| order | value | type | comment |
|--|--|--|--|
| 1 | assetType       | utf8 string  | "finp2p", "fiat", "cryptocurrency" |
| 2 | assetId         | utf8 string  | unique identifier of the asset |
| 3 | srcAccountType  | utf8 string  | "finId", "cryptoWallet", "escrow" |
| 4 | srcAccount      | utf8 string  | source account of the asset  |
| 5 | dstAccountType  | utf8 string  | "finId", "cryptoWallet", "escrow" |
| 6 | dstAccount      | utf8 string  | destination account for the asset  |
| 7 | amount          | utf8 string  | hex representation of the settlement amount |

#### Verifying transfer signatures

The entry point to transfer an asset (`transfer_asset`) does the following:

1. Check that the operation is still **live**, _i.e._ check that the `timestamp`
   plus the constant `operation_ttl` is still in the future and that the
   `timestamp` is in the past.
2. encode the parameter (without the signature) in bytes to recover the original
   signed message in the FinP2P node.
   - We need to convert the timestamp to seconds from epoch (easy) then to int64
     big endian bytes (cumbersome but possible, need to encode by hand, for each
     uint8 byte)
   - encode public_key to hexadecimal representation (pack, then trim prefix,
     then convert bytes to hex one by one), then encode this string to utf8
     (pack then trim, we're on the ascii subset)
   - convert the amount to hex string (must be done by "hand", for each hex
     digit) and encode this hex string to utf8 bytes (pack and trim, we're also
     on the ascii subset).
3. Hash the produced bytes (this is in fact the `hashGroup`) and ensure that it
   is not in our `live_operations` table.
4. Register the hash -> timestamp in the `live_operations` table.
   - We store the timestamp rather than the expiry date so that in case the
     `operation_ttl` is updated, the new ttl takes effect immediately (even for
     existing operations).
5. check that the encoded message was signed by the public key `src_account`
   [^Tezos requires the signature to be done on a `hashGroup` whose top hash is [BLAKE2b](https://en.wikipedia.org/wiki/BLAKE_(hash_function))]
6. retrieve the FA2 and token id corresponding to `asset_id`
7. call the `transfer` entry point of the FA2

Note that if one of the steps fails (_e.g._ the FA2 transfer), the whole
transaction is rolled back, and the storage of the smart contracts are
unchanged.

#### Issue Asset

```ocaml
type issue_asset_param = {
  nonce : { nonce :bytes; (* 24 bytes *)
            timestamp : timestamp };
  asset_id : bytes;
  dst_account : public_key;
  amount : nat;
  shg : bytes; (* 32 bytes hash *)
  signature : signature option; (* Optional signature for issue *)
  fa2_token: (address * nat);
}

let issue_asset
  (param, store : issue_asset_param * storage) : (operation list * storage)
= ...
```

This Tezos operation must be signed/injected by an administrator.

Note that the signature is not necessarily present because FinP2P does not
forward it to the DLT for now (but will at some point).

##### Payload

> See [API reference](https://finp2p-docs.ownera.io/reference/issuetoken) and
> [DLT spec](https://finp2p-docs.ownera.io/reference/issue-1).

hashGroups = hash('BLAKE2B', [AHG, SHG]);

Signature = sign(sender private secp256k1 key, hashGroups)

###### Asset Hash Group (AHG) structure

AHG = hash('BLAKE2B', [fields by order]);

| order | value | type | comment |
|--|--|--|--|
| 1 | nonce | []byte | 
| 2 | operation | utf8 string | "issue"
| 3 | assetType | utf8 string | "finp2p"
| 4 | assetId | utf8 string | unique identifier of the asset
| 5 | dstAccountType | utf8 string | "finId"
| 6 | dstAccount | utf8 string | destination account finId address hex representation
| 7 | amount | utf8 string | hex (prefixed with 0x) representation of the issuance amount

###### Settlement Hash Group (SHG) structure:

SHG = hash('BLAKE2B', [fields by order]);

order | value | type | comment
|--|--|--|--|
| 1 | assetType | utf8 string | "finp2p", "fiat", "cryptocurrency"
| 2 | assetId | utf8 string | unique identifier of the asset
| 3 | srcAccountType | utf8 string | "finId", "cryptoWallet", "escrow"
| 4 | srcAccount | utf8 string | source account of the asset
| 5 | dstAccountType | utf8 string | "finId", "cryptoWallet", "escrow"
| 6 | dstAccount | utf8 string | destination account for the asset
| 7 | amount | utf8 string | hex representation of the settlement amount
| 8 | expiry | utf8 string | hex representation of the escrow hold expiry value

#### Verifying asset issuance signature

The entry point to issue a new asset (`issue_asset`) does the following:

1. Do the same steps 1-4 of [transfer asset](#verifying-asset-signatures)
5. **If the signature is present**, check that the encoded message was signed by
   the public key `dst_account` (otherwise skip signature the check)
6. store the `asset_id` with `fa2_token` and check if does not already exist
7. call the `mint` entry point of the FA2
   - **Question**: What token metadata? 
     - decimals (mandatory)
     - name (= asset_id?)
     - symbol
     - URI to external metadata


### Redeem Asset

```ocaml
type redeem_asset_param = {
  nonce : { nonce :bytes; (* 24 bytes *)
            timestamp : timestamp };
  nonce_timestamp : timestamp;
  asset_id : bytes;
  quantity : nat;
  signature : signature;
  src_account : public_key;
}

let redeem_asset
  (param, store : issue_asset_param * storage) : (operation list * storage)
= ...
```

This Tezos operation must be signed/injected by an administrator.

##### Signed Payload

> See [API reference](https://finp2p-docs.ownera.io/reference/redeemtoken)  and
> [DLT spec](https://finp2p-docs.ownera.io/reference/transfer-1).

Signature = sign(sender private secp256k1 key, message)

|order|value|type|comment|
|---|---|---|---|
|1|nonce|[]byte|	
|2|	"redeem"|	utf8 string|	name of the method|
|3|	assetId	|utf8 string	|
|4|	quantity|	utf8 string|	hex representation of the quantity

#### Verifying asset redeem signature

The entry point to redeem an existing asset (`redeem_asset`) does the following:

1. Do the same steps 1-4 of [transfer asset](#verifying-asset-signatures)
   excepted that the `src_account` is not part of the signed payload (but it
   still need to be passed as a parameter to the Tezos transaction in order to
   check the signature and to burn tokens from the correct signer)
5. check that the encoded message was signed by the public key `src_account`
7. call the `burn` entry point of the FA2


### Clean up

The space used by the operation hashes and their timestamps can be reclaimed by
removing the ones that expired, _i.e._ the ones whose timestamp plus
`operation_ttl` is before the current time (the timestamp of the previous
block).

```ocaml
let cleanup
  (param, store : bytes list * storage) : (operation list * storage)
= ...
```

The parameter to this entry point is a list of operation hashes (as stored in
[Transfer Asset](#transfer-asset) and [Issue Asset](#issue-asset)). The code for
`cleanup` removes expired operations of this list from `live_operations`. (It
need not fail, but simply skip, operations which are not expired.) The total
storage used by a contract is computed with a _high water mark_ which means that
if we make it decrease in one transaction, then the additional bytes stored
below this _high water mark_ will be free.

Note that because big_map's in Tezos cannot be iterated, we have to provide this
list.

This entry point can be called by anybody (the caller will pay the fees to
cleanup the table). In practice, this would be called by daemon at regular
intervals.

In V1, we do not need to have this daemon operational right away because there
is no risk of this table being too big and hindering the execution of the smart
contracts. Big map's in Tezos (alike "mappings" in Ethereum) are never fully
deserialized, but rather accessed on demand, which means we pay the
deserialization gas only when retrieving (or updating) a value from the map.

### Update administrators

```ocaml
let update_administrators 
  (param, store : address set * storage) : (operation list * storage)
= ...
```

This is callable only by an administrator. We will use a configurable
multi-signature scheme if desired for this.

The administrator is the only one 

### Update `operation_ttl`

```ocaml
let update_operation_ttl 
  (new_operation_ttl, store : nat * storage) : (operation list * storage)
= ...
```

This is callable only by an administrator. This does not need a multi-signature
scheme at first glance.

### Update FA2 token for an asset

```ocaml
type update_fa2_token_param = {
  asset_id : bytes;
  fa2_token : (address * nat);
}

let update_fa2_token 
  (param, store : update_fa2_token_param * storage) : (operation list * storage)
= ...
```

This is callable only by an administrator. This does not need a multi-signature
scheme at first glance. It should allow for an administrator to update the FA2
contract address (and/or it's token id) for an asset that is already registered
in the table.

This is useful in case we want to update one or more FA2 contract to a new
implementation (note that the update, and the migration of the data
contained in the FA2, including the ledger, etc. should be done beforehand,
either manually or by the FinP2P Tezos adapter).

This entry point should also allow an administrator to add a new asset for an
external FA2 token that is already deployed on chain (see [scenario External
FA2s](external-fa2s)).

## Authorization contract

The authorization contract acts as an indirection point for the FA2 contracts to
allow the Proxy contract(s) to perform actions (the proxy can be replaced, or
more can be added). It receives authorization requests from the FA2 asset
contracts (see [Authorization policy](#authorization-policy)).

### Stored information

This contract needs at least to know the address of the Proxy contract. In the
most basic version, it simply checks if the `sender` field in the authorization
requests corresponds to the Proxy contract and rejects the others.

However, for flexibility and future-proofing, the address of the Proxy contract
can be updated and the authorization logic can be updated as well.

In particular, we want
- an administrator (address) for this contract, which also acts as an
  administrator contract for the FA2
- a table `accredited` (big map) of addresses to bytes (the associated bytes
  value will be empty at the beginning but can contain arbitrary encoded
  information in the long run); this table is initialized with the Proxy
  contract address
- a field to store a lambda which records the (updatable) code for the
  authorization logic.
  
### Entry points

- `authorize`
- `add_accredited`
- `update_accredited`
- `update_authorization_logic`
- `update_administrator`

### `authorize`

```ocaml
type fa2 = 
  | Transfer of fa2_transfer_param
  | Balance_of of ...
  | Update_operators of ...

type manmger = 
  | Mint of fa2_transfer_mint
  | Burn of fa2_transfer_burn

type authorizable_action =
  | Assets_action of fa2
  | Manage_action of manager
  | Admin_action

type auth_param = {
  sender : address;
  sender_is_operator : bool list list;
  fa2_address : address;
  action : authorizable_action;
}

let authorize
  (param * store : auth_param * storage) :
  (operation list * storage) = ...
```

The code for this entry point will simply retrieve the authorization logic from
the storage and apply it to its parameter. The initial authorization logic will
contain a function which simply checks if the `sender` is in the table
`accredited`.

#### `add_accredited`

```ocaml
let add_accredited
  (param * store : (address * bytes) * storage) :
  (operation * storage) = ...
```

Adds an accredited address with the `bytes` accreditation.

This is callable only by an administrator

#### `remove_accredited`

```ocaml
let remove_accredited
  (param * store : address * storage) :
  (operation * storage) = ...
```

Removes an accredited address.

This is callable only by an administrator

#### `update_authorization_logic`

```ocaml
let update_authorization_logic
  (param * store : 
    (authorize_param * storage -> operation list * storage) * storage) :
  (operation list * storage) = ...
```

This is callable only by an administrator. This entry point changes the code for
the authorization logic of the contract.


## Scenarios

### FinP2P Asset transfers outside FinP2P

If we have a “finP2P FA2 contract” and an outside user A tries to transfer his
tokens to B (B can be in finP2P or not), then the **Authorization** contract will
receive a request to authorize a transfer of A to B where the sender is A (as
opposed to the Proxy contract).

By default, if A is not in the `accredited` table, the transaction will be
blocked, but if an admin adds A to `accredited`, then it will be allowed.

Note: If we want a more complicated scheme in a future evolution of the platform
we can update the autorization logic and say now that A is accredited to
transfer only to [B] in the `accredited` table.

### External FA2s

Consider the scenario of an FA2 contract that is already deployed
on Tezos, and someone wants to offer his assets through the finP2P
network.

In this case, this user will need to add the **Proxy** contract as an operator
to its account on the FA2. Because the operator has all the rights, the user
will want to move only the assets to offer on finP2P to an address that
corresponds to his finId and add an operator for this account only.

The asset will need to also be added to the FinP2P network and an administrator
should register the corresponding **asset id** in the **Proxy** contract (with
the `update_fa2_contract` entry point).

See the red external FA2 contract [in the diagram above](#architecture).
