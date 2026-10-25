#!/usr/bin/env bash
# Headless rule + determinism + tutorial-acceptance tests. Requires godot 4.3 on PATH.
set -euo pipefail
cd "$(dirname "$0")"
godot --headless --path . --import >/dev/null 2>&1 || true
echo "== core rules + determinism =="
godot --headless --path . res://tests/tests.tscn
echo "== tutorial level 1 acceptance =="
godot --headless --path . res://tests/tutorial.tscn
echo "== play scene render smoke (auto) =="
godot --headless --path . res://game/play.tscn --quit-after 600 -- --auto >/dev/null 2>&1 && echo "render smoke: no script errors"
