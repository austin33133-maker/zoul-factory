# COMMERCIALIZATION — readiness & gap analysis (honest)

Straight answer: a verified, deterministic game **engine** exists; a **shippable commercial product
does not**, and the biggest remaining blockers are things **only you can do** (Mac/Xcode/Apple
account, money, art rights, backend hosting, legal). This file is the real gap list, not a
checkbox victory lap.

## Where we are (verified this session, headless Godot 4.3)
- Deterministic battle core, tutorial L1 (interactive), levels 1–5 configs, save system, and
  Phase-C tooling (replay, simulation matrix, contribution report). **234-ish checks across 4 suites,
  all green.** Logic only — no rendered gameplay verified, no device testing.

## What I can still build & verify headless (no outside dependency)
- Balance passes using the simulation matrix; tune all levels; expand to the 6-card deck matrix.
- More deterministic systems: out-of-battle progression math, deck/collection rules, result-screen
  data, daily/season logic (local), anti-cheat-friendly command validation hardening.
- Replay-based regression gates in CI.
- UI *code* for all pages (but appearance/touch needs your device check — I won't fake it).

## Hard blockers — ONLY YOU can clear these
| # | Blocker | Why I can't | What it needs |
|---|---------|-------------|---------------|
| B1 | **iOS build + sign + submit** | Linux container, no macOS/Xcode | Your Mac + Xcode + Apple Developer Program ($99/yr) + App Store Connect |
| B2 | **Production art** | No artist; no image-gen tool here; GPU-less | Your ChatGPT/artist to make assets (I have locked prompts in ../qmirun/assets); or license a set |
| B3 | **Art/name rights** | Legal, not technical | Confirm you own the concept art; clear trademarks for "QmiRun"/"Cloud Clash" |
| B4 | **Multiplayer backend** (versus is the core!) | Needs hosted servers + ops + cost | Server-authoritative netcode, matchmaking, accounts, anti-cheat, hosting/infra + monthly cost |
| B5 | **Monetization** | Store/bank/legal | IAP catalog, App Store Connect agreements, bank+tax, server-side receipt validation |
| B6 | **Legal/compliance** | Legal review | Privacy policy, GDPR/CCPA, **COPPA/age-gating (the art appeals to kids)**, ToS, loot-box odds disclosure, EULA |
| B7 | **Real-device QA & perf** | No phone here | Test on real iPhones/Android; confirm FPS/memory/thermals |

## Missing game scope (beyond the current slice)
- Full interactive battle UI for versus + all pages (home/cards/unit-detail/result/map/season).
- Content depth: more units/heroes, more levels/waves, cross-side pressure mechanic (undefined in
  spec — **needs design**, see DECISIONS Q2), progression & collection economy.
- Audio: SFX + music (none yet); event-driven feedback wiring (spec §10, specced not built).
- Live-ops: telemetry, crash reporting, remote config, A/B, seasons/battle-pass.
- Store assets: icon set, screenshots, trailer, localized metadata, ratings.

## Honest risk flags
- **Bot win-rate ≠ competitive balance.** The matrix already shows strategy dominance
  (merge_pressure >> upgrade_first); human balance needs real playtests, not bot sims.
- **Versus-first design implies a backend from day one** — this is the single largest cost/time
  item and the spec defers its design (phase E). Without it, only single-player PvE ships.
- A kid-appealing art style + any randomized monetization triggers the strictest app-store and
  legal scrutiny (COPPA, loot-box laws). Decide the monetization model before building it.

## Suggested order to a *real* launch
1. **PvE-only soft launch first** (no backend): polish L1–L5 + UI + art, ship single-player to
   validate fun & retention. Clears B4/B5 risk for v1.
2. Then backend + versus (B4) as v2, once PvE proves the game.
3. Monetization (B5) + legal (B6) gated behind a product decision you make with real advisors.

**I keep driving the headless-verifiable parts; the launch itself runs through your Mac, accounts,
money, and legal — I'll tell you exactly what to click at each step, but I can't do those from here.**
