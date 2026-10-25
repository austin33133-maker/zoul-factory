extends Resource
class_name TowerData
## Static definition of one tower type across its 3 levels (index 0 = level 1).

@export var id: StringName = &""
@export var display_name: String = ""
@export var color: Color = Color.YELLOW
@export var targeting: StringName = &"first"   # first/last/closest/strongest/weakest
@export var build_cost: int = 70

# Per-level arrays, size 3 (level 1,2,3). upgrade_cost[0] is unused (that's the build).
@export var upgrade_cost: Array[int] = [0, 60, 90]
@export var damage: Array[float] = [6.0, 9.0, 13.0]
@export var fire_rate: Array[float] = [3.0, 3.5, 4.0]     # shots per second
@export var range_px: Array[float] = [110.0, 120.0, 130.0]
@export var splash_radius: Array[float] = [0.0, 0.0, 0.0] # 0 = single target
@export var slow_factor: Array[float] = [0.0, 0.0, 0.0]   # fraction of speed removed on hit
@export var slow_duration: float = 1.5
@export var armor_pen: float = 0.0            # fraction of enemy armor ignored (0..1)
@export var projectile_speed: float = 420.0

const MAX_LEVEL := 3

func stat(level: int, arr: Array) -> float:
	return float(arr[clampi(level - 1, 0, MAX_LEVEL - 1)])

func dps(level: int) -> float:
	return stat(level, damage) * stat(level, fire_rate)

func cost_to_upgrade(to_level: int) -> int:
	return int(upgrade_cost[clampi(to_level - 1, 0, MAX_LEVEL - 1)])

func total_invested(level: int) -> int:
	var t := build_cost
	for l in range(2, level + 1):
		t += cost_to_upgrade(l)
	return t
