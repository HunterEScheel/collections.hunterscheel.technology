import { useEffect, useMemo, useState } from 'react'
import type { CharacterSkill } from '../system/character'
import { COMBAT_SKILLS, isCombatSkillId } from '../system/combatSkills'
import { MAX_SKILL_LEVEL, skillCost } from '../system/costs'
import { searchSkills, type SkillSearchResult } from '../lib/skills'
import { supabaseConfigured } from '../lib/supabase'
import { NumberStepper } from './NumberStepper'

interface Props {
  value: CharacterSkill[]
  onChange: (next: CharacterSkill[]) => void
}

export function SkillsEditor({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SkillSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      const r = await searchSkills(query)
      if (!cancelled) {
        setResults(r)
        setSearching(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  const { saveSkills, combatSkills, customSkills } = useMemo(() => {
    const combatById = new Map(value.filter((s) => isCombatSkillId(s.id)).map((s) => [s.id, s]))
    const ordered = COMBAT_SKILLS.map((def) => ({
      def,
      skill: combatById.get(def.id) ?? { id: def.id, name: def.name, level: 0 },
    }))
    const saves = ordered.filter((o) => o.def.category === 'passive')
    const others = ordered.filter((o) => o.def.category !== 'passive')
    const custom = value.filter((s) => !isCombatSkillId(s.id))
    return {
      saveSkills: saves,
      combatSkills: others,
      customSkills: custom,
    }
  }, [value])

  const setLevel = (id: string, level: number) =>
    onChange(value.map((s) => (s.id === id ? { ...s, level } : s)))

  const remove = (id: string) => {
    if (isCombatSkillId(id)) return
    onChange(value.filter((s) => s.id !== id))
  }

  const addSkill = (name: string, externalId?: number) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (
      value.some((s) => s.name.toLowerCase() === trimmed.toLowerCase()) ||
      COMBAT_SKILLS.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
      )
    )
      return
    const id = externalId ? `sk-${externalId}` : `custom-${crypto.randomUUID()}`
    onChange([...value, { id, name: trimmed, level: 1 }])
    setQuery('')
    setResults([])
  }

  const renderSkillRow = ({
    def,
    skill,
  }: {
    def: (typeof COMBAT_SKILLS)[number]
    skill: CharacterSkill
  }) => (
    <li
      key={skill.id}
      className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-2"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100 truncate">{skill.name}</div>
        <div className="text-xs text-zinc-500 truncate">{def.effect}</div>
      </div>
      <span className="text-xs text-zinc-500 font-mono w-16 text-right">
        {skillCost(skill.level)} BP
      </span>
      <NumberStepper
        value={skill.level}
        onChange={(v) => setLevel(skill.id, v)}
        min={0}
        max={MAX_SKILL_LEVEL}
      />
    </li>
  )

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs uppercase tracking-wide text-zinc-400 mb-2">
          Saving throws
        </h4>
        <p className="text-xs text-zinc-500 mb-2">
          Dodge, Grit, and Resolve are your three saves. Each level adds +1
          to the corresponding save roll.
        </p>
        <ul className="space-y-2">{saveSkills.map(renderSkillRow)}</ul>
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-wide text-zinc-400 mb-2">
          Combat skills
        </h4>
        <p className="text-xs text-zinc-500 mb-2">
          Every character starts with these at level 0. Upgrade as needed; they
          can&apos;t be removed.
        </p>
        <ul className="space-y-2">{combatSkills.map(renderSkillRow)}</ul>
      </div>

      <div>
        <h4 className="text-xs uppercase tracking-wide text-zinc-400 mb-2">
          Other skills
        </h4>
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              supabaseConfigured
                ? 'Search non-combat skills…'
                : 'Add a skill (Supabase not configured — custom only)'
            }
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100 placeholder:text-zinc-500"
          />
          {query && (
            <div className="mt-2 rounded border border-zinc-800 bg-zinc-950 max-h-56 overflow-y-auto divide-y divide-zinc-800">
              {searching && (
                <div className="px-3 py-2 text-xs text-zinc-500">Searching…</div>
              )}
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addSkill(r.name, r.id)}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-900"
                >
                  <div className="text-sm text-zinc-100">{r.name}</div>
                  {r.description && (
                    <div className="text-xs text-zinc-500 line-clamp-1">
                      {r.description}
                    </div>
                  )}
                </button>
              ))}
              {!searching && results.length === 0 && (
                <button
                  type="button"
                  onClick={() => addSkill(query)}
                  className="w-full px-3 py-2 text-left text-sm text-amber-300 hover:bg-zinc-900"
                >
                  + Add &quot;{query.trim()}&quot; as custom skill
                </button>
              )}
            </div>
          )}
        </div>

        {customSkills.length === 0 ? (
          <p className="text-sm text-zinc-500 italic mt-3">No other skills yet.</p>
        ) : (
          <ul className="space-y-2 mt-3">
            {customSkills.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <span className="text-sm text-zinc-100 flex-1 truncate">
                  {s.name}
                </span>
                <span className="text-xs text-zinc-500 font-mono w-16 text-right">
                  {skillCost(s.level)} BP
                </span>
                <NumberStepper
                  value={s.level}
                  onChange={(v) => setLevel(s.id, v)}
                  min={1}
                  max={MAX_SKILL_LEVEL}
                />
                <button
                  type="button"
                  onClick={() => remove(s.id)}
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
    </div>
  )
}
