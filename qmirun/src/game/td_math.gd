class_name TDMath
## Pure combat/economy math. No engine state, no nodes — unit-testable in isolation.

## Damage after armor. armor_pen (0..1) ignores part of the enemy's armor.
static func effective_damage(raw: float, armor: float, armor_pen: float) -> float:
	var eff_armor := clampf(armor * (1.0 - clampf(armor_pen, 0.0, 1.0)), 0.0, 0.95)
	return maxf(0.0, raw * (1.0 - eff_armor))

static func dps(damage: float, fire_rate: float) -> float:
	return damage * fire_rate

## Geometric HP growth. wave_index is 0-based.
static func wave_hp_mult(wave_index: int, growth: float) -> float:
	return pow(growth, float(wave_index))

## Pick a target index from parallel arrays, or -1 if none in range.
## positions/progresses/hps are same-length arrays describing live enemies.
static func pick_target(
		positions: Array, progresses: Array, hps: Array,
		tower_pos: Vector2, trange: float, mode: StringName) -> int:
	var best := -1
	var best_score := 0.0
	var r2 := trange * trange
	for i in positions.size():
		var p: Vector2 = positions[i]
		if tower_pos.distance_squared_to(p) > r2:
			continue
		var score: float
		match mode:
			&"first":    score = progresses[i]
			&"last":     score = -progresses[i]
			&"closest":  score = -tower_pos.distance_squared_to(p)
			&"strongest":score = hps[i]
			&"weakest":  score = -hps[i]
			_:           score = progresses[i]
		if best == -1 or score > best_score:
			best = i
			best_score = score
	return best

## Shortest distance from point to segment [a,b]. Used for valid tower-slot placement.
static func point_segment_distance(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var len2 := ab.length_squared()
	if len2 == 0.0:
		return p.distance_to(a)
	var t := clampf((p - a).dot(ab) / len2, 0.0, 1.0)
	return p.distance_to(a + ab * t)
