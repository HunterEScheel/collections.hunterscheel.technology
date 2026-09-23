export const MAGIC_SCHOOLS = [
  'Destroy',
  'Create',
  'Alter',
  'Restore',
  'Divine',
  'Control',
  'Summon',
] as const

export const MAGIC_MEDIUMS = [
  'Elemental',
  'Magic',
  'Kinetic',
  'Cognition',
  'Space',
  'Toxicity',
  'Material',
  'Vitality',
] as const

// Short descriptions for tooltips / help text.
export const MAGIC_MEDIUM_DESCRIPTIONS: Record<
  (typeof MAGIC_MEDIUMS)[number],
  string
> = {
  Elemental: 'Fire, water, earth, lightning, air, sound.',
  Magic: 'Counterspelling and effects that target magic itself.',
  Kinetic: 'Manipulates speed and motion.',
  Cognition:
    'Charm, persuasion, and effects influencing thoughts or actions.',
  Space: 'Teleportation and spatial manipulation.',
  Toxicity: 'Poisons and acids.',
  Material:
    'Targets a specific item or person — alter self, locate object, etc.',
  Vitality: 'Healing, life force, and biological vigor.',
}

export type MagicSchool = (typeof MAGIC_SCHOOLS)[number]
export type MagicMedium = (typeof MAGIC_MEDIUMS)[number]
