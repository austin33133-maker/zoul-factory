extends Node
## Central data registry (autoload "GameData"). All balance numbers live here so the
## balance sim and the game read exactly the same values.

const START_GOLD := 260
const START_LIVES := 20
const HP_GROWTH := 1.16          # geometric per-wave HP growth
const SELL_REFUND := 0.7         # fraction of invested gold returned on sell

var enemies: Dictionary = {}     # id -> EnemyData
var towers: Dictionary = {}      # id -> TowerData
var tower_order: Array[StringName] = [&"popcorn", &"frost", &"rocket", &"pierce"]
var waves: Array[WaveData] = []
var skills: Array[Dictionary] = []

# Serpentine lane for a portrait 720x1280 board (HUD reserves top/bottom).
var path_points: PackedVector2Array = PackedVector2Array([
	Vector2(60, 170), Vector2(650, 170),
	Vector2(650, 360), Vector2(110, 360),
	Vector2(110, 540), Vector2(650, 540),
	Vector2(650, 720), Vector2(110, 720),
	Vector2(110, 900), Vector2(650, 900),
	Vector2(650, 1010),
])

func _ready() -> void:
	_build_enemies()
	_build_towers()
	_build_waves()
	_build_skills()

func _mk_enemy(id: StringName, name: String, hp: float, speed: float, armor: float,
		bounty: int, color: Color, radius := 12.0, leak := 1,
		heal := 0.0, boss := false) -> void:
	var e := EnemyData.new()
	e.id = id; e.display_name = name; e.base_hp = hp; e.speed = speed
	e.armor = armor; e.bounty = bounty; e.color = color; e.radius = radius
	e.leak_damage = leak; e.heal_per_sec = heal; e.is_boss = boss
	enemies[id] = e

func _build_enemies() -> void:
	_mk_enemy(&"windup", "Windup", 22.0, 62.0, 0.0, 6, Color("d96a4a"), 12.0)
	_mk_enemy(&"runner", "Runner", 13.0, 128.0, 0.0, 5, Color("e24b4b"), 10.0)
	_mk_enemy(&"shield", "Shield", 48.0, 46.0, 0.45, 11, Color("8a5a3b"), 15.0)
	_mk_enemy(&"repair", "Repair", 34.0, 54.0, 0.1, 12, Color("c98a3a"), 13.0, 1, 4.0)
	_mk_enemy(&"magnet", "Magnet Boss", 1500.0, 34.0, 0.3, 160, Color("7d49b5"), 26.0, 6, 0.0, true)

func _mk_tower(id: StringName, name: String, color: Color, targeting: StringName,
		build_cost: int, upg: Array, dmg: Array, fire: Array, rng: Array,
		splash: Array, slow: Array, slow_dur: float, armor_pen: float,
		proj_speed: float) -> void:
	var t := TowerData.new()
	t.id = id; t.display_name = name; t.color = color; t.targeting = targeting
	t.build_cost = build_cost
	t.upgrade_cost.assign(upg)
	t.damage.assign(dmg)
	t.fire_rate.assign(fire)
	t.range_px.assign(rng)
	t.splash_radius.assign(splash)
	t.slow_factor.assign(slow)
	t.slow_duration = slow_dur
	t.armor_pen = armor_pen
	t.projectile_speed = proj_speed
	towers[id] = t

