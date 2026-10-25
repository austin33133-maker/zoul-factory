# QmiRun — Cloud Voyage (Godot 4.3)

A casual tower-defense. This is the **M1 greybox**: real systems, placeholder (primitive)
art. Enemies walk a serpentine cloud lane; you place and upgrade towers, cast hero skills,
and survive 12 waves ending in the Magnet Boss.

## Run the game

Requires Godot **4.3** (standard build).

```bash
# In the Godot editor: open this folder (qmirun/) as a project, press F5.
# Or from the command line:
godot --path . res://src/game/main.tscn
```

Portrait 720×1280. Controls: tap a build button to arm a tower, tap the board to place it;
tap a placed tower to upgrade/sell; tap a skill, then (for Air Strike) tap a target; `Esc`
or the II button pauses; START WAVE begins the next wave.

## Run the tests (headless, no GUI)

```bash
./run_tests.sh
# or individually:
godot --headless --path . res://tests/tests.tscn        # unit + balance sim
godot --headless --path . res://tests/integration.tscn  # Main+HUD+Level wiring
```

## Layout

| Path | Purpose |
|------|---------|
| `src/autoload/game_data.gd` | all balance numbers: towers, enemies, 12 waves, skills, lane |
| `src/autoload/game_state.gd` | runtime economy / lives / wave / status + signals |
| `src/data/*.gd` | `Resource` classes (TowerData / EnemyData / WaveData) |
| `src/game/td_math.gd` | pure combat/economy math (unit-tested) |
| `src/game/level.gd` | lane, slots, wave spawning, combat tick, skills, win/lose |
| `src/game/{enemy,tower,projectile}.gd` | entities, all driven by `Level.tick()` |
| `src/game/main.gd` + `main.tscn` | controller: wires Level+HUD, input, pause, retry |
| `src/ui/hud.gd` | greybox HUD (top bar, build/skill bars, panels, overlays) |
| `tests/` | headless unit, balance, and integration suites |

## Design notes

- **Level drives every `tick(delta)`** (enemies/towers/projectiles do not self-`_process`),
  so pause is trivial and the balance sim is deterministic and fast.
- **Data-driven**: tuning lives entirely in `game_data.gd`.
- 4 towers × 3 levels: Popcorn (rapid), Frost (slow), Rocket (splash), Pierce (long/anti-armor).
- 5 enemies: Windup, Runner, Shield (armored), Repair (heals allies), Magnet Boss.
