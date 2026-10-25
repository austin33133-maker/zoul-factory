# GPT-Image prompts (run in ChatGPT, attach the named concept image as reference)

How to use: in ChatGPT, attach the referenced concept image, paste the prompt, ask for a
**transparent PNG** at the stated size. Send the PNGs back here; I normalize + import + verify
in-engine. Every prompt locks palette, finish, view, and light so output cannot drift from your art.

Shared style lock (append to any prompt if needed):
> Soft-3D "clay toy" render, rounded chunky forms, thick soft brown outline (#4a3a2a), baked soft
> ground shadow, top-left light, flat light-blue or transparent background, no text, no labels, no
> mockup frame, single centered object, matching the attached reference image's exact style.

---

## board_grass_tile (96×96, seamless) — ref: image5
ROLE: seamless top-down grass board tile for a tower-defense grid.
SUBJECT: a single square patch of stylized bright grass with tiny flowers/pebbles.
VIEW: straight top-down, orthographic.
ART DIRECTION: grass `#8fd36a`/`#6fb84f`, soft-3D clay finish, subtle not noisy.
OUTPUT: 96×96, **tileable on all 4 edges**, transparent or flat fill, no outline on tile edges.
LOCKS: palette + finish from reference. EXCLUDE: text, grid lines, objects, shadows at edges.

## board_path_tile (96×96, seamless) — ref: image5
As above but the sand lane: `#efe09a` fill with soft `#d8c66a` border, matches the yellow path in image 5.

## bg_sky (1080×1920 portrait) — ref: image2
ROLE: parallax sky background behind floating islands.
SUBJECT: soft blue sky `#8fd3ff→#bfeaff` gradient with a few fluffy clouds, lower third lighter.
OUTPUT: 1080×1920, opaque, no foreground objects, gentle so HUD stays readable.
EXCLUDE: islands, characters, text, logos.

## fx_muzzle (64×64, transparent) — ref: image5
Small bright muzzle-flash puff, warm yellow-white, soft-3D, transparent PNG, centered, no object behind it.

## fx_explosion (4 frames, 96×96 each, transparent) — ref: image5
4-frame rocket explosion: expand → peak → dissipate smoke puff, warm orange→grey, style matches
the combat FX in image 5. Deliver as 4 separate transparent 96×96 PNGs (f1..f4), consistent center.

---

## Fallback — regenerate a unit if extraction from image3/image4 is too low-res
Example (Popcorn tower Lv1), ref: image3 POPCORN row, leftmost:
> Production sprite of the "Popcorn" tower, level 1: twin stubby cannon barrels with a popcorn/clover
> icon on a round toy base. 3/4 front view, soft-3D clay render, thick brown outline (#4a3a2a),
> yellow `#f2b33d` body, baked soft shadow, top-left light. Transparent PNG, 96×120, single object,
> centered, identical style to the attached reference. No text, no labels, no background scenery.
Repeat per tower/enemy swapping SUBJECT + palette role (see art-direction-brief.md).
