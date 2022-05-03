
DIST=dist
BUILD=_build/default

all: contracts lib server

.PHONY: contracts
contracts: build copy

copy: dist-dir
	@cp -f $(BUILD)/contracts/*.mligo $(DIST)/ligo
	@cp -f $(BUILD)/contracts/*.tz $(DIST)/michelson
	@cp -f $(BUILD)/contracts/*.json $(DIST)/michelson
	@cp -f $(BUILD)/contracts/for_tests/fa2.json $(DIST)/michelson/for_tests/test_fa2.json

dist-dir:
	@mkdir -p $(DIST)/ligo
	@mkdir -p $(DIST)/michelson/for_tests

.PHONY: build
build:
	@dune build

clean:
	@dune clean
	@rm -rf dist/js

fmt:
	@dune build @fmt --auto-promote

_opam:
	@opam switch create . --empty --no-install

build-deps: _opam
	@opam install . --deps-only -y

ts-deps:
#	@sudo npm i -g typescript
	@npm --prefix tezos-lib install

ts-dev-deps: ts-deps
	@npm --prefix tezos-lib install --dev

lib:
	@npm --prefix tezos-lib run build

build-tests:
	@npm --prefix tezos-lib run build-test

test:
	@npm --prefix tezos-lib test

server-deps:
	@npm --prefix server install

server-dev-deps:
	@npm --prefix server install --dev

.PHONY: server
server:
	@npm --prefix server run build

docker:
	@docker build -f build/Dockerfile -t tezos-adapter:latest .

start-sandbox-network:
	@npx --prefix tezos-lib ts-node tezos-lib/tests/sandbox.ts start

stop-sandbox-network:
	@npx --prefix tezos-lib ts-node tezos-lib/tests/sandbox.ts stop

redeploy-contracts:
	@npx --prefix tezos-lib ts-node tezos-lib/tests/redeploy_contracts.ts configs/testnet-config.json
