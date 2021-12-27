# Tezos FinP2P adapter

## Smart contracts

The smart contracts are provided in three formats:

- OCaml (mligo) in [contracts](contracts), the [**reference implementation**]
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

Compile the typescript library with

### Docker
The prject can be built and baked using Docker in [dockerfile](build/Dockerfile)

```bash
$ make docker
```



