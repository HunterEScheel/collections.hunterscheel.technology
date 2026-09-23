import { useMemo, useState } from 'react'
import {
  CASTING_TIMES,
  EP_PER_DAMAGE_DIE,
  SPELL_CRITERIA,
  SPELL_TARGETING_OPTIONS,
  criterionEp,
  criterionOptions,
  emptySpellDraft,
  selectedOption,
  spellCost,
  type CastingTimeKey,
  type CriterionKey,
  type SavedSpell,
  type SpellCriterion,
  type SpellDraft,
  type SpellSelection,
  type SpellTargeting,
} from '../system/spells'
import {
  MAGIC_MEDIUMS,
  MAGIC_SCHOOLS,
  type MagicMedium,
  type MagicSchool,
} from '../system/magicSchools'

interface Props {
  schools: Record<MagicSchool, number>
  mediums: Record<MagicMedium, number>
  currentEp: number
  savedSpells: SavedSpell[]
  onCast: (epCost: number) => void
  onSave: (spell: {
    name: string
    school: MagicSchool
    medium: MagicMedium
    draft: SpellDraft
  }) => void
}

export function QuickCast({
  schools,
  mediums,
  currentEp,
  savedSpells,
  onCast,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(emptySpellDraft)
  const [school, setSchool] = useState<MagicSchool | ''>('')
  const [medium, setMedium] = useState<MagicMedium | ''>('')
  const [spellName, setSpellName] = useState('')

  const trainedSchools = useMemo(
    () => MAGIC_SCHOOLS.filter((s) => schools[s] > 0),
    [schools],
  )
  const trainedMediums = useMemo(
    () => MAGIC_MEDIUMS.filter((m) => mediums[m] > 0),
    [mediums],
  )

  const cost = useMemo(() => spellCost(draft), [draft])

  const setMode = (key: CriterionKey, modeIndex: number) =>
    setDraft((d) => ({
      ...d,
      selections: { ...d.selections, [key]: { modeIndex, optionIndex: 0 } },
    }))
  const setOption = (key: CriterionKey, optionIndex: number) =>
    setDraft((d) => ({
      ...d,
      selections: {
        ...d.selections,
        [key]: { ...d.selections[key], optionIndex },
      },
    }))
  const setDamage = (n: number) =>
    setDraft((d) => ({ ...d, damageDice: Math.max(0, n) }))
  const setTime = (k: CastingTimeKey) =>
    setDraft((d) => ({ ...d, castingTime: k }))
  const setTargeting = (t: SpellTargeting) =>
    setDraft((d) => ({ ...d, targeting: t }))

  const reset = () => setDraft(emptySpellDraft())

  const canCast =
    school !== '' &&
    medium !== '' &&
    cost.totalEp > 0 &&
    cost.totalEp <= currentEp

  const handleCast = () => {
    if (!canCast) return
    onCast(cost.totalEp)
    reset()
  }

  const savedInSchool =
    school === ''
      ? 0
      : savedSpells.filter((s) => s.school === school).length
  const schoolLimit = school === '' ? 0 : schools[school]
  const slotsLeft = Math.max(0, schoolLimit - savedInSchool)
  const canSave =
    school !== '' &&
    medium !== '' &&
    spellName.trim().length > 0 &&
    cost.totalEp > 0 &&
    slotsLeft > 0

  const handleSave = () => {
    if (!canSave) return
    const pickedSchool = school as MagicSchool
    const pickedMedium = medium as MagicMedium
    onSave({
      name: spellName.trim(),
      school: pickedSchool,
      medium: pickedMedium,
      draft,
    })
    setSpellName('')
    reset()
  }

  if (trainedSchools.length === 0 || trainedMediums.length === 0) {
    return (
      <p className="text-sm text-zinc-500 italic">
        Train at least one school and one medium to cast.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <PickerSelect
          label="School"
          value={school}
          options={trainedSchools.map((s) => ({
            value: s,
            label: `${s} (Lv ${schools[s]})`,
          }))}
          onChange={(v) => setSchool(v as MagicSchool)}
        />
        <PickerSelect
          label="Medium"
          value={medium}
          options={trainedMediums.map((m) => ({
            value: m,
            label: `${m} (Lv ${mediums[m]})`,
          }))}
          onChange={(v) => setMedium(v as MagicMedium)}
        />
      </div>

      {SPELL_CRITERIA.map((c) => (
        <CriterionRow
          key={c.key}
          criterion={c}
          selection={draft.selections[c.key]}
          onModeChange={(idx) => setMode(c.key, idx)}
          onOptionChange={(idx) => setOption(c.key, idx)}
        />
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-zinc-400">
              Damage dice (d6)
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              {EP_PER_DAMAGE_DIE} EP per die
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDamage(draft.damageDice - 1)}
              className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
              disabled={draft.damageDice <= 0}
            >
              −
            </button>
            <input
              type="number"
              min={0}
              max={50}
              value={draft.damageDice}
              onChange={(e) => setDamage(Number(e.target.value) || 0)}
              className="w-16 text-center bg-zinc-900 border border-zinc-700 rounded px-1 py-1 text-zinc-100"
            />
            <button
              type="button"
              onClick={() => setDamage(draft.damageDice + 1)}
              className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <span className="text-xs uppercase tracking-wide text-zinc-400 block mb-1">
            Casting time
          </span>
          <select
            value={draft.castingTime}
            onChange={(e) => setTime(e.target.value as CastingTimeKey)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
          >
            {CASTING_TIMES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label} (×{t.multiplier})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-zinc-400 block mb-1">
          Targeting
        </span>
        <div className="flex flex-wrap gap-1">
          {SPELL_TARGETING_OPTIONS.map((opt) => {
            const active = draft.targeting === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTargeting(opt.key)}
                className={
                  'rounded px-3 py-1.5 text-xs border ' +
                  (active
                    ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500')
                }
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950 p-3 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-zinc-500 font-mono">
            {cost.baseEp} base × {cost.multiplier} = {cost.totalEp} EP
            {school !== '' && medium !== '' && (
              <>
                {' · '}
                {draft.targeting === 'hit' ? (
                  <span className="text-amber-300">
                    hit {schools[school] + mediums[medium] >= 0 ? '+' : ''}
                    {schools[school] + mediums[medium]}
                  </span>
                ) : (
                  <span className="text-amber-300">
                    {draft.targeting === 'dodge'
                      ? 'Dodge'
                      : draft.targeting === 'grit'
                        ? 'Grit'
                        : 'Resolve'}{' '}
                    DC {10 + schools[school] + mediums[medium]}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleCast}
              disabled={!canCast}
              title={
                cost.totalEp === 0
                  ? 'Set at least one criterion or damage die'
                  : cost.totalEp > currentEp
                    ? `Not enough EP (need ${cost.totalEp}, have ${currentEp})`
                    : school === ''
                      ? 'Pick a school'
                      : medium === ''
                        ? 'Pick a medium'
                        : undefined
              }
              className="rounded bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-medium text-zinc-950"
            >
              Cast (−{cost.totalEp} EP)
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={spellName}
            onChange={(e) => setSpellName(e.target.value)}
            placeholder="Name to save this spell…"
            className="flex-1 min-w-[12rem] bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
          />
          {school !== '' && schoolLimit > 0 && (
            <span className="text-xs text-zinc-500 font-mono whitespace-nowrap">
              {school}: {savedInSchool}/{schoolLimit} saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            title={
              school === ''
                ? 'Pick a school'
                : medium === ''
                  ? 'Pick a medium'
                  : spellName.trim().length === 0
                    ? 'Give the spell a name'
                    : cost.totalEp === 0
                      ? 'Set at least one criterion or damage die'
                      : slotsLeft === 0
                        ? `No save slots left for ${school} (school level ${schoolLimit})`
                        : undefined
            }
            className="rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-medium text-zinc-950"
          >
            Save spell
          </button>
        </div>
      </div>
    </div>
  )
}

interface PickerSelectProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}

export function PickerSelect({
  label,
  value,
  options,
  onChange,
}: PickerSelectProps) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-zinc-400 block mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
      >
        <option value="">— pick —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface CriterionRowProps {
  criterion: SpellCriterion
  selection: SpellSelection
  onModeChange: (idx: number) => void
  onOptionChange: (idx: number) => void
}

export function CriterionRow({
  criterion,
  selection,
  onModeChange,
  onOptionChange,
}: CriterionRowProps) {
  const ep = criterionEp(criterion, selection)
  const hasModes = (criterion.modes?.length ?? 0) > 1
  const options = criterionOptions(criterion, selection.modeIndex)
  const currentOption = selectedOption(criterion, selection)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs uppercase tracking-wide text-zinc-400">
          {criterion.label}
        </span>
        <span className="text-xs text-zinc-500 font-mono">
          {currentOption ? currentOption.label : '—'} · {ep} EP
        </span>
      </div>
      {hasModes && criterion.modes && (
        <div className="flex flex-wrap gap-1 mb-2">
          {criterion.modes.map((mode, i) => {
            const active = i === selection.modeIndex
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => onModeChange(i)}
                className={
                  'rounded px-2 py-1 text-xs border ' +
                  (active
                    ? 'border-violet-500 bg-violet-900/30 text-violet-200'
                    : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500')
                }
              >
                {mode.label}
              </button>
            )
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {options.map((opt, i) => {
          const active = i === selection.optionIndex
          const optionEp = opt.tier * criterion.epPerTier
          return (
            <button
              key={i}
              type="button"
              onClick={() => onOptionChange(i)}
              className={
                'rounded px-2 py-1 text-xs border ' +
                (active
                  ? 'border-emerald-500 bg-emerald-900/30 text-emerald-200'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500')
              }
            >
              <span>{opt.label}</span>
              <span className="ml-1 text-[10px] text-zinc-500 font-mono">
                {optionEp} EP
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
