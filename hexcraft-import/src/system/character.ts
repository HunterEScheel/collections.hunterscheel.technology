import { ATTRIBUTES, type AttributeName } from './attributes'
import { COMBAT_SKILLS, isCombatSkillId } from './combatSkills'
import { flawRefundTotal, type Flaw } from './flaws'
import {
  ARMOR_CLASS_STATS,
  armorEvasionReduction,
  armorReductionDie,
  armorThreshold,
  normalizeArmor,
  type ArmorClass,
  type ArmorReductionDie,
  type ArmorStats,
  type DamageType,
  type InventoryItem,
} from './inventory'
import {
  MAGIC_MEDIUMS,
  MAGIC_SCHOOLS,
  type MagicMedium,
  type MagicSchool,
} from './magicSchools'
import {
  attributeCost,
  DEFAULT_SPEED,
  epCost,
  hpCost,
  magicMediumCost,
  magicSchoolCost,
  skillCost,
  speedCost,
} from './costs'
import {
  tetherObligationWeight,
  tetherRefundTotal,
  type Tether,
} from './tethers'
import type { SavedSpell } from './spells'

export interface CharacterSkill {
  id: string
  name: string
  level: number
}

export const BODY_PARTS = ['head', 'torso', 'arms', 'legs'] as const
export type BodyPart = (typeof BODY_PARTS)[number]
export const BODY_PART_LABELS: Record<BodyPart, string> = {
  head: 'Head',
  torso: 'Torso',
  arms: 'Arms',
  legs: 'Legs',
}

// Merge legacy per-limb keys (leftArm/rightArm/leftLeg/rightLeg) into the
// combined arms/legs regions.
function migrateBodyDescriptions(
  raw: Record<string, string> | undefined,
): Partial<Record<BodyPart, string>> {
  if (!raw) return {}
  const result: Partial<Record<BodyPart, string>> = {}
  for (const part of BODY_PARTS) {
    if (raw[part]) result[part] = raw[part]
  }
  const merged: [BodyPart, string[]][] = [
    ['arms', [raw.leftArm, raw.rightArm].filter((s): s is string => !!s)],
    ['legs', [raw.leftLeg, raw.rightLeg].filter((s): s is string => !!s)],
  ]
  for (const [part, legacy] of merged) {
    if (legacy.length) {
      result[part] = [result[part], ...legacy].filter(Boolean).join('\n')
    }
  }
  return result
}

export interface Character {
  name: string
  tierName: string
  bpBudget: number
  bonusBp: number
  hp: number
  ep: number
  speed: number
  currentHp: number
  currentEp: number
  attributes: Record<AttributeName, number>
  magicSchools: Record<MagicSchool, number>
  magicMediums: Record<MagicMedium, number>
  skills: CharacterSkill[]
  tethers: Tether[]
  flaws: Flaw[]
  obligationThreshold: number
  gold: number
  inventory: InventoryItem[]
  armorModifier: number
  savedSpells: SavedSpell[]
  deathSaves: DeathSaves
  tempHp: number
  bodyDescriptions: Partial<Record<BodyPart, string>>
}

export interface DeathSaves {
  successes: number
  failures: number
}

const EMPTY_DEATH_SAVES: DeathSaves = { successes: 0, failures: 0 }

export interface BPBreakdown {
  hp: number
  ep: number
  speed: number
  attributes: number
  magicSchools: number
  magicMediums: number
  skills: number
  total: number
  tetherRefund: number
  flawRefund: number
  obligationWeight: number
  effectiveBudget: number
}

function seededCombatSkills(): CharacterSkill[] {
  return COMBAT_SKILLS.map((c) => ({ id: c.id, name: c.name, level: 0 }))
}

export function emptyCharacter(tierName: string, bpBudget: number): Character {
  return {
    name: '',
    tierName,
    bpBudget,
    bonusBp: 0,
    hp: 0,
    ep: 0,
    speed: DEFAULT_SPEED,
    currentHp: 0,
    currentEp: 0,
    attributes: Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Record<
      AttributeName,
      number
    >,
    magicSchools: Object.fromEntries(MAGIC_SCHOOLS.map((s) => [s, 0])) as Record<
      MagicSchool,
      number
    >,
    magicMediums: Object.fromEntries(MAGIC_MEDIUMS.map((m) => [m, 0])) as Record<
      MagicMedium,
      number
    >,
    skills: seededCombatSkills(),
    tethers: [],
    flaws: [],
    obligationThreshold: 0,
    gold: 0,
    inventory: [],
    armorModifier: 0,
    savedSpells: [],
    deathSaves: { ...EMPTY_DEATH_SAVES },
    tempHp: 0,
    bodyDescriptions: {},
  }
}

