# UI_SPEC — pages & interaction (contract for phase B/D; UI NOT yet implemented)

Status: ⬜ not implemented. This defines the contract so implementation can't drift.
Portrait, 720×1280 design reference, containers + anchors for aspect/safe-area adaptation.
Real interactive widgets only — **never a full concept image as background with transparent
buttons on top** (spec §8, R-UI-NOFAKE).

## Six-screen concept corrections (spec §4 — binding)
- **UI-FIX-01** Map node numbers are unique and continuous.
- **UI-FIX-02** Each side's board is fixed 5 columns × 3 rows.
- **UI-FIX-03** Summon uses the **blue energy** icon, never the gold coin.
- **UI-FIX-04** Both sides' lives are clearly shown.
- **UI-FIX-05** Merge preview must not cover the board.
- **UI-FIX-06** Enemy robots must not be used as friendly skill icons.
- **UI-FIX-07** In-battle merge tier (I–IV) and out-of-battle collection level must never be mixed.

## Pages (order after greybox passes; spec §16)
1. **Home** — practice entry, current deck, settings. Unopened modes clearly marked, not faked.
2. **Cards** — pick 5 of 6; show role + config stats.
3. **Unit detail** — merge tier vs in-battle upgrade vs collection level kept distinct; no fake purchase for unimplemented out-of-battle upgrades.
4. **Result** — win/lose, reason, key performance, rematch, home.
5. **Map** — unique continuous numbering, real level configs + unlock conditions; no fake "done".
6. **Season** — only after rewards/claim/save exist; no payment in phase 1.

## In-battle HUD
- Both lives, both energy (blue), wave/boss timer, summon button with current cost, deck bar (5),
  hero skill button (locked until unlocked in tutorial), merge preview (off-board), pause.

## Drag & touch (R-UI-DRAG, phase B)
- Legal-target highlight, merge-result preview, illegal-drag rebound, click-vs-drag threshold,
  touch cancel, safe cancel on popup/pause/settlement. All feed the single command entry.

## Settings (spec §10)
- SFX toggle + volume, vibration toggle (safe degrade if unsupported), reduced-motion.
