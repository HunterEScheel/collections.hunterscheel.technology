// Spell scaling criteria from the Hexcraft RPG sheet.
// Each criterion is split into one or more "modes" (e.g. AOE: splash/line/targets).
// Each mode contains options whose tier drives the EP cost.

export type CriterionKey =
  | 'range'
  | 'aoe'
  | 'duration'
  | 'buffDebuff'
  | 'challenge'

export interface SpellOption {
  label: string
  tier: number
}

export interface SpellMode {
  key: string
  label: string
  options: readonly SpellOption[]
}

// Either `options` (simple list) or `modes` (mode-then-value pick).
export interface SpellCriterion {
  key: CriterionKey
  label: string
  epPerTier: number
  options?: readonly SpellOption[]
  modes?: readonly SpellMode[]
}

export const SPELL_CRITERIA: readonly SpellCriterion[] = [
  {
    key: 'range',
    label: 'Range',
    epPerTier: 8,
    options: [
      { label: 'touch / 30 ft', tier: 0 },
      { label: '120 ft', tier: 1 },
      { label: '600 ft', tier: 2 },
      { label: '1 mile', tier: 3 },
      { label: 'any distance', tier: 4 },
      { label: 'cross-planar', tier: 5 },
    ],
  },
  {
    key: 'aoe',
    label: 'AOE / Targets',
    epPerTier: 10,
    modes: [
      {
        key: 'targets',
        label: 'Targeted',
        options: [
          { label: 'none / self', tier: 0 },
          { label: 'single target', tier: 0 },
          { label: 'split damage', tier: 1 },
          { label: '3 targets', tier: 2 },
          { label: '10 targets', tier: 3 },
          { label: '100 targets', tier: 5 },
        ],
      },
      {
        key: 'splash',
        label: 'Splash',
        options: [
          { label: '20 ft splash', tier: 1 },
          { label: '60 ft splash', tier: 2 },
          { label: '120 ft splash', tier: 3 },
          { label: '300 ft splash', tier: 4 },
        ],
      },
      {
        key: 'line',
        label: 'Line',
        options: [
          { label: '60 ft line', tier: 1 },
          { label: '300 ft line', tier: 2 },
          { label: '600 ft line', tier: 3 },
          { label: '1 mile line', tier: 4 },
        ],
      },
    ],
  },
  {
    key: 'duration',
    label: 'Duration',
    epPerTier: 8,
    modes: [
      {
        key: 'standard',
        label: 'No concentration',
        options: [
          { label: 'instantaneous', tier: 0 },
          { label: '1 minute', tier: 1 },
          { label: '1 hour', tier: 2 },
          { label: '1 day', tier: 3 },
          { label: '1 year', tier: 4 },
          { label: 'permanent', tier: 5 },
        ],
      },
      {
        key: 'concentration',
        label: 'Concentration',
        options: [
          { label: '1 round', tier: 1 },
          { label: '1 minute', tier: 2 },
          { label: '1 hour', tier: 3 },
        ],
      },
    ],
  },
  {
    key: 'buffDebuff',
    label: 'Buff / Debuff',
    epPerTier: 10,
    modes: [
      {
        key: 'none',
        label: 'None',
        options: [{ label: 'none', tier: 0 }],
      },
      {
        key: 't1',
        label: 'Tier I (10 EP)',
        options: [
          { label: 'darkvision', tier: 1 },
          { label: 'magic detection', tier: 1 },
          { label: 'languages', tier: 1 },
          { label: '1-sense illusions', tier: 1 },
          { label: '+2 skill', tier: 1 },
          { label: 'cursory knowledge', tier: 1 },
          { label: 'inconvenience', tier: 1 },
          { label: 'poisoned', tier: 1 },
          { label: 'deafened', tier: 1 },
          { label: 'grappled', tier: 1 },
          { label: 'slowed', tier: 1 },
          { label: 'reincarnation', tier: 1 },
        ],
      },
      {
        key: 't2',
        label: 'Tier II (20 EP)',
        options: [
          { label: 'tremorsense', tier: 2 },
          { label: 'see invisibility', tier: 2 },
          { label: 'detect lies', tier: 2 },
          { label: 'multi-sense illusions', tier: 2 },
          { label: '+5 skill', tier: 2 },
          { label: 'fundamental knowledge', tier: 2 },
          { label: 'prone', tier: 2 },
          { label: 'frightened', tier: 2 },
          { label: 'illness', tier: 2 },
          { label: 'undeath', tier: 2 },
          { label: 'exhaustion', tier: 2 },
        ],
      },
      {
        key: 't3',
        label: 'Tier III (30 EP)',
        options: [
          { label: 'truesight', tier: 3 },
          { label: 'total evasion', tier: 3 },
          { label: 'detailed knowledge', tier: 3 },
          { label: 'disability', tier: 3 },
          { label: 'restrained', tier: 3 },
          { label: 'blinded', tier: 3 },
          { label: 'silenced', tier: 3 },
          { label: 'charmed', tier: 3 },
          { label: 'resurrection', tier: 3 },
        ],
      },
      {
        key: 't4',
        label: 'Tier IV (40 EP)',
        options: [
          { label: 'stunned', tier: 4 },
          { label: 'paralyzed', tier: 4 },
          { label: 'incapacitated', tier: 4 },
          { label: 'banished', tier: 4 },
          { label: 'dominated', tier: 4 },
          { label: 'polymorphed', tier: 4 },
          { label: 'total knowledge', tier: 4 },
          { label: 'true resurrection', tier: 4 },
        ],
      },
      {
        key: 't5',
        label: 'Tier V (50 EP)',
        options: [
          { label: 'petrification', tier: 5 },
          { label: 'soul-bound', tier: 5 },
          { label: 'death', tier: 5 },
          { label: 'True Resurrection (greater)', tier: 5 },
        ],
      },
    ],
  },
  {
    key: 'challenge',
    label: 'Challenge',
    epPerTier: 15,
    options: [
      { label: 'none', tier: 0 },
      { label: '150 BP', tier: 0 },
      { label: '400 BP', tier: 1 },
      { label: '1 000 BP', tier: 2 },
      { label: '2 500 BP', tier: 3 },
      { label: '5 000 BP', tier: 4 },
      { label: '10 000 BP', tier: 5 },
    ],
  },
] as const

