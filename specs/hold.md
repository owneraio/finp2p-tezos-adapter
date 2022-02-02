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

TODO: Schema



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

1. Retrieve the hold information from the FA2 contract.
2. Call the `release` entry point with corresponding amount.
3. Call the `transfer` entry point to transfer tokens from holder to the
   expected destination. (Note that this must be called after `release` for the
   funds to be transferable.)

##### Execute Hold by Escrow

**TODO**
