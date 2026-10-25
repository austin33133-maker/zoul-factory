class_name CCAI
extends RefCounted
## Practice-AI policies (R-AI-01). The AI only ever calls battle.submit() with legal
## commands — never reads hidden state or mutates the battle directly. Three strategies,
## each acting at a fixed decision interval. Labelled "practice AI", never a real player.

const SUMMON_FIRST := 0
const UPGRADE_FIRST := 1
const MERGE_PRESSURE := 2

var _battle: CCBattle
var _strategy: int
var _interval_steps: int
var _next_decision: int = 0

func _init(battle: CCBattle, strategy: int, decision_interval_sec := 0.5) -> void:
	_battle = battle
	_strategy = strategy
	_interval_steps = maxi(1, CCConfig.secs_to_steps(decision_interval_sec))

## Call once per sim step (after battle.step_once); issues at most one command per tick.
func tick() -> void:
	if _battle.settled:
		return
	if _battle.step < _next_decision:
		return
	_next_decision = _battle.step + _interval_steps
	match _strategy:
		SUMMON_FIRST:   _do_summon_first()
		UPGRADE_FIRST:  _do_upgrade_first()
		MERGE_PRESSURE: _do_merge_pressure()

func _can_summon() -> bool:
	return _battle.energy >= float(CCConfig.summon_cost(_battle.summon_count)) \
		and not _battle._empty_cells().is_empty()

func _do_summon_first() -> void:
	if _can_summon():
		_battle.submit({"t": "summon"})
	else:
		_try_merge_any()

func _do_upgrade_first() -> void:
	# Upgrade the cheapest not-maxed deck type we can afford; else summon; else merge.
	var best_type: StringName = &""
	var best_cost := 1 << 30
	for t in _battle.deck:
		var lvl := int(_battle.type_upgrades.get(t, 0))
		if lvl >= CCConfig.MAX_UPGRADE:
			continue
		var cost := int(CCConfig.UPGRADE_COST[lvl + 1])
		if cost < best_cost and _battle.energy >= float(cost):
			best_cost = cost
			best_type = t
	if best_type != &"":
		_battle.submit({"t": "upgrade", "type": best_type})
	elif _can_summon():
		_battle.submit({"t": "summon"})
	else:
		_try_merge_any()

func _do_merge_pressure() -> void:
	# Keep the board pressured: merge when a legal pair exists, otherwise summon.
	if _try_merge_any():
		return
	if _can_summon():
		_battle.submit({"t": "summon"})

func _try_merge_any() -> bool:
	# Find the first legal same-type/same-tier pair in fixed cell order.
	var board := _battle.board
	for i in CCConfig.CELLS:
		var a: CCUnit = board[i]
		if a == null or a.type == &"flower" or a.tier >= CCConfig.MAX_TIER:
			continue
		for j in range(i + 1, CCConfig.CELLS):
			var b: CCUnit = board[j]
			if b != null and b.type == a.type and b.tier == a.tier:
				_battle.submit({"t": "merge", "from": i, "to": j})
				return true
	return false