func _build_towers() -> void:
	# Popcorn: cheap rapid single-target DPS.
	_mk_tower(&"popcorn", "Popcorn", Color("f2b33d"), &"first", 70,
		[0, 55, 85], [6.0, 9.0, 13.0], [3.0, 3.6, 4.2], [115.0, 125.0, 135.0],
		[0.0, 0.0, 0.0], [0.0, 0.0, 0.0], 1.5, 0.0, 480.0)
	# Frost: low damage, slows. Utility that lets other towers finish kills.
	_mk_tower(&"frost", "Frost", Color("4db6e6"), &"first", 85,
		[0, 70, 110], [3.0, 4.0, 6.0], [1.1, 1.3, 1.5], [105.0, 115.0, 125.0],
		[0.0, 0.0, 0.0], [0.35, 0.45, 0.55], 1.6, 0.0, 520.0)
	# Rocket: splash AoE for swarms. Slow, expensive.
	_mk_tower(&"rocket", "Rocket", Color("e2574c"), &"closest", 120,
		[0, 100, 150], [22.0, 34.0, 52.0], [0.75, 0.85, 0.95], [130.0, 140.0, 150.0],
		[46.0, 54.0, 64.0], [0.0, 0.0, 0.0], 1.5, 0.0, 360.0)
	# Pierce: long range, high single-target, ignores most armor. Counters Shield.
	_mk_tower(&"pierce", "Pierce", Color("3fb6a0"), &"strongest", 110,
		[0, 95, 145], [30.0, 46.0, 70.0], [0.85, 1.05, 1.25], [185.0, 205.0, 225.0],
		[0.0, 0.0, 0.0], [0.0, 0.0, 0.0], 1.5, 0.75, 640.0)

func _g(type: StringName, count: int, spacing: float, lead := 0.0) -> Dictionary:
	return {"type": type, "count": count, "spacing": spacing, "lead": lead}

func _mk_wave(groups: Array, clear_bonus: int) -> void:
	var w := WaveData.new()
	w.groups.assign(groups)
	w.hp_mult = TDMath.wave_hp_mult(waves.size(), HP_GROWTH)
	w.clear_bonus = clear_bonus
	waves.append(w)

func _build_waves() -> void:
	# 12 waves: intro -> runners -> armor intro -> mixed -> healer -> boss.
	_mk_wave([_g(&"windup", 8, 0.8)], 22)                                             # 1
	_mk_wave([_g(&"windup", 12, 0.7)], 24)                                            # 2
	_mk_wave([_g(&"runner", 10, 0.45), _g(&"windup", 6, 0.7, 1.0)], 26)               # 3
	_mk_wave([_g(&"windup", 10, 0.6), _g(&"shield", 3, 1.2, 1.5)], 30)                # 4
	_mk_wave([_g(&"runner", 16, 0.4)], 30)                                            # 5
	_mk_wave([_g(&"shield", 6, 1.0), _g(&"windup", 10, 0.5, 0.5)], 34)                # 6
	_mk_wave([_g(&"repair", 3, 1.4), _g(&"windup", 14, 0.5, 1.0)], 36)               # 7
	_mk_wave([_g(&"runner", 20, 0.35), _g(&"shield", 5, 1.0, 1.0)], 38)               # 8
	_mk_wave([_g(&"shield", 8, 0.9), _g(&"repair", 3, 1.5, 2.0)], 42)                 # 9
	_mk_wave([_g(&"windup", 16, 0.4), _g(&"runner", 16, 0.3, 1.0), _g(&"shield", 4, 1.0, 2.0)], 46) # 10
	_mk_wave([_g(&"shield", 10, 0.8), _g(&"repair", 5, 1.2, 1.0), _g(&"runner", 12, 0.35, 2.0)], 50) # 11
	_mk_wave([_g(&"windup", 12, 0.5, 0.0), _g(&"magnet", 1, 1.0, 3.0), _g(&"shield", 6, 1.0, 5.0)], 120) # 12 boss

func _build_skills() -> void:
	skills = [
		{"id": &"airstrike", "name": "Air Strike", "cooldown": 18.0,
			"radius": 120.0, "damage": 65.0, "aimed": true, "color": Color("f2b33d")},
		{"id": &"freeze", "name": "Freeze", "cooldown": 12.0,
			"slow": 0.6, "duration": 3.0, "aimed": false, "color": Color("4db6e6")},
		{"id": &"rally", "name": "Rally", "cooldown": 20.0,
			"fire_boost": 0.6, "duration": 6.0, "aimed": false, "color": Color("e2574c")},
	]

func enemy(id: StringName) -> EnemyData: return enemies[id]
func tower(id: StringName) -> TowerData: return towers[id]
