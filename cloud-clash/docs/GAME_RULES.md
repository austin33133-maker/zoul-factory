# GAME_RULES — QmiRun Cloud Clash (core rules)

Rules version: **0.1.0**. All numbers are **test baselines**, not verified balance.
Priority (spec §19): latest user instruction > confirmed rules/level config > UI spec > concept art > inference.
On conflict, **rules win** (e.g. concept art shows 2 board rows; engine uses 5×3).

Each rule has a unique ID, implemented in the cited file and verified by the cited test.

## Simulation
- **R-SIM-01** Fixed step, `SIM_HZ=20` (DT=0.05s). No logic depends on render FPS, effect completion, wall-clock, per-projectile physics, or UI/audio callbacks. — `config.gd`, `battle.gd`
- **R-SIM-02** All durations/intervals convert to integer steps via one shared rule `secs_to_steps = round(s*HZ)`. — `config.gd`
- **R-SIM-03** Fixed intra-step order: income → boss skill → spawn → move/leak → towers fire → remove dead → hero cd. — `battle.step_once`

## Board & economy
- **R-BOARD-01** Fixed 5 cols × 3 rows = 15 cells. — `config.gd`
- **R-ENERGY-01** Start 240; passive +5/s. — `config.gd`
- **R-ENERGY-02** n-th summon cost = 80 + 10·(n−1). — `config.summon_cost` / test `t_summon_cost_curve`
- **R-SUMMON-FULL** Full board rejects summon (clear feedback, not an illegal op). — `t_summon_full_board`
- **R-SUMMON-COST** Insufficient energy rejects: no charge, no count increase. — `t_summon_insufficient`
- **R-SUMMON-PLACE** Summon picks type then empty cell (independent RNG stream); tutorial may force both. Never overwrites an occupied cell. — `t_forced_cell_occupied`

## Merge & upgrade
- **R-MERGE-01** Only same type + same tier merge; source removed; target becomes same type +1 tier; one cell freed. — `t_merge_frees_cell_and_timing`
- **R-MERGE-02** Merge creates a NEW uid; both sources archived with their logs; merge-source link kept. — `battle._cmd_merge`
- **R-MERGE-TIMING** Merged unit starts a full attack interval (no instant shot from chain-merging). — `t_merge_frees_cell_and_timing`
- **R-MERGE-CAP** Max tier IV; tier IV cannot merge. — `t_merge_tier_cap`
- **R-MERGE-ILLEGAL** Illegal merge changes nothing, charges nothing. — `t_merge_illegal_no_loss`
- **R-UPG-01** Type upgrade pays per level (100/200/400/800), no skipping, max 4; affects current & future units of that type. Snow upgrade adds damage only, not slow. Flower does not use the damage-mult. — `t_upgrade_no_skip_no_double`

## Combat
- **R-TARGET-01** Normal attack reaches the whole lane; primary = enemy nearest the base (max path progress); tie → smallest uid. — `geometry.primary_target`
- **R-SPLASH-01** Popcorn: main target first, then others within radius, nearest-then-uid, capped. — `t_splash_main_first`
- **R-CHAIN-01** Zap: hop to nearest not-yet-hit enemy within hop range of the current one; no repeat; falloff 0.55/0.30; capped 3. — `t_chain_no_repeat`
- **R-PIERCE-01** Pierce: ray from tower through main target; candidates within width and in front; ordered by along-ray distance; no repeat; falloff 0.65/0.40; capped 3; logical geometry (no projectile physics). — `t_pierce_order_and_cap`
- **R-SNOW-01** Slow: strongest active source applies; sources expire independently; global cap 50%; boss takes 50% of the effective slow. — `t_snow_slow_cap_override_expire`
- **R-FLOWER-01** Flower buffs only orthogonally adjacent output towers; not itself; not other flowers; multiple flowers → max (no stack); no recursion. — `t_flower_max_not_stacked`
- **R-BAL-01** Merge damage mult by tier: 1.000 / 1.800 / 3.240 / 5.832. — `config.gd`
- **R-BAL-02** Single hit = base × merge(tier) × upgrade(level) × (1+flower) × (1+mark). No other mult regions. Internal full precision; UI rounds on display. — `damage.gd` / `t_damage_formula_example`

## Enemies / waves / hero
- **R-ENEMY-01..04** windup (base), roller (0.6 hp /1.6 spd), heavy (4 hp /0.7 spd, elite), magnet boss (own stats; warn 1s / disable-cell 2s / interval 12s; disabled cell stops attacking & flower buff; no permanent delete/downgrade). — `config.gd`, `battle._update_boss_skill`
- **R-LIFE-01** Leak: normal/fast/heavy −1 life, boss −2. Death bounty settles once; leaked enemies give no bounty. — `t_kill_reward_once`
- **R-HERO-01** White Falcon mark: up to 5 frontmost alive enemies, +20% damage for 5s, cd 30s, ready at start, no energy cost, no stacking. — `battle._cmd_hero`

## Match / state
- **R-CMD-01** All state changes go through one validated command entry (`submit`); UI/AI never mutate battle state directly. — `battle.submit`
- **R-WIN-01** Both sides complete a step before any win check. — `match.step_once`
- **R-WIN-02** Both sides reach 0 lives on the same step → draw. — `t_simultaneous_zero_draw`
- **R-WIN-03** Settlement triggers exactly once. — `t_settle_once`
- **R-MATCH-01** Timeout 240s (test param) compares remaining lives; equal → draw. Same comparator used when both sides clear all waves (DECISION D-004). — `t_compare_lives`
- **R-PAUSE-01** Pause freezes both sides' simulation and AI. — `match.set_paused`
- **R-STATE-01** After settlement, commands are rejected. — `t_settled_rejects`
- **R-RNG-01** Same rules version + config + seed + command sequence → identical result. — `t_reproducible_ai_match`
- **R-RNG-02** Independent RNG streams per side/purpose so one side's extra actions don't shift the other's rolls. — `rng.gd`, `match._init`
- **R-DECK-01** Deck = exactly 5 distinct cards from the 6. — `t_deck_validation`
- **R-AI-01** Practice AI acts only through legal commands; three strategies; never hidden resources. Labelled "practice AI", never a real player. — `ai.gd`

## Not yet validated (explicitly)
- Direct cross-side pressure (damage transfer / economy snowball) — **not implemented**, phase-1 is parallel survival only (spec §5.7).
- Free repositioning — not in phase 1 (spec §6).
