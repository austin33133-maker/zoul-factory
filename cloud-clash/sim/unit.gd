class_name CCUnit
extends RefCounted
## A tower on the board. Each merge produces a NEW uid (R-MERGE-02); sources are archived.
## Carries its own contribution log (R-LOG-01).

var uid: int
var type: StringName
var tier: int = 1
var cell: int = -1
var cooldown: int = 0          # steps until next attack (full interval after spawn/merge)
var spawn_step: int = 0
var merge_sources: Array[int] = []
var summon_cost: int = 0

# --- contribution log ---
var attack_count: int = 0
var hit_count: int = 0
var effective_damage: float = 0.0
var overkill_damage: float = 0.0
var kills: int = 0
var control_steps: int = 0
var flower_bonus_damage: float = 0.0
var hero_mark_bonus_damage: float = 0.0

func _init(p_uid: int, p_type: StringName, p_tier: int, p_cell: int, p_step: int) -> void:
	uid = p_uid
	type = p_type
	tier = p_tier
	cell = p_cell
	spawn_step = p_step

func to_log() -> Dictionary:
	return {
		"uid": uid, "type": type, "tier": tier,
		"attacks": attack_count, "hits": hit_count,
		"effective_damage": effective_damage, "overkill": overkill_damage,
		"kills": kills, "control_steps": control_steps,
		"flower_bonus": flower_bonus_damage, "mark_bonus": hero_mark_bonus_damage,
		"summon_cost": summon_cost, "merge_sources": merge_sources,
	}