export function bpBreakdown(c: Character): BPBreakdown {
  const skills = c.skills.reduce((sum, s) => sum + skillCost(s.level), 0)
  const hp = hpCost(c.hp)
  const ep = epCost(c.ep)
  const speed = speedCost(c.speed ?? DEFAULT_SPEED)
  const attributes = Object.values(c.attributes).reduce(
    (sum, v) => sum + attributeCost(v),
    0,
  )
  const magicSchools = Object.values(c.magicSchools).reduce(
    (sum, v) => sum + magicSchoolCost(v),
    0,
  )
  const magicMediums = Object.values(c.magicMediums).reduce(
    (sum, v) => sum + magicMediumCost(v),
    0,
  )
  const tetherRefund = tetherRefundTotal(c.tethers ?? [])
  const flawRefund = flawRefundTotal(c.flaws ?? [])
  const obligationWeight = tetherObligationWeight(c.tethers ?? [])
  const effectiveBudget =
    c.bpBudget + (c.bonusBp ?? 0) + tetherRefund + flawRefund
  return {
    hp,
    ep,
    speed,
    attributes,
    magicSchools,
    magicMediums,
    skills,
    total:
      hp + ep + speed + attributes + magicSchools + magicMediums + skills,
    tetherRefund,
    flawRefund,
    obligationWeight,
    effectiveBudget,
  }
}

export function restoreToMax(c: Character): Character {
  return normalizeCurrentValues({
    ...c,
    currentHp: c.hp,
    currentEp: c.ep,
    tempHp: 0,
  })
}

export function normalizeCurrentValues(c: Character): Character {
  const currentHp = Math.max(0, Math.min(c.currentHp, c.hp))
  const existing = c.deathSaves ?? EMPTY_DEATH_SAVES
  // Clear death saves whenever the caller intends the character to be conscious
  // (input currentHp > 0), regardless of clamping against max HP.
  const alive = c.currentHp > 0
  return {
    ...c,
    currentHp,
    currentEp: Math.max(0, Math.min(c.currentEp, c.ep)),
    // tempHp has no upper bound — it's the mechanism for going above max HP.
    tempHp: Math.max(0, Math.floor(c.tempHp ?? 0)),
    deathSaves: alive ? { ...EMPTY_DEATH_SAVES } : existing,
  }
}

const clampSave = (n: number) => Math.max(0, Math.min(3, n))

export function setDeathSaves(
  c: Character,
  next: Partial<DeathSaves>,
): Character {
  const current = c.deathSaves ?? EMPTY_DEATH_SAVES
  return {
    ...c,
    deathSaves: {
      successes: clampSave(next.successes ?? current.successes),
      failures: clampSave(next.failures ?? current.failures),
    },
  }
}

export function expendEpToRevive(c: Character): Character {
  if (c.currentEp <= 0) return c
  return normalizeCurrentValues({
    ...c,
    currentHp: 1,
    currentEp: 0,
    tempHp: 0,
    deathSaves: { ...EMPTY_DEATH_SAVES },
  })
}

// Migration map for school renames/removals. Dominate folds into Control
// (cognition-based domination is now expressed as Control + Cognition).
const LEGACY_SCHOOL_MIGRATION: Record<string, MagicSchool> = {
  Dominate: 'Control',
}

// Migration map for the medium rename/consolidation.
const LEGACY_MEDIUM_MIGRATION: Record<string, MagicMedium> = {
  Temperature: 'Elemental',
  Earth: 'Elemental',
  Luminance: 'Elemental',
  Weather: 'Elemental',
  Resonance: 'Magic',
  Poison: 'Toxicity',
  Acid: 'Toxicity',
  Body: 'Material',
  Object: 'Material',
}

// Legacy attribute renames: Lore/Wit → Intelligence, Awareness/Intuition → Sense.
const LEGACY_ATTRIBUTE_RENAMES: Record<string, AttributeName> = {
  Lore: 'Intelligence',
  Wit: 'Intelligence',
  Awareness: 'Sense',
  Intuition: 'Sense',
}

function migrateAttributes(
  raw: Partial<Record<string, number>> | undefined,
): Record<AttributeName, number> {
  const result = Object.fromEntries(
    ATTRIBUTES.map((a) => [a, 0]),
  ) as Record<AttributeName, number>
  if (!raw) return result
  const VALID = new Set<string>(ATTRIBUTES)
  for (const [key, levelRaw] of Object.entries(raw)) {
    const level = levelRaw ?? 0
    if (VALID.has(key)) {
      result[key as AttributeName] = level
      continue
    }
    const renamed = LEGACY_ATTRIBUTE_RENAMES[key]
    if (renamed) {
      result[renamed] = level
    }
  }
  return result
}

