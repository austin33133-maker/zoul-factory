class_name CCConfig
## QmiRun Cloud Clash — single source of all rule constants and test-baseline numbers.
## Every value here is a TEST BASELINE, not a verified-balanced or competitor figure.
## Requirement IDs (see docs/) are cited in comments: R-<AREA>-<n>.

const RULES_VERSION := "0.1.0"

# --- Simulation (R-SIM-01: fixed step; all durations convert to integer steps) ---
const SIM_HZ := 20                      # simulation steps per second
const DT := 1.0 / float(SIM_HZ)         # seconds per step (0.05)

static func secs_to_steps(s: float) -> int:
	# Single, shared rounding rule for every duration/interval (R-SIM-02).
	return int(round(s * float(SIM_HZ)))

# --- Board (R-BOARD-01: fixed 5 cols x 3 rows, 15 cells) ---
const COLS := 5
const ROWS := 3
const CELLS := COLS * ROWS

static func cell_index(col: int, row: int) -> int: return row * COLS + col
static func cell_col(idx: int) -> int: return idx % COLS
static func cell_row(idx: int) -> int: return idx / COLS
# Cell center in grid units (1 unit = 1 cell width). Used for pierce ray origin.
static func cell_center(idx: int) -> Vector2:
	return Vector2(cell_col(idx) + 0.5, cell_row(idx) + 0.5)

# --- Economy (R-ENERGY-01..04) ---
const START_ENERGY := 240.0
const PASSIVE_ENERGY_PER_SEC := 5.0
const SUMMON_BASE_COST := 80            # first summon
const SUMMON_COST_STEP := 10            # nth cost = 80 + 10*(n-1)

static func summon_cost(successful_summons_so_far: int) -> int:
	# n-th summon (1-based) costs 80 + 10*(n-1); arg is count already done.
	return SUMMON_BASE_COST + SUMMON_COST_STEP * successful_summons_so_far

# --- Lives / leaks (R-LIFE-01, test params) ---
const START_LIVES := 3
const LEAK_DAMAGE_NORMAL := 1
const LEAK_DAMAGE_BOSS := 2

# --- Match length (R-MATCH-01, test param) ---
const MATCH_TIMEOUT_SEC := 240.0

# --- Merge tiers (R-MERGE-01, R-BAL-01) : output damage multiplier by tier (I..IV) ---
const MERGE_MULT := [1.000, 1.800, 3.240, 5.832]   # index = tier-1
const MAX_TIER := 4

# --- In-battle type upgrade (R-UPG-01): damage mult + cumulative energy cost ---
const UPGRADE_MULT := [1.00, 1.15, 1.30, 1.45, 1.60]      # index = level 0..4
const UPGRADE_COST := [0, 100, 200, 400, 800]            # cost to go FROM level i-1 TO i
const MAX_UPGRADE := 4

# --- Snow control (R-SNOW-01) ---
const SNOW_SLOW_BY_TIER := [0.25, 0.30, 0.35, 0.40]      # index = tier-1
const SNOW_SLOW_DURATION_SEC := 1.5
const SLOW_GLOBAL_CAP := 0.50                            # max effective slow on any enemy
const BOSS_SLOW_FACTOR := 0.50                           # boss takes 50% of the effective slow

# --- Flower buff (R-FLOWER-01): base by tier + 0.02 per upgrade level (not damage-mult) ---
const FLOWER_BUFF_BY_TIER := [0.15, 0.19, 0.23, 0.27]    # index = tier-1
const FLOWER_BUFF_PER_UPGRADE := 0.02

# --- Hero: White Falcon Captain mark (R-HERO-01, test params) ---
const HERO_MARK_MAX_TARGETS := 5
const HERO_MARK_BONUS := 0.20
const HERO_MARK_DURATION_SEC := 5.0
const HERO_MARK_COOLDOWN_SEC := 30.0

# --- Tower definitions (R-TOWER-01..06). damage float; interval in seconds (->steps). ---
# kind: single / splash / chain / pierce / support
static func towers() -> Dictionary:
	return {
		&"mint": {
			"name": "Mint Repeater", "kind": "single",
			"damage": 12.0, "interval": 0.30,
		},
		&"popcorn": {
			"name": "Popcorn Cannon", "kind": "splash",
			"damage": 30.0, "interval": 1.50,
			"splash_radius": 0.75, "max_targets": 5,
		},
		&"lightning": {
			"name": "Zap Tower", "kind": "chain",
			"damage": 24.0, "interval": 1.20,
			"max_targets": 3, "falloff": [0.55, 0.30], "hop_range": 1.25,
		},
		&"snow": {
			"name": "Snow Tower", "kind": "snow",
			"damage": 8.0, "interval": 1.00,
		},
		&"pierce": {
			"name": "Pierce Tower", "kind": "pierce",
			"damage": 42.0, "interval": 1.40,
			"max_targets": 3, "falloff": [0.65, 0.40], "ray_width": 0.30,
		},
		&"flower": {
			"name": "Flower Amp", "kind": "support",
			"damage": 0.0, "interval": 0.0,
		},
	}

