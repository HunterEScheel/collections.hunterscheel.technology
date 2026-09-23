import {
  CASTING_TIMES,
  savedSpellCost,
  selectedOption,
  SPELL_CRITERIA,
  type SavedSpell,
} from '../system/spells'
import {
  MAGIC_SCHOOLS,
  type MagicMedium,
  type MagicSchool,
} from '../system/magicSchools'

interface Props {
  schools: Record<MagicSchool, number>
  mediums: Record<MagicMedium, number>
  savedSpells: SavedSpell[]
  currentEp: number
  onCast: (epCost: number) => void
  onRemove: (id: string) => void
}

export function SavedSpells({
  schools,
  mediums,
  savedSpells,
  currentEp,
  onCast,
  onRemove,
}: Props) {
  const trainedSchools = MAGIC_SCHOOLS.filter((s) => schools[s] > 0)

  if (trainedSchools.length === 0) {
    return null
  }

  const totalSaved = savedSpells.length
  if (totalSaved === 0) {
    return (
      <p className="text-sm text-zinc-500 italic">
        No saved spells yet. Build one above and click Save spell to prepare it
        at a 25% cost reduction.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {trainedSchools.map((school) => {
        const spells = savedSpells.filter((s) => s.school === school)
        if (spells.length === 0) return null
        const limit = schools[school]
        return (
          <div key={school}>
            <div className="flex items-baseline justify-between mb-1">
              <h4 className="text-xs uppercase tracking-wide text-zinc-400">
                {school}
              </h4>
              <span className="text-xs text-zinc-500 font-mono">
                {spells.length}/{limit} saved
              </span>
            </div>
            <ul className="space-y-1">
              {spells.map((s) => {
                const discounted = savedSpellCost(s.draft).totalEp
                const canCast = discounted > 0 && discounted <= currentEp
                const factors: string[] = []
                for (const c of SPELL_CRITERIA) {
                  const sel = s.draft.selections[c.key]
                  const opt = selectedOption(c, sel)
                  if (!opt) continue
                  factors.push(opt.label)
                }
                if (s.draft.damageDice > 0) {
                  factors.push(`${s.draft.damageDice}d6`)
                }
                const time = CASTING_TIMES.find(
                  (t) => t.key === s.draft.castingTime,
                )
                if (time) {
                  factors.push(`${time.label} (×${time.multiplier})`)
                }
                const schoolLv =
                  (schools as Record<string, number>)[s.school] ?? 0
                const mediumLv =
                  (mediums as Record<string, number>)[s.medium] ?? 0
                const hit = schoolLv + mediumLv
                const dc = 10 + hit
                const targeting = s.draft.targeting ?? 'hit'
                const targetingLabel =
                  targeting === 'hit'
                    ? `hit ${hit >= 0 ? '+' : ''}${hit}`
                    : `${
                        targeting === 'dodge'
                          ? 'Dodge'
                          : targeting === 'grit'
                            ? 'Grit'
                            : 'Resolve'
                      } DC ${dc}`
                return (
                  <li
                    key={s.id}
                    className="rounded bg-zinc-900 border border-zinc-800 px-3 py-2 flex items-center gap-2"
                  >
                    <span className="text-sm text-zinc-100 whitespace-nowrap">
                      {s.name}
                    </span>
                    <span className="text-[11px] text-zinc-400 whitespace-nowrap">
                      <span className="text-violet-300">{s.school}</span>
                      <span className="text-zinc-600 mx-1">·</span>
                      <span className="text-sky-300">{s.medium}</span>
                    </span>
                    <span className="text-xs font-mono text-amber-300 whitespace-nowrap">
                      {targetingLabel}
                    </span>
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                      {factors.map((label, i) => (
                        <span
                          key={i}
                          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-300"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onCast(discounted)}
                      disabled={!canCast}
                      title={
                        !canCast
                          ? `Not enough EP (need ${discounted}, have ${currentEp})`
                          : undefined
                      }
                      className="rounded bg-violet-500 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1 text-xs font-medium text-zinc-950 whitespace-nowrap"
                    >
                      Cast (−{discounted})
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(s.id)}
                      className="text-zinc-500 hover:text-rose-400 text-sm"
                      aria-label={`Remove ${s.name}`}
                    >
                      ✕
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
