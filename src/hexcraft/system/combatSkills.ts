import type { AttributeName } from './attributes'
import type { WeaponCategory } from './inventory'

export type CombatSkillCategory = 'passive' | 'action' | 'reaction'

export interface CombatSkillDef {
  id: string
  name: string
  effect: string
  category: CombatSkillCategory
  requiresWeapon?: WeaponCategory
  attribute?: AttributeName
}

export const COMBAT_SKILLS: readonly CombatSkillDef[] = [
  {
    id: 'combat-dodge',
    name: 'Dodge',
    effect: 'evasion +1 · save vs. agility-based effects',
    category: 'passive',
  },
  {
    id: 'combat-grit',
    name: 'Grit',
    effect: 'save vs. physical effects',
    category: 'passive',
  },
  {
    id: 'combat-resolve',
    name: 'Resolve',
    effect: 'save vs. mental effects',
    category: 'passive',
  },
  {
    id: 'combat-parry',
    name: 'Parry',
    effect: '-1 attack (reaction)',
    category: 'reaction',
  },
  {
    id: 'combat-melee-1h',
    name: '1-handed melee',
    effect: 'Attack (action) +1',
    category: 'action',
    requiresWeapon: 'melee-1h',
    attribute: 'Agility',
  },
  {
    id: 'combat-fired-1h',
    name: '1-handed fired',
    effect: 'Attack (action) +1',
    category: 'action',
    requiresWeapon: 'fired-1h',
    attribute: 'Agility',
  },
  {
    id: 'combat-melee-2h',
    name: '2-handed melee',
    effect: 'Attack (action) +1',
    category: 'action',
    requiresWeapon: 'melee-2h',
    attribute: 'Power',
  },
  {
    id: 'combat-fired-2h',
    name: '2-handed fired',
    effect: 'Attack (action) +1',
    category: 'action',
    requiresWeapon: 'fired-2h',
    attribute: 'Power',
  },
  {
    id: 'combat-unarmed',
    name: 'Unarmed',
    effect: 'Attack (action) +1',
    category: 'action',
    attribute: 'Agility',
  },
  {
    id: 'combat-grapple',
    name: 'Grapple',
    effect: 'Attack (action) +1',
    category: 'action',
    attribute: 'Agility',
  },
  {
    id: 'combat-tackle',
    name: 'Tackle',
    effect: 'Attack (action) +1',
    category: 'action',
    attribute: 'Power',
  },
] as const

export const COMBAT_SKILL_IDS = new Set(COMBAT_SKILLS.map((s) => s.id))

export function isCombatSkillId(id: string): boolean {
  return COMBAT_SKILL_IDS.has(id)
}
