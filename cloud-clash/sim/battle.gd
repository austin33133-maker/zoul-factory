class_name CCBattle
extends RefCounted
## One side's deterministic battle (R-SIM-01). No rendering, no engine time, no physics.
## All state changes go through submit() (commands) or step() (fixed simulation step).
## Intra-step order is fixed (R-SIM-03): income -> boss skill -> spawn -> move/leak ->
## towers fire -> remove dead. Win/lose is decided by CCMatch after both sides step.

const STREAM_SUMMON := 0
const STREAM_WAVE := 1

var step: int = 0
var energy: float = 0.0
var lives: int = 0
var board: Array = []                 # size CELLS, CCUnit or null
var enemies: Array[CCEnemy] = []
var type_upgrades: Dictionary = {}    # StringName -> level 0..4
var summon_count: int = 0
var hero_cd: int = 0
var settled: bool = false
var defeated: bool = false
var cleared: bool = false
var deck: Array[StringName] = []

# logs / counters
var archived_units: Array = []
var energy_income: float = 0.0
var energy_spent: float = 0.0
var illegal_ops: int = 0
var failed_summons: int = 0
var starved_steps_full: int = 0
var starved_steps_space: int = 0
var leaks: int = 0
var log_events: Array = []

var _uid_seq: int = 0
var _summon_rng: CCRng
var _wave_rng: CCRng
var _spawn_queue: Array = []
var _spawn_cursor: int = 0
var _path_len: float = 0.0
var _towers: Dictionary = {}
var _enemies_def: Dictionary = {}
var _disabled_cell: int = -1
var _disable_expire: int = 0
var _boss_next_skill: int = -1
var _master_seed: int = 0
var _stream_offset: int = 0

# Tutorial hooks (kept here as plain flags so tutorial logic stays in CCTutorial, not scattered).
var hero_enabled: bool = true          # gate hero skill until the tutorial unlocks it
var boss_skill_enabled: bool = true    # tutorial mini-boss has no cell-disable
var _grants: Dictionary = {}           # tag -> true (one-time energy grants)

func _init(master_seed: int, stream_offset: int, p_deck: Array, wave_config: Array) -> void:
	_master_seed = master_seed
	_stream_offset = stream_offset
	_summon_rng = CCRng.new(CCRng.stream_seed(master_seed, stream_offset + STREAM_SUMMON))
	_wave_rng = CCRng.new(CCRng.stream_seed(master_seed, stream_offset + STREAM_WAVE))
	board.resize(CCConfig.CELLS)
	for i in CCConfig.CELLS:
		board[i] = null
	energy = CCConfig.START_ENERGY
	lives = CCConfig.START_LIVES
	_towers = CCConfig.towers()
	_enemies_def = CCConfig.enemies()
	_path_len = CCConfig.path_length()
	deck.assign(p_deck)
	for t in deck:
		type_upgrades[t] = 0
	_build_spawn_queue(wave_config)

# ---------------------------------------------------------------- waves

func _build_spawn_queue(wave_config: Array) -> void:
	# wave_config: Array of groups {type, count, spacing, lead}
	for g in wave_config:
		var lead := float(g.get("lead", 0.0))
		var spacing := float(g.get("spacing", 0.6))
		var count := int(g.get("count", 0))
		var type: StringName = g.get("type", &"windup")
		for i in count:
			var at := CCConfig.secs_to_steps(lead + i * spacing)
			_spawn_queue.append({"type": type, "step": at})
			if type == &"magnet" and _boss_next_skill == -1:
				pass
	_spawn_queue.sort_custom(func(a, b): return a.step < b.step)

func total_wave_enemies() -> int:
	return _spawn_queue.size()

# ---------------------------------------------------------------- commands (single entry)

