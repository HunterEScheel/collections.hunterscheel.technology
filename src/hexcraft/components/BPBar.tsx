import type { BPBreakdown } from '../system/character'

interface Props {
  breakdown: BPBreakdown
}

export function BPBar({ breakdown }: Props) {
  const budget = breakdown.effectiveBudget
  const remaining = budget - breakdown.total
  const pct = budget > 0 ? Math.min(100, (breakdown.total / budget) * 100) : 0
  const over = breakdown.total > budget

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-zinc-400">
          Spent <span className="font-mono text-zinc-100">{breakdown.total}</span> / {budget} BP
        </span>
        <span
          className={
            'font-mono ' + (over ? 'text-rose-400' : 'text-emerald-300')
          }
        >
          {over ? '' : '+'}
          {remaining} remaining
        </span>
      </div>
      <div className="h-2 w-full rounded bg-zinc-800 overflow-hidden">
        <div
          className={
            'h-full transition-all ' +
            (over ? 'bg-rose-500' : 'bg-emerald-500')
          }
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 font-mono">
        <span>HP {breakdown.hp}</span>
        <span>EP {breakdown.ep}</span>
        <span>Spd {breakdown.speed}</span>
        <span>Attr {breakdown.attributes}</span>
        <span>Schools {breakdown.magicSchools}</span>
        <span>Mediums {breakdown.magicMediums}</span>
        <span>Skills {breakdown.skills}</span>
        {breakdown.tetherRefund > 0 && (
          <span className="text-emerald-400">
            Tethers +{breakdown.tetherRefund}
          </span>
        )}
        {breakdown.flawRefund > 0 && (
          <span className="text-emerald-400">
            Flaws +{breakdown.flawRefund}
          </span>
        )}
      </div>
    </div>
  )
}
