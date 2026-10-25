# ONBOARDING — tutorial flow (contract for phase B; NOT yet implemented)

Status: ⬜ not implemented. Level 1 "初次守卫" is an interactive, single-player PvE tutorial —
an explicit exception to normal dual-board rules (see LEVEL_SPEC §Level 1).

## Flow (spec §21)
- **T01 Meet the threat** — show enemy entrance, direction, base lives. Tip: "别让捣蛋机器人进入基地。"
  Player taps continue (no forced long cutscene).
- **T02 First summon** — highlight summon (80). Forced tier-I mint at (r2,c2) via real command →
  240→160, count 1, next 90. Spawn 3 windups; player sees it attack. Done: summon ok + ≥1 kill.
- **T03 Second summon** — forced tier-I mint at (r2,c3), charge current 90. Done: two tier-I mints exist.
- **T04 First merge** — pause sim (keep board interactive), highlight the two mints + drag preview.
  Player drags → tier-II mint, source freed, no energy. Illegal drag rebounds. Then resume.
- **T05 Crowd + splash** — visible `tutorial_grant` 200 energy (once). Forced popcorn at (r2,c2), cost 100.
  Dense crowd; tip about splash. Done: one blast hits ≥2 (bounded retries, no infinite loop).
- **T06 First upgrade** — pause at a safe moment; highlight mint upgrade. Top up to 100 via visible grant
  if short. Mint upgrade 0→1, −100; existing tier-II mint applies ×1.15; future mints inherit.
- **T07 Hero + mini-boss** — resume; show boss warning; hero skill becomes usable (hidden before).
  Player casts mark; mini-boss uses boss slow rule (no cell-disable in tutorial). Done: skill cast + boss killed.
- **T08 Victory** — "守卫成功！" + learned list. Buttons: 下一关 / 再练一次. No coins/gems/pay.
  Save completion flag + unlock level 2.

## Guarantees (spec §22, §24)
- Fixed outcomes only in tutorial mode; before entering normal mode, explicitly warn:
  "之后召唤的单位和位置将随机出现。"
- Touch-first: text/drag/highlight work without hover; tips never cover the operated object.
- Player can distinguish merge vs type upgrade; no deadlock waiting on infinite spawns / energy / targets.
- Tutorial must not steal a legal action the player already started.

## Acceptance (must automate; spec §24)
first-entry starts at T01 · summon costs 80/90/100 · forced type/cell only in tutorial · tutorial
pause doesn't advance battle · illegal drag no board change · merge tier correct · grant once-only ·
upgrade affects existing+future · hero triggers · no skipping to victory · fail retryable · retry resets ·
completion persists across restart · level 2 restores random summon · level 5 introduces dual-board AI.
Plus manual playtest: continues without narration, clear tap/drag affordances, no hidden deadlocks.
