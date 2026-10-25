#!/usr/bin/env bash
# Run QmiRun's headless test suites. Requires `godot` (4.3) on PATH.
# Usage: ./run_tests.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "== Importing project (populates .godot/ on a fresh checkout) =="
godot --headless --path . --import >/dev/null 2>&1 || true

echo "== Unit + balance sim =="
godot --headless --path . res://tests/tests.tscn
echo

echo "== Integration smoke =="
godot --headless --path . res://tests/integration.tscn
echo
echo "All suites passed."
