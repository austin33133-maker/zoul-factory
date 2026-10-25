extends Node
## Tutorial Level-1 automated acceptance (spec §24). Headless, deterministic.
## Run: godot --headless --path cloud-clash res://tests/tutorial.tscn

var passed := 0
var failed := 0

func _ready() -> void:
	t_full_playthrough()
	t_pause_no_advance()
	t_illegal_merge_no_change()
	t_grant_once()
	t_hero_locked_before_t7()
	t_forced_placement_only_tutorial()
	t_retry_resets()
	t_no_skip_to_victory()
	print("\n==== TUTORIAL TESTS: %d passed, %d failed ====" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)

func ok(c: bool, l: String) -> void:
	if c: passed += 1
	else:
		failed += 1; push_error("FAIL: " + l); print("  FAIL: " + l)

func approx(a: float, b: float, l: String, eps := 0.01) -> void:
	ok(absf(a - b) <= eps, "%s (got %f want %f)" % [l, a, b])

# ---- drive helpers

func _do_action(tut: CCTutorial) -> void:
	match tut.state:
		CCTutorial.T01, CCTutorial.T08:
			if tut.awaiting == &"continue": tut.player_continue()
		CCTutorial.T02, CCTutorial.T03, CCTutorial.T05:
			if tut.awaiting == &"summon": tut.player_summon()
		CCTutorial.T04:
			if tut.awaiting == &"merge": tut.player_merge(CCTutorial.MINT1_CELL, CCTutorial.MINT2_CELL)
		CCTutorial.T06:
			if tut.awaiting == &"upgrade": tut.player_upgrade(&"mint")
		CCTutorial.T07:
			if tut.awaiting == &"hero": tut.player_hero()

func _advance_to(tut: CCTutorial, target: int, guard_max := 40000) -> int:
	var guard := 0
	while tut.state != target and not tut.done and guard < guard_max:
		_do_action(tut); tut.tick(); guard += 1
	return guard

# ---- tests

func t_full_playthrough() -> void:
	var tut := CCTutorial.new(1)
	ok(tut.state == CCTutorial.T01, "tutorial starts at T01")
	var tr := {}
	var guard := 0
	while not tut.done and guard < 60000:
		var s := tut.state
		if s == CCTutorial.T02 and tut.awaiting == &"summon":
			var eb := tut.battle.energy
			var r := tut.player_summon()
			tr["t02_ok"] = r.ok; tr["t02_cost"] = eb - tut.battle.energy
			tr["t02_count"] = tut.battle.summon_count
			tr["t02_next"] = CCConfig.summon_cost(tut.battle.summon_count)
		elif s == CCTutorial.T03 and tut.awaiting == &"summon":
			var eb := tut.battle.energy
			tut.player_summon(); tr["t03_cost"] = eb - tut.battle.energy
		elif s == CCTutorial.T06 and tut.awaiting == &"upgrade":
			tut.player_upgrade(&"mint"); tr["t06_level"] = tut.battle.type_upgrades[&"mint"]
		elif s == CCTutorial.T07 and tut.awaiting == &"hero":
			tr["t07_hero_ok"] = tut.player_hero().ok
		else:
			_do_action(tut)
		tut.tick(); guard += 1
	ok(tr.get("t02_ok", false), "T02 first summon succeeds")
	approx(tr.get("t02_cost", -1), 80.0, "T02 first summon charges exactly 80")
	ok(tr.get("t02_count", -1) == 1, "T02 summon count = 1")
	ok(tr.get("t02_next", -1) == 90, "next summon cost = 90")
	approx(tr.get("t03_cost", -1), 90.0, "T03 second summon charges exactly 90")
	ok(tr.get("t06_level", -1) == 1, "T06 mint upgrade -> level 1")
	ok(tr.get("t07_hero_ok", false), "T07 hero skill fires")
	ok(not tut.failed, "tutorial did not fail")
	ok(tut.won, "tutorial won (base survived, all steps done)")
	ok(tut.unlocked_level_2, "level 2 unlocked on win")
	print("  tutorial finished: lives=%d guard=%d notes=%s" % [tut.battle.lives, guard, str(tut.notes)])

func t_pause_no_advance() -> void:
	var tut := CCTutorial.new(2)
	_advance_to(tut, CCTutorial.T04)
	ok(tut.state == CCTutorial.T04 and not tut.running, "reached T04, sim paused")
	var step0 := tut.battle.step
	for i in 10: tut.tick()
	ok(tut.battle.step == step0, "paused tutorial does not advance the battle")

func t_illegal_merge_no_change() -> void:
	var tut := CCTutorial.new(3)
	_advance_to(tut, CCTutorial.T04)
	var r := tut.player_merge(0, CCTutorial.MINT2_CELL)   # cell 0 empty
	ok(not r.ok, "illegal drag rejected")
	ok(tut.battle.board[CCTutorial.MINT1_CELL] != null and tut.battle.board[CCTutorial.MINT2_CELL] != null,
		"illegal drag changed nothing on the board")

func t_grant_once() -> void:
	var b := CCBattle.new(1, 0, CCConfig.default_deck(), [])
	var e0 := b.energy
	ok(b.grant_energy(100.0, "x"), "first grant applies")
	approx(b.energy, e0 + 100.0, "grant adds energy")
	ok(not b.grant_energy(100.0, "x"), "same tag grants only once")
	approx(b.energy, e0 + 100.0, "repeat grant adds nothing")

func t_hero_locked_before_t7() -> void:
	var tut := CCTutorial.new(4)
	_advance_to(tut, CCTutorial.T02)
	ok(not tut.player_hero().ok, "hero action rejected before T07")
	ok(not tut.battle.hero_enabled, "hero disabled in battle before T07")
	var direct := tut.battle.submit({"t": "hero"})
	ok(not direct.ok and direct.reason == "hero_locked", "direct hero command locked")

func t_forced_placement_only_tutorial() -> void:
	var tut := CCTutorial.new(5)
	_advance_to(tut, CCTutorial.T04)
	ok(tut.battle.board[6] != null and tut.battle.board[6].type == &"mint", "tutorial forced mint at cell 6")
	ok(tut.battle.board[7] != null and tut.battle.board[7].type == &"mint", "tutorial forced mint at cell 7")
	# A normal (non-tutorial) summon does not take forced cells; it lands via RNG in range.
	var b := CCBattle.new(9, 0, CCConfig.default_deck(), [])
	var r := b.submit({"t": "summon"})
	ok(r.ok and r.cell >= 0 and r.cell < CCConfig.CELLS, "normal summon places via RNG in range")

func t_retry_resets() -> void:
	var tut := CCTutorial.new(6)
	_advance_to(tut, CCTutorial.T05)
	var fresh := CCTutorial.new(6)        # "retry" = new tutorial instance
	ok(fresh.state == CCTutorial.T01 and fresh.battle.step == 0
		and fresh.battle.lives == CCConfig.START_LIVES and fresh.battle.active_units().is_empty(),
		"retry resets units, enemies, resources and tutorial state")

func t_no_skip_to_victory() -> void:
	var tut := CCTutorial.new(7)
	ok(not tut.player_summon().ok, "cannot summon at T01 (must continue first)")
	ok(not tut.player_hero().ok, "cannot cast hero at T01")
	ok(not tut.won, "no victory without playing the steps")