function migrateMediums(
  raw: Partial<Record<string, number>> | undefined,
): Record<MagicMedium, number> {
  const result = Object.fromEntries(
    MAGIC_MEDIUMS.map((m) => [m, 0]),
  ) as Record<MagicMedium, number>
  if (!raw) return result
  const VALID = new Set<string>(MAGIC_MEDIUMS)
  for (const [key, levelRaw] of Object.entries(raw)) {
    const level = levelRaw ?? 0
    if (level === 0) continue
    if (VALID.has(key)) {
      const k = key as MagicMedium
      result[k] = Math.max(result[k], level)
      continue
    }
    const mapped = LEGACY_MEDIUM_MIGRATION[key]
    if (mapped) {
      result[mapped] = Math.max(result[mapped], level)
    }
  }
  return result
}

function migrateSchools(
  raw: Partial<Record<string, number>> | undefined,
): Record<MagicSchool, number> {
  const result = Object.fromEntries(
    MAGIC_SCHOOLS.map((s) => [s, 0]),
  ) as Record<MagicSchool, number>
  if (!raw) return result
  const VALID = new Set<string>(MAGIC_SCHOOLS)
  for (const [key, levelRaw] of Object.entries(raw)) {
    const level = levelRaw ?? 0
    if (level === 0) continue
    if (VALID.has(key)) {
      const k = key as MagicSchool
      result[k] = Math.max(result[k], level)
      continue
    }
    const mapped = LEGACY_SCHOOL_MIGRATION[key]
    if (mapped) {
      result[mapped] = Math.max(result[mapped], level)
    }
  }
  return result
}

export function ensureCombatSkills(c: Character): Character {
  const existing = new Map(c.skills.map((s) => [s.id, s]))
  const combatRows: CharacterSkill[] = COMBAT_SKILLS.map((def) => {
    const found = existing.get(def.id)
    return found
      ? { ...found, name: def.name }
      : { id: def.id, name: def.name, level: 0 }
  })
  const custom = c.skills.filter((s) => !isCombatSkillId(s.id))
  return {
    ...c,
    bonusBp: c.bonusBp ?? 0,
    speed: c.speed ?? DEFAULT_SPEED,
    tethers: c.tethers ?? [],
    flaws: c.flaws ?? [],
    obligationThreshold: c.obligationThreshold ?? 0,
    gold: c.gold ?? 0,
    inventory: (c.inventory ?? []).map(migrateInventoryItem),
    armorModifier: c.armorModifier ?? 0,
    savedSpells: (c.savedSpells ?? []).map((s) => ({
      ...s,
      school: MAGIC_SCHOOLS.includes(s.school as MagicSchool)
        ? s.school
        : (LEGACY_SCHOOL_MIGRATION[s.school] ?? s.school),
      medium:
        MAGIC_MEDIUMS.includes(s.medium as MagicMedium)
          ? s.medium
          : (LEGACY_MEDIUM_MIGRATION[s.medium] ?? s.medium),
    })),
    deathSaves: c.deathSaves ?? { ...EMPTY_DEATH_SAVES },
    tempHp: c.tempHp ?? 0,
    bodyDescriptions: migrateBodyDescriptions(c.bodyDescriptions),
    magicSchools: migrateSchools(c.magicSchools),
    magicMediums: migrateMediums(c.magicMediums),
    attributes: migrateAttributes(c.attributes),
    skills: [...combatRows, ...custom],
  }
}

export function combatSkillLevel(c: Character, id: string): number {
  return c.skills.find((s) => s.id === id)?.level ?? 0
}

// Migrate legacy armor (flat reductionDie / damageThreshold / durability /
// evasionReduction fields) into the new class-based ArmorStats shape. Items
// that already match the new shape pass through normalized.
function migrateInventoryItem(item: InventoryItem): InventoryItem {
  if (!item.armor) return item
  const a = item.armor as Partial<ArmorStats> & {
    reductionDie?: ArmorReductionDie | 'd4'
    damageThreshold?: number
    durability?: number
    evasionReduction?: number
  }
  // Already new shape.
  if (a.class && ARMOR_CLASS_STATS[a.class as ArmorClass]) {
    return { ...item, armor: normalizeArmor(a as ArmorStats) }
  }
  // Old shape — pick class by reduction die. d4 and d6 → light, d8 → medium,
  // d10 → heavy (d10 didn't exist in the old shape but handle it anyway).
  const die = a.reductionDie
  const cls: ArmorClass =
    die === 'd10' ? 'heavy' : die === 'd8' ? 'medium' : 'light'
  const base = ARMOR_CLASS_STATS[cls]
  return {
    ...item,
    armor: normalizeArmor({
      class: cls,
      reductionTypes: a.reductionTypes ?? ['Physical'],
      extraProtective: 0,
      weightAdjust: 0,
      durabilityAdjust: 0,
      currentDurability: Math.min(a.durability ?? base.durability, base.durability),
    }),
  }
}

