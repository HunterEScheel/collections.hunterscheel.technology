import { useState } from 'react'

type Difficulty = 'easy' | 'medium' | 'hard' | 'near-impossible'
type Correlation = 'negative' | 'none' | 'relevant' | 'adjacent' | 'exact'

interface DifficultyDef {
  key: Difficulty
  label: string
  base: number
}

interface CorrelationDef {
  key: Correlation
  label: string
  mod: string
  // If multiplier is undefined, this correlation adds `add` to base DC instead.
  multiplier?: number
  add?: number
}

const DIFFICULTIES: readonly DifficultyDef[] = [
  { key: 'easy', label: 'Easy', base: 12 },
  { key: 'medium', label: 'Medium', base: 20 },
  { key: 'hard', label: 'Hard', base: 30 },
  { key: 'near-impossible', label: 'Near-impossible', base: 40 },
] as const

const CORRELATIONS: readonly CorrelationDef[] = [
  { key: 'negative', label: 'Negative', mod: '+10', add: 10 },
  { key: 'none', label: 'None', mod: '±0' },
  { key: 'relevant', label: 'Relevant', mod: '−10%', multiplier: 0.9 },
  { key: 'adjacent', label: 'Adjacent', mod: '−25%', multiplier: 0.75 },
  { key: 'exact', label: 'Exact', mod: '−40%', multiplier: 0.6 },
] as const

function computeDC(diff: DifficultyDef, corr: CorrelationDef): number {
  if (corr.add !== undefined) return diff.base + corr.add
  if (corr.multiplier !== undefined)
    return Math.floor(diff.base * corr.multiplier)
  return diff.base
}

export function DCCalculator() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [correlation, setCorrelation] = useState<Correlation>('adjacent')

  const diff = DIFFICULTIES.find((d) => d.key === difficulty)!
  const corr = CORRELATIONS.find((c) => c.key === correlation)!
  const dc = computeDC(diff, corr)

  return (
    <section className="overflow-hidden rounded-lg border border-amber-700/40 bg-zinc-900/50">
      <header className="flex items-baseline justify-between border-b border-zinc-800 bg-zinc-950/50 px-4 py-2">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] text-amber-300/80">
          DC Calculator
        </h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          GM tool
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <Group label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <Pill
                key={d.key}
                active={difficulty === d.key}
                onClick={() => setDifficulty(d.key)}
              >
                <span>{d.label}</span>
                <span className="font-mono text-zinc-500">{d.base}</span>
              </Pill>
            ))}
          </Group>

          <Group label="Correlation">
            {CORRELATIONS.map((c) => (
              <Pill
                key={c.key}
                active={correlation === c.key}
                onClick={() => setCorrelation(c.key)}
              >
                <span>{c.label}</span>
                <span className="font-mono text-zinc-500">{c.mod}</span>
              </Pill>
            ))}
          </Group>
        </div>

        <div className="flex flex-col items-center justify-center min-w-[160px] border-t border-zinc-800 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">
            DC
          </span>
          <span className="my-1 font-mono text-6xl leading-none text-amber-300 tabular-nums">
            {dc}
          </span>
          <span className="mt-1 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {diff.label} <span className="text-zinc-700">×</span> {corr.label}
          </span>
        </div>
      </div>
    </section>
  )
}

function Group({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'inline-flex items-baseline gap-1.5 rounded border px-2 py-1 text-[11px] uppercase tracking-[0.12em] transition ' +
        (active
          ? 'border-amber-400/80 bg-amber-500/15 text-amber-100'
          : 'border-zinc-700 bg-zinc-950/40 text-zinc-300 hover:border-zinc-500')
      }
    >
      {children}
    </button>
  )
}
