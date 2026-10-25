class_name CCLevels
## Level configs L1–L5 (spec §23). Each is genuinely distinct (different waves / deck / goal /
## mode) — not the same content renamed. All numbers are test baselines.
## mode: "tutorial" (L1, see CCTutorial) · "pve" (single board) · "versus" (dual, practice AI).

static func all() -> Array:
	return [level(1), level(2), level(3), level(4), level(5)]

static func level(n: int) -> Dictionary:
	match n:
		1: return {
			"id": 1, "name": "初次守卫", "prerequisite": 0, "mode": "tutorial",
			"goal": "召唤·合并·范围·强化·英雄",
			"deck": CCConfig.default_deck(), "win": "tutorial",
		}
		2: return {
			"id": 2, "name": "随机召唤", "prerequisite": 1, "mode": "pve",
			"goal": "随机单位·随机空格·保留能量",
			"deck": [&"mint", &"popcorn", &"lightning", &"snow", &"pierce"],
			"ai": 0,  # CCAI.SUMMON_FIRST
			"waves": [
				{"type": &"windup", "count": 10, "spacing": 0.7, "lead": 0.0},
				{"type": &"windup", "count": 12, "spacing": 0.6, "lead": 12.0},
				{"type": &"roller", "count": 8,  "spacing": 0.5, "lead": 24.0},
			],
			"win": "survive",
		}
		3: return {
			"id": 3, "name": "快怪来了", "prerequisite": 2, "mode": "pve",
			"goal": "雪球减速·漏怪处理",
			"deck": [&"snow", &"mint", &"popcorn", &"pierce", &"lightning"],
			"ai": 2,  # MERGE_PRESSURE
			"waves": [
				{"type": &"roller", "count": 8,  "spacing": 0.6, "lead": 6.0},
				{"type": &"roller", "count": 10, "spacing": 0.5, "lead": 22.0},
				{"type": &"windup", "count": 8,  "spacing": 0.6, "lead": 40.0},
			],
			"win": "survive",
		}
		4: return {
			"id": 4, "name": "火力组合", "prerequisite": 3, "mode": "pve",
			"goal": "连锁·穿透·花朵邻接",
			"deck": [&"lightning", &"pierce", &"flower", &"mint", &"popcorn"],
			"ai": 2,
			"waves": [
				{"type": &"windup", "count": 10, "spacing": 0.35, "lead": 6.0},
				{"type": &"windup", "count": 12, "spacing": 0.35, "lead": 22.0},
				{"type": &"heavy",  "count": 2,  "spacing": 1.2,  "lead": 40.0},
			],
			"win": "survive",
		}
		5: return {
			"id": 5, "name": "首次对决", "prerequisite": 4, "mode": "versus",
			"goal": "双棋盘·练习AI·生命·超时·平局",
			"deck": CCConfig.default_deck(),
			"waves": CCConfig.default_waves(),
			"win": "versus",
		}
		_: return {}
