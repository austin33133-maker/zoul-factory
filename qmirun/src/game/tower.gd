extends Node2D
class_name Tower
## A placed tower. Level.tick() passes the live enemy list and drives firing.

var data: TowerData
var level_num: int = 1
var level: Node                        # the Level node (spawns projectiles)
var slot_index: int = -1

var _cooldown: float = 0.0
var _fire_boost: float = 0.0           # extra fire-rate fraction from Rally
var _boost_timer: float = 0.0
var _show_range: bool = false

func setup(d: TowerData, lvl_node: Node, slot: int) -> void:
	data = d
	level = lvl_node
	slot_index = slot
	level_num = 1
	_cooldown = 0.0
	queue_redraw()

func cur_damage() -> float: return data.stat(level_num, data.damage)
func cur_fire_rate() -> float: return data.stat(level_num, data.fire_rate) * (1.0 + _fire_boost)
func cur_range() -> float: return data.stat(level_num, data.range_px)
func cur_splash() -> float: return data.stat(level_num, data.splash_radius)
func cur_slow() -> float: return data.stat(level_num, data.slow_factor)

func can_upgrade() -> bool: return level_num < TowerData.MAX_LEVEL
func upgrade_cost() -> int: return data.cost_to_upgrade(level_num + 1)
func sell_value() -> int: return int(data.total_invested(level_num) * GameData.SELL_REFUND)

func upgrade() -> void:
	if can_upgrade():
		level_num += 1
		queue_redraw()

func apply_fire_boost(fraction: float, duration: float) -> void:
	_fire_boost = fraction
	_boost_timer = duration

func tick(delta: float, enemies: Array) -> void:
	if _boost_timer > 0.0:
		_boost_timer -= delta
		if _boost_timer <= 0.0:
			_fire_boost = 0.0
	_cooldown -= delta
	if _cooldown > 0.0:
		return
	var target := _acquire(enemies)
	if target != null:
		_fire(target)
		_cooldown = 1.0 / maxf(0.01, cur_fire_rate())

func _acquire(enemies: Array) -> Enemy:
	var positions: Array = []
	var progresses: Array = []
	var hps: Array = []
	for e in enemies:
		positions.append(e.global_position)
		progresses.append(e.progress)
		hps.append(e.hp)
	var idx := TDMath.pick_target(positions, progresses, hps,
		global_position, cur_range(), data.targeting)
	return enemies[idx] if idx >= 0 else null

func _fire(target: Enemy) -> void:
	level.spawn_projectile(self, target)

func set_show_range(v: bool) -> void:
	_show_range = v
	queue_redraw()

func _draw() -> void:
	if _show_range:
		draw_circle(Vector2.ZERO, cur_range(), Color(1, 1, 1, 0.08))
		draw_arc(Vector2.ZERO, cur_range(), 0.0, TAU, 48, Color(1, 1, 1, 0.25), 1.5)
	# Base + body; pips show level.
	draw_circle(Vector2.ZERO, 20.0, Color(0, 0, 0, 0.25))
	draw_rect(Rect2(Vector2(-16, -16), Vector2(32, 32)), data.color)
	draw_rect(Rect2(Vector2(-16, -16), Vector2(32, 32)), Color(0, 0, 0, 0.5), false, 2.0)
	for i in level_num:
		draw_circle(Vector2(-10.0 + i * 10.0, 22.0), 3.5, Color("fff2b0"))
