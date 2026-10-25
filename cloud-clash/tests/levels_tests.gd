extends Node
## Levels 2–5 + save-system acceptance (spec §13, §23). Headless, deterministic.

var passed := 0
var failed := 0

func _ready() -> void:
	t_levels_distinct()
	t_level2_runs()
	t_level3_teaches_slow()
	t_level4_teaches_combos()
	t_level5_versus_resolves()
	t_save_first_launch()
	t_save_roundtrip()
	t_save_missing_fields_repaired()
	t_save_corrupt_fallback_backup()
	t_save_incompatible_version()
	t_progression_persists()
	print("\n==== LEVELS/SAVE TESTS: %d passed, %d failed ====" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)

func ok(c: bool, l: String) -> void:
	if c: passed += 1
	else:
		failed += 1; push_error("FAIL: " + l); print("  FAIL: " + l)

# ---- levels

func t_levels_distinct() -> void:
	var lv := CCLevels.all()
	ok(lv.size() == 5, "5 levels defined")
	var names := {}
	var sigs := {}
	for i in lv.size():
		ok(lv[i].id == i + 1, "level %d id" % (i + 1))
		ok(int(lv[i].prerequisite) == i, "level %d prerequisite chains" % (i + 1))
		names[lv[i].name] = true
		sigs[JSON.stringify(lv[i].get("waves", []))] = true
	ok(names.size() == 5, "all level names distinct")
	ok(sigs.size() >= 4, "levels are not the same content renamed (distinct waves)")

func t_level2_runs() -> void:
	var r := CCLevel.new(CCLevels.level(2), 101).run()
	ok(r.cleared or r.defeated, "L2 reaches a terminal state")
	ok(r.summons > 0, "L2 uses random summons")
	print("  L2: cleared=%s lives=%d summons=%d step=%d" % [r.cleared, r.lives, r.summons, r.step])

func t_level3_teaches_slow() -> void:
	var r := CCLevel.new(CCLevels.level(3), 202).run()
	ok(r.cleared or r.defeated, "L3 reaches a terminal state")
	ok(r.slow_fired, "L3 exercises snow slow")
	print("  L3: cleared=%s lives=%d slow=%s step=%d" % [r.cleared, r.lives, r.slow_fired, r.step])

func t_level4_teaches_combos() -> void:
	var r := CCLevel.new(CCLevels.level(4), 303).run()
	ok(r.cleared or r.defeated, "L4 reaches a terminal state")
	ok(r.chain_multi or r.pierce_multi, "L4 exercises chain/pierce multi-hit")
	print("  L4: cleared=%s chain=%s pierce=%s step=%d" % [r.cleared, r.chain_multi, r.pierce_multi, r.step])

func t_level5_versus_resolves() -> void:
	var m := CCMatch.new(404, CCConfig.default_deck(), CCConfig.default_deck(), CCConfig.default_waves())
	var ai_a := CCAI.new(m.a, CCAI.MERGE_PRESSURE)
	var ai_b := CCAI.new(m.b, CCAI.UPGRADE_FIRST)
	var guard := 0
	while not m.done and guard < 20000:
		ai_a.tick(); ai_b.tick(); m.step_once(); guard += 1
	ok(m.done and m.winner in ["a", "b", "draw"], "L5 versus resolves to a valid result (%s)" % m.winner)

# ---- save

func _tmp(name: String) -> String:
	return "user://t_%s.json" % name

func t_save_first_launch() -> void:
	var p := _tmp("first")
	if FileAccess.file_exists(p): DirAccess.remove_absolute(ProjectSettings.globalize_path(p))
	var res := CCSave.load_game(p)
	ok(res.status == "first_launch", "no file -> first_launch default")
	ok(res.data.progress.unlocked == [1], "default unlocks level 1 only")

func t_save_roundtrip() -> void:
	var p := _tmp("round")
	var d := CCSave.default_data()
	d.settings.volume = 0.3
	ok(CCSave.save_game(d, p), "save writes")
	var res := CCSave.load_game(p)
	ok(res.status == "ok", "clean save loads ok")
	ok(abs(float(res.data.settings.volume) - 0.3) < 0.001, "settings round-trip")

func t_save_missing_fields_repaired() -> void:
	var p := _tmp("missing")
	var f := FileAccess.open(p, FileAccess.WRITE)
	f.store_string('{"version":1,"settings":{"volume":0.5}}')   # no progress, partial settings
	f.close()
	var res := CCSave.load_game(p)
	ok(res.status == "repaired", "partial save -> repaired")
	ok(res.data.progress.unlocked == [1], "missing progress filled from default")
	ok(bool(res.data.settings.sfx) == true, "missing setting filled from default")
	ok(abs(float(res.data.settings.volume) - 0.5) < 0.001, "present setting preserved")

func t_save_corrupt_fallback_backup() -> void:
	var p := _tmp("corrupt")
	var f := FileAccess.open(p, FileAccess.WRITE)
	f.store_string("{ this is not json ::::")
	f.close()
	var res := CCSave.load_game(p)
	ok(res.status == "fallback_corrupt", "corrupt -> fallback_corrupt (no crash)")
	ok(FileAccess.file_exists(p + ".corrupt"), "corrupt file backed up, not silently discarded")

func t_save_incompatible_version() -> void:
	var p := _tmp("version")
	var f := FileAccess.open(p, FileAccess.WRITE)
	f.store_string('{"version":999,"settings":{},"progress":{"unlocked":[1,2,3,4,5]}}')
	f.close()
	var res := CCSave.load_game(p)
	ok(res.status == "fallback_version", "newer version -> fallback_version")
	ok(FileAccess.file_exists(p + ".corrupt"), "incompatible file backed up")

func t_progression_persists() -> void:
	var p := _tmp("progress")
	var d := CCSave.default_data()
	d = CCSave.mark_completed(d, 1)
	ok(2 in d.progress.unlocked, "completing L1 unlocks L2")
	CCSave.save_game(d, p)
	var res := CCSave.load_game(p)   # simulate restart
	print("  progress after reload: status=%s progress=%s" % [res.status, str(res.data.progress)])
	ok(2 in res.data.progress.unlocked and 1 in res.data.progress.completed,
		"progression persists across restart")
