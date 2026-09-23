import { useMemo, useState } from 'react'
import {
  CASTING_TIMES,
  EP_PER_DAMAGE_DIE,
  SPELL_CRITERIA,
  SPELL_TARGETING_OPTIONS,
  emptySpellDraft,
  spellCost,
  type CastingTimeKey,
  type CriterionKey,
  type SpellTargeting,
} from '../system/spells'
import { spellTargetingLabel, type MonsterSpell } from '../system/monster'
import { CriterionRow } from './QuickCast'

interface Props {
  spellBonus: number
  value: MonsterSpell[]
  onChange: (next: MonsterSpell[]) => void
}

export function MonsterSpellComposer({ spellBonus, value, onChange }: Props) {
  const [draft, setDraft] = useState(emptySpellDraft)
  const [name, setName] = useState('')

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

  const canAdd = name.trim().length > 0 && cost.totalEp > 0

  const handleAdd = () => {
    if (!canAdd) return
    onChange([
      ...value,
      {
        id: `monster-spell-${crypto.randomUUID()}`,
        name: name.trim(),
        draft,
      },
    ])
    setName('')
    setDraft(emptySpellDraft())
  }

  return (
    <div className="space-y-4">
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
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                castingTime: e.target.value as CastingTimeKey,
              }))
            }
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
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    targeting: opt.key as SpellTargeting,
                  }))
                }
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

      <div className="rounded border border-zinc-800 bg-zinc-950 p-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500 font-mono whitespace-nowrap">
          {cost.baseEp} base × {cost.multiplier} = {cost.totalEp} EP
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spell name…"
          className="flex-1 min-w-[10rem] bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          title={
            name.trim().length === 0
              ? 'Give the spell a name'
              : cost.totalEp === 0
                ? 'Set at least one criterion or damage die'
                : undefined
          }
          className="rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-medium text-zinc-950"
        >
          Add spell
        </button>
      </div>

      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((s) => (
            <li
              key={s.id}
              className="rounded bg-zinc-900 border border-zinc-800 px-3 py-2 flex items-center gap-2"
            >
              <span className="text-sm text-zinc-100 whitespace-nowrap">
                {s.name}
              </span>
              <span className="text-xs font-mono text-amber-300 whitespace-nowrap">
                {spellTargetingLabel(s, spellBonus)}
              </span>
              <span className="text-xs font-mono text-zinc-500 flex-1">
                {spellCost(s.draft).totalEp} EP
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.id !== s.id))}
                className="text-zinc-500 hover:text-rose-400 text-sm"
                aria-label={`Remove ${s.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
