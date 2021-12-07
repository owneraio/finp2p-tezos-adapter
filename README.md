# tezos

## Installation and compilation

Create a local opam switch and install all the OCaml dependencies::

```bash
$ make opam-switch
```

Compile the OCaml Smart Contracts to mligo and then to michelson:

```bash
$ make
```

All the mligo smart contracts will be copied in the `dist/ligo`
directory and the michelson contracts in `dist/michelson`.