const OUTPUT_TOWERS: Array[StringName] = [&"mint", &"popcorn", &"lightning", &"snow", &"pierce"]
const ALL_TOWERS: Array[StringName] = [&"mint", &"popcorn", &"lightning", &"snow", &"pierce", &"flower"]

# --- Enemy definitions (R-ENEMY-01..04). Baselines from docs/BALANCE_SPEC calibration. ---
# Normal baseline hp/speed are the reference; others are multiples of it.
const ENEMY_BASE_HP := 60.0             # calibration baseline (see BALANCE_SPEC)
const ENEMY_BASE_SPEED := 1.0           # grid-units per second

static func enemies() -> Dictionary:
	return {
		&"windup": {"name": "Windup Grunt", "hp": ENEMY_BASE_HP, "speed": ENEMY_BASE_SPEED,
			"bounty": 4, "leak": LEAK_DAMAGE_NORMAL, "is_boss": false},
		&"roller": {"name": "Roller", "hp": ENEMY_BASE_HP * 0.6, "speed": ENEMY_BASE_SPEED * 1.6,
			"bounty": 4, "leak": LEAK_DAMAGE_NORMAL, "is_boss": false},
		&"heavy":  {"name": "Heavy Scrap", "hp": ENEMY_BASE_HP * 4.0, "speed": ENEMY_BASE_SPEED * 0.7,
			"bounty": 8, "leak": LEAK_DAMAGE_NORMAL, "is_boss": false},
		&"magnet": {"name": "Magnet Boss", "hp": ENEMY_BASE_HP * 18.0, "speed": ENEMY_BASE_SPEED * 0.6,
			"bounty": 20, "leak": LEAK_DAMAGE_BOSS, "is_boss": true,
			"warn": 1.0, "disable": 2.0, "skill_interval": 12.0},
	}

# --- Path (R-PATH-01): continuous, does not cross the board, length in grid widths. ---
# Polyline in grid coords; board occupies x[0,5] y[0,3]. Lane sits to the right of the
# board and snakes so splash/chain/pierce geometry is meaningful. Spawn=points[0], base=last.
static func path_points() -> PackedVector2Array:
	return PackedVector2Array([
		Vector2(5.6, 3.2), Vector2(5.6, 2.5), Vector2(6.3, 2.5), Vector2(6.3, 1.5),
		Vector2(5.6, 1.5), Vector2(5.6, 0.5), Vector2(6.3, 0.5), Vector2(6.3, -0.4),
	])

## Deck validation (R-DECK-01): exactly 5 distinct cards drawn from ALL_TOWERS.
static func validate_deck(cards: Array) -> Dictionary:
	if cards.size() != 5:
		return {"ok": false, "reason": "need_exactly_5"}
	var seen := {}
	for c in cards:
		if not (c in ALL_TOWERS):
			return {"ok": false, "reason": "unknown_card:%s" % c}
		if seen.has(c):
			return {"ok": false, "reason": "duplicate:%s" % c}
		seen[c] = true
	return {"ok": true, "reason": ""}

## Default deck + calibration wave set (TEST BASELINE — see docs/BALANCE_SPEC.md).
static func default_deck() -> Array:
	return [&"mint", &"popcorn", &"lightning", &"snow", &"pierce"]

static func default_waves() -> Array:
	return [
		{"type": &"windup", "count": 8,  "spacing": 0.8, "lead": 0.0},
		{"type": &"roller", "count": 10, "spacing": 0.4, "lead": 10.0},
		{"type": &"windup", "count": 10, "spacing": 0.6, "lead": 20.0},
		{"type": &"heavy",  "count": 4,  "spacing": 1.4, "lead": 32.0},
		{"type": &"roller", "count": 14, "spacing": 0.35,"lead": 44.0},
		{"type": &"heavy",  "count": 6,  "spacing": 1.2, "lead": 56.0},
		{"type": &"windup", "count": 16, "spacing": 0.45,"lead": 70.0},
		{"type": &"magnet", "count": 1,  "spacing": 1.0, "lead": 86.0},
		{"type": &"heavy",  "count": 6,  "spacing": 1.0, "lead": 92.0},
	]

static func path_length() -> float:
	var pts := path_points()
	var total := 0.0
	for i in range(pts.size() - 1):
		total += pts[i].distance_to(pts[i + 1])
	return total

# Sample world position (grid units) at a given progress distance along the path.
static func path_sample(progress: float) -> Vector2:
	var pts := path_points()
	var remaining := maxf(0.0, progress)
	for i in range(pts.size() - 1):
		var seg := pts[i + 1] - pts[i]
		var seg_len := seg.length()
		if remaining <= seg_len or i == pts.size() - 2:
			var t := 0.0 if seg_len == 0.0 else clampf(remaining / seg_len, 0.0, 1.0)
			return pts[i] + seg * t
		remaining -= seg_len
	return pts[pts.size() - 1]
