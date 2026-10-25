class_name CCDeck
## Deck editing rules (spec: pick 5 of the 6 cards). Pure logic over save data.

static func available() -> Array:
	return CCConfig.ALL_TOWERS.duplicate()     # the 6 cards

static func validate(cards: Array) -> Dictionary:
	return CCConfig.validate_deck(cards)

static func get_deck(save_data: Dictionary) -> Array:
	var out: Array = []
	for s in save_data.get("deck", CCConfig.default_deck()):
		out.append(StringName(s))
	return out

## Set the deck if valid; returns {ok, data|reason}. Does not persist (caller saves).
static func set_deck(save_data: Dictionary, cards: Array) -> Dictionary:
	var v := validate(cards)
	if not v.ok:
		return {"ok": false, "reason": v.reason}
	save_data["deck"] = cards.map(func(c): return String(c))
	return {"ok": true, "data": save_data}
