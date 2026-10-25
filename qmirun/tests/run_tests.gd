extends Node
## Headless test + balance harness. Run with:
##   godot --headless --path qmirun res://tests/tests.tscn
## Exits 0 if all unit tests pass AND the balance sim is a valid, non-trivial win; else 1.

var passed := 0
var failed := 0

func _ready() -> void:
	_unit_tests()
	var report := _balance_sim()
	_report_balance(report)
	print("\n==== RESULTS: %d passed, %d failed ====" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)

# ---------------------------------------------------------------- asserts

func check(cond: bool, label: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		push_error("FAIL: " + label)
		print("  FAIL: " + label)

func approx(a: float, b: float, label: String, eps := 0.001) -> void:
	check(absf(a - b) <= eps, "%s (got %f, want %f)" % [label, a, b])

# ---------------------------------------------------------------- unit tests

func _unit_tests() -> void:
	# effective_damage / armor
	approx(TDMath.effective_damage(100.0, 0.0, 0.0), 100.0, "no armor")
	approx(TDMath.effective_damage(100.0, 0.5, 0.0), 50.0, "50% armor")
	approx(TDMath.effective_damage(100.0, 0.5, 1.0), 100.0, "armor fully pierced")
	approx(TDMath.effective_damage(100.0, 0.5, 0.5), 75.0, "armor half pierced")
	approx(TDMath.effective_damage(100.0, 0.99, 0.0), 5.0, "armor capped at 95% -> 5% dmg")

	# dps / wave scaling
	approx(TDMath.dps(10.0, 3.0), 30.0, "dps")
	approx(TDMath.wave_hp_mult(0, 1.16), 1.0, "wave0 mult")
	approx(TDMath.wave_hp_mult(2, 1.16), 1.16 * 1.16, "wave2 mult")

	# targeting
	var pos := [Vector2(0, 0), Vector2(10, 0), Vector2(20, 0)]
	var prog := [5.0, 50.0, 15.0]
	var hps := [100.0, 10.0, 40.0]
	check(TDMath.pick_target(pos, prog, hps, Vector2.ZERO, 100.0, &"first") == 1, "first = furthest progress")
	check(TDMath.pick_target(pos, prog, hps, Vector2.ZERO, 100.0, &"last") == 0, "last = least progress")
	check(TDMath.pick_target(pos, prog, hps, Vector2.ZERO, 100.0, &"closest") == 0, "closest")
	check(TDMath.pick_target(pos, prog, hps, Vector2.ZERO, 100.0, &"strongest") == 0, "strongest hp")
	check(TDMath.pick_target(pos, prog, hps, Vector2.ZERO, 100.0, &"weakest") == 1, "weakest hp")
	check(TDMath.pick_target(pos, prog, hps, Vector2.ZERO, 5.0, &"first") == 0, "range filter")
	check(TDMath.pick_target(pos, prog, hps, Vector2(999, 999), 5.0, &"first") == -1, "none in range")

	# point-segment distance
	approx(TDMath.point_segment_distance(Vector2(5, 10), Vector2(0, 0), Vector2(10, 0)), 10.0, "perp dist")
	approx(TDMath.point_segment_distance(Vector2(-5, 0), Vector2(0, 0), Vector2(10, 0)), 5.0, "past endpoint")

	# data integrity
	check(GameData.waves.size() == 12, "12 waves")
	check(GameData.tower_order.size() == 4, "4 tower types")
	for id in GameData.tower_order:
		var t: TowerData = GameData.tower(id)
		check(t.damage.size() == 3 and t.fire_rate.size() == 3 and t.range_px.size() == 3,
			"%s has 3 levels" % id)
	check(GameData.enemy(&"magnet").is_boss, "magnet is boss")
	# boss present on final wave
	var last_has_boss := false
	for g in GameData.waves[11].groups:
		if g.type == &"magnet":
			last_has_boss = true
	check(last_has_boss, "wave 12 has boss")

# ---------------------------------------------------------------- balance sim

const DT := 0.05
var _built := 0
const PLAN: Array[StringName] = [
	&"popcorn", &"frost", &"popcorn", &"rocket", &"pierce", &"popcorn",
	&"rocket", &"pierce", &"frost", &"popcorn", &"rocket", &"pierce",
]

func _balance_sim() -> Dictionary:
	var level := Level.new()
	add_child(level)                      # _ready runs synchronously; builds path+slots
	level.set_process(false)              # we drive tick() manually, deterministically

	var per_wave: Array = []
	var leaked_total := 0
	var prev_lives := GameState.lives

	for w in range(GameData.waves.size()):
		_spend_prep(level)
		var gold_before: int = GameState.gold
		var ok := level.start_next_wave()
		if not ok:
			break
		var steps := 0
		while GameState.status == GameState.RUNNING and steps < 6000:
			level.tick(DT)
			steps += 1
		var leaked_this: int = prev_lives - GameState.lives
		prev_lives = GameState.lives
		leaked_total += maxi(0, leaked_this)
		per_wave.append({
			"wave": w + 1,
			"towers": level._towers.size(),
			"gold_before": gold_before,
			"gold_after": GameState.gold,
			"lives": GameState.lives,
			"leaked": maxi(0, leaked_this),
			"steps": steps,
		})
		if GameState.status == GameState.LOST:
			break

	var won := (GameState.status == GameState.WON)
	return {
		"won": won,
		"lives": GameState.lives,
		"leaked_total": leaked_total,
		"towers": level._towers.size(),
		"per_wave": per_wave,
	}

func _spend_prep(level: Level) -> void:
	var changed := true
	while changed:
		changed = false
		# 1) build the next planned tower on the slot closest to the lane.
		var t_id: StringName = PLAN[min(_built, PLAN.size() - 1)]
		var cost: int = GameData.tower(t_id).build_cost
		var slot := _best_coverage_slot(level)
		if slot >= 0 and GameState.gold >= cost:
			if level.build_tower(slot, t_id) != null:
				_built += 1
				changed = true
				continue
		# 2) else upgrade the cheapest affordable upgradeable tower.
		var tw := _cheapest_upgrade(level)
		if tw != null and GameState.gold >= tw.upgrade_cost():
			level.upgrade_tower(tw)
			changed = true

func _best_coverage_slot(level: Level) -> int:
	var pts := GameData.path_points
	var best := -1
	var best_d := INF
	for i in level.slot_count():
		if level.slot_tower(i) != null:
			continue
		var p := level.slot_pos(i)
		var d := INF
		for j in range(pts.size() - 1):
			d = minf(d, TDMath.point_segment_distance(p, pts[j], pts[j + 1]))
		if d < best_d:
			best_d = d
			best = i
	return best

func _cheapest_upgrade(level: Level) -> Tower:
	var best: Tower = null
	for t in level._towers:
		if t.can_upgrade():
			if best == null or t.upgrade_cost() < best.upgrade_cost():
				best = t
	return best

func _report_balance(r: Dictionary) -> void:
	print("\n---- BALANCE SIM (greedy auto-player) ----")
	print("wave | towers | gold_in -> gold_out | lives | leaked")
	for e in r.per_wave:
		print("  %2d  |   %2d   |  %4d -> %4d       |  %2d   |  %d" %
			[e.wave, e.towers, e.gold_before, e.gold_after, e.lives, e.leaked])
	print("RESULT: %s | lives=%d | leaked_total=%d | towers=%d" %
		["WON" if r.won else "LOST", r.lives, r.leaked_total, r.towers])
	# A valid M1 balance: greedy play clears all 12 waves and survives.
	check(r.won, "balance: greedy player clears all 12 waves")
	check(r.lives > 0, "balance: survives with lives remaining")
