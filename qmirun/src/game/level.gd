extends Node2D
class_name Level
## Orchestrates the whole match: lane, buildable slots, wave spawning, combat ticking,
## economy wiring, skills, and win/lose. Drives every tick() so the sim is deterministic
## and headless-testable (see tests/balance_sim.gd).

signal wave_cleared(wave_index: int)
signal match_ended(won: bool)

const SLOT_CLEARANCE := 50.0        # min distance a slot must keep from the lane
const BUILD_RADIUS := 0.0           # drawn slot radius handled in HUD/Level draw

var auto_advance: bool = false      # sim can flip this; game uses the Start button

var _path: Path2D
var _proj_container: Node2D
var _tower_container: Node2D

var _slots: Array[Vector2] = []
var _slot_tower: Array = []         # Tower or null, parallel to _slots
var _enemies: Array[Enemy] = []
var _towers: Array[Tower] = []
var _projectiles: Array[Projectile] = []

var _spawn_queue: Array = []        # [{type:StringName, t:float}], sorted by t
var _spawn_cursor: int = 0
var _wave_time: float = 0.0
var _wave_running: bool = false

var _skill_cd: Dictionary = {}      # id -> remaining seconds

func _ready() -> void:
	GameState.reset()
	_build_path()
	_proj_container = Node2D.new()
	_proj_container.name = "Projectiles"
	add_child(_proj_container)
	_tower_container = Node2D.new()
	_tower_container.name = "Towers"
	add_child(_tower_container)
	_compute_slots()
	for s in GameData.skills:
		_skill_cd[s.id] = 0.0
	set_process(true)

func _build_path() -> void:
	_path = Path2D.new()
	_path.name = "Lane"
	var curve := Curve2D.new()
	for p in GameData.path_points:
		curve.add_point(p)
	_path.curve = curve
	add_child(_path)

func _compute_slots() -> void:
	var pts := GameData.path_points
	for gy in range(230, 1000, 95):
		for gx in range(70, 680, 95):
			var p := Vector2(gx, gy)
			var ok := true
			for i in range(pts.size() - 1):
				if TDMath.point_segment_distance(p, pts[i], pts[i + 1]) < SLOT_CLEARANCE:
					ok = false
					break
			if ok:
				_slots.append(p)
				_slot_tower.append(null)

# ---------------------------------------------------------------- wave flow

func start_next_wave() -> bool:
	if _wave_running or GameState.status == GameState.WON or GameState.status == GameState.LOST:
		return false
	if GameState.wave_index + 1 >= GameData.waves.size():
		return false
	GameState.wave_index += 1
	GameState.set_status(GameState.RUNNING)
	GameState.wave_changed.emit(GameState.wave_index + 1, GameState.total_waves)
	_build_spawn_queue(GameData.waves[GameState.wave_index])
	_wave_time = 0.0
	_spawn_cursor = 0
	_wave_running = true
	return true

func _build_spawn_queue(wave: WaveData) -> void:
	_spawn_queue.clear()
	for g in wave.groups:
		var lead := float(g.get("lead", 0.0))
		var spacing := float(g.get("spacing", 0.5))
		var count := int(g.get("count", 0))
		var type: StringName = g.get("type", &"windup")
		for i in count:
			_spawn_queue.append({"type": type, "t": lead + i * spacing})
	_spawn_queue.sort_custom(func(a, b): return a.t < b.t)

func _spawn_enemy(type: StringName) -> void:
	var data := GameData.enemy(type)
	var e := Enemy.new()
	_path.add_child(e)                       # must be a child of Path2D
	e.setup(data, GameData.waves[GameState.wave_index].hp_mult)
	e.died.connect(_on_enemy_died)
	e.leaked.connect(_on_enemy_leaked)
	_enemies.append(e)

func _on_enemy_died(bounty: int) -> void:
	GameState.earn(bounty)

func _on_enemy_leaked(leak_damage: int) -> void:
	GameState.lose_life(leak_damage)
	if GameState.status == GameState.LOST:
		_end_match(false)

# ---------------------------------------------------------------- main tick

func _process(delta: float) -> void:
	if get_tree().paused:
		return
	tick(delta)

func tick(delta: float) -> void:
	for id in _skill_cd:
		if _skill_cd[id] > 0.0:
			_skill_cd[id] = maxf(0.0, _skill_cd[id] - delta)

	if GameState.status != GameState.RUNNING:
		return

	# Spawns due this frame.
	if _wave_running:
		_wave_time += delta
		while _spawn_cursor < _spawn_queue.size() and _spawn_queue[_spawn_cursor].t <= _wave_time:
			_spawn_enemy(_spawn_queue[_spawn_cursor].type)
			_spawn_cursor += 1

	# Enemies move.
	for e in _enemies.duplicate():
		if is_instance_valid(e):
			e.tick(delta)
	_prune_enemies()

	# Healer auras.
	_apply_healers(delta)

	# Towers fire.
	for t in _towers:
		t.tick(delta, _enemies)

	# Projectiles.
	for p in _projectiles.duplicate():
		if is_instance_valid(p):
			p.tick(delta)
	_prune_projectiles()

	# Wave end: all spawned and nothing left alive.
	if _wave_running and _spawn_cursor >= _spawn_queue.size() and _enemies.is_empty():
		_finish_wave()

func _prune_enemies() -> void:
	var kept: Array[Enemy] = []
	for e in _enemies:
		if is_instance_valid(e) and e.is_alive():
			kept.append(e)
	_enemies = kept

func _prune_projectiles() -> void:
	var kept: Array[Projectile] = []
	for p in _projectiles:
		if is_instance_valid(p) and not p.is_done():
			kept.append(p)
	_projectiles = kept

