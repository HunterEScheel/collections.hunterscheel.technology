import { MAGIC_SCHOOLS, type MagicSchool } from '../system/magicSchools'
import { NumberStepper } from './NumberStepper'

interface Props {
  value: Record<MagicSchool, number>
  onChange: (next: Record<MagicSchool, number>) => void
}

export function MagicSchoolsEditor({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {MAGIC_SCHOOLS.map((school) => (
        <NumberStepper
          key={school}
          label={school}
          value={value[school]}
          onChange={(v) => onChange({ ...value, [school]: v })}
          min={0}
          max={5}
        />
      ))}
    </div>
  )
}
