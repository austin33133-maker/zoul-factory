extends Resource
class_name EnemyData
## Static definition of one enemy archetype. Instances live in GameData's registry.

@export var id: StringName = &""
@export var display_name: String = ""
@export var base_hp: float = 20.0
@export var speed: float = 60.0            # pixels/sec along the path
@export var armor: float = 0.0             # 0..0.95 fractional damage reduction
@export var bounty: int = 5                # gold granted on kill
@export var leak_damage: int = 1           # lives lost when it reaches the goal
@export var radius: float = 12.0           # greybox draw radius
@export var color: Color = Color.WHITE
@export var heal_per_sec: float = 0.0      # Repair archetype: heals nearby allies
@export var heal_radius: float = 90.0
@export var is_boss: bool = false
