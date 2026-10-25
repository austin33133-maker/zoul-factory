class_name CCDamage
## Pure damage math (R-BAL-02). Single defined multiplier chain; no hidden mult regions.
##   single_hit = base * merge_mult(tier) * upgrade_mult(level) * (1+flower) * (1+mark)
## Internal precision kept full; UI rounds for display only.

static func merge_mult(tier: int) -> float:
	return float(CCConfig.MERGE_MULT[clampi(tier - 1, 0, CCConfig.MAX_TIER - 1)])

static func upgrade_mult(level: int) -> float:
	return float(CCConfig.UPGRADE_MULT[clampi(level, 0, CCConfig.MAX_UPGRADE)])

static func flower_buff(tier: int, upgrade_level: int) -> float:
	return float(CCConfig.FLOWER_BUFF_BY_TIER[clampi(tier - 1, 0, CCConfig.MAX_TIER - 1)]) \
		+ CCConfig.FLOWER_BUFF_PER_UPGRADE * float(clampi(upgrade_level, 0, CCConfig.MAX_UPGRADE))

static func single_hit(base: float, tier: int, upgrade_level: int,
		flower_buff_frac: float, mark_bonus_frac: float) -> float:
	return base \
		* merge_mult(tier) \
		* upgrade_mult(upgrade_level) \
		* (1.0 + maxf(0.0, flower_buff_frac)) \
		* (1.0 + maxf(0.0, mark_bonus_frac))

## Effective slow applied to an enemy given the strongest active slow source.
static func effective_slow(strongest_active: float, is_boss: bool) -> float:
	var eff := minf(strongest_active, CCConfig.SLOW_GLOBAL_CAP)
	if is_boss:
		eff *= CCConfig.BOSS_SLOW_FACTOR
	return eff
