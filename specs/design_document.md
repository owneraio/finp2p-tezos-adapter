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

#### FinP2P relay contract

##### Preventing replay attacks

#### FA2 asset contracts

### Security

### Cost

#### Garbage collection
