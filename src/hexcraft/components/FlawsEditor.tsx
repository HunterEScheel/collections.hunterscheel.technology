import {
  FLAW_BP_BY_SEVERITY,
  FLAW_SEVERITIES,
  type Flaw,
  type FlawSeverity,
} from '../system/flaws'

interface Props {
  value: Flaw[]
  onChange: (next: Flaw[]) => void
}

export function FlawsEditor({ value, onChange }: Props) {
  const add = () =>
    onChange([
      ...value,
      {
        id: `flaw-${crypto.randomUUID()}`,
        description: '',
        severity: 'quirk',
      },
    ])

  const update = (id: string, patch: Partial<Flaw>) =>
    onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const remove = (id: string) =>
    onChange(value.filter((f) => f.id !== id))

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          No flaws. Add a quirk, flaw, or vice to claim more BP.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((f) => (
            <li
              key={f.id}
              className="rounded border border-zinc-800 bg-zinc-900 p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <textarea
                  value={f.description}
                  onChange={(e) =>
                    update(f.id, { description: e.target.value })
                  }
                  placeholder="Compulsive gambler, hot-tempered, fear of heights, etc."
                  rows={2}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 resize-y"
                />
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  aria-label="Remove flaw"
                  className="text-zinc-500 hover:text-rose-400 text-sm px-1"
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-2">
                {FLAW_SEVERITIES.map((opt) => {
                  const active = opt.key === f.severity
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        update(f.id, { severity: opt.key as FlawSeverity })
                      }
                      className={
                        'flex-1 rounded border px-2 py-1 text-xs ' +
                        (active
                          ? 'border-emerald-500 bg-emerald-900/30 text-emerald-200'
                          : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500')
                      }
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="font-mono text-[10px] text-zinc-500">
                        +{FLAW_BP_BY_SEVERITY[opt.key as FlawSeverity]} BP
                      </div>
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={add}
        className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
      >
        + Add flaw
      </button>
    </div>
  )
}
