# QmiRun Cloud Clash (云岛对决)

Portrait 2D **merge-battler tower defense** (Rush Royale-class decision density; original world,
art, code). This directory is the authoritative project per the production spec. The sibling
`../qmirun/` is an earlier classic-lane-TD prototype kept only as reference (see DECISIONS D-001).

**Status:** Phase A done + deterministic battle core implemented & headless-verified (70 tests).
No interactive UI or tutorial yet — see `PROGRESS.md`.

## Requirements
Godot **4.3** (standard build). Blender used offline for assets only (not real-time 3D).

## Play Level 1 (interactive greybox tutorial)
```bash
godot --path cloud-clash res://game/play.tscn    # open on a desktop/Mac to see & play
```
Tap **召唤/继续/强化/白隼** as prompted; **drag** one tower onto a same-type/same-tier tower to merge.
Logic + render paths are headless-smoke-clean; on-screen visuals need a device check.

## Run the tests (headless, no GUI, no device needed)
```bash
cd cloud-clash
godot --headless --path . --import          # first time only
godot --headless --path . res://tests/tests.tscn
# or:
./run_tests.sh
```
Exits 0 iff all rule + determinism checks pass. Also prints calibration numbers.

## Architecture (spec §3 — strict separation)
```
config/config.gd     rules & tunables (single source; all numbers are test baselines)
sim/rng.gd           deterministic per-stream RNG
sim/damage.gd        pure damage / slow math
sim/geometry.gd      pure targeting (primary/splash/chain/pierce)
sim/unit.gd          board unit + contribution log
sim/enemy.gd         lane enemy (position from path progress, slows)
sim/battle.gd        one side: state + single command entry + fixed-step sim + logging
sim/match.gd         dual-board match: win/lose/timeout/draw, settle-once
sim/ai.gd            practice AI (3 legal-only strategies)
tests/               headless rule + determinism + reproducibility suite
docs/                GAME_RULES / BALANCE_SPEC / UI_SPEC / LEVEL_SPEC / ONBOARDING / ACCEPTANCE
```

Determinism contract: results depend only on rules version + config + seed + command sequence.
No logic reads render FPS, effect completion, wall-clock, projectile physics, or UI/audio callbacks.

## Docs
`docs/GAME_RULES.md` (rule IDs), `docs/BALANCE_SPEC.md` (numbers/formulas), `docs/ACCEPTANCE.md`
(ID→test→status), `DECISIONS.md`, `PROGRESS.md`, `ASSET_SOURCES.md`.
