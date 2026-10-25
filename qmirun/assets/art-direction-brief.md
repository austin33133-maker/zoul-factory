# QmiRun — Art Direction Brief (locked to concept images)

_Anti-drift reference. Every produced asset is judged against this and the 5 concept images._
_Source images (this session): 1=Hero Workshop · 2=World Map · 3=Tower Upgrades · 4=Cloud Guardians lineup · 5=Gameplay._

## Technical frame (locked)

| Field | Value |
|-------|-------|
| Engine | Godot 4.3, **2D** |
| View | Board: 3/4 top-down (as image 5). Characters/towers: 3/4 front, slight hero angle (as images 3,4) |
| Target display | Portrait 1080×1920 design, ships 720×1280+ (phone), iOS first |
| Sprite format | PNG, transparent alpha, premultiplied off |
| Filtering | Linear, mipmaps on (sprites scale down on small phones) |
| World scale | Board tile ≈ 96 px; enemy sprite ≈ 72–96 px tall; tower ≈ 96–120 px tall; boss ≈ 200 px |
| Texture budget | Atlas per family; keep total < 40 MB uncompressed for M2 |

## Palette roles (sampled from the concept images)

| Role | Hex | Use |
|------|-----|-----|
| Sky / bg top | `#8fd3ff` → `#bfeaff` gradient | background, cards |
| Cloud white | `#f4fbff` | clouds, panels |
| Grass | `#8fd36a` / `#6fb84f` | board top / edge |
| Path sand | `#efe09a` / `#d8c66a` | lane fill / lane edge |
| Primary yellow | `#f2b33d` | buttons, coins, Popcorn, Captain accents |
| Alert red | `#e2574c` | Rocket, Runner, hearts |
| Ice blue | `#4db6e6` | Frost, Freeze skill |
| Teal | `#3fb6a0` | Pierce, Captain scarf |
| Boss purple | `#7d49b5` | Magnet Boss, chapter 3 |
| Outline brown | `#4a3a2a` | all silhouette outlines |

## Visual system (shape & finish)

- **"Clay toy / soft-3D render"**: rounded chunky volumes, no hard edges, baked soft shadow under each object, subtle rim light top-left. Matches images 3 & 4 exactly.
- **Thick soft outline** (`#4a3a2a`, ~3–4 px at native) on every gameplay object for silhouette read on the busy board (image 5).
- **High silhouette priority**: each tower & enemy must be ID-able as a black shape (Popcorn = twin barrels; Frost = snowflake drum; Rocket = multi-tube rack; Pierce = long single barrel; Runner = wheel; Shield = dome+plate; Repair = backpack+cross; Boss = tank+magnet arms).
- **Detail density**: medium; readable at 72 px. No fine text/filigree on units.
- **Light direction**: top-left, consistent across all families (locks shading so generated art can't drift).

## Hero / anchor assets (approve these first, per skill step 5)

1. **Popcorn tower Lv1** — the simplest, defines tower silhouette + outline + shadow spec.
2. **Captain** (eagle pilot) — defines character proportions, face style, palette.

Produce the rest as **families** only after these two match the concept at game scale.

## Deviations the spec must correct (from image review)

- Image 1 "UPGRADE · 600" with "2,400 → 1,800": 2400−600 = **1800** ✓ (consistent).
- Image 5 top shows "WAVE 6/12" but gameplay HUD must also show **lives + gold** (present) — keep.
- Keep **4 towers for M1** (Popcorn/Frost/Rocket/Pierce); Spark & Boost from image 3 are M2+.
  (Any further "界面错误" corrections await the `QmiRun-Claude-Game-Production.md` spec, not yet received.)
