extends CanvasLayer
class_name HUD
## Greybox HUD built in code: top bar, next-wave preview, start button, build bar,
## skill bar, selected-tower panel, and the win/lose result overlay.

var main: Node
var level: Level

var _lives_lbl: Label
var _gold_lbl: Label
var _wave_lbl: Label
var _preview_lbl: Label
var _toast_lbl: Label
var _start_btn: Button
var _pause_btn: Button
var _build_btns: Dictionary = {}       # tower_id -> Button
var _skill_btns: Array = []            # [{btn, skill}]
var _sel_panel: PanelContainer
var _sel_title: Label
var _sel_upgrade: Button
var _sel_sell: Button
var _result_panel: PanelContainer
var _result_lbl: Label
var _pause_overlay: ColorRect

var _selected: Tower
var _toast_t: float = 0.0

func setup(main_node: Node, level_node: Level) -> void:
	main = main_node
	level = level_node
	_build_ui()
	GameState.lives_changed.connect(func(v): _lives_lbl.text = "HP %d" % v)
	GameState.gold_changed.connect(func(v): _gold_lbl.text = "Gold %d" % v)
	GameState.wave_changed.connect(_on_wave_changed)
	GameState.status_changed.connect(_on_status_changed)
	level.match_ended.connect(_on_match_ended)
	_refresh_all()

func _mk_label(text: String, size: int, col := Color.WHITE) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	l.add_theme_constant_override("outline_size", 4)
	return l

func _mk_button(text: String, size := 22) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", size)
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 54)
	return b

func _build_ui() -> void:
	# --- Top bar ---
	var top := HBoxContainer.new()
	top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	top.offset_top = 12
	top.offset_left = 16
	top.offset_right = -16
	top.add_theme_constant_override("separation", 18)
	add_child_control(top)
	_lives_lbl = _mk_label("HP 20", 30, Color("ff6b6b"))
	_gold_lbl = _mk_label("Gold 260", 30, Color("ffcf5c"))
	_wave_lbl = _mk_label("Wave 0/12", 30)
	top.add_child(_lives_lbl)
	top.add_child(_gold_lbl)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)
	top.add_child(_wave_lbl)
	_pause_btn = _mk_button("II", 24)
	_pause_btn.custom_minimum_size = Vector2(64, 48)
	_pause_btn.pressed.connect(func(): main.toggle_pause())
	top.add_child(_pause_btn)

	# --- Next-wave preview ---
	_preview_lbl = _mk_label("", 20, Color("fff2b0"))
	_preview_lbl.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	_preview_lbl.offset_top = 58
	_preview_lbl.offset_left = 16
	_preview_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child_control(_preview_lbl)

	# --- Toast ---
	_toast_lbl = _mk_label("", 24, Color("ffd1d1"))
	_toast_lbl.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	_toast_lbl.offset_top = 150
	_toast_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child_control(_toast_lbl)

	# --- Start Wave button ---
	_start_btn = _mk_button("START WAVE", 26)
	_start_btn.custom_minimum_size = Vector2(260, 60)
	_start_btn.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	_start_btn.offset_top = -250
	_start_btn.offset_bottom = -190
	_start_btn.offset_left = -130
	_start_btn.offset_right = 130
	_start_btn.pressed.connect(func(): if not level.start_next_wave(): toast("Wave in progress"))
	add_child_control(_start_btn)

	# --- Skill bar ---
	var skills := HBoxContainer.new()
	skills.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	skills.offset_top = -176
	skills.offset_bottom = -116
	skills.offset_left = 16
	skills.offset_right = -16
	skills.add_theme_constant_override("separation", 10)
	add_child_control(skills)
	for s in GameData.skills:
		var b := _mk_button(s.name, 18)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.pressed.connect(_on_skill_pressed.bind(s))
		skills.add_child(b)
		_skill_btns.append({"btn": b, "skill": s})

	# --- Build bar ---
	var build := HBoxContainer.new()
	build.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	build.offset_top = -104
	build.offset_bottom = -20
	build.offset_left = 16
	build.offset_right = -16
	build.add_theme_constant_override("separation", 10)
	add_child_control(build)
	for id in GameData.tower_order:
		var td := GameData.tower(id)
		var b := _mk_button("%s\n%d" % [td.display_name, td.build_cost], 18)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.custom_minimum_size = Vector2(0, 76)
		b.pressed.connect(_on_build_pressed.bind(id))
		build.add_child(b)
		_build_btns[id] = b

	# --- Selected tower panel ---
	_sel_panel = PanelContainer.new()
	_sel_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	_sel_panel.offset_top = 120
	_sel_panel.visible = false
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 8)
	_sel_panel.add_child(vb)
	_sel_title = _mk_label("", 24)
	vb.add_child(_sel_title)
	_sel_upgrade = _mk_button("Upgrade", 20)
	_sel_upgrade.pressed.connect(_on_upgrade_pressed)
	vb.add_child(_sel_upgrade)
	_sel_sell = _mk_button("Sell", 20)
	_sel_sell.pressed.connect(_on_sell_pressed)
	vb.add_child(_sel_sell)
	var close := _mk_button("Close", 18)
	close.pressed.connect(func(): select_tower(null))
	vb.add_child(close)
	add_child_control(_sel_panel)

	# --- Pause overlay ---
	_pause_overlay = ColorRect.new()
	_pause_overlay.color = Color(0, 0, 0, 0.5)
	_pause_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_pause_overlay.visible = false
	var pl := _mk_label("PAUSED", 48)
	pl.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	_pause_overlay.add_child(pl)
	add_child_control(_pause_overlay)

	# --- Result overlay ---
	_result_panel = PanelContainer.new()
	_result_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_result_panel.visible = false
	var rbg := ColorRect.new()
	rbg.color = Color(0, 0, 0, 0.6)
	rbg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_result_panel.add_child(rbg)
	var rv := VBoxContainer.new()
	rv.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	rv.alignment = BoxContainer.ALIGNMENT_CENTER
	rv.add_theme_constant_override("separation", 20)
	_result_lbl = _mk_label("", 52)
	_result_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rv.add_child(_result_lbl)
	var retry := _mk_button("RETRY", 30)
	retry.custom_minimum_size = Vector2(240, 64)
	retry.pressed.connect(func(): main.retry())
	rv.add_child(retry)
	_result_panel.add_child(rv)
	add_child_control(_result_panel)

