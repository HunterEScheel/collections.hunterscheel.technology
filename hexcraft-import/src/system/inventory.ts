export const WEAPON_CATEGORIES = [
  { key: 'melee-1h', label: 'Melee (1H)' },
  { key: 'melee-2h', label: 'Melee (2H)' },
  { key: 'fired-1h', label: 'Fired (1H)' },
  { key: 'fired-2h', label: 'Fired (2H)' },
] as const

export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number]['key']

export function weaponCategoryLabel(key: WeaponCategory): string {
  return WEAPON_CATEGORIES.find((c) => c.key === key)?.label ?? key
}

export const ARMOR_REDUCTION_DICE = ['d6', 'd8', 'd10'] as const
export type ArmorReductionDie = (typeof ARMOR_REDUCTION_DICE)[number]

export const DAMAGE_TYPES = [
  'Physical',
  'Fire',
  'Cold',
  'Lightning',
  'Acid',
  'Poison',
  'Psychic',
  'Magical',
  'Force',
  'Sonic',
] as const
export type DamageType = (typeof DAMAGE_TYPES)[number]

export const ARMOR_CLASSES = ['light', 'medium', 'heavy'] as const
export type ArmorClass = (typeof ARMOR_CLASSES)[number]

interface ArmorClassDef {
  label: string
  reductionDie: ArmorReductionDie
  threshold: number
  durability: number
  evasionReduction: number
}

// Required base stats per armor weight class.
export const ARMOR_CLASS_STATS: Record<ArmorClass, ArmorClassDef> = {
  light: {
    label: 'Light',
    reductionDie: 'd6',
    threshold: 10,
    durability: 12,
    evasionReduction: 2,
  },
  medium: {
    label: 'Medium',
    reductionDie: 'd8',
    threshold: 12,
    durability: 15,
    evasionReduction: 4,
  },
  heavy: {
    label: 'Heavy',
    reductionDie: 'd10',
    threshold: 15,
    durability: 20,
    evasionReduction: 6,
  },
}

export interface ArmorStats {
  class: ArmorClass
  reductionTypes: DamageType[]
  // 0..3 — adds flat damage absorbed on top of the die roll.
  extraProtective: number
  // -3..+3 — negative is "Lightweight" (subtracts evasion penalty), positive
  // is "Heavyweight" (adds evasion penalty).
  weightAdjust: number
  // multiples of 2 in [-6, +6] — positive is "Durable" (raises threshold AND
  // max durability), negative is "Brittle" (lowers both).
  durabilityAdjust: number
  // Mutable. Drops as armor takes damage; armor breaks at 0.
  currentDurability: number
}

export function armorReductionDie(a: ArmorStats): ArmorReductionDie {
  return ARMOR_CLASS_STATS[a.class].reductionDie
}

export function armorThreshold(a: ArmorStats): number {
  return Math.max(
    0,
    ARMOR_CLASS_STATS[a.class].threshold + (a.durabilityAdjust ?? 0),
  )
}

export function armorMaxDurability(a: ArmorStats): number {
  return Math.max(
    0,
    ARMOR_CLASS_STATS[a.class].durability + (a.durabilityAdjust ?? 0),
  )
}

export function armorEvasionReduction(a: ArmorStats): number {
  return Math.max(
    0,
    ARMOR_CLASS_STATS[a.class].evasionReduction + (a.weightAdjust ?? 0),
  )
}

export function normalizeArmor(a: ArmorStats): ArmorStats {
  const max = armorMaxDurability(a)
  return {
    class: a.class,
    reductionTypes: a.reductionTypes ?? ['Physical'],
    extraProtective: clamp(a.extraProtective ?? 0, 0, 3),
    weightAdjust: clamp(a.weightAdjust ?? 0, -3, 3),
    durabilityAdjust: clampStep(a.durabilityAdjust ?? 0, -6, 6, 2),
    currentDurability: clamp(a.currentDurability ?? max, 0, max),
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n)))
}

function clampStep(n: number, lo: number, hi: number, step: number): number {
  const snapped = Math.round(n / step) * step
  return clamp(snapped, lo, hi)
}

export function newArmorStats(): ArmorStats {
  return normalizeArmor({
    class: 'light',
    reductionTypes: ['Physical'],
    extraProtective: 0,
    weightAdjust: 0,
    durabilityAdjust: 0,
    currentDurability: ARMOR_CLASS_STATS.light.durability,
  })
}

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  notes?: string
  weaponCategory?: WeaponCategory
  armor?: ArmorStats
  equipped?: boolean
}

export function newInventoryItem(): InventoryItem {
  return {
    id: `item-${crypto.randomUUID()}`,
    name: '',
    quantity: 1,
  }
}
