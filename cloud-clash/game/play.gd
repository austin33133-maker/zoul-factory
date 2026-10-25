extends Node2D
## Interactive greybox for Level 1 (the verified tutorial slice). Renders one CCBattle with
## real widgets + drag-to-merge, driven by the deterministic sim at a fixed step (decoupled
## from frame rate — R-SIM-01). Shapes are placeholder art, clearly greybox.
## NOTE: built headless-smoke-clean; on-screen visuals need a device/desktop check (not faked).

const ORIGIN := Vector2(40, 300)
const SCALE := 96.0
const CELL := 96.0

var tut: CCTutorial
var _acc := 0.0
var _user_paused := false

# drag state
var _drag_from := -1
var _drag_pos := Vector2.ZERO
var _dragging := false

# HUD
var _hud: CanvasLayer
var _energy_lbl: Label
var _lives_lbl: Label
var _hint_lbl: Label
var _action_btn: Button
var _pause_btn: Button
var _toast_lbl: Label
var _result_lbl: Label

const TYPE_COLOR := {
	&"mint": Color("7bd389"), &"popcorn": Color("f2b33d"), &"lightning": Color("b48cff"),
	&"snow": Color("6fc7ef"), &"pierce": Color("4fc2aa"), &"flower": Color("f29bc4"),
}
const ENEMY_COLOR := {
	&"windup": Color("d96a4a"), &"roller": Color("e24b4b"),
	&"heavy": Color("8a5a3b"), &"magnet": Color("7d49b5"),
}

var _auto := false   # --auto: drive the real UI controller headless (smoke/validation, not faked)

func _ready() -> void:
	tut = CCTutorial.new(1)
	_build_hud()
	_auto = "--auto" in OS.get_cmdline_user_args()
	set_process(true)
	set_process_unhandled_input(true)

func _process(delta: float) -> void:
	if not _user_paused:
		_acc += delta
		var guard := 0
		while _acc >= CCConfig.DT and guard < 8:
			tut.tick()
			_acc -= CCConfig.DT
			guard += 1
	else:
		tut.tick()   # still checks step transitions without advancing the battle
	if _auto and not tut.done:
		if tut.awaiting == &"merge":
			tut.player_merge(CCTutorial.MINT1_CELL, CCTutorial.MINT2_CELL)
		elif tut.awaiting != &"none":
			_on_action()
	queue_redraw()
	_update_hud()

# ---------------- coordinate helpers

func grid_to_screen(p: Vector2) -> Vector2:
	return ORIGIN + p * SCALE

func cell_center_screen(cell: int) -> Vector2:
	return grid_to_screen(CCConfig.cell_center(cell))

func cell_at(screen_pos: Vector2) -> int:
	for i in CCConfig.CELLS:
		if screen_pos.distance_to(cell_center_screen(i)) <= CELL * 0.5:
			return i
	return -1

# ---------------- input

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			var c := cell_at(event.position)
			if c != -1 and tut.battle.board[c] != null:
				_drag_from = c
				_dragging = true
				_drag_pos = event.position
		elif _dragging:
			var c := cell_at(event.position)
			if c != -1 and c != _drag_from:
				var r := tut.player_merge(_drag_from, c)
				if not r.ok:
					_toast(_merge_reason(r.get("reason", "")))
			_dragging = false
			_drag_from = -1
	elif event is InputEventMouseMotion and _dragging:
		_drag_pos = event.position

func _merge_reason(r: String) -> String:
	match r:
		"mismatch": return "需同类同阶"
		"max_tier": return "已满阶"
		"not_now": return "现在不能合并"
		_: return "无法合并"

# ---------------- HUD

func _build_hud() -> void:
	_hud = CanvasLayer.new()
	add_child(_hud)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud.add_child(root)

	_energy_lbl = _mk_label("能量 240", 28, Color("6fc7ef"))
	_energy_lbl.position = Vector2(24, 20)
	root.add_child(_energy_lbl)
	_lives_lbl = _mk_label("生命 3", 28, Color("ff6b6b"))
	_lives_lbl.position = Vector2(300, 20)
	root.add_child(_lives_lbl)

	_hint_lbl = _mk_label("", 24, Color("4a3a2a"))
	_hint_lbl.position = Vector2(24, 70)
	_hint_lbl.size = Vector2(672, 60)
	_hint_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(_hint_lbl)

	_toast_lbl = _mk_label("", 24, Color("c0392b"))
	_toast_lbl.position = Vector2(24, 640)
	root.add_child(_toast_lbl)

	_action_btn = Button.new()
	_action_btn.add_theme_font_size_override("font_size", 28)
	_action_btn.focus_mode = Control.FOCUS_NONE
	_action_btn.position = Vector2(200, 1150)
	_action_btn.custom_minimum_size = Vector2(320, 72)
	_action_btn.pressed.connect(_on_action)
	root.add_child(_action_btn)

	_pause_btn = Button.new()
	_pause_btn.text = "II"
	_pause_btn.add_theme_font_size_override("font_size", 24)
	_pause_btn.focus_mode = Control.FOCUS_NONE
	_pause_btn.position = Vector2(620, 20)
	_pause_btn.custom_minimum_size = Vector2(72, 48)
	_pause_btn.pressed.connect(func(): _user_paused = not _user_paused)
	root.add_child(_pause_btn)

	_result_lbl = _mk_label("", 48, Color("2d7a2d"))
	_result_lbl.position = Vector2(200, 560)
	root.add_child(_result_lbl)

