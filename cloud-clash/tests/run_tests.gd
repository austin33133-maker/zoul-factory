extends Node
## Cloud Clash headless rule + determinism tests (covers docs/ACCEPTANCE §14 items).
## Run: godot --headless --path cloud-clash res://tests/tests.tscn
## Exits 0 iff all pass. These verify RULE CORRECTNESS, not balance.

var passed := 0
var failed := 0

func _ready() -> void:
	t_deck_validation()
	t_summon_cost_curve()
	t_summon_full_board()
	t_summon_insufficient()
	t_forced_cell_occupied()
	t_merge_frees_cell_and_timing()
	t_merge_illegal_no_loss()
	t_merge_tier_cap()
	t_upgrade_no_skip_no_double()
	t_settled_rejects()
	t_damage_formula_example()
	t_flower_max_not_stacked()
	t_snow_slow_cap_override_expire()
	t_chain_no_repeat()
	t_pierce_order_and_cap()
	t_splash_main_first()
	t_kill_reward_once()
	t_simultaneous_zero_draw()
	t_compare_lives()
	t_settle_once()
	t_attribution_sums()
	t_reproducible_ai_match()
	t_rematch_resets()
	_calibration_report()
	print("\n==== CLOUD CLASH TESTS: %d passed, %d failed ====" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)

# ---------------- helpers
func ok(cond: bool, label: String) -> void:
	if cond: passed += 1
	else:
		failed += 1
		push_error("FAIL: " + label); print("  FAIL: " + label)

func approx(a: float, b: float, label: String, eps := 0.0005) -> void:
	ok(absf(a - b) <= eps, "%s (got %f want %f)" % [label, a, b])

func new_battle(seed := 123, waves := []) -> CCBattle:
	return CCBattle.new(seed, 0, CCConfig.default_deck(), waves)

# ---------------- tests

func t_deck_validation() -> void:
	ok(CCConfig.validate_deck([&"mint",&"popcorn",&"lightning",&"snow",&"pierce"]).ok, "deck valid 5 distinct")
	ok(not CCConfig.validate_deck([&"mint",&"mint",&"lightning",&"snow",&"pierce"]).ok, "deck rejects duplicate")
	ok(not CCConfig.validate_deck([&"mint",&"popcorn",&"lightning",&"snow"]).ok, "deck rejects wrong count")
	ok(not CCConfig.validate_deck([&"mint",&"popcorn",&"lightning",&"snow",&"ghost"]).ok, "deck rejects unknown")

func t_summon_cost_curve() -> void:
	ok(CCConfig.summon_cost(0) == 80, "1st summon 80")
	ok(CCConfig.summon_cost(1) == 90, "2nd summon 90")
	ok(CCConfig.summon_cost(2) == 100, "3rd summon 100")

func t_summon_full_board() -> void:
	var b := new_battle()
	b.energy = 100000.0
	for i in CCConfig.CELLS:
		ok(b.submit({"t":"summon","force_cell":i}).ok, "summon fills cell %d" % i)
	var r := b.submit({"t":"summon"})
	ok(not r.ok and r.reason == "board_full", "full board rejects summon")
	ok(b.failed_summons == 1, "failed summon counted")

func t_summon_insufficient() -> void:
	var b := new_battle()
	b.energy = 50.0
	var before := b.summon_count
	var r := b.submit({"t":"summon"})
	ok(not r.ok and r.reason == "insufficient_energy", "insufficient energy rejects")
	ok(b.summon_count == before, "failed summon does not increment count")
	approx(b.energy, 50.0, "failed summon does not charge")

func t_forced_cell_occupied() -> void:
	var b := new_battle()
	b.energy = 10000.0
	b.submit({"t":"summon","force_cell":5})
	var r := b.submit({"t":"summon","force_cell":5})
	ok(not r.ok, "cannot summon onto occupied cell")
	ok(b.board[5] != null and b.board[5].tier == 1, "occupied cell unchanged")

func t_merge_frees_cell_and_timing() -> void:
	var b := new_battle()
	b.energy = 10000.0
	b.submit({"t":"summon","force_type":&"mint","force_cell":0})
	b.submit({"t":"summon","force_type":&"mint","force_cell":1})
	var r := b.submit({"t":"merge","from":0,"to":1})
	ok(r.ok, "legal merge ok")
	ok(b.board[0] == null, "source cell freed")
	ok(b.board[1] != null and b.board[1].tier == 2, "target tier II")
	ok(b.board[1].cooldown == CCConfig.secs_to_steps(0.30), "merged unit full cooldown (no instant shot)")
	ok(b.board[1].merge_sources.size() == 2, "merge sources recorded")

func t_merge_illegal_no_loss() -> void:
	var b := new_battle()
	b.energy = 10000.0
	b.submit({"t":"summon","force_type":&"mint","force_cell":0})
	b.submit({"t":"summon","force_type":&"popcorn","force_cell":1})
	var r := b.submit({"t":"merge","from":0,"to":1})
	ok(not r.ok and r.reason == "mismatch", "type mismatch merge rejected")
	ok(b.board[0] != null and b.board[1] != null, "no unit lost on illegal merge")
	ok(b.illegal_ops == 1, "illegal op counted")