## The ONLY way UI/AI mutate battle state (R-CMD-01). Returns {ok, reason}.
func submit(cmd: Dictionary) -> Dictionary:
	if settled:
		return _reject("settled")
	match cmd.get("t", &""):
		&"summon":  return _cmd_summon(cmd)
		&"merge":   return _cmd_merge(cmd)
		&"upgrade": return _cmd_upgrade(cmd)
		&"hero":    return _cmd_hero(cmd)
		_:          return _reject("unknown_command")

func _reject(reason: String, illegal := true) -> Dictionary:
	if illegal:
		illegal_ops += 1
	return {"ok": false, "reason": reason}

func _empty_cells() -> Array:
	var out: Array = []
	for i in CCConfig.CELLS:
		if board[i] == null:
			out.append(i)
	return out

func _cmd_summon(cmd: Dictionary) -> Dictionary:
	var empties := _empty_cells()
	if empties.is_empty():
		failed_summons += 1
		return _reject("board_full", false)             # R-SUMMON-FULL: not an illegal op
	var cost := CCConfig.summon_cost(summon_count)
	if energy < float(cost):
		failed_summons += 1
		return _reject("insufficient_energy", false)    # R-SUMMON-COST: no charge, no count
	# type then cell (R-RNG order). Tutorial may force both.
	var type: StringName
	if cmd.has("force_type"):
		type = cmd["force_type"]
	else:
		type = deck[_summon_rng.pick_index(deck.size())]
	var cell: int
	if cmd.has("force_cell"):
		cell = int(cmd["force_cell"])
		if cell < 0 or cell >= CCConfig.CELLS or board[cell] != null:
			return _reject("forced_cell_invalid")
	else:
		cell = empties[_summon_rng.pick_index(empties.size())]
	energy -= float(cost)
	energy_spent += float(cost)
	summon_count += 1
	var u := _new_unit(type, 1, cell)
	u.summon_cost = cost
	board[cell] = u
	_log("summon", {"uid": u.uid, "type": type, "cell": cell, "cost": cost})
	return {"ok": true, "reason": "", "uid": u.uid, "cell": cell, "type": type}

func _cmd_merge(cmd: Dictionary) -> Dictionary:
	var from := int(cmd.get("from", -1))
	var to := int(cmd.get("to", -1))
	if from == to or from < 0 or to < 0 or from >= CCConfig.CELLS or to >= CCConfig.CELLS:
		return _reject("bad_cells")
	var a: CCUnit = board[from]
	var b: CCUnit = board[to]
	if a == null or b == null:
		return _reject("empty_cell")
	if a.type != b.type or a.tier != b.tier:
		return _reject("mismatch")
	if a.tier >= CCConfig.MAX_TIER:
		return _reject("max_tier")                       # R-MERGE-CAP
	# Execute: new unit at `to`, tier+1, cooldown reset full (R-MERGE-TIMING).
	var merged := _new_unit(a.type, a.tier + 1, to)
	merged.merge_sources = [a.uid, b.uid]
	_archive(a)
	_archive(b)
	board[to] = merged
	board[from] = null
	_log("merge", {"uid": merged.uid, "type": merged.type, "tier": merged.tier,
		"from": from, "to": to, "sources": merged.merge_sources})
	return {"ok": true, "reason": "", "uid": merged.uid}

func _cmd_upgrade(cmd: Dictionary) -> Dictionary:
	var type: StringName = cmd.get("type", &"")
	if not type_upgrades.has(type):
		return _reject("type_not_in_deck")
	var lvl := int(type_upgrades[type])
	if lvl >= CCConfig.MAX_UPGRADE:
		return _reject("max_upgrade")
	var cost := int(CCConfig.UPGRADE_COST[lvl + 1])      # pay per level, no skipping
	if energy < float(cost):
		return _reject("insufficient_energy", false)
	energy -= float(cost)
	energy_spent += float(cost)
	type_upgrades[type] = lvl + 1
	_log("upgrade", {"type": type, "level": lvl + 1, "cost": cost})
	return {"ok": true, "reason": "", "level": lvl + 1}