func _mk_label(t: String, s: int, c: Color) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_size_override("font_size", s)
	l.add_theme_color_override("font_color", c)
	l.add_theme_color_override("font_outline_color", Color(1, 1, 1, 0.9))
	l.add_theme_constant_override("outline_size", 4)
	return l

func _on_action() -> void:
	match tut.awaiting:
		&"continue": tut.player_continue()
		&"summon": tut.player_summon()
		&"merge": _toast("拖动两座同类同阶塔合并")
		&"upgrade": tut.player_upgrade(&"mint")
		&"hero": tut.player_hero()

func _update_hud() -> void:
	_energy_lbl.text = "能量 %d" % int(tut.battle.energy)
	_lives_lbl.text = "生命 %d" % tut.battle.lives
	_hint_lbl.text = tut.hint()
	var labels := {
		&"continue": "继续", &"summon": "召唤 (%d)" % CCConfig.summon_cost(tut.battle.summon_count),
		&"merge": "拖动合并", &"upgrade": "强化薄荷 (100)", &"hero": "白隼技能", &"none": "…",
	}
	_action_btn.text = labels.get(tut.awaiting, "…")
	_action_btn.disabled = tut.awaiting == &"none"
	if tut.done or tut.won:
		_result_lbl.text = "守卫成功！" if tut.won else ""
	if tut.failed:
		_result_lbl.text = "失败，可重试"
		_result_lbl.add_theme_color_override("font_color", Color("c0392b"))

var _toast_t := 0.0
func _toast(m: String) -> void:
	_toast_lbl.text = m
	_toast_t = 2.0

# ---------------- rendering (greybox)

func _draw() -> void:
	# board background
	draw_rect(Rect2(ORIGIN - Vector2(20, 20), Vector2(5 * SCALE + 40, 3 * SCALE + 40)),
		Color("eaf6ff"), true)
	# path
	var pts := CCConfig.path_points()
	for i in range(pts.size() - 1):
		draw_line(grid_to_screen(pts[i]), grid_to_screen(pts[i + 1]), Color("efe09a"), 36.0)
	draw_circle(grid_to_screen(pts[0]), 16.0, Color("ffcf5c"))
	draw_circle(grid_to_screen(pts[pts.size() - 1]), 16.0, Color("c15b5b"))
	# cells
	for i in CCConfig.CELLS:
		var c := cell_center_screen(i)
		var rect := Rect2(c - Vector2(CELL, CELL) * 0.45, Vector2(CELL, CELL) * 0.9)
		draw_rect(rect, Color("fff3c4"), true)
		draw_rect(rect, Color("4a3a2a"), false, 3.0)
		var u: CCUnit = tut.battle.board[i]
		if u != null:
			_draw_unit(c, u)
	# enemies
	for e in tut.battle.enemies:
		if e.alive:
			_draw_enemy(e)
	# drag line + legal highlight
	if _dragging and _drag_from != -1:
		var from := cell_center_screen(_drag_from)
		draw_line(from, _drag_pos, Color(0.3, 0.3, 0.3, 0.7), 4.0)
		var src: CCUnit = tut.battle.board[_drag_from]
		if src != null:
			for i in CCConfig.CELLS:
				var t: CCUnit = tut.battle.board[i]
				if i != _drag_from and t != null and t.type == src.type \
					and t.tier == src.tier and t.tier < CCConfig.MAX_TIER:
					draw_arc(cell_center_screen(i), CELL * 0.5, 0, TAU, 24, Color("57d957"), 4.0)

func _draw_unit(c: Vector2, u: CCUnit) -> void:
	var col: Color = TYPE_COLOR.get(u.type, Color.WHITE)
	if u.type == &"flower":
		draw_circle(c, CELL * 0.3, col)
	else:
		draw_rect(Rect2(c - Vector2(30, 30), Vector2(60, 60)), col, true)
		draw_rect(Rect2(c - Vector2(30, 30), Vector2(60, 60)), Color("4a3a2a"), false, 3.0)
	for t in u.tier:
		draw_circle(c + Vector2(-20 + t * 13, 34), 5.0, Color("fff2b0"))

func _draw_enemy(e: CCEnemy) -> void:
	var p := grid_to_screen(e.position())
	var col: Color = ENEMY_COLOR.get(e.type, Color.GRAY)
	var r := 18.0 if e.is_boss else 11.0
	draw_circle(p, r, col)
	draw_arc(p, r, 0, TAU, 18, Color("4a3a2a"), 2.0)
	if e.is_marked(tut.battle.step):
		draw_arc(p, r + 4, 0, TAU, 18, Color("f2b33d"), 3.0)
	if e.hp < e.max_hp:
		var w := r * 2.0
		var frac := clampf(e.hp / e.max_hp, 0, 1)
		draw_rect(Rect2(p + Vector2(-r, -r - 8), Vector2(w, 4)), Color(0, 0, 0, 0.6))
		draw_rect(Rect2(p + Vector2(-r, -r - 8), Vector2(w * frac, 4)), Color("57d957"))
