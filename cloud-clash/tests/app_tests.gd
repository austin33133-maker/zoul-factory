extends Node
## App navigation + deck-editing + progression acceptance (headless).

var passed := 0
var failed := 0

func _ready() -> void:
	t_deck_edit_and_persist()
	t_unlock_gating()
	t_progression_persists_via_app()
	t_make_runner_types()
	print("\n==== APP TESTS: %d passed, %d failed ====" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)

func ok(c: bool, l: String) -> void:
	if c: passed += 1
	else:
		failed += 1; push_error("FAIL: " + l); print("  FAIL: " + l)

func _fresh(path: String) -> void:
	for p in [path, path + ".corrupt"]:
		if FileAccess.file_exists(p):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(p))

func t_deck_edit_and_persist() -> void:
	var path := "user://app_deck.json"
	_fresh(path)
	var app := CCApp.new(path)
	ok(CCDeck.available().size() == 6, "6 cards available")
	var bad := app.set_deck([&"mint", &"mint", &"snow", &"pierce", &"flower"])
	ok(not bad.ok, "invalid deck (duplicate) rejected")
	var good := app.set_deck([&"mint", &"popcorn", &"flower", &"snow", &"pierce"])
	ok(good.ok, "valid 5-card deck accepted")
	var app2 := CCApp.new(path)   # reload
	ok(app2.deck() == [&"mint", &"popcorn", &"flower", &"snow", &"pierce"], "deck persists across restart")

func t_unlock_gating() -> void:
	var path := "user://app_unlock.json"
	_fresh(path)
	var app := CCApp.new(path)
	ok(app.unlocked() == [1], "fresh app unlocks only level 1")
	ok(app.can_play(1) and not app.can_play(2), "level 2 locked until level 1 cleared")
	ok(not app.select_level(2), "cannot select a locked level")
	ok(app.select_level(1), "can select unlocked level 1")

func t_progression_persists_via_app() -> void:
	var path := "user://app_prog.json"
	_fresh(path)
	var app := CCApp.new(path)
	app.select_level(1)
	app.finish(true, {"won": true})
	ok(app.screen == CCApp.RESULT, "finish goes to result screen")
	ok(2 in app.unlocked(), "winning L1 unlocks L2")
	var app2 := CCApp.new(path)
	ok(2 in app2.unlocked() and 1 in app2.completed(), "progression persists across restart")

func t_make_runner_types() -> void:
	var path := "user://app_runner.json"
	_fresh(path)
	var app := CCApp.new(path)
	# unlock up to level 2 for the test
	app.select_level(1)
	app.finish(true)
	app.select_level(1)
	ok(app.make_runner(1) is CCTutorial, "level 1 runner is the tutorial")
	app.selected_level = 2
	ok(app.make_runner(1) is CCLevel, "level 2 runner is a PvE level")
