class_name CCGeo
## Pure target-selection geometry (R-TARGET-01, R-CHAIN-01, R-PIERCE-01, R-SPLASH-01).
## All functions take parallel arrays (positions, uids, progresses) and return indices
## into them. Deterministic: ties break by stable uid. No engine state, no physics bodies.

## Primary target = enemy nearest the base (max progress); tie -> smallest uid.
static func primary_target(progresses: Array, uids: Array) -> int:
	var best := -1
	for i in progresses.size():
		if best == -1:
			best = i
		elif progresses[i] > progresses[best] \
			or (progresses[i] == progresses[best] and uids[i] < uids[best]):
			best = i
	return best

## Splash: main target first, then others within radius of the center, nearest-then-uid.
static func splash_targets(center: Vector2, radius: float, main_idx: int,
		positions: Array, uids: Array, max_targets: int) -> Array:
	var out: Array = []
	if main_idx >= 0:
		out.append(main_idx)
	var others: Array = []
	for i in positions.size():
		if i == main_idx:
			continue
		if positions[i].distance_to(center) <= radius:
			others.append(i)
	others.sort_custom(func(a, b):
		var da: float = positions[a].distance_to(center)
		var db: float = positions[b].distance_to(center)
		if da == db:
			return uids[a] < uids[b]
		return da < db)
	for i in others:
		if out.size() >= max_targets:
			break
		out.append(i)
	return out

## Chain: start at main; each hop goes to the nearest not-yet-hit enemy within hop_range
## of the CURRENT enemy. No enemy hit twice. Ordered list, capped at max_targets.
static func chain_targets(main_idx: int, hop_range: float, positions: Array, uids: Array,
		max_targets: int) -> Array:
	var out: Array = []
	if main_idx < 0:
		return out
	out.append(main_idx)
	var cur := main_idx
	while out.size() < max_targets:
		var next := -1
		var next_d := 0.0
		for i in positions.size():
			if i in out:
				continue
			var d: float = positions[cur].distance_to(positions[i])
			if d > hop_range:
				continue
			if next == -1 or d < next_d or (d == next_d and uids[i] < uids[next]):
				next = i
				next_d = d
		if next == -1:
			break
		out.append(next)
		cur = next
	return out

## Pierce: ray from tower through the main target, continuing straight. Candidates lie
## within ray_width/2 perpendicular and in front of the tower; ordered by along-ray
## distance, no repeats, capped at max_targets.
static func pierce_targets(tower_pos: Vector2, main_pos: Vector2, ray_width: float,
		positions: Array, uids: Array, max_targets: int) -> Array:
	var dir := (main_pos - tower_pos)
	if dir.length() == 0.0:
		dir = Vector2.RIGHT
	dir = dir.normalized()
	var half := ray_width * 0.5
	var cand: Array = []
	for i in positions.size():
		var rel: Vector2 = positions[i] - tower_pos
		var along: float = rel.dot(dir)
		if along < 0.0:
			continue
		var perp: float = absf(rel.x * dir.y - rel.y * dir.x)  # |cross| = perpendicular distance
		if perp <= half:
			cand.append({"i": i, "along": along})
	cand.sort_custom(func(a, b):
		if a.along == b.along:
			return uids[a.i] < uids[b.i]
		return a.along < b.along)
	var out: Array = []
	for c in cand:
		if out.size() >= max_targets:
			break
		out.append(c.i)
	return out
