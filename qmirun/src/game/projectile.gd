extends Node2D
class_name Projectile
## Homing shot. Updated by Level.tick(). On impact it asks the Level to resolve
## damage (so splash can query nearby enemies in one place).

var target: Enemy
var speed: float = 420.0
var damage: float = 10.0
var splash: float = 0.0
var slow_factor: float = 0.0
var slow_duration: float = 1.5
var armor_pen: float = 0.0
var color: Color = Color.WHITE
var level: Node                      # Level, resolves the hit

var _dir: Vector2 = Vector2.RIGHT
var _life: float = 3.0               # self-destruct safety if it never connects
var _done: bool = false              # resolved/expired; ignore further ticks

func is_done() -> bool:
	return _done

func tick(delta: float) -> void:
	if _done:
		return
	_life -= delta
	if _life <= 0.0:
		_expire()
		return
	var step := speed * delta
	var has_target := is_instance_valid(target) and target.is_alive()
	if has_target:
		var aim := target.global_position
		_dir = (aim - global_position).normalized()
		if global_position.distance_to(aim) <= step:
			global_position = aim
			_impact()
			return
	# Move along current heading (toward target, or straight on if the target is gone).
	global_position += _dir * step
	queue_redraw()

func _impact() -> void:
	if _done:
		return
	_done = true
	if level and level.has_method("resolve_hit"):
		level.resolve_hit(global_position, target, damage, splash, slow_factor, slow_duration, armor_pen)
	queue_free()

func _expire() -> void:
	if _done:
		return
	_done = true
	queue_free()

func _draw() -> void:
	draw_circle(Vector2.ZERO, 5.0, color)
	draw_circle(Vector2.ZERO, 2.0, Color(1, 1, 1, 0.9))