func add_child_control(c: Control) -> void:
	# CanvasLayer needs a Control host for anchors; use one shared full-rect Control.
	if not has_node("Root"):
		var root := Control.new()
		root.name = "Root"
		root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		root.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(root)
	$Root.add_child(c)

# ---------------------------------------------------------------- callbacks

func _on_build_pressed(id: StringName) -> void:
	select_tower(null)
	main.arm_tower(id)
	_highlight_build(id)

func _on_skill_pressed(skill: Dictionary) -> void:
	if not level.skill_ready(skill.id):
		toast("%s on cooldown" % skill.name)
		return
	if skill.get("aimed", false):
		main.arm_skill(skill)
		toast("Tap a target for %s" % skill.name)
	else:
		if level.use_skill(skill, Vector2.ZERO):
			toast("%s!" % skill.name)

func _on_upgrade_pressed() -> void:
	if _selected and level.upgrade_tower(_selected):
		_refresh_selected()
	else:
		toast("Can't upgrade")

func _on_sell_pressed() -> void:
	if _selected:
		level.sell_tower(_selected)
		select_tower(null)

func _on_wave_changed(cur: int, total: int) -> void:
	_wave_lbl.text = "Wave %d/%d" % [cur, total]
	_update_preview()

func _on_status_changed(s: StringName) -> void:
	_refresh_all()
	# Status is the single source of truth for match end (covers every loss/win path).
	if s == &"won" or s == &"lost":
		_show_result(s == &"won")

func _on_match_ended(won: bool) -> void:
	_show_result(won)

func _show_result(won: bool) -> void:
	_result_lbl.text = "VICTORY!" if won else "DEFEATED"
	_result_lbl.add_theme_color_override("font_color", Color("9cff9c") if won else Color("ff8f8f"))
	_result_panel.visible = true

# ---------------------------------------------------------------- selection / display

func select_tower(t: Tower) -> void:
	if is_instance_valid(_selected):
		_selected.set_show_range(false)
	_selected = t
	if is_instance_valid(t):
		t.set_show_range(true)
		main.arm_tower(&"")
		_highlight_build(&"")
		_refresh_selected()
		_sel_panel.visible = true
	else:
		_sel_panel.visible = false

func _refresh_selected() -> void:
	if not is_instance_valid(_selected):
		_sel_panel.visible = false
		return
	var t := _selected
	_sel_title.text = "%s  Lv%d" % [t.data.display_name, t.level_num]
	if t.can_upgrade():
		_sel_upgrade.text = "Upgrade  %d" % t.upgrade_cost()
		_sel_upgrade.disabled = false
	else:
		_sel_upgrade.text = "Max level"
		_sel_upgrade.disabled = true
	_sel_sell.text = "Sell  +%d" % t.sell_value()

func _highlight_build(active: StringName) -> void:
	for id in _build_btns:
		_build_btns[id].modulate = Color(1, 1, 0.6) if id == active else Color.WHITE

func _update_preview() -> void:
	var next := GameState.wave_index + 1
	if next >= GameData.waves.size():
		_preview_lbl.text = ""
		return
	var w := GameData.waves[next]
	var counts: Dictionary = {}
	for g in w.groups:
		counts[g.type] = counts.get(g.type, 0) + g.count
	var parts: Array = []
	for type in counts:
		parts.append("%dx %s" % [counts[type], GameData.enemy(type).display_name])
	_preview_lbl.text = "Next: " + ", ".join(parts)

func toast(msg: String) -> void:
	_toast_lbl.text = msg
	_toast_t = 2.0

func _refresh_all() -> void:
	_lives_lbl.text = "HP %d" % GameState.lives
	_gold_lbl.text = "Gold %d" % GameState.gold
	_wave_lbl.text = "Wave %d/%d" % [max(0, GameState.wave_index + 1), GameState.total_waves]
	_start_btn.visible = (GameState.status == GameState.PREP)
	_update_preview()

func _process(delta: float) -> void:
	if _toast_t > 0.0:
		_toast_t -= delta
		if _toast_t <= 0.0:
			_toast_lbl.text = ""
	for entry in _skill_btns:
		var cd: float = level.skill_cooldown_left(entry.skill.id)
		if cd > 0.0:
			entry.btn.text = "%s\n%.0fs" % [entry.skill.name, ceil(cd)]
			entry.btn.disabled = true
		else:
			entry.btn.text = entry.skill.name
			entry.btn.disabled = false
	if is_instance_valid(_selected):
		_sel_sell.text = "Sell  +%d" % _selected.sell_value()
