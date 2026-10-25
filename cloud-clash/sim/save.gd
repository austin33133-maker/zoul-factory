class_name CCSave
## Versioned local save (spec §13): settings, deck, and local progress/unlock flags.
## Handles first-launch (no file), missing fields, corrupt JSON, and incompatible versions with
## a safe fallback that never silently discards a user's file (the bad file is backed up).
## In-battle resume is NOT a phase-1 feature — this persists settings + progress only.

const VERSION := 1
const PATH := "user://save.json"

static func default_data() -> Dictionary:
	return {
		"version": VERSION,
		"rules_version": CCConfig.RULES_VERSION,
		"settings": {"sfx": true, "volume": 1.0, "vibration": true, "reduced_motion": false},
		"deck": CCConfig.default_deck().map(func(s): return String(s)),
		"progress": {"unlocked": [1], "completed": []},
	}

## Fill missing fields from defaults (shallow+one level for known maps). Returns a complete dict.
static func _fill(data: Dictionary) -> Dictionary:
	var d := default_data()
	for k in data:
		if k == "settings" or k == "progress":
			if data[k] is Dictionary:
				for sk in data[k]:
					d[k][sk] = data[k][sk]
		else:
			d[k] = data[k]
	d["version"] = VERSION           # normalise after migration/fallback
	# JSON numbers parse as float; level ids are ints — coerce so == / `in` checks are exact.
	d.progress.unlocked = (d.progress.get("unlocked", [1]) as Array).map(func(x): return int(x))
	d.progress.completed = (d.progress.get("completed", []) as Array).map(func(x): return int(x))
	return d

## Load; on any problem return defaults (and back up a corrupt/incompatible file).
## Returns {data, status}: status in {"ok","first_launch","repaired","fallback_corrupt","fallback_version"}.
static func load_game(path := PATH) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {"data": default_data(), "status": "first_launch"}
	var text := FileAccess.get_file_as_string(path)
	var parsed = JSON.parse_string(text)
	if parsed == null or not (parsed is Dictionary):
		_backup(path)
		return {"data": default_data(), "status": "fallback_corrupt"}
	var ver := int(parsed.get("version", -1))
	if ver > VERSION:
		# newer-than-known: don't guess; back up and start fresh (no silent data loss).
		_backup(path)
		return {"data": default_data(), "status": "fallback_version"}
	var filled := _fill(parsed)
	var status := "ok" if parsed.has("version") and ver == VERSION \
		and parsed.has("settings") and parsed.has("progress") else "repaired"
	return {"data": filled, "status": status}

static func save_game(data: Dictionary, path := PATH) -> bool:
	var d := _fill(data)
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(d, "\t"))
	f.close()
	return true

static func mark_completed(data: Dictionary, level_id: int) -> Dictionary:
	var d := _fill(data)
	if not (level_id in d.progress.completed):
		d.progress.completed.append(level_id)
	var nxt := level_id + 1
	if nxt <= 5 and not (nxt in d.progress.unlocked):
		d.progress.unlocked.append(nxt)
	return d

static func _backup(path: String) -> void:
	var text := FileAccess.get_file_as_string(path)
	var bf := FileAccess.open(path + ".corrupt", FileAccess.WRITE)
	if bf != null:
		bf.store_string(text)
		bf.close()
