#!/usr/bin/env bash

set -e

script_dir="$(cd "$(dirname "$0")" && echo "$(pwd -P)/")"
dir="$(dirname "$script_dir")"

cd "$dir"

# Use this to replace in all files, maybe too violent
# files=$(find "$dir" -type f)

files="README.md server/src/helpers/config.ts"

cp configs/testnet-config.json /tmp/tmp-config.json
npx --prefix tezos-lib ts-node tezos-lib/tests/redeploy_contracts.ts /tmp/tmp-config.json

fields=("finp2pAuthAddress" "finp2pFA2Address" "finp2pProxyAddress")
replacements=""
for field in "${fields[@]}"; do
    old="$(cat configs/testnet-config.json | jq -r .$field)"
    new="$(cat /tmp/tmp-config.json | jq -r .$field)"
    replacements="$replacements;s/$old/$new/g"
done

sedi=(-i)
case "$(uname)" in
  # For macOS, use two parameters
  Darwin*) sedi=(-i "")
esac

for f in $files; do
    sed "${sedi[@]}" -e "$replacements" $f
done

cp /tmp/tmp-config.json configs/testnet-config.json
