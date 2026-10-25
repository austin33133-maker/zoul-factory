class_name CCTutorial
extends RefCounted
## Level 1 "初次守卫" interactive tutorial as a self-contained state machine (spec §20-24).
## Single-player PvE, no opponent/AI. All tutorial special-casing lives HERE; the battle only
## exposes generic hooks (forced summon, grant_energy, spawn_enemy, hero/boss gates). Drives one
## CCBattle deterministically so acceptance is headless-testable.

enum { T01, T02, T03, T04, T05, T06, T07, T08, DONE }

# Scripted cells: row2col2 = cell 6, row2col3 = cell 7 (cell = row*5 + col).
const MINT1_CELL := 6
const MINT2_CELL := 7
const POPCORN_CELL := 6          # free again after the T04 merge keeps the unit at cell 7
const CROWD_SIZE := 6
const CROWD_RETRY_MAX := 3
const MINI_BOSS_HP := 300.0

var battle: CCBattle
var state: int = T01
var awaiting: StringName = &"continue"
var running: bool = false
var done: bool = false
var won: bool = false
var failed: bool = false
var unlocked_level_2: bool = false
var notes: Array = []

var _crowd_retries: int = 0

func _init(seed_value := 1) -> void:
	battle = CCBattle.new(seed_value, 0, CCConfig.default_deck(), [])
	battle.hero_enabled = false          # unlocked at T07
	battle.boss_skill_enabled = false    # mini-boss has no cell-disable in the tutorial
	_enter(T01)

# ---------------- public step info

func hint() -> String:
	match state:
		T01: return "别让捣蛋机器人进入基地。"
		T02: return "召唤你的第一座防御塔。"
		T03: return "再召唤一座薄荷塔。"
		T04: return "合并同类同阶防御塔，腾出一个位置。"
		T05: return "爆米花炮能同时攻击附近的敌人。"
		T06: return "强化会提升本局所有薄荷塔。"
		T07: return "使用白隼标记，让火力集中爆发。"
		T08: return "守卫成功！已学会：召唤、合并、强化、英雄技能。"
		_: return ""

# ---------------- player actions (valid only for the awaited action of the current step)

func player_continue() -> Dictionary:
	if awaiting != &"continue":
		return _nope()
	match state:
		T01: _enter(T02)
		T08: done = true; return {"ok": true}
	return {"ok": true}

func player_summon() -> Dictionary:
	if awaiting != &"summon":
		return _nope()
	var res: Dictionary
	match state:
		T02:
			res = battle.submit({"t": "summon", "force_type": &"mint", "force_cell": MINT1_CELL})
			if res.ok:
				for i in 3:
					var e := battle.spawn_enemy(&"windup")
					e.progress = 0.0 + i * 0.15
				awaiting = &"none"
		T03:
			res = battle.submit({"t": "summon", "force_type": &"mint", "force_cell": MINT2_CELL})
			if res.ok:
				awaiting = &"none"
		T05:
			res = battle.submit({"t": "summon", "force_type": &"popcorn", "force_cell": POPCORN_CELL})
			if res.ok:
				_spawn_crowd()
				awaiting = &"none"
		_:
			return _nope()
	return res

func player_merge(from: int, to: int) -> Dictionary:
	if awaiting != &"merge" or state != T04:
		return _nope()
	var res := battle.submit({"t": "merge", "from": from, "to": to})
	if res.ok:
		awaiting = &"none"
	return res

func player_upgrade(type: StringName) -> Dictionary:
	if awaiting != &"upgrade" or state != T06:
		return _nope()
	var res := battle.submit({"t": "upgrade", "type": type})
	if res.ok:
		awaiting = &"none"
	return res

func player_hero() -> Dictionary:
	if awaiting != &"hero" or state != T07:
		return _nope()
	var res := battle.submit({"t": "hero"})
	if res.ok:
		awaiting = &"none"
	return res

# ---------------- simulation driver

func tick() -> void:
	if done:
		return
	if running and not battle.settled:
		battle.step_once()
		if battle.lives <= 0:
			failed = true
			done = true
			return
	_check_advance()

# ---------------- internals

func _enter(s: int) -> void:
	state = s
	match s:
		T01: running = false; awaiting = &"continue"
		T02: running = true;  awaiting = &"summon"
		T03: running = true;  awaiting = &"summon"
		T04: running = false; awaiting = &"merge"          # pause, keep board interactive
		T05:
			running = true
			battle.grant_energy(200.0, "t05_supply")       # visible, once
			awaiting = &"summon"
		T06:
			running = false
			var need := float(CCConfig.UPGRADE_COST[1])
			if battle.energy < need:
				battle.grant_energy(need - battle.energy, "t06_topup")
			awaiting = &"upgrade"
		T07:
			running = true
			battle.hero_enabled = true
			var boss := battle.spawn_enemy(&"magnet")
			boss.hp = MINI_BOSS_HP
			boss.max_hp = MINI_BOSS_HP
			awaiting = &"hero"
		T08:
			running = false
			awaiting = &"continue"
			won = battle.lives > 0
			unlocked_level_2 = won
			battle.settle()                         # tutorial battle ends; reject further commands
		DONE:
			done = true

func _check_advance() -> void:
	match state:
		T02:
			if awaiting == &"none" and _kills(&"windup") >= 1:
				_enter(T03)
		T03:
			if awaiting == &"none" and _is_mint1(MINT1_CELL) and _is_mint1(MINT2_CELL):
				_enter(T04)
		T04:
			if awaiting == &"none" and battle.board[MINT1_CELL] == null \
				and battle.board[MINT2_CELL] != null and battle.board[MINT2_CELL].tier == 2:
				_enter(T05)
		T05:
			if awaiting == &"none" and _has_splash_multi():
				_enter(T06)
			elif awaiting == &"none" and battle._alive_enemies().is_empty():
				# crowd cleared without a 2-hit blast: bounded reinforcement, never infinite.
				if _crowd_retries < CROWD_RETRY_MAX:
					_crowd_retries += 1
					_spawn_crowd()
				else:
					notes.append("T05: splash>=2 not achieved after %d retries; continued" % CROWD_RETRY_MAX)
					_enter(T06)
		T06:
			if awaiting == &"none" and int(battle.type_upgrades.get(&"mint", 0)) >= 1:
				_enter(T07)
		T07:
			if awaiting == &"none" and _boss_dead():
				_enter(T08)

func _spawn_crowd() -> void:
	for i in CROWD_SIZE:
		var e := battle.spawn_enemy(&"windup")
		e.progress = 1.0            # clustered so a popcorn blast overlaps them

func _is_mint1(cell: int) -> bool:
	var u: CCUnit = battle.board[cell]
	return u != null and u.type == &"mint" and u.tier == 1

func _kills(etype: StringName) -> int:
	var n := 0
	for ev in battle.log_events:
		if ev.kind == "kill" and ev.data.get("etype", &"") == etype:
			n += 1
	return n

func _has_splash_multi() -> bool:
	for ev in battle.log_events:
		if ev.kind == "splash_multi" and int(ev.data.get("count", 0)) >= 2:
			return true
	return false

func _boss_dead() -> bool:
	# A magnet was spawned at T07; dead when no boss is alive anymore.
	for e in battle.enemies:
		if e.is_boss and e.alive:
			return false
	return true

func _nope() -> Dictionary:
	return {"ok": false, "reason": "not_now"}
