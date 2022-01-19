# Tezos adapter for FinP2P

The purpose of this adapter is to allow FinP2P users to move assets deployed on
Tezos. The main constraint being that not all nodes of the FinP2P network have a
Tezos adapter and thus not all nodes can access the Tezos blockchain.

This document describes the smart contracts architecture of the FinP2P adapter
on the Tezos blockchain.

<a name="architecture"></a>

![Contracts architecture](images/finp2p_tezos_contracts.png)


## Design Considerations

### Signing Tezos Transactions VS Signing Orders

Each FinP2P user has a **secp256k1** key-pair at his or her disposal and can
sign arbitrary messages/transactions with it.

There are two possibilities for FinP2P users: 
1. Sign tezos transactions directly, or
2. Sign transfer order messages, that are injected by another account on the
   chain to a smart contract which checks the signature and execute the order.

We've chosen the second solution (2) because (1) is incompatible with the
restriction that not all FinP2P nodes have access to the Tezos blockchain. In
particular, the necessary information needs to be retrieved from a Tezos node to
_forge_ a complete transaction (or smart contract call) include the following:

- `branch`: a recent block hash from the chain (no more that 120 blocks old,
  _i.e._ one hour on the current mainnet)
- `counter`: the counter associated to the account (_i.e._ the address, or
  public key hash, of the FinP2P cryptographic key). This counter is incremented
  at each transaction (and is initialized with an arbitrary number by the chain
  on the first transaction).

There is also the need to specify precise values for _gas limit_ and a _storage
limit_ (and an appropriate fee which covers the announced limits). These limits
are part of the signed operation and we can decide to put what we want here,
however putting too large values mean we will have to pay a large fee which is
not ideal. The best way to compute these values is to perform a _simulation_ of
the operation on a Tezos node and get back the appropriate gas and storage
consumed. This requires to have access to a Tezos node as well.

