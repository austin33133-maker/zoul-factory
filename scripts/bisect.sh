#!/usr/bin/env bash
# Wrap `git bisect run` for Hermes regression hunting.
#
# Given a known-bad commit (or HEAD) and a known-good commit, this script
# rebuilds Hermes at each step and runs $POC through it, exiting 1 (bad)
# if the bug reproduces, 0 (good) otherwise.
#
# Usage:
#   HERMES_SRC=$HOME/hermes-research/hermes \
#   POC=/abs/path/poc.min.js \
#   BAD=HEAD GOOD=v0.12.0 \
#   ./scripts/bisect.sh
#
# Override BUILD_DIR if you want incremental rebuilds (faster).
set -euo pipefail

: "${HERMES_SRC:?set HERMES_SRC to the hermes source tree}"
: "${POC:?set POC to the absolute path of the PoC js}"
: "${BAD:=HEAD}"
: "${GOOD:?set GOOD to a known-good commit/tag}"
BUILD_DIR="${BUILD_DIR:-$HERMES_SRC/../build_bisect}"

cat > /tmp/hermes-bisect-step.sh <<EOS
#!/usr/bin/env bash
set -e
cmake -S "$HERMES_SRC" -B "$BUILD_DIR" -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ \
  -DCMAKE_C_FLAGS="-fsanitize=address -fno-omit-frame-pointer -g" \
  -DCMAKE_CXX_FLAGS="-fsanitize=address -fno-omit-frame-pointer -g" \
  -DCMAKE_EXE_LINKER_FLAGS="-fsanitize=address" \
  -DHERMES_ENABLE_INTL=OFF >/dev/null
cmake --build "$BUILD_DIR" -j \$(nproc) --target hermes >/dev/null
OUT=\$("$BUILD_DIR/bin/hermes" - < "$POC" 2>&1 || true)
# Adjust this match to your bug's signature.
if grep -q -E "AddressSanitizer|runtime error|SEGV|stack-buffer-overflow|heap-buffer-overflow" <<< "\$OUT"; then
  exit 1   # bad
else
  exit 0   # good
fi
EOS
chmod +x /tmp/hermes-bisect-step.sh

cd "$HERMES_SRC"
git bisect start
git bisect bad "$BAD"
git bisect good "$GOOD"
git bisect run /tmp/hermes-bisect-step.sh
git bisect log
