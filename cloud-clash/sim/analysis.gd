class_name CCAnalysis
## Balance / telemetry tooling (spec §11, §12). Deterministic: same inputs -> same report.
## Bot win-rate is NOT a proof of competitive balance (recorded, not concluded).

## Versus simulation matrix: for each strategy pair, run every seed, tally outcomes.
static func versus_matrix(seeds: Array, pairs: Array, deck_a: Array, deck_b: Array,
		waves: Array) -> Dictionary:
	var rows: Array = []
	for pair in pairs:
		var a_wins := 0
		var b_wins := 0
		var draws := 0
		var steps_sum := 0
		var samples := 0
		for s in seeds:
			var m := CCMatch.new(int(s), deck_a, deck_b, waves)
			var ai_a := CCAI.new(m.a, int(pair[0]))
			var ai_b := CCAI.new(m.b, int(pair[1]))
			var guard := 0
			while not m.done and guard < 20000:
				ai_a.tick(); ai_b.tick(); m.step_once(); guard += 1
			match m.winner:
				"a": a_wins += 1
				"b": b_wins += 1
				_: draws += 1
			steps_sum += m.step
			samples += 1
		rows.append({
			"pair": [int(pair[0]), int(pair[1])],
			"samples": samples, "a_wins": a_wins, "b_wins": b_wins, "draws": draws,
			"avg_steps": float(steps_sum) / float(max(1, samples)),
		})
	return {
		"rules_version": CCConfig.RULES_VERSION,
		"seeds": seeds.duplicate(), "rows": rows,
		"note": "Bot win-rate is not competitive balance; inspect combos/strategies/positions/RNG first.",
	}

## Per-unit contribution leaderboard (active + archived), sorted by effective damage.
static func contribution(battle: CCBattle) -> Array:
	var logs: Array = []
	for u in battle.active_units():
		logs.append(u.to_log())
	logs.append_array(battle.archived_units)
	logs.sort_custom(func(a, b): return a.effective_damage > b.effective_damage)
	return logs

static func format_matrix(report: Dictionary) -> String:
	var out := "versus matrix (rules %s, %d seeds)\n" % [report.rules_version, report.seeds.size()]
	out += "pair(aStrat,bStrat) | a_wins b_wins draws | avg_steps\n"
	for r in report.rows:
		out += ("  %s | a=%d b=%d draw=%d | avg_steps=%.0f\n" % [str(r.pair), r.a_wins, r.b_wins, r.draws, r.avg_steps])
	return out
