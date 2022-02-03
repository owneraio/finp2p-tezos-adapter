# Hold and Release for FinP2P Assets

FinP2P assets can represent digital securities but also currencies. This means
that they can be used as a payment mechanism (to settle an asset transfer in
another DLT for instance).

To support this process, additional functionality needs to be added to the asset
tokens smart contracts on the Tezos side. There are two ways to proceed
depending on the guarantees and flexibility that we seek.

## Escrow VS. Hold

### Escrow

FinP2P assets can be moved to an _escrow contract_ which will take care of
holding the tokens. The tokens put in escrow can then be moved to their
destination when the settlement takes place, or they can be returned to the
original owner if it expires or if it is canceled.

With an escrow mechanism, the funds have to be **moved out** from the owners
account to the escrow contract. To an outside observer, it looks like the owner
does not possess the tokens that are in escrow, so in particular, this means
that any (on-chain or off-chain) mechanism which incurs dividends for the
tokens/assets of an owner will not work directly.

The advantage of using an escrow contract is that any (FA2) token can be used as
a settlement currency. This would allow in particular users who own one of the
stable coin on Tezos (such as [USDtz](https://usdtz.com/),
[kUSD](https://kolibri.finance/), [uUSD](https://youves.com/), wrapped USDC
tokens, or [USDC](https://www.circle.com/en/usdc) if it supports Tezos in the
future), to make payment on FinP2P directly.


### Hold and Release

In order for the owners to keep their tokens in their account, one must
implement a hold mechanism on the token natively. This means that tokens never
leave a users account, but instead the FA2 token contract (or an external
coupled one) keeps track of holds that are opened for every user and every
tokens. The FA2 contract then ensures that only funds that are not on hold can
be moved out of an account (in an asset transfer, or asset redeem operation for
instance).

The advantage of this approach, is that the tokens and value stay in possession
of the user when they are put on hold, which allows external mechanisms (_e.g._,
for dividends) to work unchanged. Because all the information about the tokens
are kept in the same place, it is also easier to retrieve what is relevant for
applications (for instance, the number of held tokens for user, _etc._).

The drawback is that only tokens that natively support this hold mechanism can
be used. For the FinP2P application, this means that the organizations will need
to issue the tokens that represent FIAT currency themselves. (But note that
these tokens will be subject to the same constraints as the FinP2P security
tokens, and in particular they will not be exchangeable freely.)

The constraint that users keep their held tokens in their account is
important for _security_ assets (_e.g._, like the assets created by
organizations in FinP2P) but it is not so much important for tokens that
represent a payment currency (such as stable coins).

This is why we propose to have a hybrid mechanism where external (to FinP2P) FA2
assets on Tezos (like stable coins) will be held in an escrow contract whereas
FinP2P assets tokens will be held with a _built-in_ hold and release mechanism
in the FA2 smart contract.

**TODO**: Schema


## Native Hold in FA2 Asset Contract

The proposed solution is similar to the
[UniversalToken](https://github.com/ConsenSys/UniversalToken) developed by
Consensys on the Ethereum blockchain, with the difference that our solution is
lower level and only provides the necessary basic building blocks for a hold
mechanism.

We extend the FA2 contract with three additional entry points:

- `hold` to put tokens on hold,
- `release` to release tokens on hold back to their owner,
- `execute` to execute a on hold.

Additional views are also provided to query the balance and total number of
tokens on hold for a specific user and token.

To keep track of this information we must augment the storage with the following
fields:
- `holds` :  a big map from unique `hold_id`s to hold information to store each
  new hold that is made,
- `holds_totals` : a big map from address and token id to an amount that
  represent the total number of tokens (of this token id) on hold for a given user,
- `max_hold_id` : a global incrementing counter to generate new fresh hold_ids.


### `hold`

```ocaml
type hold = {
  token_id : token_id;
  amount : token_amount;
  src : address;
  dst : address option;
}

type hold_param = { id : hold_id option; hold : hold }

let hold (h : hold_param) (s : storage) : storage = ...
```

This entry point has the same authorization policy as the `transfer` entry
point. This means that it can be called by the proxy contract or an accredited
user. For this reason it is grouped with what we call the asset entry points of
the FA2 contract (namely `transfer`, `add/remove_operator`, `balance_of`).

#### Spec

The `hold` entry point checks that the `hold_id`, when provided, is strictly
greater than `max_hold_id`. This prevents reusing released hold ids. If the
hold_id is not provided, a fresh hold id is computed as `max_hold_id + 1`.

Note that when a user provides his or her own hold id, the transaction is
subject to _front running_ attacks. It is possible for an attacker to make all
these hold operations fail by monitoring the mempool and injecting hold
transactions (of say 0 tokens) with the same `hold_id`. This is not a problem in
our solution with the proxy because the hold operation is internal and the hold
id is computed dynamically.

The hold information is then stored in the `holds` table. And finally, the total
held for the user is incremented with the hold amount in the table `holds_totals`.

### `release`

```ocaml
type release_param = { 
  hold_id : hold_id; 
  amount : token_amount option;
  token_id : token_id option;
  src : address option;
}

let release (r : release_param) (s : storage) : storage =
```

The authorization policy for this entry point restricts calls to be made only by
the proxy.

#### Spec

Calling `release` will remove the hold (if no amount is provided or if the
amount is the one of the hold) or decrement the hold, effectively returning the
held tokens to the original user.

When provided, `token_id` and `src` must match the one of the hold.

If the `amount` is smaller than the amount of the hold (it cannot be greater),
then the hold remains active, but is decremented by the released amount. In this
case we talk about a _partial release_ of the tokens.


### `execute`

```ocaml
type execute_param = { 
  hold_id : hold_id; 
  amount : token_amount option;
  token_id : token_id option;
  src : address option;
  dst : address option;
}

let execute (e : execute_param) (s : storage) : storage =
```

The authorization policy for this entry point restricts calls to be made only by
the proxy.

#### Spec

Calling `execute` will remove the hold (if no amount is provided or if the
amount is the one of the hold) or decrement the hold, and transfer the executed
amount to the intended destination.

It is important to remove the hold before transferring the tokens to be able to
reuse the internal transfer function and ensure it goes through.

When provided, `token_id` and `src` must match the one of the hold.

When the hold was not registered with a destination, `dst` must be provided. (It
can also be provided if there is a destination in the hold, but it must be
identical.)

If the `amount` is smaller than the amount of the hold (it cannot be greater),
then the hold remains active, but is decremented by the executed amount. In this
case we talk about a _partial hold execution_.


### Modifications to the Other Entry Points

The entry points of the contract which transfer funds out of an account must
ensure that only the tokens that are not on hold are transferred. We talk about
the _spendable_ balance of an account (the full balance minus the total tokens
on hold).

In the case of our FA2, only the entry points `transfer` and `burn` needs to be
modified to ensure that the transferred (resp. burned) tokens are within the
spendable balance of the source account.


## Changes to the Proxy Contract

To support these new features the Proxy contract is augmented with three new
entry points:

- `hold_tokens` (put tokens on hold)
- `execute_hold` (transfer tokens on hold)
- `release_hold` (return tokens to owner)

Only the `hold_tokens` entry point requires a signature from a FinP2P user. The
other entry points are called a FinP2P admin account, which in this case acts as
a _notary_ for the hold (the FinP2P network takes care of solving disputes,
_etc_.).

The implementation for these entry points depends on if the held tokens are a
FinP2P asset or an external asset (in which case they must go through an
[escrow](#escrow-contract)).

To make this information known to the outside (either by other contracts, or by
off-chain applications), the proxy contract needs to provide enriched views
which give the information about tokens on hold for users.

We propose to keep `get_asset_balance` unchanged, _i.e._ returns the full
balance of a user for a given asset. And we propose to add
`get_asset_spendable_balance` which returns the balance that can be transferred
out (_i.e._ without the tokens on hold) and a new view `get_asset_balance_info`
which returns both the full balance and the total amount of this asset on hold
for a given user.

### `hold_tokens`

```ocaml
type hold_tokens_param = {
  hold_id : finp2p_hold_id; (* = boxed bytes *)
  asset_id : asset_id; (* = boxed bytes *)
  amount : token_amount;
  src_account : public_key;
  dst_account : public_key option;
  expiration : timestamp;
  nonce : { nonce :bytes; (* 24 bytes *)
            timestamp : timestamp };
  ahg_wo_nonce : bytes;
  signature : signature;
}

let hold_tokens (p : hold_tokens_param) (s : storage) : operation * storage = ...
```

This Tezos operation must be signed/injected by an administrator.

##### Signed Payload

> See [API reference](https://finp2p-docs.ownera.io/reference/transfertoken) in
> **BUYERTRANSFERSIGNATURE** and
> [DLT spec](TODO).

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
| 1 | assetType       | utf8 string  | "finp2p", ~~"fiat", "cryptocurrency"~~ |
| 2 | assetId         | utf8 string  | unique identifier of the asset |
| 3 | srcAccountType  | utf8 string  | "finId", "cryptoWallet", "escrow" **TODO?**|
| 4 | srcAccount      | utf8 string  | source account of the asset  |
| 5 | dstAccountType  | utf8 string  | "finId", "cryptoWallet", "escrow" **TODO?**|
| 6 | dstAccount      | utf8 string  | destination account for the asset  |
| 7 | amount          | utf8 string  | hex representation of the settlement amount |
| 8	| expiry          | utf8 string  | hex representation of the escrow hold expiry value |

#### Verifying hold signatures

To verify a hold operation signature, one needs only to check the _settlement
hash group_ as it contains all the necessary information to put the tokens on
hold. **However, to prevent replay attacks on this hold operation one must also
extract the timestamp from the nonce of the _asset hash group_ in order to know
the operation's live status.**

This is why the AHG cannot be given _as is_ to the entry point `hold_tokens` but
instead it expects to get both the nonce and the rest of the asset group payload
(`ahg_wo_nonce`) in bytes form.

The entry point performs the following:
1. Check that the operation is still **live**, _i.e._ check that the `timestamp`
   plus the constant `operation_ttl` is still in the future and that the
   `timestamp` is in the past.
2. Encode the parameters (without the signature, nor nonce) in bytes to recover
   the SHG
3. Encode the nonce + `ahg_wo_nonce` in bytes to recover the AHG
4. Hash the produced bytes (this is in fact the `hashGroup`) and ensure that it
   is not in our `live_operations` table.
4. Register the hash -> timestamp in the `live_operations` table.
   - We store the timestamp rather than the expiry date so that in case the
     `operation_ttl` is updated, the new ttl takes effect immediately (even for
     existing operations).
5. Check that the encoded message was signed by the public key `src_account`
   (of the SHG) which corresponds to the **buyer**.
6. Depending on the asset, either:
   - Call the `hold` entry point of the FA2 contract, or
   - Transfer the FA2 tokens to the **Escrow** contract (by calling the
     `tranfer` entry point)
     **TODO**: This may require a additional bookkeeping transaction
   


### `execute_hold`

```ocaml
type execute_hold_param = {
  hold_id : finp2p_hold_id; (* = boxed bytes *)
  asset_id : asset_id option;  (* = boxed bytes *)
  amount : token_amount option;
  src_account : public_key option;
  dst_account : public_key option;
}

let execute_hold (p : execute_hold_param) (s : storage) : operation * storage = ...
```

This Tezos operation must be signed/injected by an administrator.


#### Spec for Execute Hold

Executing a hold here means that the FinP2P admin has confirmed the
corresponding sell and so the tokens on hold must be paid to the intended
recipient.

The destination for a hold is optional when it is created. If it was not set at
creation time then the admin must provide a destination (`dst_account`) when
calling `execute_hold`.

Only the FinP2P `hold_id` is compulsory. The other information, _i.e._
`asset_id` and `src_account` are used to perform extra checks to ensure that the
values are the expected ones.

The `amount` can be inferior to the amount that was put on hold. In this case,
the execution is _partial_, and there is still a hold for the difference.
**TODO**: Do we want to release the rest or not?

The `execute_hold` works differently if the hold is native to the FA2 or if it
resides in an external **Escrow** contract.

##### Execute Native Hold on FA2 

1. Remove `hold_id` association from storage.
2. Call the `execute` entry point with corresponding amount and destination.

##### Execute Hold by Escrow

**TODO**


### `release_hold`

```ocaml
type release_hold_param = {
  hold_id : finp2p_hold_id; (* = boxed bytes *)
  asset_id : asset_id option;  (* = boxed bytes *)
  amount : token_amount option;
  src_account : public_key option;
}

let release_hold (p : release_hold_param) (s : storage) : operation * storage = ...
```

This Tezos operation must be signed/injected by an administrator.


#### Spec for Release Hold

Releasing a hold happens when the other side of the bargain has not been
fulfilled or if the FinP2P transaction is canceled. This event is initiated by
the notary (_i.e._ an admin of the proxy contract). In this case, the funds are
not transferred to their intended destination but are instead returned to the
original owner.

Only the FinP2P `hold_id` is compulsory. The other information, _i.e._
`asset_id` and `src_account` are used to perform extra checks to ensure that the
values are the expected ones.

The `amount` can be inferior to the amount that was put on hold. In this case,
the release is _partial_, and there is still a hold for the difference.
**TODO**: Do we want to forbid partial release or not?

The `release_hold` works differently if the hold is native to the FA2 or if it
resides in an external **Escrow** contract.

##### Release Native Hold on FA2 

1. Remove `hold_id` association from storage.
2. Call the `release` entry point with corresponding amount.

##### Release Hold by Escrow

**TODO**
