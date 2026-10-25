#!/usr/bin/env bash
# Headless rule + determinism tests for Cloud Clash. Requires godot 4.3 on PATH.
set -euo pipefail
cd "$(dirname "$0")"
godot --headless --path . --import >/dev/null 2>&1 || true
godot --headless --path . res://tests/tests.tscn
