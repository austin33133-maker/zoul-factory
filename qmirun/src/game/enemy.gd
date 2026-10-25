extends PathFollow2D
class_name Enemy
## An enemy walking the lane. A PathFollow2D so the curve handles cornering/overshoot.
## Updated by Level.tick(), never by its own _process (keeps the sim deterministic).

signal died(bounty: int)
signal leaked(leak_damage: int)

var data: EnemyData
var hp: float = 1.0
var max_hp: float = 1.0
var base_speed: float = 60.0
var _slow_timer: float = 0.0
var _slow_factor: float = 0.0
var _finished: bool = false        # dead or leaked; ignore further ticks

func setup(d: EnemyData, hp_mult: float) -> void:
	data = d
	max_hp = d.base_hp * hp_mult
	hp = max_hp
	base_speed = d.speed
	loop = false
	rotates = false
	progress = 0.0
	queue_redraw()

func tick(delta: float) -> void:
	if _finished:
		return
	var speed := base_speed
	if _slow_timer > 0.0:
		_slow_timer -= delta
		speed *= (1.0 - _slow_factor)
	progress += speed * delta
	if progress_ratio >= 1.0:
		_leak()
	else:
		queue_redraw()

func take_damage(raw: float, armor_pen: float) -> void:
	if _finished:
		return
	hp -= TDMath.effective_damage(raw, data.armor, armor_pen)
	if hp <= 0.0:
		_die()
	else:
		queue_redraw()

func heal(amount: float) -> void:
	if _finished:
		return
	hp = minf(max_hp, hp + amount)
	queue_redraw()

func apply_slow(factor: float, duration: float) -> void:
	# Strongest active slow wins; refresh its timer.
	if factor >= _slow_factor or _slow_timer <= 0.0:
		_slow_factor = factor
		_slow_timer = duration

func is_alive() -> bool:
	return not _finished

func _die() -> void:
	_finished = true
	died.emit(data.bounty)
	queue_free()

func _leak() -> void:
	_finished = true
	leaked.emit(data.leak_damage)
	queue_free()

func _draw() -> void:
	var r := data.radius
	draw_circle(Vector2.ZERO, r, data.color)
	draw_arc(Vector2.ZERO, r, 0.0, TAU, 20, Color(0, 0, 0, 0.4), 2.0)
	if _slow_timer > 0.0:
		draw_arc(Vector2.ZERO, r + 3.0, 0.0, TAU, 18, Color("8fdcff"), 2.0)
	# Health bar above the enemy.
	if hp < max_hp:
		var w := r * 2.0
		var frac := clampf(hp / max_hp, 0.0, 1.0)
		var top := Vector2(-r, -r - 9.0)
		draw_rect(Rect2(top, Vector2(w, 4.0)), Color(0, 0, 0, 0.6))
		draw_rect(Rect2(top, Vector2(w * frac, 4.0)), Color("57d957"))