export type CastingTimeKey =
  | 'reaction'
  | 'action'
  | '2actions'
  | '1minute'
  | '1hour'

export interface CastingTimeOption {
  key: CastingTimeKey
  label: string
  multiplier: number
}

export const CASTING_TIMES: readonly CastingTimeOption[] = [
  { key: 'reaction', label: 'Reaction', multiplier: 4 },
  { key: 'action', label: 'Action', multiplier: 2 },
  { key: '2actions', label: '2 Actions', multiplier: 1 },
  { key: '1minute', label: '1 Minute', multiplier: 0.5 },
  { key: '1hour', label: '1 Hour', multiplier: 0.25 },
] as const

export const EP_PER_DAMAGE_DIE = 2

export interface SpellSelection {
  modeIndex: number
  optionIndex: number
}

export type SpellTargeting = 'hit' | 'dodge' | 'grit' | 'resolve'

export const SPELL_TARGETING_OPTIONS: readonly {
  key: SpellTargeting
  label: string
}[] = [
  { key: 'hit', label: 'Roll to hit' },
  { key: 'dodge', label: 'Dodge save' },
  { key: 'grit', label: 'Grit save' },
  { key: 'resolve', label: 'Resolve save' },
] as const

export interface SpellDraft {
  selections: Record<CriterionKey, SpellSelection>
  damageDice: number
  castingTime: CastingTimeKey
  targeting: SpellTargeting
}

export function emptySpellDraft(): SpellDraft {
  return {
    selections: {
      range: { modeIndex: 0, optionIndex: 0 },
      aoe: { modeIndex: 0, optionIndex: 0 },
      duration: { modeIndex: 0, optionIndex: 0 },
      buffDebuff: { modeIndex: 0, optionIndex: 0 },
      challenge: { modeIndex: 0, optionIndex: 0 },
    },
    damageDice: 0,
    castingTime: '2actions',
    targeting: 'hit',
  }
}

export function criterionOptions(
  criterion: SpellCriterion,
  modeIndex: number,
): readonly SpellOption[] {
  if (criterion.options) return criterion.options
  return criterion.modes?.[modeIndex]?.options ?? []
}

export function selectedOption(
  criterion: SpellCriterion,
  selection: SpellSelection,
): SpellOption | undefined {
  return criterionOptions(criterion, selection.modeIndex)[
    selection.optionIndex
  ]
}

export function criterionEp(
  criterion: SpellCriterion,
  selection: SpellSelection,
): number {
  const opt = selectedOption(criterion, selection)
  return opt ? opt.tier * criterion.epPerTier : 0
}

export interface SpellCost {
  baseEp: number
  multiplier: number
  totalEp: number
}

export function spellCost(draft: SpellDraft): SpellCost {
  const criteriaEp = SPELL_CRITERIA.reduce(
    (sum, c) => sum + criterionEp(c, draft.selections[c.key]),
    0,
  )
  const damageEp = draft.damageDice * EP_PER_DAMAGE_DIE
  const baseEp = criteriaEp + damageEp
  const time =
    CASTING_TIMES.find((t) => t.key === draft.castingTime) ?? CASTING_TIMES[2]
  const totalEp = Math.ceil(baseEp * time.multiplier)
  return { baseEp, multiplier: time.multiplier, totalEp }
}

// Saved (prepared) spells cost 25% less to cast.
export const SAVED_SPELL_DISCOUNT = 0.25

export function savedSpellCost(draft: SpellDraft): SpellCost {
  const base = spellCost(draft)
  return {
    ...base,
    totalEp: Math.max(0, Math.round(base.totalEp * (1 - SAVED_SPELL_DISCOUNT))),
  }
}

export interface SavedSpell {
  id: string
  name: string
  school: string
  medium: string
  draft: SpellDraft
}
