extends Resource
class_name WaveData
## One wave: ordered groups of enemies, plus HP scaling and clear bonus.
## Each group is a Dictionary: {type: StringName, count: int, spacing: float, lead: float}
##   spacing = seconds between spawns inside the group
##   lead    = seconds to wait before this group begins

@export var groups: Array[Dictionary] = []
@export var hp_mult: float = 1.0
@export var clear_bonus: int = 25

func total_enemies() -> int:
	var n := 0
	for g in groups:
		n += int(g.get("count", 0))
	return n
