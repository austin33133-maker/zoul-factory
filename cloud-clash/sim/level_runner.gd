class_name CCLevel
extends RefCounted
## Runs a single-board PvE level (L2–L4) deterministically with a practice AI, to a terminal
## state (cleared / defeated). L1 uses CCTutorial; L5 (versus) uses CCMatch directly.

var cfg: Dictionary
var battle: CCBattle
var ai: CCAI

func _init(level_cfg: Dictionary, seed_value := 1) -> void:
	cfg = level_cfg
	battle = CCBattle.new(seed_value, 0, cfg.deck, cfg.get("waves", []))
	ai = CCAI.new(battle, int(cfg.get("ai", CCAI.MERGE_PRESSURE)))

func terminal() -> bool:
	return battle.cleared or battle.defeated

func run(max_steps := 30000) -> Dictionary:
	var guard := 0
	while not terminal() and guard < max_steps:
		ai.tick()
		battle.step_once()
		guard += 1
	return result()

func _has(kind: String) -> bool:
	for ev in battle.log_events:
		if ev.kind == kind:
			return true
	return false

func result() -> Dictionary:
	return {
		"id": cfg.id, "name": cfg.name,
		"cleared": battle.cleared, "defeated": battle.defeated,
		"lives": battle.lives, "step": battle.step, "summons": battle.summon_count,
		"slow_fired": _has("slow"),
		"chain_multi": _has("chain_multi"),
		"pierce_multi": _has("pierce_multi"),
		"splash_multi": _has("splash_multi"),
	}
