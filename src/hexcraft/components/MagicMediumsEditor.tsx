import {
  MAGIC_MEDIUM_DESCRIPTIONS,
  MAGIC_MEDIUMS,
  type MagicMedium,
} from '../system/magicSchools'
import { NumberStepper } from './NumberStepper'

interface Props {
  value: Record<MagicMedium, number>
  onChange: (next: Record<MagicMedium, number>) => void
}

export function MagicMediumsEditor({ value, onChange }: Props) {
  return (
    <ul className="space-y-2">
      {MAGIC_MEDIUMS.map((medium) => (
        <li
          key={medium}
          className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-2"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-100">{medium}</div>
            <div className="text-xs text-zinc-500">
              {MAGIC_MEDIUM_DESCRIPTIONS[medium]}
            </div>
          </div>
          <NumberStepper
            value={value[medium]}
            onChange={(v) => onChange({ ...value, [medium]: v })}
            min={0}
            max={5}
          />
        </li>
      ))}
    </ul>
  )
}
