class_name CCRng
extends RefCounted
## Deterministic RNG stream (xorshift32). Engine-independent so the same seed always
## yields the same sequence across platforms (R-RNG-01). Each named stream is seeded
## independently so one side's extra actions cannot shift the other's rolls (R-RNG-02).

var _state: int

func _init(seed_value: int) -> void:
	_state = seed_value & 0xFFFFFFFF
	if _state == 0:
		_state = 0x9E3779B9        # xorshift32 must not start at 0

func _next() -> int:
	var x := _state
	x = (x ^ (x << 13)) & 0xFFFFFFFF
	x = (x ^ (x >> 17)) & 0xFFFFFFFF   # state is always >=0, so >> is logical
	x = (x ^ (x << 5)) & 0xFFFFFFFF
	_state = x
	return x

func randf() -> float:
	return float(_next()) / 4294967296.0

## Inclusive integer in [a, b].
func randi_range(a: int, b: int) -> int:
	if b <= a:
		return a
	return a + int(_next() % (b - a + 1))

## Uniform pick of an array index, or -1 if empty.
func pick_index(size: int) -> int:
	if size <= 0:
		return -1
	return int(_next() % size)

## Derive a child stream seed deterministically from this one (not consuming main flow).
static func stream_seed(master_seed: int, stream_id: int) -> int:
	# splitmix-ish mix so nearby ids diverge.
	var z := (master_seed + stream_id * 0x9E3779B1) & 0xFFFFFFFF
	z = ((z ^ (z >> 16)) * 0x85EBCA6B) & 0xFFFFFFFF
	z = ((z ^ (z >> 13)) * 0xC2B2AE35) & 0xFFFFFFFF
	z = (z ^ (z >> 16)) & 0xFFFFFFFF
	return z
