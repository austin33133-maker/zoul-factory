extends Node
## Integration smoke test: drives the real Main + HUD + Level through build / upgrade /
## sell / skill / pause / wave / loss, across real frames. Catches wiring errors the
## pure-logic balance sim bypasses. Run with:
##   godot --headless --path qmirun res://tests/integration.tscn

var passed := 0
var failed := 0

func check(cond: bool, label: String) -> void:
	if cond:
		passed += 1
	else:
		failed += 1
		push_error("FAIL: " + label)
		print("  FAIL: " + label)

func _ready() -> void:
	await _run()
	print("\n==== INTEGRATION: %d passed, %d failed ====" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)

func _run() -> void:
	var MainScript := load("res://src/game/main.gd")
	var main = MainScript.new()
	add_child(main)
	await get_tree().process_frame
	await get_tree().process_frame
	var level: Level = main.level
	var hud: HUD = main.hud
	check(level != null and hud != null, "Main built Level + HUD")
	check(level.slot_count() > 8, "slots computed (%d)" % level.slot_count())

	# Build a tower via the armed-board-tap path.
	var gold0: int = GameState.gold
	main.arm_tower(&"popcorn")
	var slot_pos := level.slot_pos(level.nearest_free_slot(level.slot_pos(0), 9999.0))
	main._on_board_click(slot_pos)
	check(level._towers.size() == 1, "tower built via board tap")
	check(GameState.gold == gold0 - GameData.tower(&"popcorn").build_cost, "gold spent on build")

	# Select + upgrade through the HUD.
	var t: Tower = level._towers[0]
	hud.select_tower(t)
	check(hud._sel_panel.visible, "selected panel visible")
	var g_before_up: int = GameState.gold
	GameState.earn(500)
	hud._on_upgrade_pressed()
	check(t.level_num == 2, "tower upgraded to Lv2")

	# Sell it back.
	var g_before_sell: int = GameState.gold
	hud._on_sell_pressed()
	check(level._towers.is_empty(), "tower sold / removed")
	check(GameState.gold > g_before_sell, "sell refunded gold")

	# Skills: instant (freeze) and aimed (airstrike) must not error with no enemies.
	var freeze: Dictionary = GameData.skills[1]
	hud._on_skill_pressed(freeze)
	check(level.skill_cooldown_left(&"freeze") > 0.0, "freeze went on cooldown")
	var airstrike: Dictionary = GameData.skills[0]
	main.arm_skill(airstrike)
	main._on_board_click(Vector2(360, 600))
	check(level.skill_cooldown_left(&"airstrike") > 0.0, "airstrike fired at point")

	# Pause toggles.
	main.toggle_pause()
	check(get_tree().paused, "paused on")
	main.toggle_pause()
	check(not get_tree().paused, "paused off")

	# Start a wave and let it run a few real frames; enemies should appear.
	GameState.earn(1000)
	main.arm_tower(&"popcorn")
	main._on_board_click(slot_pos)
	check(level.start_next_wave(), "wave started")
	check(GameState.status == GameState.RUNNING, "status RUNNING")
	var saw_enemy := false
	for i in range(40):
		await get_tree().process_frame
		if level._enemies.size() > 0:
			saw_enemy = true
	check(saw_enemy, "enemies spawned during wave")

	# Force a loss; result overlay must appear.
	GameState.lose_life(999)
	await get_tree().process_frame
	check(GameState.status == GameState.LOST, "status LOST after fatal leak")
	check(hud._result_panel.visible, "defeat overlay shown")