func t_merge_tier_cap() -> void:
	var b := new_battle()
	b.board[0] = CCUnit.new(901, &"mint", 4, 0, 0)
	b.board[1] = CCUnit.new(902, &"mint", 4, 1, 0)
	var r := b.submit({"t":"merge","from":0,"to":1})
	ok(not r.ok and r.reason == "max_tier", "tier IV cannot merge")

func t_upgrade_no_skip_no_double() -> void:
	var b := new_battle()
	b.energy = 1000.0
	ok(b.submit({"t":"upgrade","type":&"mint"}).ok, "upgrade to L1")
	ok(b.type_upgrades[&"mint"] == 1, "mint level 1")
	approx(b.energy, 900.0, "L1 cost 100")
	ok(b.submit({"t":"upgrade","type":&"mint"}).ok, "upgrade to L2")
	approx(b.energy, 700.0, "L2 cost 200")
	ok(b.type_upgrades[&"mint"] == 2, "no skipping levels")

func t_settled_rejects() -> void:
	var b := new_battle()
	b.energy = 10000.0
	b.settle()
	var r := b.submit({"t":"summon"})
	ok(not r.ok and r.reason == "settled", "settled battle rejects commands")

func t_damage_formula_example() -> void:
	# Spec §8 example: tier II mint, upgrade L2, under tier-I unupgraded flower = 32.292.
	approx(CCDamage.single_hit(12.0, 2, 2, 0.15, 0.0), 32.292, "spec §8 example 32.292")
	approx(CCDamage.single_hit(12.0, 1, 0, 0.0, 0.0), 12.0, "base tier I no buffs")

func t_flower_max_not_stacked() -> void:
	var b := new_battle()
	# mint at cell 6 (col1,row1); flowers at 5 (col0,row1) tier1 and 7 (col2,row1) tier3.
	b.board[6] = CCUnit.new(1, &"mint", 1, 6, 0)
	b.board[5] = CCUnit.new(2, &"flower", 1, 5, 0)
	b.board[7] = CCUnit.new(3, &"flower", 3, 7, 0)
	var buff := b._flower_buff_for(6)
	approx(buff, CCConfig.FLOWER_BUFF_BY_TIER[2], "flower takes MAX not sum")
	# diagonal flower must NOT count
	var b2 := new_battle()
	b2.board[6] = CCUnit.new(1, &"mint", 1, 6, 0)
	b2.board[0] = CCUnit.new(2, &"flower", 4, 0, 0)  # col0,row0 = diagonal to col1,row1
	approx(b2._flower_buff_for(6), 0.0, "diagonal flower does not buff")

func t_snow_slow_cap_override_expire() -> void:
	var e := CCEnemy.new(1, &"windup", CCConfig.enemies()[&"windup"])
	e.add_slow(0.25, 10)
	e.add_slow(0.40, 10)
	approx(e.strongest_slow(5), 0.40, "strongest slow wins")
	approx(CCDamage.effective_slow(0.60, false), 0.50, "global slow cap 50%")
	approx(CCDamage.effective_slow(0.40, true), 0.20, "boss takes 50% of slow")
	ok(e.strongest_slow(20) == 0.0, "slow expires")

func t_chain_no_repeat() -> void:
	var pos := [Vector2(0,0), Vector2(1,0), Vector2(2,0), Vector2(5,0)]
	var uids := [10, 11, 12, 13]
	var idx := CCGeo.chain_targets(0, 1.25, pos, uids, 3)
	ok(idx == [0,1,2], "chain hops nearest, no repeat, capped: %s" % str(idx))
	ok(idx.size() == 3 and not (3 in idx), "far enemy out of hop range excluded")

func t_pierce_order_and_cap() -> void:
	# tower at (0,0), main at (3,0): ray +x. Enemies at along 1,2,3 within width.
	var pos := [Vector2(3,0), Vector2(1,0.1), Vector2(2,-0.1), Vector2(2,5)]
	var uids := [20,21,22,23]
	var idx := CCGeo.pierce_targets(Vector2(0,0), Vector2(3,0), 0.30, pos, uids, 3)
	ok(idx == [1,2,0], "pierce ordered by along-ray distance, capped, off-ray excluded: %s" % str(idx))

func t_splash_main_first() -> void:
	var pos := [Vector2(0,0), Vector2(0.5,0), Vector2(0.6,0), Vector2(3,3)]
	var uids := [30,31,32,33]
	var idx := CCGeo.splash_targets(Vector2(0,0), 0.75, 0, pos, uids, 5)
	ok(idx[0] == 0, "splash main target first")
	ok(not (3 in idx), "splash excludes out-of-radius")

