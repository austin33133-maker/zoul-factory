#!/usr/bin/env bash
# One-shot bootstrap for Hermes vulnerability research.
#
# Pulls facebook/hermes, builds an ASAN + Debug variant, and prints the
# absolute paths to the three binaries we care about for fuzzing /
# differential testing / triage.
#
# Tested on Ubuntu 22.04+ and macOS 14+.
set -euo pipefail

ROOT="${HERMES_RESEARCH_ROOT:-$HOME/hermes-research}"
HERMES_REPO="${HERMES_REPO:-https://github.com/facebook/hermes.git}"
HERMES_REV="${HERMES_REV:-main}"
JOBS="${JOBS:-$(nproc 2>/dev/null || sysctl -n hw.ncpu)}"

echo "[*] root         = $ROOT"
echo "[*] hermes rev   = $HERMES_REV"
echo "[*] parallel     = $JOBS"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1"; exit 1; }; }
need git
need cmake
need ninja
need python3
need clang
need clang++

mkdir -p "$ROOT"
cd "$ROOT"

if [ ! -d hermes ]; then
  git clone --depth 1 --branch "$HERMES_REV" "$HERMES_REPO"
else
  git -C hermes fetch --depth 1 origin "$HERMES_REV"
  git -C hermes checkout "$HERMES_REV"
fi

BUILD="$ROOT/build_asan"
rm -rf "$BUILD"
mkdir -p "$BUILD"

# ASAN + UBSAN + Debug. Disable LTO so stack traces stay readable.
cmake -S hermes -B "$BUILD" -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_C_COMPILER=clang \
  -DCMAKE_CXX_COMPILER=clang++ \
  -DCMAKE_C_FLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -g" \
  -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -g" \
  -DCMAKE_EXE_LINKER_FLAGS="-fsanitize=address,undefined" \
  -DHERMES_ENABLE_DEBUGGER=ON \
  -DHERMES_ENABLE_TEST_SUITE=ON \
  -DHERMES_ENABLE_INTL=OFF

cmake --build "$BUILD" -j "$JOBS" --target hermes hermesc hbcdump hbc-diff

echo
echo "=== built ==="
printf "  HERMES_BIN=%s\n"   "$BUILD/bin/hermes"
printf "  HERMESC_BIN=%s\n"  "$BUILD/bin/hermesc"
printf "  HBCDUMP_BIN=%s\n"  "$BUILD/bin/hbcdump"
printf "  HBC_DIFF_BIN=%s\n" "$BUILD/bin/hbc-diff"

echo
echo "Quick sanity:"
"$BUILD/bin/hermes" -e 'print("hermes asan ready: " + (1+2))'

cat <<EOF

export these in your shell to chain with diff-test.py / fuzz harness:

  export HERMES_BIN=$BUILD/bin/hermes
  export HERMESC_BIN=$BUILD/bin/hermesc
  export HBCDUMP_BIN=$BUILD/bin/hbcdump

EOF
