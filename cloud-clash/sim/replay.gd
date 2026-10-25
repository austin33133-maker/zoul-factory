class_name CCReplay
## Deterministic replay (R-REPLAY-01): capture a run's resolved command stream + per-step state
## hashes, then re-simulate from the commands alone and confirm an identical hash trail. On any
## mismatch, report the first diverging step.

## Capture a PvE run: AI plays, commands are recorded (resolved), each step is hashed.
static func capture(seed_value: int, deck: Array, waves: Array, strategy: int,
		max_steps := 30000) -> Dictionary:
	var b := CCBattle.new(seed_value, 0, deck, waves)
	b.recording = true
	var ai := CCAI.new(b, strategy)
	var trail: Array = []
	var guard := 0
	while not (b.cleared or b.defeated) and guard < max_steps:
		ai.tick()
		b.step_once()
		trail.append(b.state_hash())
		guard += 1
	return {"recorded": b.recorded.duplicate(true), "trail": trail, "summary": b.summary()}

## Replay the recorded commands into a fresh battle (no AI, no RNG needed — summons are forced).
static func replay(seed_value: int, deck: Array, waves: Array, recorded: Array,
		steps: int) -> Dictionary:
	var b := CCBattle.new(seed_value, 0, deck, waves)
	# index commands by issue step for O(1) lookup
	var by_step: Dictionary = {}
	for rc in recorded:
		by_step.get_or_add(int(rc.step), []).append(rc.cmd)
	var trail: Array = []
	for _i in steps:
		if by_step.has(b.step):
			for cmd in by_step[b.step]:
				b.submit(cmd)
		b.step_once()
		trail.append(b.state_hash())
	return {"trail": trail, "summary": b.summary()}

## First differing index between two hash trails, or -1 if identical up to the shorter length.
static func first_divergence(a: Array, b: Array) -> int:
	var n := mini(a.size(), b.size())
	for i in n:
		if a[i] != b[i]:
			return i
	if a.size() != b.size():
		return n
	return -1