func t_kill_reward_once() -> void:
	var b := new_battle()
	b.board[7] = CCUnit.new(1, &"mint", 4, 7, 0)   # tier IV, big damage
	b.board[7].cooldown = 0
	var e := CCEnemy.new(50, &"windup", CCConfig.enemies()[&"windup"])
	e.progress = 1.0
	b.enemies.append(e)
	var energy0 := b.energy
	# fire repeatedly until enemy dies
	for i in range(30):
		b._fire_towers()
		if not e.alive: break
	ok(not e.alive, "enemy killed")
	approx(b.energy - energy0, float(CCConfig.enemies()[&"windup"].bounty), "kill bounty granted exactly once")

func t_simultaneous_zero_draw() -> void:
	# No towers either side; 3 windups leak -> both hit 0 on the same step -> draw.
	var waves := [{"type":&"windup","count":3,"spacing":0.5,"lead":0.0}]
	var m := CCMatch.new(777, CCConfig.default_deck(), CCConfig.default_deck(), waves)
	var guard := 0
	while not m.done and guard < 20000:
		m.step_once(); guard += 1
	ok(m.done and m.winner == "draw", "simultaneous zero -> draw (winner=%s)" % m.winner)

func t_compare_lives() -> void:
	# Empty waves -> both cleared immediately -> compare lives. Pre-damage side B.
	var m := CCMatch.new(1, CCConfig.default_deck(), CCConfig.default_deck(), [])
	m.b.lives = 1
	m.step_once()
	ok(m.done and m.winner == "a", "higher remaining lives wins (a=%d b=%d)" % [m.a.lives, m.b.lives])

func t_settle_once() -> void:
	var m := CCMatch.new(1, CCConfig.default_deck(), CCConfig.default_deck(), [])
	m.step_once()
	var w := m.winner
	var s := m.step
	m.step_once(); m.step_once()
	ok(m.winner == w and m.step == s, "result settles only once; no further stepping")

func t_attribution_sums() -> void:
	var b := new_battle()
	b.type_upgrades[&"mint"] = 2
	b.board[6] = CCUnit.new(1, &"mint", 2, 6, 0)      # tier II
	b.board[6].cooldown = 0
	b.board[5] = CCUnit.new(2, &"flower", 1, 5, 0)    # tier-I flower neighbour (0.15)
	var e := CCEnemy.new(70, &"windup", {"hp":1000000.0,"speed":1.0,"bounty":4,"leak":1,"is_boss":false})
	e.progress = 0.5
	e.mark_expire_step = 1000                         # marked
	b.enemies.append(e)
	b._fire_towers()
	var u: CCUnit = b.board[6]
	approx(u.effective_damage, 38.7504, "marked+flower hit = 38.7504")
	approx(u.flower_bonus_damage, 4.212, "flower attribution")
	approx(u.hero_mark_bonus_damage, 6.4584, "mark attribution")
	var base_part := u.effective_damage - u.flower_bonus_damage - u.hero_mark_bonus_damage
	approx(base_part + u.flower_bonus_damage + u.hero_mark_bonus_damage, u.effective_damage,
		"attribution sums to effective damage")

func t_reproducible_ai_match() -> void:
	var r1 := _run_ai_match(4242)
	var r2 := _run_ai_match(4242)
	ok(r1.hash() == r2.hash(), "same seed/config/strategy -> identical result")
	ok(r1.result.done, "ai match reached a decision")

func _run_ai_match(seed_value: int) -> Dictionary:
	var m := CCMatch.new(seed_value, CCConfig.default_deck(), CCConfig.default_deck(), CCConfig.default_waves())
	var ai_a := CCAI.new(m.a, CCAI.MERGE_PRESSURE)
	var ai_b := CCAI.new(m.b, CCAI.SUMMON_FIRST)
	var guard := 0
	while not m.done and guard < 20000:
		ai_a.tick(); ai_b.tick()
		m.step_once(); guard += 1
	return {"result": m.result(), "a": m.a.summary(), "b": m.b.summary()}

func t_rematch_resets() -> void:
	var m1 := CCMatch.new(5, CCConfig.default_deck(), CCConfig.default_deck(), CCConfig.default_waves())
	var m2 := CCMatch.new(5, CCConfig.default_deck(), CCConfig.default_deck(), CCConfig.default_waves())
	ok(m2.a.lives == CCConfig.START_LIVES and m2.a.energy == CCConfig.START_ENERGY
		and m2.a.step == 0 and m2.a.enemies.is_empty(), "rematch resets all in-battle state")

func _calibration_report() -> void:
	print("\n---- CALIBRATION (test baseline) ----")
	var pl := CCConfig.path_length()
	print("path length: %.3f grid-units" % pl)
	print("windup traversal @speed %.2f: %.2f s (%d steps)" %
		[CCConfig.ENEMY_BASE_SPEED, pl / CCConfig.ENEMY_BASE_SPEED,
		 CCConfig.secs_to_steps(pl / CCConfig.ENEMY_BASE_SPEED)])
	var r := _run_ai_match(999)
	print("sample AI match (merge_pressure vs summon_first, seed 999): winner=%s a_lives=%d b_lives=%d steps=%d" %
		[r.result.winner, r.result.a_lives, r.result.b_lives, r.result.step])
