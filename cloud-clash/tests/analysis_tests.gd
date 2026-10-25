extends Node
## Phase C tooling acceptance: replay fidelity, simulation matrix determinism, contribution report.

var passed := 0
var failed := 0

func _ready() -> void:
	t_replay_identical()
	t_replay_detects_divergence()
	t_matrix_deterministic()
	t_matrix_tallies()
	t_contribution_sorted()
	print("\n==== ANALYSIS TESTS: %d passed, %d failed ====" % [passed, failed])
	get_tree().quit(1 if failed > 0 else 0)

func ok(c: bool, l: String) -> void:
	if c: passed += 1
	else:
		failed += 1; push_error("FAIL: " + l); print("  FAIL: " + l)

func t_replay_identical() -> void:
	var deck := CCConfig.default_deck()
	var waves := CCConfig.default_waves()
	var cap := CCReplay.capture(7, deck, waves, CCAI.MERGE_PRESSURE)
	ok(cap.recorded.size() > 0, "capture recorded commands (%d)" % cap.recorded.size())
	var rep := CCReplay.replay(7, deck, waves, cap.recorded, cap.trail.size())
	ok(CCReplay.first_divergence(cap.trail, rep.trail) == -1, "replay reproduces identical state trail")
	ok(cap.summary.lives == rep.summary.lives and cap.summary.step == rep.summary.step,
		"replay summary matches capture")

func t_replay_detects_divergence() -> void:
	var deck := CCConfig.default_deck()
	var waves := CCConfig.default_waves()
	var cap := CCReplay.capture(8, deck, waves, CCAI.SUMMON_FIRST)
	var tampered: Array = cap.recorded.slice(1)   # drop the first command
	var rep := CCReplay.replay(8, deck, waves, tampered, cap.trail.size())
	ok(CCReplay.first_divergence(cap.trail, rep.trail) >= 0, "replay runner flags a divergence when commands change")

func t_matrix_deterministic() -> void:
	var seeds := [1, 2, 3]
	var pairs := [[CCAI.SUMMON_FIRST, CCAI.MERGE_PRESSURE], [CCAI.MERGE_PRESSURE, CCAI.UPGRADE_FIRST]]
	var deck := CCConfig.default_deck()
	var waves := CCConfig.default_waves()
	var r1 := CCAnalysis.versus_matrix(seeds, pairs, deck, deck, waves)
	var r2 := CCAnalysis.versus_matrix(seeds, pairs, deck, deck, waves)
	ok(JSON.stringify(r1) == JSON.stringify(r2), "simulation matrix is deterministic")
	print("\n" + CCAnalysis.format_matrix(r1))

func t_matrix_tallies() -> void:
	var seeds := [10, 11, 12, 13]
	var pairs := [[CCAI.MERGE_PRESSURE, CCAI.MERGE_PRESSURE]]
	var deck := CCConfig.default_deck()
	var r := CCAnalysis.versus_matrix(seeds, pairs, deck, deck, CCConfig.default_waves())
	var row = r.rows[0]
	ok(row.a_wins + row.b_wins + row.draws == seeds.size(), "matrix outcomes sum to sample count")

func t_contribution_sorted() -> void:
	var lvl := CCLevels.level(2)
	var runner := CCLevel.new(lvl, 55)
	runner.run()
	var contrib := CCAnalysis.contribution(runner.battle)
	ok(contrib.size() > 0, "contribution report has entries")
	var sorted := true
	for i in range(contrib.size() - 1):
		if contrib[i].effective_damage < contrib[i + 1].effective_damage:
			sorted = false
	ok(sorted, "contribution sorted by effective damage desc")
	if contrib.size() > 0:
		print("  top contributor: %s tier%d dmg=%.1f kills=%d" %
			[contrib[0].type, contrib[0].tier, contrib[0].effective_damage, contrib[0].kills])
