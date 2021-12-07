all: build

DIST=dist
BUILD=_build/default

all: copy

copy: dist
	@cp -f $(BUILD)/contracts/*.mligo $(DIST)/ligo
	@cp -f $(BUILD)/contracts/n_ft_multiple.tz $(DIST)/michelson

dist: build
	@mkdir -p $(DIST)/ligo
	@mkdir -p $(DIST)/michelson

build:
	@dune build

clean:
	@dune clean

opam-switch:
	@opam switch create . ocaml-base-compiler.4.12.1 -y

build-deps:
	@opam install . --deps-only -y
