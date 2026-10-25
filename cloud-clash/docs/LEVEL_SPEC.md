# LEVEL_SPEC — levels & tutorial (contract for phase B; NOT yet implemented)

Status: ⬜ not implemented (core sim supports the needed hooks: forced summon, pausing, mark).
Each level has its own config; levels must NOT be the same content under different names (spec §23).

## Per-level config fields (required)
id · name · prerequisite-unlock · teaching goal · initial state (lives/energy/deck) ·
waves & enemies · available units · special override rules · win/lose conditions ·
complete/fail events · acceptance checks.

## First five levels (spec §23)
| # | name | teaches | mode |
|---|------|---------|------|
| 1 | 初次守卫 First Watch | summon, merge, splash, upgrade, hero | single-player PvE tutorial (no AI/opponent) |
| 2 | 随机召唤 | random unit + cell, saving energy | PvE, normal random summon restored |
| 3 | 快怪来了 | snow slow + leak handling | PvE |
| 4 | 火力组合 | chain + pierce + flower adjacency (short segmented) | PvE |
| 5 | 首次对决 | dual board + labelled practice AI, both lives, timeout/draw | normal battle |

## Level 1 (tutorial) — binding exceptions (spec §20)
- Single board only; no AI/opponent; dedicated tutorial config + its own state machine (no tutorial
  special-cases scattered in normal battle code).
- 5×3 board, lives 3, energy 240, deck of 5 but only mint & popcorn taught.
- Fixed outcomes allowed ONLY in tutorial mode (forced summon type/cell); normal mode stays random.
- No out-of-battle level/season/shop/payment; no auto-play; no forced long reading.
- Target length ~90–150s (to test), never padded by forced waiting.

### Step outcomes that acceptance must check (spec §21, §24)
- T02 first summon = tier-I mint at (row2,col2) via real command: energy 240→160, count→1, next cost 90.
- T03 second summon charges current 90 (no fake UI charge, no bypass of validation).
- T04 first merge by real drag: two tier-I mint → one tier-II; illegal drag rebounds, no loss; no energy.
- T05 explicit `tutorial_grant` 200 energy (single log entry, once); third summon = popcorn, cost 100;
  splash must hit ≥2; bounded extra enemy groups if not met, no infinite loop.
- T06 mint type upgrade 0→1, −100 energy (top up via visible grant if short); existing tier-II mint and
  future mints get ×1.15.
- T07 hero mark first unlocked here (hidden/disabled before); mini-boss uses boss slow rule, no cell-disable
  in tutorial; win when boss defeated.
- T08 win when all steps done, enemies cleared, base alive; mark cleared + unlock level 2; no coins/gems/pay.

### Fairness/fail (spec §22)
- Never secretly change enemy hp or player damage to force a win.
- Real fail → "retry this level" / "home"; no paid revive. Retry restarts the level (no mid-step resume in v1).
- Energy grants: visible prompt, separate log, once only (no double-claim on repeated step trigger).
