import {
  expendEpToRevive,
  restoreToMax,
  setDeathSaves,
  type Character,
} from '../system/character'

interface Props {
  character: Character
  onApply: (next: Character) => void
}

export function DeathSavePanel({ character, onApply }: Props) {
  const { successes, failures } = character.deathSaves
  const stable = successes >= 3
  const dead = failures >= 3

  if (dead) {
    return (
      <DeathScreen onResurrect={() => onApply(restoreToMax(character))} />
    )
  }

  // Click pip n → set count to n+1. Click the rightmost filled pip → drop to n.
  const setCount = (kind: 'successes' | 'failures', n: number) => {
    onApply(setDeathSaves(character, { [kind]: n }))
  }

  const burnEp = () => onApply(expendEpToRevive(character))

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <PipRow
          label="Successes"
          color="emerald"
          count={successes}
          onChange={(n) => setCount('successes', n)}
          disabled={false}
        />
        <PipRow
          label="Failures"
          color="rose"
          count={failures}
          onChange={(n) => setCount('failures', n)}
          disabled={stable}
        />
      </div>

      {stable && (
        <div className="rounded border border-emerald-700/50 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-200">
          Stable — unconscious but no longer dying.
        </div>
      )}

      {!stable && (
        <button
          type="button"
          onClick={burnEp}
          disabled={character.currentEp <= 0}
          title={
            character.currentEp <= 0
              ? 'No EP to spend'
              : `Spend ${character.currentEp} EP to stand at 1 HP`
          }
          className="rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-sm font-medium text-zinc-950"
        >
          Spend all EP ({character.currentEp}) → 1 HP
        </button>
      )}

      <p className="text-[11px] text-zinc-500">
        Tap a pip to mark a result. Tap the rightmost filled pip to undo.
      </p>
    </div>
  )
}

function DeathScreen({ onResurrect }: { onResurrect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="text-7xl leading-none" aria-hidden>
        💀
      </div>
      <div className="text-2xl font-bold tracking-[0.3em] text-rose-300">
        YOU ARE DEAD
      </div>
      <button
        type="button"
        onClick={onResurrect}
        className="mt-2 rounded bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950"
      >
        Resurrect character
      </button>
    </div>
  )
}

interface PipRowProps {
  label: string
  color: 'emerald' | 'rose'
  count: number
  onChange: (n: number) => void
  disabled: boolean
}

function PipRow({ label, color, count, onChange, disabled }: PipRowProps) {
  const accent =
    color === 'emerald' ? 'text-emerald-300' : 'text-rose-300'
  const filled =
    color === 'emerald'
      ? 'bg-emerald-500 border-emerald-400 hover:bg-emerald-400'
      : 'bg-rose-500 border-rose-400 hover:bg-rose-400'
  const empty =
    'border-zinc-700 bg-zinc-900 ' +
    (color === 'emerald' ? 'hover:border-emerald-500' : 'hover:border-rose-500')

  return (
    <div className="flex flex-col gap-1">
      <span className={'text-[10px] uppercase tracking-wider ' + accent}>
        {label}
      </span>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => {
          const isFilled = i < count
          const nextCount = count === i + 1 ? i : i + 1
          return (
            <button
              key={i}
              type="button"
              aria-label={`${label} ${i + 1}`}
              aria-pressed={isFilled}
              disabled={disabled}
              onClick={() => onChange(nextCount)}
              className={
                'h-6 w-6 rounded-full border transition disabled:opacity-40 disabled:cursor-not-allowed ' +
                (isFilled ? filled : empty)
              }
            />
          )
        })}
      </div>
    </div>
  )
}