export interface MatchingArmor {
  itemId: string
  itemName: string
  die: ArmorReductionDie
  extraProtective: number
  threshold: number
  durability: number
}

// Returns equipped armor pieces that reduce the given damage type — useful
// so the UI can tell the player which physical dice to roll.
export function matchingArmorFor(
  c: Character,
  type: DamageType,
): MatchingArmor[] {
  return (c.inventory ?? [])
    .filter(
      (i) => i.equipped && i.armor && i.armor.reductionTypes.includes(type),
    )
    .map((i) => ({
      itemId: i.id,
      itemName: i.name || 'Unnamed armor',
      die: armorReductionDie(i.armor!),
      extraProtective: i.armor!.extraProtective,
      threshold: armorThreshold(i.armor!),
      durability: i.armor!.currentDurability,
    }))
}

export interface DamageOutcome {
  rawDamage: number
  type: DamageType
  reduction: number
  netDamage: number
  tempHpAbsorbed: number
  tempHpBefore: number
  tempHpAfter: number
  hpBefore: number
  hpAfter: number
  durabilityChanges: {
    itemId: string
    itemName: string
    delta: number
    newDurability: number
    broke: boolean
  }[]
}

// Apply typed damage with a player-supplied reduction value (rolled in
// meatspace). Each piece of equipped armor matching the damage type whose
// threshold is exceeded loses floor(damage / threshold) durability. Broken
// armor (durability 0) auto-unequips.
export function applyTypedDamage(
  c: Character,
  amount: number,
  type: DamageType,
  reduction: number,
): { next: Character; outcome: DamageOutcome } {
  const inv = c.inventory ?? []
  const safeReduction = Math.max(0, Math.floor(reduction))
  const netDamage = Math.max(0, amount - safeReduction)
  // Damage hits temp HP first, then real HP.
  const tempHpBefore = Math.max(0, c.tempHp ?? 0)
  const tempHpAbsorbed = Math.min(tempHpBefore, netDamage)
  const tempHpAfter = tempHpBefore - tempHpAbsorbed
  const damageToHp = netDamage - tempHpAbsorbed
  const hpBefore = c.currentHp
  const hpAfter = Math.max(0, hpBefore - damageToHp)

  const durabilityChanges: DamageOutcome['durabilityChanges'] = []
  const nextInventory = inv.map((i) => {
    if (!i.armor || !i.equipped) return i
    if (!i.armor.reductionTypes.includes(type)) return i
    const threshold = armorThreshold(i.armor)
    if (threshold <= 0 || amount <= threshold) return i
    const loss = Math.floor(amount / threshold)
    if (loss <= 0) return i
    const newDurability = Math.max(0, i.armor.currentDurability - loss)
    const broke = newDurability === 0
    durabilityChanges.push({
      itemId: i.id,
      itemName: i.name || 'Unnamed armor',
      delta: -loss,
      newDurability,
      broke,
    })
    return {
      ...i,
      armor: { ...i.armor, currentDurability: newDurability },
      equipped: broke ? false : i.equipped,
    }
  })

  return {
    next: {
      ...c,
      currentHp: hpAfter,
      tempHp: tempHpAfter,
      inventory: nextInventory,
    },
    outcome: {
      rawDamage: amount,
      type,
      reduction: safeReduction,
      netDamage,
      tempHpAbsorbed,
      tempHpBefore,
      tempHpAfter,
      hpBefore,
      hpAfter,
      durabilityChanges,
    },
  }
}

// Sum of evasion reduction from equipped armor items.
export function equippedArmorEvasionReduction(c: Character): number {
  return (c.inventory ?? [])
    .filter((i) => i.armor && i.equipped)
    .reduce((sum, i) => sum + armorEvasionReduction(i.armor!), 0)
}

// Evasion = 10 + Agility + Dodge skill level − armor modifier − equipped armor
export function evasion(c: Character): number {
  const agility = c.attributes['Agility'] ?? 0
  const dodge = combatSkillLevel(c, 'combat-dodge')
  return (
    10 +
    agility +
    dodge -
    (c.armorModifier ?? 0) -
    equippedArmorEvasionReduction(c)
  )
}
