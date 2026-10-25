class_name CCEnemy
extends RefCounted
## An enemy walking the lane. Position derives from `progress` (distance along the path),
## never from rendering. Slows tracked as independent sources with their own expiries
## (R-SNOW-01); the strongest still-active one applies.

var uid: int
var type: StringName
var hp: float
var max_hp: float
var speed: float               # grid units per second (base)
var progress: float = 0.0      # distance travelled along path (grid units)
var is_boss: bool = false
var bounty: int = 0
var leak_damage: int = 1
var alive: bool = true
var mark_expire_step: int = -1 # hero mark active while step < this

var _slows: Array = []         # [{factor:float, expire:int}]

func _init(p_uid: int, p_type: StringName, def: Dictionary) -> void:
	uid = p_uid
	type = p_type
	hp = float(def["hp"])
	max_hp = hp
	speed = float(def["speed"])
	is_boss = bool(def.get("is_boss", false))
	bounty = int(def.get("bounty", 0))
	leak_damage = int(def.get("leak", 1))

func position() -> Vector2:
	return CCConfig.path_sample(progress)

func add_slow(factor: float, expire_step: int) -> void:
	_slows.append({"factor": factor, "expire": expire_step})

func strongest_slow(step: int) -> float:
	var best := 0.0
	var kept: Array = []
	for s in _slows:
		if s.expire > step:
			kept.append(s)
			best = maxf(best, s.factor)
	_slows = kept
	return best

func is_marked(step: int) -> bool:
	return step < mark_expire_step

## Apply damage; returns {dealt, overkill, killed}.
func take_damage(raw: float) -> Dictionary:
	if not alive or raw <= 0.0:
		return {"dealt": 0.0, "overkill": 0.0, "killed": false}
	var dealt := minf(hp, raw)
	var overkill := raw - dealt
	hp -= dealt
	var killed := hp <= 0.0
	if killed:
		hp = 0.0
		alive = false
	return {"dealt": dealt, "overkill": overkill, "killed": killed}
