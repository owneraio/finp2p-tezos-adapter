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

_opam:
	@opam switch create . --empty --no-install

build-deps: _opam
	@opam install . --deps-only -y
