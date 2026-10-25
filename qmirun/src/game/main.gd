extends Node2D
## Match controller: owns the Level and HUD, routes board taps to build/select/skill,
## and handles pause + retry. Processes while paused so the HUD stays interactive.

var level: Level
var hud: HUD

var _armed_tower: StringName = &""
var _armed_skill: Dictionary = {}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	level = Level.new()
	level.name = "Level"
	add_child(level)
	hud = HUD.new()
	hud.name = "HUD"
	hud.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(hud)
	hud.setup(self, level)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		toggle_pause()
		return
	if get_tree().paused:
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_on_board_click(get_global_mouse_position())

func _on_board_click(pos: Vector2) -> void:
	if not _armed_skill.is_empty():
		if level.use_skill(_armed_skill, pos):
			hud.toast("%s!" % _armed_skill.name)
		arm_skill({})
		return
	if _armed_tower != &"":
		var slot := level.nearest_free_slot(pos, 60.0)
		if slot < 0:
			hud.toast("No free slot here")
		elif level.build_tower(slot, _armed_tower) == null:
			hud.toast("Not enough gold")
		arm_tower(&"")
		hud._highlight_build(&"")
		return
	# Nothing armed: select / deselect a tower.
	hud.select_tower(level.tower_at(pos, 28.0))

func arm_tower(id: StringName) -> void:
	_armed_tower = id
	if id != &"":
		_armed_skill = {}

func arm_skill(skill: Dictionary) -> void:
	_armed_skill = skill
	if not skill.is_empty():
		_armed_tower = &""
		hud._highlight_build(&"")

func toggle_pause() -> void:
	if GameState.status == GameState.WON or GameState.status == GameState.LOST:
		return
	var p := not get_tree().paused
	get_tree().paused = p
	hud._pause_overlay.visible = p

func retry() -> void:
	get_tree().paused = false
	get_tree().reload_current_scene()
