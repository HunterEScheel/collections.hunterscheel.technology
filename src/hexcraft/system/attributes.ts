export const ATTRIBUTES = [
  'Power',
  'Agility',
  'Intelligence',
  'Sense',
  'Influence',
] as const

export type AttributeName = (typeof ATTRIBUTES)[number]