func _cmd_hero(_cmd: Dictionary) -> Dictionary:
	if not hero_enabled:
		return _reject("hero_locked", false)      # tutorial: hidden until T07
	if hero_cd > 0:
		return _reject("hero_cooldown", false)
	var alive := _alive_enemies()
	alive.sort_custom(func(x, y):
		if x.progress == y.progress:
			return x.uid < y.uid
		return x.progress > y.progress)
	var n := mini(CCConfig.HERO_MARK_MAX_TARGETS, alive.size())
	var expire := step + CCConfig.secs_to_steps(CCConfig.HERO_MARK_DURATION_SEC)
	var marked: Array = []
	for i in n:
		alive[i].mark_expire_step = expire
		marked.append(alive[i].uid)
	hero_cd = CCConfig.secs_to_steps(CCConfig.HERO_MARK_COOLDOWN_SEC)
	_log("hero_mark", {"targets": marked})
	return {"ok": true, "reason": "", "marked": marked}

# ---------------------------------------------------------------- simulation step

func settle() -> void:
	settled = true

func step_once() -> void:
	if settled:
		return
	step += 1
	# 1. passive income
	var inc := CCConfig.PASSIVE_ENERGY_PER_SEC * CCConfig.DT
	energy += inc
	energy_income += inc
	# 2. boss skill (disable a cell)
	_update_boss_skill()
	# 3. spawn
	while _spawn_cursor < _spawn_queue.size() and _spawn_queue[_spawn_cursor].step <= step:
		_spawn(_spawn_queue[_spawn_cursor].type)
		_spawn_cursor += 1
	# 4. move + leak
	_move_enemies()
	# 5. towers fire
	_fire_towers()
	# 6. remove dead (bounty already granted on kill)
	_cleanup_enemies()
	# 7. hero cooldown
	if hero_cd > 0:
		hero_cd -= 1
	# 8. starvation accounting
	if energy < float(CCConfig.summon_cost(summon_count)):
		if _empty_cells().is_empty():
			starved_steps_full += 1
		else:
			starved_steps_space += 1
	# 9. defeat / clear flags (match decides final result)
	if lives <= 0 and not defeated:
		defeated = true
	if not defeated and _spawn_cursor >= _spawn_queue.size() and enemies.is_empty():
		cleared = true

func _update_boss_skill() -> void:
	# re-enable an expired disable
	if _disabled_cell != -1 and step >= _disable_expire:
		_disabled_cell = -1
	if not boss_skill_enabled:
		return                                      # tutorial mini-boss: no cell-disable
	var boss := _find_boss()
	if boss == null:
		return
	if _boss_next_skill == -1:
		_boss_next_skill = step + CCConfig.secs_to_steps(float(_enemies_def[&"magnet"]["skill_interval"]))
		return
	if step >= _boss_next_skill and _disabled_cell == -1:
		# warn then disable an occupied cell (first occupied in fixed order after warn window).
		var warn := CCConfig.secs_to_steps(float(_enemies_def[&"magnet"]["warn"]))
		var dis := CCConfig.secs_to_steps(float(_enemies_def[&"magnet"]["disable"]))
		for i in CCConfig.CELLS:
			if board[i] != null:
				_disabled_cell = i
				_disable_expire = step + warn + dis
				_boss_next_skill = step + warn + dis + CCConfig.secs_to_steps(
					float(_enemies_def[&"magnet"]["skill_interval"]))
				_log("boss_disable", {"cell": i, "until": _disable_expire})
				break

func _move_enemies() -> void:
	for e in enemies:
		if not e.alive:
			continue
		var slow := CCDamage.effective_slow(e.strongest_slow(step), e.is_boss)
		var spd := e.speed * (1.0 - slow)
		e.progress += spd * CCConfig.DT
		if e.progress >= _path_len:
			e.alive = false
			lives -= e.leak_damage
			leaks += 1
			_log("leak", {"uid": e.uid, "type": e.type, "dmg": e.leak_damage})

