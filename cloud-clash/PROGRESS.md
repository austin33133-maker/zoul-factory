# PROGRESS — QmiRun Cloud Clash

Rules version 0.1.0. Phases per spec §18: A env+rules · B full greybox+tutorial · C six-tower+balance tools · D visuals/pages · E networking.

## 已实现 (implemented)
- Deterministic battle core: fixed-step sim, 5×3 board, energy economy, summon, merge, type upgrade, 6 tower behaviours (single/splash/chain/pierce/snow/flower), targeting, slow system, hero mark, 4 enemy types, magnet-boss cell-disable, waves, leaks, win/lose. — `sim/`, `config/`
- Single validated command entry; UI/AI cannot mutate state directly. — `sim/battle.gd`
- Independent RNG streams per side/purpose. — `sim/rng.gd`
- Dual-board match wrapper (draw / winner / timeout-by-lives / settle-once). — `sim/match.gd`
- Practice AI, 3 legal-only strategies. — `sim/ai.gd`
- Per-unit contribution + economy logging + damage attribution. — `sim/battle.gd`, `sim/unit.gd`
- Docs with requirement IDs + acceptance traceability. — `docs/`

## 已运行验证 (run-verified, this session, Godot 4.3 headless)
- `res://tests/tests.tscn` → **70 checks passed, 0 failed, exit 0**.
- Covers §14 rule-correctness list (see docs/ACCEPTANCE.md), the §8 damage example (32.292),
  attribution-sum invariant, simultaneous-zero draw, and seed/config/command reproducibility.
- Calibration numbers printed by the harness (path 5.70u, traversal 5.70s; sample AI match draw).

## 待验证 / 待实现 (pending)
- **Interactive UI** (board render, drag with legal-target highlight + merge preview + rebound,
  touch cancel, panels) — not built; needs on-device/desktop render. (phase B/D)
- **Tutorial level 1** state machine + levels 2–5 configs (spec §20–24) — not built. (phase B)
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
