# DECISIONS — Cloud Clash (reversible engineering choices + spec gap resolutions)

Per spec §19: reversible engineering details decided and recorded here; anything affecting
gameplay/payment/fairness/save-compat is flagged for user, not silently changed.

- **D-001** New project dir `cloud-clash/` (not overwriting the earlier classic-TD prototype in
  `qmirun/`, which is a different game and stays as reference). Reversible. Spec §4.
- **D-002** `SIM_HZ = 20` (DT 0.05s). All spec intervals land on integer steps at 20 Hz
  (0.30→6, 1.5→30, 1.2→24, 1.0→20, 1.4→28). Reversible config.
- **D-003** RNG = xorshift32 with per-stream splitmix seed derivation. Chosen for determinism and
  to avoid GDScript int64 sign pitfalls. Side 0 uses stream offset 0, side 1 uses 10. Reversible.
- **D-004** When BOTH sides clear all waves and survive, the match ends immediately using the same
  "compare remaining lives, equal→draw" comparator as the timeout, instead of idling to 240s.
  Spec lists zero-life and timeout endings; this is an added, consistent early-end. **Flagged** —
  revert to pure-timeout if undesired.
- **D-005** Magnet-boss cell-disable targets the first occupied cell in fixed index order
  (deterministic placeholder). Spec requires "disable one occupied cell" but not which; a smarter
  target (e.g. highest-value) can replace this. Reversible.
- **D-006** `path_length 5.70u` serpentine lane to the right of the board so splash/chain/pierce
  geometry is meaningful and the path never crosses the board (spec §5). Shape is config; tune freely.
- **D-007** Normal enemy baseline hp 60 / speed 1.0, boss 18× hp — first runnable calibration
  baselines (spec §9), recorded for comparison, **not** claimed optimal.
- **D-008** Damage kept in full float precision internally; attribution scaled by dealt/raw so the
  flower/mark parts always sum to effective damage (R-LOG-ATTR). Reversible accounting choice.

## Open questions for the user (gameplay-affecting — not changed unilaterally)
- Q1: D-004 early-end on mutual clear — keep or revert to pure 240s timeout?
- Q2: Phase-1 is parallel survival only; cross-side pressure (how one player attacks the other)
  is undefined in the spec and **not implemented**. Needs a design before phase D/E.
- Q3: Boss-disable target selection rule (D-005) — any preference beyond "first occupied"?
