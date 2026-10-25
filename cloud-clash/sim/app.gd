class_name CCApp
extends RefCounted
## App navigation + progression logic (headless-testable; a UI scene renders it). Owns the save,
## decides which levels are unlocked, starts the right runner (tutorial vs PvE), and persists
## progress on a win. Rendering lives elsewhere; this is the single source of navigation truth.

enum { HOME, DECK, PLAY, RESULT }

var screen: int = HOME
var save: Dictionary
var selected_level: int = 0
var last_result: Dictionary = {}
var _path: String

func _init(save_path := CCSave.PATH) -> void:
	_path = save_path
	save = CCSave.load_game(save_path).data

func unlocked() -> Array:
	return save.progress.unlocked.duplicate()

func completed() -> Array:
	return save.progress.completed.duplicate()

func can_play(level_id: int) -> bool:
	return level_id in save.progress.unlocked

func goto(s: int) -> void:
	screen = s

func select_level(level_id: int) -> bool:
	if not can_play(level_id):
		return false
	selected_level = level_id
	screen = PLAY
	return true

func deck() -> Array:
	return CCDeck.get_deck(save)

func set_deck(cards: Array) -> Dictionary:
	var r := CCDeck.set_deck(save, cards)
	if r.ok:
		save = r.data
		CCSave.save_game(save, _path)
	return r

## Build the runner for the selected level. L1 -> tutorial; others -> PvE CCLevel.
## (Versus L5 would return a CCMatch; kept out of this helper until its UI exists.)
func make_runner(seed_value := 1):
	var cfg := CCLevels.level(selected_level)
	if cfg.get("mode", "") == "tutorial":
		return CCTutorial.new(seed_value)
	return CCLevel.new(cfg, seed_value)

## Record the outcome of the selected level. On a win, persist unlock of the next level.
func finish(won: bool, result := {}) -> void:
	last_result = result
	if won:
		save = CCSave.mark_completed(save, selected_level)
		CCSave.save_game(save, _path)
	screen = RESULT
