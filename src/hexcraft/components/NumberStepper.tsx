interface NumberStepperProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  label,
}: NumberStepperProps) {
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(Math.min(max, value + step))
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-sm text-zinc-400 w-24">{label}</span>
      )}
      <button
        type="button"
        onClick={dec}
        className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40"
        disabled={value <= min}
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)))
        }}
        className="w-16 text-center bg-zinc-900 border border-zinc-700 rounded px-1 py-1 text-zinc-100"
      />
      <button
        type="button"
        onClick={inc}
        className="w-8 h-8 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40"
        disabled={value >= max}
      >
        +
      </button>
    </div>
  )
}
