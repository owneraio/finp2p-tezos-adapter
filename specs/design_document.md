# Tezos adapter for FinP2P

The purpose of this adapter is to allow FinP2P users to move assets deployed on
Tezos. The main constraint being that not all nodes of the FinP2P network have a
Tezos adapter and thus not all nodes can access the Tezos blockchain.


## Design choice for assets

We propose to use the
[FA2](https://gitlab.com/tezos/tzip/-/blob/master/proposals/tzip-12/tzip-12.md)
standard to represent financial assets on Tezos. This is the latest standard and
now the most commonly used one for new projects. It is generally well supported
in the ecosystem (block-explorers, wallets, libraries, _etc._) and offers the
flexibility and extensibility that we seek.

In particular, it allows to represent _fungible_ assets, _non-fungible_ assets,
_semi-fungible_ assets (_i.e._ non-fungible assets, but each with a fixed amount
of fungible copies), and contracts with _multiple assets_.


## Tezos assets transactions on FinP2P

Each FinP2P user has a **secp256k1** key-pair at his or her disposal and can
sign arbitrary messages/transactions with it.

There are two possibilities for FinP2P users: 
1. Sign tezos transactions directly, or
2. Sign transfer order messages, that are injected by another account on the
   chain to a smart contract which checks the signature and execute the order.
   
(1) seems to be incompatible with the restriction that not all FinP2P nodes have
access to the Tezos blockchain. In particular the necessary information needs to
be retrieved from a Tezos node to _forge_ a complete transaction (or smart
contract call):

- `branch`: a recent block hash from the chain (no more that 120 blocks old,
  _i.e._ one hour)
- `counter`: the counter associated to the account (_i.e._ the address, or
  public key hash, of the FinP2P cryptographic key). This counter is incremented
  at each transaction (and is initialized with an arbitrary number by the chain
  on the first transaction).

There is also the need to specify precise values for _gas limit_ and a _storage
limit_ (and an appropriate fee which corresponds to these limits). These limits
are part of the signed operation and we can decide to put what we want here, 
however putting too large values mean we will have to pay a large fee which is
not ideal. The best way to compute these values is to perform a simulation of
the operation on a Tezos node and get back the appropriate gas and storage
consumed. This requires to have access to a Tezos node as well.

(2) Seems adequate for what we want to do but it comes with added complexity on
the chain, and introduces security concerns (_e.g._ replay attacks) to which
great care needs to be given.

In the following we propose an architecture (for the smart contracts mostly)
that allows users to sign payloads for Tezos asset transfers _offline_ securely,
with signature checks happening on-chain. The assets are attributed to the
addresses that correspond to the user's FinP2P addresses, so this is transparent
for all other contracts and tools. This system allows users to also sign and
inject transactions with their FinP2P key directly on Tezos (if they have access
to a node).


## FA2 transfers (and more) with offline signatures

Tezos supports three cryptographic signature schemes, whose keys (and key hashes) are
identified with a different prefix in their Base-58 representation:
- `tz1` : public key hashes for Ed25519
- `tz2` : public key hashes for secp256k1
- `tz3` : public key hashes for P-256 (secp256r1)

FinP2P keys thus yield `tz2` addresses for the users on Tezos. In the following
we will consider that the only `tz2` addresses that we manipulate are FinP2P
addresses, and we will use `tz1` for other keys on Tezos.

### Diagram

![Architecture](images/finp2p_tezos_archi.drawio.svg)

### Contracts

There is **one** main relay contract for all FinP2P assets deployed on Tezos,
and there are as many FA2 asset contracts as we want.

Typically one will want to deploy a new FA2 asset contract when there is a new
kind of asset is issued.

#### Relay contract vs. transfer hooks

Using a relay contract which checks payload signatures and dispatches
operations to the corresponding asset contracts seems more lightweight and
flexible. We sum up the advantages of each approach.

| _Advantage_    | Relay   | Hook   |
| --- | :---------: | :------: |
| Tokens held by `tz2` | ✓ | |
| Contract calls for simple transfer | 2 | 3 |
| Atomic (only internal transactions) | ✓ |  |
| No need to add operator in FA2 | | ✓ |
| Easily updatable | ✓ | (update each managed) |
| Transferable outside of relay or managed | ✓ |  |

##### Transfer/owner hooks

Sender and receiver (they must be smart-contracts in this case) can implement
receive and send hooks. These hooks are called by the FA2 contract on transfer
and they can perform actions (for instance, the receiver can forward tokens to
another address, say a `tz2`) or perform checks (for instance a sender contract
can check a signature -- of the transfer parameter + payload information,
etc. -- and fail, which rollback the whole transaction sequence).

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

###### Example for transfer of `amt` tokens from `tz2A` to `tz2B`

- `KT1A` is a contract with manager `tz2A`
- `KT1B` is a contract with manager `tz2B`


```
- tz1admin -- record payload + signature --> KT1A hook 
- tz1admin -- transfer amt of KT1token from KT1A to KT1B 
  - KT1token -- sender hook [Tr(amt,KT1,KT1B)] --> KT1A
    - KT1A -- check signature (() or fail)
  - KT1token -- receiver hook [Tr(amt,KT1,KT1B)] --> KT1B
```

##### Relay contract

A relay contract for the FinP2P assets can be deployed once and for all to
interact with the FinP2P assets. The role of this contract is to check for
payload signatures (and ensure safety properties) and forward/relay calls to the
FA2 asset contracts.

The relay contract (let's call it `KT1Relay`) acts a central database of
information through which all asset operations transit. The main advantage of
this approach is that the relay will produce operations of transfers (for
example) between `tz2` addresses, and that the owners of said assets will be
`tz2` addresses (_i.e._ the same addresses/public key than on the FinP2P
network). It also allows for _Tezos operations_ to be injected and signed by the
FinP2P (tz2) key directly should we decide to switch the scheme (it also allows
for an later cost optimization on FinP2P nodes that are connected to a Tezos
node/adapter).

The main drawback is that `tz2` addresses need to add `KT1Relay` as an operator
for each asset. The FA2 standard does not specify who can add operators for a
specific owner, and in particular it allows for a central authority to change
operators at will. Multiple possibilities here, depending on the
decentralization level that we want to achieve:

1. An administrator (possibly updatable) of the FA2 asset contract can set
   `KT1Relay` as an operator for any account. This gives **a lot** of power to
   the administrator, which users of the FA2 must now trust. It may be
   undesirable.
2. Only owners (FinP2P tz2 addresses) can "add an operator" (such as
   KT1Relay). This is the usual way to add operators in other FA2 assets on
   Tezos. However it requires to sign these operations on FinP2P nodes that are
   connected to a Tezos node, which we want to avoid (or for which we need to
   find a workaround). Operators are defined for each owner and _token id_, so
   this must be called for each new owner and each new token id (in the case of 
   mutli-asset contracts, or NFT contracts).
3. "Add operators" operations are seen as the other operations on the asset, and
   so will be forwarded by the relay contract with FinP2P signatures on
   "blockchain independent" payloads. This is also necessary to be done for each
   token id, but it is more seamless.

TODO:
- [ ] Describe storage:
  - association map FinP2P tz2 -> public key (`sppk...`(55))
  - association map FinP2P operation payload hash ->  expiry date
  - admin set (is needed or can anyone relay? in theory ok, but more security
    with admin set (managed like multisig))
- [ ] Describe entry points
  - `relay : payload * signature -> storage * operation list`
  - admin managing (if any)

###### Example for transfer of `amt` tokens from `tz2A` to `tz2B`

TODO

#### FA2 asset contracts

TODO:
- [ ] Decide update operator scheme
- [ ] Describe additional information that we _need_ to store
- [ ] Describe the kind of asset that will be deployed in FinP2P
- [ ] Describe/decide the deployment scheme for these assets (anyone, approved
      set, admin, factory contract, _etc._)

### Security

When re-implementing checks that would normally be performed by the blockchain
protocol, it must be taken great care of not introducing _security
vulnerabilities_.

In particular (for both relay and hooks schemes), checking signatures is
normally done by the blockchain (transactions and smart contract calls are
signed by their originator in Tezos). The operations that are signed include
information to ensure that the operation comes for the correct "person", and
cannot be _modified_ or _replayed_ (_i.e._ re-included in a different block) by
another party.

#### Preventing replay attacks

To prevent replay attack, the signed payload must contain the following:

- The **chain id** is used to prevent replaying an operation on a different
  chain (_e.g._ we don't want an operation on a testnet to be valid on the main
  chain).
- The **address of the relay contract** is used to prevent an operation for
  another relay. Anyone can redeploy an identical relay contract, and we don't
  want operations on one relay to be _relayable_ by someone else (this would
  allow to replay the operation).
- An **expiry date** is used to simulate both a counter (strictly increasing
  counters are a traditional way to prevent replay attacks in smart
  contracts) and a TTL for the operation. The relay contract allows to forward
  one such operation if its expiry date is not past (the opcode `NOW` refers to
  the timestamp of the previous block, to prevent malleability by
  bakers). Operations and their payloads are stored in a big map of the relay
  smart contract, and **must** be kept there until the expiry date has
  passed. The relay contract does not allow to forward an operation which is
  already in its internal operation table. This is safe to do because blocks
  of the same chain necessarily have a strictly increasing timestamp (by
  `time_between_blocks` in Emmy* or the duration of the first round in
  Tenderbake -- an upcoming PBFT-like consensus algorithm in Tezos).
- The actual **payload** of the desired action. We envision that these payloads
  are _lambdas_. This brings the most flexibility, effectively allowing the
  relay contract to call _any_ smart contract, irrespective of its
  signature/interface. See [the format](#format-of-payload-for-tezos-asset-transactions).


### Cost

TODO:
- [ ] Perform cost evaluation in gas/fees for different operations/scenarios

#### Garbage collection

The operation table of the relay smart contract can be garbage collected once
the operation is expired. (Note that an operation is in the table only if it was
included successfully, i.e. it was forwarded and applied on the FA2 asset.)

Because an expired operation will not be accepted by the relay (without looking
at the state) they can be safely discarded to save space in the smart contract
storage. The storage space allocated for a smart contract is accounted with
_high water mark_ system. This means that space that is freed by our garbage
collection operation can be used to register new operations and expiry in the
smart contract table _for free_ (in terms of consumed storage).

Removing expired operations is an entry point of the relay contract
callable by anyone.

### Format of payload for Tezos asset transactions

#### Description

Payloads are lambas of type : ```unit -> operation list```

In ligo/OCaml:

```ocaml
(fun () ->
  let c : (transfer list) contract option = 
    Tezos.get_entrypoint_opt "%transfer" ("KT1Fa2asset" : address) in
  match c with
  | None -> (failwith "Invalid FA2 Address" : (transfer list) contract)
  | Some c ->  c in 
  let op = 
    Tezos.transaction
      [{ from_ = ("tz2A" : address) ;
         txs = [{ to_ = ("tz2B" : address) ;
                  token_id = 0n ; 
                  amount = 1000n }]
      }]
      0mutez
      c in
  [op]
)
```

#### Binary format
