class_name CCMatch
extends RefCounted
## Two independent battles stepped in lockstep (R-MATCH, R-WIN). First phase is a parallel
## survival race: a side with 0 lives loses; both reaching 0 on the SAME step is a draw;
## at timeout the higher remaining lives wins, equal is a draw. Result settles exactly once.

var a: CCBattle
var b: CCBattle
var step: int = 0
var paused: bool = false
var done: bool = false
var winner: String = ""          # "a" / "b" / "draw" / "" while running

var _timeout_steps: int

func _init(seed_value: int, deck_a: Array, deck_b: Array, wave_config: Array) -> void:
	# Stream offsets 0 and 10 keep the two sides' RNG fully independent (R-RNG-02).
	a = CCBattle.new(seed_value, 0, deck_a, wave_config)
	b = CCBattle.new(seed_value, 10, deck_b, wave_config)
	_timeout_steps = CCConfig.secs_to_steps(CCConfig.MATCH_TIMEOUT_SEC)

func set_paused(v: bool) -> void:
	paused = v                    # frozen sim AND AI while paused (R-PAUSE-01)

func step_once() -> void:
	if done or paused:
		return
	# Both sides advance one step BEFORE any win check (R-WIN-01).
	a.step_once()
	b.step_once()
	step += 1
	_check()

func _check() -> void:
	if done:
		return
	var a_dead := a.lives <= 0
	var b_dead := b.lives <= 0
	if a_dead and b_dead:
		_finish("draw")
	elif a_dead:
		_finish("b")
	elif b_dead:
		_finish("a")
	elif a.cleared and b.cleared:
		_finish_by_lives()        # both survived all waves -> compare now (DECISION D-004)
	elif step >= _timeout_steps:
		_finish_by_lives()

func _finish_by_lives() -> void:
	if a.lives > b.lives:
		_finish("a")
	elif b.lives > a.lives:
		_finish("b")
	else:
		_finish("draw")

func _finish(w: String) -> void:
	if done:
		return                    # settle only once (R-WIN-03)
	done = true
	winner = w
	a.settle()
	b.settle()

func result() -> Dictionary:
	return {"done": done, "winner": winner, "step": step,
		"a_lives": a.lives, "b_lives": b.lives}
