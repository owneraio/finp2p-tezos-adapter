
DIST=dist
BUILD=_build/default

all: contracts lib

contracts: build copy

copy: dist-dir
	@cp -f $(BUILD)/contracts/*.mligo $(DIST)/ligo
	@cp -f $(BUILD)/contracts/*.tz $(DIST)/michelson
	@cp -f $(BUILD)/contracts/*.json $(DIST)/michelson

dist-dir:
	@mkdir -p $(DIST)/ligo
	@mkdir -p $(DIST)/michelson

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
	@sudo npm i -g typescript
	@npm --prefix tezos-lib install

ts-dev-deps: ts-deps
	@npm --prefix tezos-lib install --dev

lib:
	@tsc -p tezos-lib/tsconfig.json

build-tests:
	@tsc -p tezos-lib/tests/tsconfig.json

test:
	@cd tezos-lib && npm test
