![](https://github.com/owneraio/finp2p-tezos-adapter/actions/workflows/test-ts-lib.yml/badge.svg)

# Tezos FinP2P adapter

## Documentation

- [Design choices and specifications for the smart contracts](specs/design.md)
- [Analysis of costs of smart contract calls](specs/cost_analysis.md)

## Typescript Tezos Library

### Installation and compilation

Install the dependencies with

```bash
$ make ts-deps
```

Compile the typescript library with

```bash
$ make lib
```

The JavaScript code will be produced in the [dist/js](dist/js) directory.

## FinP2P DLT Adapter Server

### Installation and compilation

DLT Adapter server source in [server](server)

Install the dependencies with

```bash
$ make server-deps
```

Compile the typescript library with

```bash
$ make server
```

The JavaScript code will be produced in the server/lib directory.

### Docker
The prject can be built and baked using Docker in [dockerfile](build/Dockerfile)

```bash
$ make docker
```

## Smart contracts

The smart contracts are provided in three formats:

- OCaml (mligo) in [contracts](contracts), the **reference implementation**
- Ligo in [dist/ligo](dist/ligo)
- Michelson in [dist/michelson](dist/michelson)

The compiled contracts are provided in this repository but one can regenerate
them to, _e.g._, ensure that the compiled Michelson matches the high level
reference implementation.

There is no need to re-compile the contracts for deployment or testing.

The rest of this section gives the necessary steps to re-compile the contracts.

### Prerequisites for compilation of smart contracts

- [Install Opam](https://opam.ocaml.org/doc/Install.html)
- [Install Ligo](https://ligolang.org/docs/intro/installation)

### Installation and compilation

Install the dependencies with

```bash
$ make build-deps
```

Compile the OCaml Smart Contracts to Ligo and then to Michelson:

```bash
$ make contracts
```

All the Ligo smart contracts will be copied (overwritten) in the
[dist/ligo](dist/ligo) directory and the Michelson contracts in
[dist/michelson](dist/michelson).

## Tests

The smart contracts are deployed on the current Tezos testnet (hangzhou2net) at
the following addresses:

Contract | Address
---|---
FinP2P Proxy | [KT1Q5d32TjMPpfvoKXPKuQ7Dr1f96XUzA6sR](https://better-call.dev/hangzhou2net/KT1Q5d32TjMPpfvoKXPKuQ7Dr1f96XUzA6sR)
FinP2P FA2 | [KT1WbSTtsza3Sb1yaBA651XBA8LRMRFQQaHL](https://better-call.dev/hangzhou2net/KT1WbSTtsza3Sb1yaBA651XBA8LRMRFQQaHL)
Authorization contract | [KT1QjrVNZrZEGrNfMUNrcQktbDUQnQqSa6xC](https://better-call.dev/hangzhou2net/KT1QjrVNZrZEGrNfMUNrcQktbDUQnQqSa6xC)

The provided links to the BetterCallDev explorer allows to see the different
operations and the tokens on the FA2 contract.

### Replaying tests

Tests can be replayed by simply running (after having installed the typescript
dependencies):

```bash
$ make test
```
