export const SKILL_COST_FROM_ZERO: readonly number[] = [
  0, 2, 5, 10, 18, 31, 52, 86, 141, 230, 374, 748, 1266, 2158, 3568, 5870, 9582,
  15596,
] as const

export const MAX_SKILL_LEVEL = SKILL_COST_FROM_ZERO.length - 1

export function skillCost(level: number): number {
  if (level <= 0) return 0
  if (level > MAX_SKILL_LEVEL) return SKILL_COST_FROM_ZERO[MAX_SKILL_LEVEL]
  return SKILL_COST_FROM_ZERO[level]
}

export const BP_PER_3_HP = 2
export const BP_PER_1_EP = 2

// Attributes, magic schools, and magic mediums all follow the skill cost
// ladder, but each level 1 → 2 → … step costs what the equivalent skill
// upgrade would cost starting from this offset. Offset N means "the cost to
// upgrade to level 1 equals the marginal cost of going from skill level N
// to N+1" — e.g. ATTRIBUTE_OFFSET=5 → attr lv1 = skillCost(6) - skillCost(5).
export const ATTRIBUTE_OFFSET = 4
export const MAGIC_SCHOOL_OFFSET = 4
export const MAGIC_MEDIUM_OFFSET = 3

export function hpCost(hp: number): number {
  if (hp <= 0) return 0
  return Math.ceil((hp / 3) * BP_PER_3_HP)
}

export function epCost(ep: number): number {
  if (ep <= 0) return 0
  return ep * BP_PER_1_EP
}

function ladderCost(level: number, offset: number): number {
  if (level === 0) return 0
  const magnitude = skillCost(Math.abs(level) + offset) - skillCost(offset)
  return Math.sign(level) * magnitude
}

export function attributeCost(level: number): number {
  return ladderCost(level, ATTRIBUTE_OFFSET)
}

export function magicSchoolCost(level: number): number {
  return ladderCost(level, MAGIC_SCHOOL_OFFSET)
}

export function magicMediumCost(level: number): number {
  return ladderCost(level, MAGIC_MEDIUM_OFFSET)
}

export const DEFAULT_SPEED = 20
export const SPEED_STEP = 5

// Speed is bought in 5 ft increments off a 20 ft baseline, costed on the same
// curve as spell schools.
export function speedCost(speed: number): number {
  const level = Math.round((speed - DEFAULT_SPEED) / SPEED_STEP)
  return magicSchoolCost(level)
}