func _fire_towers() -> void:
	var alive := _alive_enemies()
	if alive.is_empty():
		# still tick cooldowns down so timing is consistent
		for cell in CCConfig.CELLS:
			var u0: CCUnit = board[cell]
			if u0 != null and u0.cooldown > 0 and not _is_disabled(cell):
				u0.cooldown -= 1
		return
	var positions: Array = []
	var uids: Array = []
	var progresses: Array = []
	for e in alive:
		positions.append(e.position())
		uids.append(e.uid)
		progresses.append(e.progress)
	for cell in CCConfig.CELLS:
		var u: CCUnit = board[cell]
		if u == null or _is_disabled(cell):
			continue
		var tdef: Dictionary = _towers[u.type]
		if tdef.kind == "support":
			continue
		if u.cooldown > 0:
			u.cooldown -= 1
			continue
		var main := CCGeo.primary_target(progresses, uids)
		if main == -1:
			continue
		_fire(u, tdef, cell, alive, positions, uids, main)
		u.attack_count += 1
		u.cooldown = maxi(1, CCConfig.secs_to_steps(float(tdef.interval)))

func _fire(u: CCUnit, tdef: Dictionary, cell: int, alive: Array,
		positions: Array, uids: Array, main: int) -> void:
	var base: float = tdef.damage
	var tier := u.tier
	var lvl := int(type_upgrades.get(u.type, 0))
	var flower := _flower_buff_for(cell)
	match tdef.kind:
		"single":
			_hit_one(u, alive[main], base, tier, lvl, flower, 1.0)
		"snow":
			_hit_one(u, alive[main], base, tier, lvl, flower, 1.0)
			var sf: float = CCConfig.SNOW_SLOW_BY_TIER[clampi(tier - 1, 0, 3)]
			var dur := CCConfig.secs_to_steps(CCConfig.SNOW_SLOW_DURATION_SEC)
			alive[main].add_slow(sf, step + dur)
			u.control_steps += dur
		"splash":
			var center: Vector2 = alive[main].position()
			var idxs := CCGeo.splash_targets(center, float(tdef.splash_radius), main,
				positions, uids, int(tdef.max_targets))
			for i in idxs:
				_hit_one(u, alive[i], base, tier, lvl, flower, 1.0)
			if idxs.size() >= 2:
				_log("splash_multi", {"by": u.uid, "count": idxs.size()})
		"chain":
			var idxs := CCGeo.chain_targets(main, float(tdef.hop_range),
				positions, uids, int(tdef.max_targets))
			for k in idxs.size():
				var f := 1.0 if k == 0 else float(tdef.falloff[k - 1])
				_hit_one(u, alive[idxs[k]], base, tier, lvl, flower, f)
		"pierce":
			var idxs := CCGeo.pierce_targets(CCConfig.cell_center(cell), alive[main].position(),
				float(tdef.ray_width), positions, uids, int(tdef.max_targets))
			for k in idxs.size():
				var f := 1.0 if k == 0 else float(tdef.falloff[k - 1])
				_hit_one(u, alive[idxs[k]], base, tier, lvl, flower, f)

func _hit_one(u: CCUnit, e: CCEnemy, base: float, tier: int, lvl: int,
		flower: float, factor: float) -> void:
	if not e.alive:
		return
	var mark := CCConfig.HERO_MARK_BONUS if e.is_marked(step) else 0.0
	var raw := CCDamage.single_hit(base, tier, lvl, flower, mark) * factor
	var res := e.take_damage(raw)
	var dealt: float = res.dealt
	u.hit_count += 1
	u.effective_damage += dealt
	u.overkill_damage += res.overkill
	# attribution (R-LOG-ATTR): base, then flower, then mark; truncate to dealt.
	if raw > 0.0:
		var base_only := CCDamage.single_hit(base, tier, lvl, 0.0, 0.0) * factor
		var with_flower := CCDamage.single_hit(base, tier, lvl, flower, 0.0) * factor
		var scale: float = dealt / raw
		u.flower_bonus_damage += (with_flower - base_only) * scale
		u.hero_mark_bonus_damage += (raw - with_flower) * scale
	if res.killed:
		u.kills += 1
		energy += float(e.bounty)
		energy_income += float(e.bounty)
		_log("kill", {"by": u.uid, "enemy": e.uid, "etype": e.type, "bounty": e.bounty})