The second solution (2) is more adequate for what we want to do but it comes
with added complexity on the chain, and introduces security concerns (_e.g._
replay attacks) which are addressed in [the section on security](#security).

The architecture allows users to sign payloads for Tezos asset transfers
_offline_ securely, with signature checks happening _on-chain_. The assets are
owned by the addresses that correspond to the users' FinP2P keys, so
this is transparent for all other contracts and tools. **This system allows users
to also sign and inject transactions with their FinP2P key directly on Tezos** (if
they have access to a node).

### Proxy Contract VS Transfer Hooks

In this design, we use a **proxy contract** which checks payload signatures and
dispatches operations to the corresponding asset contracts. Note that it is also
possible to have a scheme where the transfer (and others) operation produce
calls to owner (resp. receiver) hooks on the sender contract (resp. destination
contract). We sum up the advantages of each approach.

| _Advantage_    | Proxy   | Hook   |
| --- | :---------: | :------: |
| Tokens held by `tz2` | ✓ | |
| Contract calls for simple transfer | 3 | 2-3 |
| Atomic (only internal transactions) | ✓ |  |
| No need for ACL | | ✓ |
| Easily updatable | ✓ | (update each managed) |
| Transferable outside of proxy or managed | ✓ |  |

##### Transfer/owner hooks

Sender and receiver (they must be smart-contracts in this case) can implement
receive and send hooks. These hooks are called by the FA2 contract on transfer
and they can perform actions (for instance, the receiver can forward tokens to
another address, say a `tz2`) or perform checks (for instance a sender contract
can check a signature -- of the transfer parameter + payload information,
etc. -- and fail, which rolls back the whole transaction sequence).

Because there is no way to attach additional payloads to FA2 transfer
operations, it is needed to _batch_ two operations together in this scheme:

1. An operation that records the payload (_e.g._ "transfer amt of KT1token from
   KT1A to KT1B") together with `tz2A`'s signature of this payload.
2. The transfer operation between the managed contracts of `tz2A` and `tz2B`
   (_i.e._ `KT1A` and `KT2B`), which will call the send transfer hook of `KT1A`
   and the receive hook of `KT2B`.
   - The _send hook_ of `KT1A` will check that it has previously recorded a
     signed payload of `tz2A` for this transfer in its storage, and subsequently
     remove it (it fails otherwise).
   - The _receive hook_ of `KT1B` can perform additional verification or actions
     (but we don't see any as of now).

Because the tokens are actually held by the managed contracts, _e.g._ KT1A,
there is no need to add _operators_ (_i.e._ addresses that can perform actions
on a FA2 token on behalf of someone else).

##### Proxy contract

A proxy contract for the FinP2P assets can be deployed once and for all to
interact with the FinP2P assets. The role of this contract is to check for
payload signatures (and ensure safety properties) and forward/proxy calls to the
FA2 asset contracts.

In this design, we choose to have each organization (which is responsible for
issuing certain assets only) deploy and _manage_ their own proxy contract and
FA2 contract (for the tokens of the organization's assets). This prevents users
and organizations on relying on a single centralization point (whose manager is
potentially out of their control) at the cost of trusting the organizations to
do the correct thing with respect to their assets. (See [this
section](#improvements) for directions of improvement.)

The proxy contract (let's call it `KT1Proxy`) acts a central database of
information through which all asset operations transit. The main advantage of
this approach is that the proxy will produce operations of transfers (for
example) between `tz2` addresses, and that the owners of said assets will be
`tz2` addresses (_i.e._ the same addresses/public key than on the FinP2P
network). It also allows for _Tezos operations_ to be injected and signed by the
FinP2P (tz2) key directly should we decide to switch the scheme (it also allows
for a later cost optimization on FinP2P nodes that are connected to a Tezos
node/adapter).

The access control logic can be handled by a separate contract whose sole role
is to approve (or disapprove) transactions on the FA2. In particular this
contract (Auth) can ensure operations come from the expected proxy and so on.


## Assets Contract(s)

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

We propose that _all calls_ go through a central **Authorization** contract
which allows, or not, the transfer to happen. In the first version (which we
call V1), this contract will contain a reference to a single proxy contract (see
below). For future-proofing, we plan to make part of this contract updatable.

This means that, in V1, users cannot sign asset transfer operations (the Tezos
operations) directly (they have to go through the proxy contract).

In V1, we also envision that we will only need one _mutli-asset_ contract to
handle all assets of an organization. If the requirements for this contract
change later on, or if there are new kinds of asset that do not fit in the
implementation of the multi-asset FA2, we can always deploy new (single- or
multi-asset) FA2 contracts that will fit in the architecture.

### Stored information

To authorize operations on the FA2, it must store the address for the
**Authorization** contract. This address is updatable but the authorization
logic in the contract can be updated in part.

It also needs to store the usual table for the ledger, the metadata, etc.

### Specs

The contract has the following entry points:

- `transfer`
- `update_operators`
- `balance_of`
- `mint`
- `burn`
- Some extra administrative functions:
  - `pause`
  - `update_auth_contract`

#### Authorization policy

Actions that are concerned by this policy (all calls) produce a call to the
**Authorization** contract with:
- the action parameters (e.g. source, destination, amount, for a transfer)
- the caller (in our case this is the proxy contract)
- the FA2 address

If this call fails, the whole action is reverted. Otherwise, the action is
executed (with the usual semantics).  Note that, for instance, we do not check
that the sender is the same address as the one that appears in the `from` field
of a transfer action (this is delegated to the authorization contract).

This authorization mechanism fits within the scope of [custom transfer
permission
policy](https://gitlab.com/tezos/tzip/-/blob/master/proposals/tzip-12/permissions-policy.md#customizing-transfer-permission-policy)
in the FA2 standard.

The FA2 contract metadata contains a field `"permissions"` with the
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

Transferring tokens produce a call to the **Authorization** contract at the
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

Minting tokens produce a call to the **Authorization** contract at the
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

The mint creates new tokens for the account `dst_account_pkh` (_i.e._ his
balance in this token is incremented by `amount`).

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

Burning tokens produces a call to the **Authorization** contract at the
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

The burn removes tokens from the account `src_account_pkh` (_i.e._ his
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

- a set of administrator addresses (updatable); only an administrator is
  allowed to call entry-points of the Proxy contract (with the exception of
  `cleanup`)
- a value `operation_ttl` in seconds that indicates for how long an operation
  can be relayed depending on its timestamp (within the nonce); this value is
  updatable by an administrator and should match the retention policy of
  operations in the FinP2P network.
- a mapping of hashGroups (this essentially amounts to a hash of the operation)
  to timestamps, called `live_opeations` which records (non-expired) operations
  that were relayed
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

This is callable only by an administrator. We can use a configurable
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
- an administrator (address) for this contract, which in consequence also acts
  as an administrator contract for the FA2
- a table `accredited` (big map) of addresses to bytes (the associated bytes
  value will be empty at the beginning but can contain arbitrary encoded
  information in the long run); this table is initialized with the Proxy
  contract address
- a field to store a lambda which records the (updatable) code for the
  authorization logic.
  
> **Note that the private key for the "master" administrator of the
> Authorization contract should be given more protection because it can be used
> to effectively administrate the FA2 contract (it can prevent the proxy from
> making transactions, or even allow another contract to control accounts in the
> FA2 contract).**
  
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

The code for this entry point simply retrieves the authorization logic from
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


## Security

When re-implementing checks that would normally be performed by the blockchain
protocol, it must be taken great care of not introducing _security
vulnerabilities_.

In particular (for both relay and hooks schemes), checking signatures is
normally done by the blockchain (transactions and smart contract calls are
signed by their originator in Tezos). The operations that are signed include
information to ensure that the operation comes for the correct "person", and
cannot be _modified_ or _replayed_ (_i.e._ re-included in a different block) by
another party.

### Assumptions

In this design, we make the following assumption:

> FinP2P organizations are in charge of offering assets on the Tezos
> blockchain, and so should behave rationally (_i.e._ they are not malicious,
> but can be compromised or defective).

This assumption can be lifted in [future evolution of the Tezos
adapter](#future-improvements) in order to make the system even more robust
depending on where we want to place our "trust".

### Preventing Replay Attacks

In the context of FinP2P, we can rely on the following prerequisite guarantees:

- Operations on the proxy are signed by an administrator (this is checked by the
  smart contract), which means that transactions can only be replayed by an
  admin of the contract. We need to prevent a compromised (or defective) admin
  from replaying transactions.

- Assets are partitioned between the different organizations, _i.e._ each asset
  can be interacted with only through **one** proxy contract.

- Every action on the FA2 contract must go through the corresponding
  authorization contract, and adding a proxy to interact with the FA2 contract
  must be done by a master administrator (of the auth contract). In practice, a
  single proxy contract can call the FA2 contract, so this rules out the
  scenario where someone else deploys a copy of a proxy contract on top of an
  already existing FA2.
  
We need to prevent replay attacks at two levels: 

1. A malicious user replaying finp2p transactions, _i.e._ resubmitting signed
   finp2p operations (_e.g._, `transfer_tokens`) to a finp2p node/tezos adapter.

2. A compromised finp2p node/tezos adapter replaying finp2p transactions (_e.g._
   by injecting multiple operations with the same content on Tezos).

(1) is potentially handled by the FinP2P network (depending on the retention
policy and the signature checks performed by the FinP2P node) but having this
guarantee on chain gives users even more confidence in the system.

The threat models for these two attacks are similar:

1. A malicious user can observe all transactions on the blockchain, and so can
   forge finp2p messages with the same content (and the same signature as well,
   as they cannot access users private keys). Malicious users can also inject
   any transactions on the chain, _signed by themselves_.
   
2. A compromised adapter/node can censor transactions (this seems unavoidable)
   and can also inject any transactions on the chain signed by a _proxy
   administrator_. In particular, it can duplicate users transactions but cannot
   forge correct finp2p2 signatures on behalf of users (the adapter does not
   have access to the users private keys).


#### Preventing Malicious Users' Replay Attacks

Because all transactions to FinP2P proxies must be signed by a proxy
administrator, a malicious user cannot interact directly with the proxy
contracts on chain.

They can however redeploy an identical (modulo administrators) or modified,
proxy contract on top of an existing FA2 contract. Let's take the extreme
example where the user redeploys a proxy which does not perform any finp2p
signature checks and accepts to forward calls to the FA2 contracts
indifferently. The call to the FA2 contract (which represent real FinP2P assets)
will indeed be made, but the authorization call will fail. Every action on the
FA2 contract must go through the corresponding authorization contract, and
adding a proxy to interact with the FA2 contract must be done by a master
administrator (of the auth contract).

A malicious users' field of action resides essentially in making calls to the
Tezos adapter or the FinP2P node. The things that can be sent to impersonate
another user amounts to copying finp2p transactions message that have already
been signed and sent. For instance a malicious user B can re-send an identical
finp2p `transfer_asset` from A to B in the hope that she or he will receive the
assets twice. These scenarios are prevented by the finp2p signature and the
operations' TTL (time to live).

An **expiry date** is used to simulate both a counter (strictly increasing
counters are a traditional way to prevent replay attacks in smart contracts, but
this requires to have access to the DLT when forging/signing finp2p
transactions, which is not the case here) and a TTL for the operation. The proxy
contract allows to forward one such operation if its expiry date is not in the
past (the opcode `NOW` refers to the timestamp of the previous block + $\delta$,
to prevent malleability by bakers). Operations and their payloads are stored in
a big map of the proxy smart contract, and **must** be kept there until the
expiry date has passed. The proxy contract does not allow to forward an
operation which is already in its internal operation table. This is safe to do
because blocks of the same chain necessarily have a strictly increasing
timestamp (by `time_between_blocks` in Emmy* or the duration of the first round
in Tenderbake -- an upcoming PBFT-like consensus algorithm in Tezos).

To allow for users to submit identical transactions with identical timestamps,
the finp2p signature schemes also allow for an arbitrary nonce to be included in
the signed message.


#### Mitigating Compromised Adapters

A compromised Tezos adapter has access to the keys used to inject transactions
on the FinP2P Proxy contract (on Tezos), and so has the liberty to call any
entry point of this contract. 

A compromised adapter can of course also re-inject transactions with the same
finp2p signatures and contents, but for which the [protection described
above](#preventing-malicious-users-replay-attacks) allow to also rule out replay
attacks performed by the adapter itself.

A compromised adapter can however issue new assets "for free" because the
signature check is optional in this call. And if there was a signature, the
attacked can choose to sign his or her transaction with his own key to be issued
new assets.

The other entry points that are callable in this attack are:

- `update_operation_ttl`, which at worst can be set to 0 effectively preventing
  the proxy from forwarding calls to the FA2 (but this is revertable). This is
  equivalent to censoring transactions.

- `update_admins`, `add_admins`, `remove_admins` which allow the attacker to set
  his/her own key as administrator. But this is not worse than the situation
  where the attacker has access to the admin keys already. Upon recovery, one
  has to redeploy a new proxy contract though with the correct (new)
  administrators.

- `update_fa2_token` which allow the attacker to replace the FA2 asset of a
  given FinP2P asset id with another FA2 contract. This would effectively make
  users believe their transaction (say `transfer_asset`) when through, but the
  assets on the real FA2 contract are not at risk.

- `cleanup` which is already a public entry point.


## Cost

The effective cost of calling the most important entry points is [detailed in
this other document](cost_analysis.md).

### Garbage collection

The operation table of the proxy smart contract can be garbage collected once
the operation is expired. (Note that an operation is in the _live operations_
only if it was included successfully, _i.e._ it was forwarded and applied on the
FA2 asset.)

Because an expired operation will not be accepted by the proxy (this does not
depend on what is already stored by the contract) they can be safely discarded
to save space in the smart contract storage. The storage space allocated for a
smart contract is accounted for with a _high water mark_ system. This means that
space that is freed by our garbage collection operation (`cleanup`) can be used
to register new operations and expiry in the smart contract table _for free_ (in
terms of consumed storage).

Anyone can call `cleanup`, as no harm (only good) can be done by this entry
point and the fees have to be payed by the caller.

In the implementation of the library, the cleanup can be done
automatically. For instance, on every injection, if there are enough expired
operations to be cleaned, an extra “cleanup” is batched with the regular call.

Finding which operations are expired can be done with a block explorer (this
operation is non sensitive and can even fail, _e.g._ if the explorer is down, in
which case the cleanup will not be attempted). There is an overhead in
contacting an explorer to retrieve this info, which is in the order of
0.1s - 0.2s overhead (which is small compared to the waiting for inclusion).

Getting rid of this overhead is possible by having a background process that
takes care of calling the cleanup entry point regularly, or the call can be
initiated asynchronously with every regular call as we don’t care about the
result or if it fails.
