# PROGRESS — QmiRun Cloud Clash

Rules version 0.1.0. Phases per spec §18: A env+rules · B full greybox+tutorial · C six-tower+balance tools · D visuals/pages · E networking.

## 已实现 (implemented)
- Deterministic battle core: fixed-step sim, 5×3 board, energy economy, summon, merge, type upgrade, 6 tower behaviours (single/splash/chain/pierce/snow/flower), targeting, slow system, hero mark, 4 enemy types, magnet-boss cell-disable, waves, leaks, win/lose. — `sim/`, `config/`
- Single validated command entry; UI/AI cannot mutate state directly. — `sim/battle.gd`
- Independent RNG streams per side/purpose. — `sim/rng.gd`
- Dual-board match wrapper (draw / winner / timeout-by-lives / settle-once). — `sim/match.gd`
- Practice AI, 3 legal-only strategies. — `sim/ai.gd`
- Per-unit contribution + economy logging + damage attribution. — `sim/battle.gd`, `sim/unit.gd`
- **Tutorial Level 1 state machine** (T01–T08: summon/merge/upgrade/hero, pause, grants, mini-boss, win/fail/retry). — `sim/tutorial.gd`
- **Interactive greybox play scene** (board/path/unit/enemy render, drag-to-merge with legal highlight, action buttons, HUD, pause). — `game/play.gd`
- Docs with requirement IDs + acceptance traceability. — `docs/`

## 已运行验证 (run-verified, this session, Godot 4.3 headless)
- `res://tests/tests.tscn` → **70 checks passed, 0 failed, exit 0** (core rules + determinism).
- `res://tests/tutorial.tscn` → **29 checks passed, 0 failed, exit 0** (spec §24 tutorial acceptance:
  full playthrough wins with 3 lives / 0 leaks; summon costs 80/90; pause-no-advance; illegal-drag-no-change;
  grant-once; hero-locked-before-T7; forced-placement-only-tutorial; retry-resets; no-skip-to-victory).
- `res://game/play.tscn --quit-after 600 -- --auto` → **no script errors** across all render paths
  (board/units/enemies/boss/mark/drag-highlight/HUD) driven through the real UI controller.
- Covers §14 rule-correctness list, the §8 damage example (32.292), attribution-sum invariant,
  simultaneous-zero draw, seed/config/command reproducibility. Calibration: path 5.70u, traversal 5.70s.
- **NOT verified:** on-screen visual appearance / touch feel (needs a device or desktop Godot — not faked here).

## 待验证 / 待实现 (pending)
- **On-device visual/touch verification** of the play scene — logic + render paths are smoke-clean
  headless, but appearance and touch feel are unconfirmed (open `game/play.tscn` in Godot on a Mac). (phase B/D)
- **Tutorial levels 2–5** configs (spec §23) — only Level 1 built. (phase B)
- **Full battle UI polish** (merge preview tier label, enemy spawn telegraph, settings panel, result page). (phase D)
- **Save / settings / progress**, corrupt-save fallback — not built. (phase B)
- **Replay runner** (command log → re-sim → first-divergence) — log captured, runner pending. (phase C)
- **Simulation matrix** (multi-seed, cross-deck, position-swap, strategy comparison report) — pending. (phase C)
- **6th tower in live deck validation flow**, deck editor — core supports flower; UI pending. (phase C)
- **Visuals / pages** (home, cards, unit detail, result, map, season) — pending. (phase D)
- **Networking** (server-authoritative) — pending, phase E.
- **Audio / feedback events** — spec'd (§10), not wired (needs presentation layer).
- **Mobile real-device performance** — 手机待测 (no device here).

## Known limitations / honesty notes
- Everything verified so far is **headless logic**, not rendered gameplay and not device testing.
- All numbers are test baselines; balance is NOT claimed.
- Boss cell-disable picks the first occupied cell in fixed order (deterministic placeholder; see DECISIONS D-005).
