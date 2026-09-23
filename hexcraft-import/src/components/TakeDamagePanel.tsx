import { useState } from 'react'
import {
  applyTypedDamage,
  matchingArmorFor,
  type Character,
  type DamageOutcome,
} from '../system/character'
import { DAMAGE_TYPES, type DamageType } from '../system/inventory'

interface Props {
  character: Character
  onApply: (next: Character) => void
}

export function TakeDamagePanel({ character, onApply }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<DamageType>('Physical')
  const [reduction, setReduction] = useState('')
  const [last, setLast] = useState<DamageOutcome | null>(null)

  const matching = matchingArmorFor(character, type)
  const dmgN = Math.max(0, Math.floor(Number(amount) || 0))
  const redN = Math.max(0, Math.floor(Number(reduction) || 0))
  const netPreview = Math.max(0, dmgN - redN)
  const canApply = dmgN > 0

  const apply = () => {
    if (!canApply) return
    const { next, outcome } = applyTypedDamage(character, dmgN, type, redN)
    onApply(next)
    setLast(outcome)
    setAmount('')
    setReduction('')
  }

  const onEnter: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') apply()
  }

  if (!expanded) {
    return (
      <div className="space-y-3">
        <CollapsedTeaser onExpand={() => setExpanded(true)} />
        {last && <ImpactReport outcome={last} onDismiss={() => setLast(null)} />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-rose-900/40 bg-zinc-950/40">
        {/* Header with collapse */}
        <div className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/50 px-3 py-1.5">
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-rose-300">
              Take damage
            </span>
          </span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Collapse"
            className="text-sm leading-none text-zinc-500 hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {/* Equation row */}
        <div className="grid gap-3 p-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-end">
          {/* DAMAGE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-rose-300/80">
                Damage
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DamageType)}
                className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-300"
              >
                {DAMAGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={onEnter}
              placeholder="0"
              autoFocus
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-center font-mono text-3xl leading-tight text-rose-300 tabular-nums focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* − */}
          <span
            aria-hidden
            className="hidden select-none pb-1.5 font-mono text-3xl text-zinc-700 sm:block"
          >
            −
          </span>

          {/* REDUCTION */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-300/80">
              Armor blocks
            </span>
            <input
              type="number"
              min={0}
              value={reduction}
              onChange={(e) => setReduction(e.target.value)}
              onKeyDown={onEnter}
              placeholder="0"
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-center font-mono text-3xl leading-tight text-emerald-300 tabular-nums focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* = */}
          <span
            aria-hidden
            className="hidden select-none pb-1.5 font-mono text-3xl text-zinc-700 sm:block"
          >
            =
          </span>

          {/* NET (live preview) */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              To HP
            </span>
            <div
              className={
                'w-full rounded border px-2 py-1.5 text-center font-mono text-3xl leading-tight tabular-nums transition-colors ' +
                (canApply
                  ? 'border-rose-900/40 bg-rose-950/30 text-rose-200'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-600')
              }
            >
              {netPreview}
            </div>
          </div>
        </div>

        {/* Armor roll instruction strip */}
        <div className="border-t border-zinc-800/60 bg-zinc-950/60 px-3 py-2">
          {matching.length > 0 ? (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                Roll
              </span>
              {matching.map((m) => (
                <span
                  key={m.itemId}
                  className="flex items-baseline gap-2 whitespace-nowrap"
                >
                  <span className="text-[11px] text-zinc-300">
                    {m.itemName}
                  </span>
                  <span className="font-mono text-sm text-emerald-300">
                    1{m.die}
                    {m.extraProtective > 0 && ` + ${m.extraProtective}`}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                    T{m.threshold} · D{m.durability}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">
              No equipped armor reduces {type} damage
            </div>
          )}
        </div>

        {/* Commit */}
        <button
          type="button"
          onClick={apply}
          disabled={!canApply}
          className="w-full bg-rose-700 py-2.5 text-sm font-medium uppercase tracking-[0.3em] text-rose-50 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-zinc-900 disabled:text-zinc-600"
        >
          Take hit
        </button>
      </div>

      {last && <ImpactReport outcome={last} onDismiss={() => setLast(null)} />}
    </div>
  )
}

function CollapsedTeaser({ onExpand }: { onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="group w-full rounded-lg border border-rose-900/50 bg-zinc-950/40 px-4 py-3 text-left transition hover:border-rose-700/70 hover:bg-rose-950/25 hover:shadow-[0_0_20px_-6px] hover:shadow-rose-600/40"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          {/* Pulsing rose pip — sonar/notification cue */}
          <span aria-hidden className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-rose-500 opacity-75 animate-ping" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-rose-500" />
          </span>
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-rose-200">
            Take damage
          </span>
        </span>
        <span className="flex items-baseline gap-2 text-[10px] uppercase tracking-[0.3em] text-rose-400/80 transition group-hover:text-rose-300">
          <span>Expand</span>
          <span className="text-sm transition group-hover:translate-y-px">▾</span>
        </span>
      </div>
    </button>
  )
}

function ImpactReport({
  outcome,
  onDismiss,
}: {
  outcome: DamageOutcome
  onDismiss: () => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-rose-700/40 bg-rose-950/15">
      <div className="flex items-baseline justify-between border-b border-rose-900/40 bg-rose-950/40 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-rose-300">
          ▣ Hit
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300"
        >
          Dismiss
        </button>
      </div>
      <div className="space-y-1.5 p-3 text-xs">
        {/* Re-stamped equation */}
        <div className="font-mono">
          <span className="text-lg text-rose-300 tabular-nums">
            {outcome.rawDamage}
          </span>{' '}
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {outcome.type}
          </span>
          {outcome.reduction > 0 && (
            <>
              {' '}
              <span className="text-zinc-700">−</span>{' '}
              <span className="text-emerald-300 tabular-nums">
                {outcome.reduction}
              </span>
            </>
          )}{' '}
          <span className="text-zinc-700">=</span>{' '}
          <span className="text-lg text-rose-300 tabular-nums">
            {outcome.netDamage}
          </span>{' '}
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            to HP
          </span>
        </div>

        {/* Layered damage allocation */}
        {outcome.tempHpAbsorbed > 0 && (
          <div className="font-mono text-sky-300">
            Temp HP {outcome.tempHpBefore} → {outcome.tempHpAfter}{' '}
            <span className="text-zinc-500">
              (absorbed {outcome.tempHpAbsorbed})
            </span>
          </div>
        )}
        <div className="font-mono text-zinc-300">
          HP {outcome.hpBefore} → {outcome.hpAfter}
        </div>

        {/* Armor durability changes */}
        {outcome.durabilityChanges.length > 0 && (
          <ul className="mt-1 space-y-0.5 border-t border-rose-900/30 pt-1.5 text-amber-200/90">
            {outcome.durabilityChanges.map((d) => (
              <li key={d.itemId} className="font-mono text-[11px]">
                {d.itemName}{' '}
                <span className="text-zinc-500">{d.delta}</span>
                {' → '}
                {d.newDurability}
                {d.broke && (
                  <span className="font-bold text-rose-300">
                    {' · '}BROKEN, unequipped
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
