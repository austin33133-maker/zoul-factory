# BALANCE_SPEC — numbers & formulas (TEST BASELINE ONLY)

Every number here is a **test baseline**, not verified balance and not any competitor's
internal value. Single source of truth in code: `config/config.gd`.

## Damage model (R-BAL-02)
```
single_hit = base × merge_mult(tier) × upgrade_mult(level) × (1 + flower) × (1 + mark)
```
- merge_mult (tier I–IV): 1.000 / 1.800 / 3.240 / 5.832
- upgrade_mult (L0–4): 1.00 / 1.15 / 1.30 / 1.45 / 1.60; cost to reach L1..4: 100/200/400/800 energy
- flower buff by tier: 0.15 / 0.19 / 0.23 / 0.27, +0.02 per flower upgrade level (max; no stack)
- hero mark bonus: +0.20
- Secondary targets (chain/pierce) multiply the single_hit by the falloff factor.
- Spec §8 worked example (tier II mint, upgrade L2, tier-I flower): 12×1.8×1.30×1.15 = **32.292** ✅ test-verified.

## Towers (R-TOWER-01..06)
| id | kind | dmg | interval | extra |
|----|------|-----|----------|-------|
| mint | single | 12 | 0.30s | — |
| popcorn | splash | 30 | 1.50s | radius 0.75, max 5 |
| lightning | chain | 24 | 1.20s | max 3, falloff 0.55/0.30, hop ≤1.25 |
| snow | snow | 8 | 1.00s | slow by tier 25/30/35/40%, 1.5s; upgrade adds dmg only |
| pierce | pierce | 42 | 1.40s | max 3, falloff 0.65/0.40, ray width 0.30 |
| flower | support | — | — | buffs orthogonal output towers only |

"Ideal multi-target DPS" is a formula check only — never an in-combat average or a balance conclusion.

## Enemies (R-ENEMY-01..04)
Baseline from calibration: **normal hp 60, speed 1.0 grid/s**.
- windup: hp 60, spd 1.0, bounty 4, leak 1
- roller: hp 36 (0.6×), spd 1.6×, bounty 4, leak 1
- heavy: hp 240 (4×), spd 0.7×, bounty 8, leak 1 (elite)
- magnet boss: hp 1080 (18×, baseline), spd 0.6×, bounty 20, leak 2; warn 1s / disable cell 2s / interval 12s
- No armor system in phase 1 (heavy uses high HP instead).

## Economy
Start 240 energy, +5/s. Summon n = 80 + 10·(n−1). Kill bounty: normal/fast 4, heavy 8, boss 20.
Lives 3. Match timeout 240s.

## Calibration (measured this session, headless)
- Path length: **5.70 grid-units**; windup traversal **5.70s** (114 steps) at speed 1.0.
- Sample AI match (merge_pressure vs summon_first, seed 999): draw, both 3 lives, 2010 steps (~100s).
- **Interpretation:** defense currently holds the baseline waves comfortably (0 leaks in sample).
  Tuning levers if pressure is too low: raise enemy HP/count, shorten path, or lower income.
  **Not tuned yet** — these are first runnable baselines per spec §9, recorded for comparison.

## Change protocol
Change only a few related params per round; keep before/after config and comparison. Bot
simulation win-rate is not a proof of competitive balance (spec §11).
