extends Node
## Runtime match state (autoload "GameState"): economy, lives, wave index, status.
## Holds data + signals only; the Level drives transitions.

signal gold_changed(value: int)
signal lives_changed(value: int)
signal wave_changed(current: int, total: int)   # current is 1-based for display
signal status_changed(status: StringName)

enum { PREP, RUNNING, WON, LOST }

var gold: int = 0
var lives: int = 0
var wave_index: int = -1          # 0-based index of the active/last wave; -1 before start
var total_waves: int = 0
var status: int = PREP

func reset() -> void:
	gold = GameData.START_GOLD
	lives = GameData.START_LIVES
	wave_index = -1
	total_waves = GameData.waves.size()
	status = PREP
	gold_changed.emit(gold)
	lives_changed.emit(lives)
	wave_changed.emit(0, total_waves)
	status_changed.emit(&"prep")

func can_afford(cost: int) -> bool:
	return gold >= cost

func spend(cost: int) -> bool:
	if gold < cost:
		return false
	gold -= cost
	gold_changed.emit(gold)
	return true

func earn(amount: int) -> void:
	gold += amount
	gold_changed.emit(gold)

func lose_life(amount: int) -> void:
	lives = max(0, lives - amount)
	lives_changed.emit(lives)
	if lives <= 0 and status == RUNNING:
		set_status(LOST)

func set_status(s: int) -> void:
	status = s
	match s:
		PREP: status_changed.emit(&"prep")
		RUNNING: status_changed.emit(&"running")
		WON: status_changed.emit(&"won")
		LOST: status_changed.emit(&"lost")
