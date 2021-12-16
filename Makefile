all: build

DIST=dist
BUILD=_build/default

all: copy

copy: dist
	@cp -f $(BUILD)/contracts/*.mligo $(DIST)/ligo
	@cp -f $(BUILD)/contracts/*.tz $(DIST)/michelson
	@cp -f $(BUILD)/contracts/*.json $(DIST)/michelson

dist: build
	@mkdir -p $(DIST)/ligo
	@mkdir -p $(DIST)/michelson

build:
	@dune build

clean:
	@dune clean

fmt:
	@dune build @fmt --auto-promote

_opam:
	@opam switch create . --empty --no-install

build-deps: _opam
	@opam install . --deps-only -y
