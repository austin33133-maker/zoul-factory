# ACCEPTANCE — traceability (rule ID → implementation → test → status)

Status legend: ✅ implemented + headless-verified · 🟡 implemented, not yet verified · ⬜ not implemented.
Verified by: `godot --headless --path cloud-clash res://tests/tests.tscn` → **70 checks, 0 failed, exit 0** (this session).

## §14 rule-correctness checklist

| Rule | Test | Status |
|------|------|--------|
| R-DECK-01 lineup count / duplicate | `t_deck_validation` | ✅ |
| R-SUMMON-FULL full board rejects | `t_summon_full_board` | ✅ |
| R-SUMMON-COST insufficient rejects | `t_summon_insufficient` | ✅ |
| R-SUMMON-COST failed summon no charge / no count | `t_summon_insufficient` | ✅ |
| R-SUMMON-PLACE no overwrite occupied | `t_forced_cell_occupied` | ✅ |
| R-MERGE-01 legal merge frees one cell | `t_merge_frees_cell_and_timing` | ✅ |
| R-MERGE-ILLEGAL illegal merge no unit loss | `t_merge_illegal_no_loss` | ✅ |
| R-MERGE-CAP tier IV cannot merge | `t_merge_tier_cap` | ✅ |
| R-MERGE-TIMING merged unit full interval | `t_merge_frees_cell_and_timing` | ✅ |
| R-UPG-01 upgrade no skip / no double charge | `t_upgrade_no_skip_no_double` | ✅ |
| R-STATE-01 settled rejects commands | `t_settled_rejects` | ✅ |
| R-SNOW-01 slow cap / override / expire | `t_snow_slow_cap_override_expire` | ✅ |
| R-FLOWER-01 flower max, no stack, no diagonal | `t_flower_max_not_stacked` | ✅ |
| R-CHAIN-01 chain no repeat / cap / range | `t_chain_no_repeat` | ✅ |
| R-PIERCE-01 pierce order / cap / off-ray | `t_pierce_order_and_cap` | ✅ |
| R-SPLASH-01 splash main first / radius | `t_splash_main_first` | ✅ |
| R-LIFE-01 kill bounty settles once | `t_kill_reward_once` | ✅ |
| R-WIN-02 simultaneous zero → draw | `t_simultaneous_zero_draw` | ✅ |
| R-MATCH-01 compare lives at end | `t_compare_lives` | ✅ |
| R-WIN-03 settle once | `t_settle_once` | ✅ |
| R-RNG-01 reproducible (seed/config/commands) | `t_reproducible_ai_match` | ✅ |
| R-BAL-02 damage formula (§8 = 32.292) | `t_damage_formula_example` | ✅ |
| R-LOG-ATTR attribution sums to effective dmg | `t_attribution_sums` | ✅ |
| rematch resets all in-battle state | `t_rematch_resets` | ✅ |
| drag cancel / illegal-drag safety | `game/play.gd` + `t_illegal_merge_no_change` | 🟡 logic verified; touch feel unverified on device |
| save restore / corrupt fallback | — | ⬜ save system not built |

## Tutorial Level 1 acceptance (spec §24) — `tests/tutorial.tscn` → 29 passed, 0 failed

| Check | Test | Status |
|-------|------|--------|
| first entry starts at T01 | `t_full_playthrough` | ✅ |
| summon costs 80 / 90 (/100 at T05) | `t_full_playthrough` | ✅ |
| forced type/cell only in tutorial | `t_forced_placement_only_tutorial` | ✅ |
| tutorial pause doesn't advance battle | `t_pause_no_advance` | ✅ |
| illegal drag = no board change | `t_illegal_merge_no_change` | ✅ |
| merge tier correct | `t_full_playthrough` | ✅ |
| tutorial grant once-only | `t_grant_once` | ✅ |
| upgrade affects existing + future | `t_full_playthrough` (mint L1) | ✅ |
| hero locked before T07, fires at T07 | `t_hero_locked_before_t7`, `t_full_playthrough` | ✅ |
| no skip to victory | `t_no_skip_to_victory` | ✅ |
| fail retryable / retry resets | `t_retry_resets` | ✅ |
| level 2 restores random summon | `t_forced_placement_only_tutorial` (normal summon is RNG) | 🟡 Level 2 not built; rule verified |
| completion persists across restart | — | ⬜ save not built (flag set in memory) |
| manual playtest (affordances, no deadlock) | — | ⬜ needs device/desktop |

## Spec areas by phase

| Area | Status | Note |
|------|--------|------|
| Deterministic battle core (board/economy/merge/upgrade/combat/boss/hero/win-lose) | ✅ | `sim/`, 70 tests |
| Practice AI (3 strategies, legal-only) | ✅ | `sim/ai.gd`, used in reproducibility test |
| Logging (per-unit contribution, economy, attribution) | 🟡 | implemented in `sim/`; raw log export entry pending |
| Calibration scene (road time, attack counts) | 🟡 | numbers printed by test harness; dedicated scene pending |
| Multi-seed / cross-deck / position-swap simulation matrix | ⬜ | phase C |
| Replay (command log → state compare, first-divergence) | ⬜ | phase C (log_events captured, replay runner pending) |
| UI (interactive board, drag, panels) | ⬜ | phase B/D — needs on-device render |
| Tutorial level 1 state machine (§20-24) | ⬜ | phase B |
| Save / settings / progress | ⬜ | phase B |
| Networking (server-authoritative) | ⬜ | phase E |
