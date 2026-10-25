# QmiRun — Production Status

_Last updated: 2026-10-25_

## Current milestone: **M1 — Playable greybox** ✅ complete (pending your playtest)

Real systems, primitive art. Verified by headless tests (not screenshots).

### M1 checklist (from your brief)

| Requirement | Status | Where |
|-------------|--------|-------|
| 1 map | ✅ | serpentine cloud lane, `game_data.gd: path_points` |
| 4 tower types × 3 levels | ✅ | Popcorn/Frost/Rocket/Pierce, `game_data.gd: _build_towers` |
| 12 waves | ✅ | `game_data.gd: _build_waves` |
| Boss | ✅ | Magnet Boss on wave 12 |
| Build + upgrade | ✅ | `level.gd: build_tower/upgrade_tower/sell_tower` (70% sell refund) |
| Hero skills | ✅ | Air Strike / Freeze / Rally, with cooldowns, `level.gd: use_skill` |
| Pause | ✅ | `main.gd: toggle_pause` (Esc / II button) |
| Win / Lose / Retry | ✅ | `game_state.gd` status + `hud.gd` result overlay + `main.gd: retry` |
| Balance test passed | ✅ | see results below |

## How to run

- **Game** (on a machine with Godot 4.3): open `qmirun/` in Godot, press F5 — or
  `godot --path qmirun res://src/game/main.tscn`.
- **Tests** (headless): `cd qmirun && ./run_tests.sh`.

## Actual test results (this session, Godot 4.3 headless on Linux)

- `tests/tests.tscn` → **27 passed, 0 failed**, exit 0.
  Unit: armor/DPS/wave-scaling/targeting/geometry/data-integrity.
- Balance sim (greedy auto-player, all 12 waves): **WON, lives 8/20, 12 leaked total**
  (6 on wave 11, 6 to the boss). Early waves easy, pressure lands at 11–12 — a valid,
  non-trivial M1 curve.
- `tests/integration.tscn` → **17 passed, 0 failed**, exit 0.
  Build/upgrade/sell/skill/pause/wave-spawn/loss-overlay through the real Main+HUD+Level.
- `main.tscn` launched headless 150 frames → no script errors.
- Reference checker `check_godot_project.py` → 0 errors, 0 warnings, 17 files.

## Deviations from the brief (read these)

1. **Attachment `QmiRun-Claude-Game-Production.md` never arrived** in this session (only the
   5 concept images did). M1 was built from the scope written in your chat message. The spec's
   **"界面错误修正" (UI-spec error corrections) and the router phase gating cannot be applied
   until you paste that file.** No invented spec was used.
2. **`awesome-gamedev-agent-skills` is not an installable cloud plugin** (not in your account's
   plugins/skills, not in the Anthropic plugin directory). It is the public GitHub repo
   `gamedev-skills/awesome-gamedev-agent-skills`. It was cloned and its router + Godot /
   tower-defense / prototype-fast / headless-testing / resources skills were followed for M1.
3. **Art is greybox primitives**, per the plan ("通过平衡测试后，再制作Blender资产"). Blender
   assets are M2 and have NOT started — gated on your go-ahead after you playtest M1.

## Blockers / things only you can do

- **iOS build & App Store**: impossible from this Linux container. Needs your **Mac + Xcode +
  Apple Developer account**. Godot can export an Xcode project on Linux; compiling, signing,
  and uploading cannot. (M3.)
- **Art rights / naming**: the concept images look AI-generated and the name "QmiRun/OmiRun"
  is unverified. Confirm you own the art and the name is clear before any store submission.
- **Environment is ephemeral**: Godot 4.3 was installed into this session's container; it is
  not persisted. Everything needed to rebuild is in the repo.

## Roadmap

- **M1** ✅ greybox playable + balance green (this commit).
- **M1.5** (optional): apply `QmiRun-Claude-Game-Production.md` spec/UI corrections once received;
  tune the early-wave curve after your playtest.
- **M2**: Blender assets (towers, enemies, heroes, board) in the concept-art style → glTF →
  integrate into Godot, replacing primitives.
- **M3**: iOS export config + your Mac/Xcode signing + submission.

## M2 — art pass (planned, 2026-10-25)

Decision locked with you: **2D sprites faithful to the concept images** (not Blender 3D —
procedural 3D with no GPU/artist would drift from the art; the images themselves are the art).
Blender 4.2.3 was verified working headless (glTF export OK) but is **not used for M2**.

Planning deliverables (committed, per `create-game-assets` skill, anti-drift):
- `qmirun/assets/art-direction-brief.md` — technical frame, palette roles, shape language locked to the 5 images.
- `qmirun/assets/asset-manifest.json` — every asset, its size, and its source (extract vs gpt-image) + approval gate.
- `qmirun/assets/gpt-image-prompts.md` — locked ChatGPT/GPT-Image prompts for the gaps.

**ChatGPT reality:** this Claude session cannot call ChatGPT/GPT-Image (no OpenAI tool or key here).
Two faithful paths: (a) **you** run the locked prompts in ChatGPT and send PNGs back; I normalize +
import + verify in-engine. (b) I **extract** sprites directly from image3 (towers) and image4
(characters) — zero generation, zero drift — for everything those images already cover.

## Next action needed from you

1. Pick the art path: **(a)** you generate the gap assets in ChatGPT with my locked prompts, and/or
   **(b)** I extract sprites from your images #3/#4 now (I can start immediately, no tool needed).
2. Playtest M1 on your Mac (or accept the test results) to confirm the greybox feel before art lands.
3. Paste `QmiRun-Claude-Game-Production.md` if you want its spec/UI corrections applied.