# ---------------------------------------------------------------- helpers

func _is_disabled(cell: int) -> bool:
	return cell == _disabled_cell and step < _disable_expire

func _flower_buff_for(cell: int) -> float:
	# Max flower buff among orthogonal neighbours; not stacked, no self, no recursion (R-FLOWER-01).
	var col := CCConfig.cell_col(cell)
	var row := CCConfig.cell_row(cell)
	var best := 0.0
	for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		var nc: int = col + d.x
		var nr: int = row + d.y
		if nc < 0 or nc >= CCConfig.COLS or nr < 0 or nr >= CCConfig.ROWS:
			continue
		var n: CCUnit = board[CCConfig.cell_index(nc, nr)]
		if n != null and n.type == &"flower":
			var lvl := int(type_upgrades.get(&"flower", 0))
			best = maxf(best, CCDamage.flower_buff(n.tier, lvl))
	return best

func _alive_enemies() -> Array:
	var out: Array = []
	for e in enemies:
		if e.alive:
			out.append(e)
	return out

func _find_boss() -> CCEnemy:
	for e in enemies:
		if e.alive and e.is_boss:
			return e
	return null

func _cleanup_enemies() -> void:
	var kept: Array[CCEnemy] = []
	for e in enemies:
		if e.alive:
			kept.append(e)
	enemies = kept

func _spawn(type: StringName) -> void:
	var e := CCEnemy.new(_next_uid(), type, _enemies_def[type])
	enemies.append(e)

## Scripted spawn (tutorial / tests). Returns the enemy so callers can position it.
func spawn_enemy(type: StringName) -> CCEnemy:
	var e := CCEnemy.new(_next_uid(), type, _enemies_def[type])
	enemies.append(e)
	return e

## One-time, visible, separately-logged energy grant (tutorial, R-TUT-GRANT). Not repeatable per tag.
func grant_energy(amount: float, tag: String) -> bool:
	if _grants.has(tag):
		return false
	_grants[tag] = true
	energy += amount
	energy_income += amount
	_log("tutorial_grant", {"tag": tag, "amount": amount})
	return true

func _new_unit(type: StringName, tier: int, cell: int) -> CCUnit:
	var u := CCUnit.new(_next_uid(), type, tier, cell, step)
	u.cooldown = maxi(1, CCConfig.secs_to_steps(float(_towers[type].interval))) if _towers[type].kind != "support" else 0
	return u

func _archive(u: CCUnit) -> void:
	archived_units.append(u.to_log())

func _next_uid() -> int:
	_uid_seq += 1
	return _uid_seq

func _log(kind: String, data: Dictionary) -> void:
	log_events.append({"step": step, "kind": kind, "data": data})

# ---------------------------------------------------------------- reporting

func active_units() -> Array:
	var out: Array = []
	for c in board:
		if c != null:
			out.append(c)
	return out

func summary() -> Dictionary:
	return {
		"rules_version": CCConfig.RULES_VERSION, "seed": _master_seed,
		"step": step, "lives": lives, "energy": energy,
		"summons": summon_count, "failed_summons": failed_summons,
		"illegal_ops": illegal_ops, "leaks": leaks,
		"cleared": cleared, "defeated": defeated,
		"energy_income": energy_income, "energy_spent": energy_spent,
		"starved_full": starved_steps_full, "starved_space": starved_steps_space,
	}