func _apply_healers(delta: float) -> void:
	for h in _enemies:
		if h.data.heal_per_sec <= 0.0:
			continue
		for e in _enemies:
			if e == h:
				continue
			if h.global_position.distance_to(e.global_position) <= h.data.heal_radius:
				e.heal(h.data.heal_per_sec * delta)

func _finish_wave() -> void:
	_wave_running = false
	var wave := GameData.waves[GameState.wave_index]
	GameState.earn(wave.clear_bonus)
	wave_cleared.emit(GameState.wave_index)
	if GameState.wave_index + 1 >= GameData.waves.size():
		GameState.set_status(GameState.WON)
		_end_match(true)
	else:
		GameState.set_status(GameState.PREP)
		if auto_advance:
			start_next_wave()

func _end_match(won: bool) -> void:
	match_ended.emit(won)

# ---------------------------------------------------------------- combat resolution

func spawn_projectile(tower: Tower, target: Enemy) -> void:
	var p := Projectile.new()
	_proj_container.add_child(p)
	p.global_position = tower.global_position
	p.target = target
	p.speed = tower.data.projectile_speed
	p.damage = tower.cur_damage()
	p.splash = tower.cur_splash()
	p.slow_factor = tower.cur_slow()
	p.slow_duration = tower.data.slow_duration
	p.armor_pen = tower.data.armor_pen
	p.color = tower.data.color
	p.level = self
	_projectiles.append(p)

func resolve_hit(pos: Vector2, direct: Enemy, damage: float, splash: float,
		slow_factor: float, slow_duration: float, armor_pen: float) -> void:
	if splash > 0.0:
		for e in _enemies.duplicate():
			if is_instance_valid(e) and e.is_alive() and e.global_position.distance_to(pos) <= splash:
				e.take_damage(damage, armor_pen)
				if slow_factor > 0.0:
					e.apply_slow(slow_factor, slow_duration)
	elif is_instance_valid(direct) and direct.is_alive():
		direct.take_damage(damage, armor_pen)
		if slow_factor > 0.0:
			direct.apply_slow(slow_factor, slow_duration)
	_prune_enemies()

# ---------------------------------------------------------------- build / upgrade / sell

func slot_count() -> int: return _slots.size()
func slot_pos(i: int) -> Vector2: return _slots[i]
func slot_tower(i: int) -> Tower: return _slot_tower[i]

func nearest_free_slot(pos: Vector2, max_dist: float) -> int:
	var best := -1
	var best_d := max_dist
	for i in _slots.size():
		if _slot_tower[i] != null:
			continue
		var d := pos.distance_to(_slots[i])
		if d < best_d:
			best_d = d
			best = i
	return best

func tower_at(pos: Vector2, max_dist: float) -> Tower:
	for t in _towers:
		if t.global_position.distance_to(pos) <= max_dist:
			return t
	return null

func build_tower(slot_index: int, tower_id: StringName) -> Tower:
	if slot_index < 0 or slot_index >= _slots.size() or _slot_tower[slot_index] != null:
		return null
	var td := GameData.tower(tower_id)
	if not GameState.spend(td.build_cost):
		return null
	var t := Tower.new()
	_tower_container.add_child(t)
	t.global_position = _slots[slot_index]
	t.setup(td, self, slot_index)
	_towers.append(t)
	_slot_tower[slot_index] = t
	return t

func upgrade_tower(t: Tower) -> bool:
	if t == null or not t.can_upgrade():
		return false
	if not GameState.spend(t.upgrade_cost()):
		return false
	t.upgrade()
	return true

func sell_tower(t: Tower) -> void:
	if t == null:
		return
	GameState.earn(t.sell_value())
	if t.slot_index >= 0 and t.slot_index < _slot_tower.size():
		_slot_tower[t.slot_index] = null
	_towers.erase(t)
	t.queue_free()

# ---------------------------------------------------------------- skills

func skill_ready(id: StringName) -> bool:
	return _skill_cd.get(id, 0.0) <= 0.0

func skill_cooldown_left(id: StringName) -> float:
	return _skill_cd.get(id, 0.0)

func use_skill(skill: Dictionary, aim: Vector2) -> bool:
	if not skill_ready(skill.id):
		return false
	match skill.id:
		&"airstrike":
			resolve_hit(aim, null, skill.damage, skill.radius, 0.0, 0.0, 1.0)
		&"freeze":
			for e in _enemies:
				e.apply_slow(skill.slow, skill.duration)
		&"rally":
			for t in _towers:
				t.apply_fire_boost(skill.fire_boost, skill.duration)
		_:
			return false
	_skill_cd[skill.id] = skill.cooldown
	return true

# ---------------------------------------------------------------- draw (greybox board)

func _draw() -> void:
	# Cloud-island board background.
	draw_rect(Rect2(Vector2(0, 150), Vector2(720, 880)), Color("8fd36a"))
	draw_rect(Rect2(Vector2(0, 150), Vector2(720, 880)), Color("6fb84f"), false, 4.0)
	# Lane.
	var pts := GameData.path_points
	for i in range(pts.size() - 1):
		draw_line(pts[i], pts[i + 1], Color("efe09a"), 44.0)
	for i in range(pts.size() - 1):
		draw_line(pts[i], pts[i + 1], Color("d8c66a"), 44.0, false)
	# Spawn (portal) and goal markers.
	draw_circle(pts[0], 26.0, Color("ffcf5c"))
	draw_circle(pts[pts.size() - 1], 26.0, Color("c15b5b"))
	# Free build slots.
	for i in _slots.size():
		if _slot_tower[i] == null:
			draw_circle(_slots[i], 18.0, Color(1, 1, 1, 0.18))
			draw_arc(_slots[i], 18.0, 0.0, TAU, 20, Color(1, 1, 1, 0.35), 1.5)
