import { useEffect, useRef, useState } from 'react'
import {
  BODY_PARTS,
  BODY_PART_LABELS,
  type BodyPart,
} from '../system/character'

interface Props {
  value: Partial<Record<BodyPart, string>>
  onChange: (next: Partial<Record<BodyPart, string>>) => void
}

const EMPTY_CLASSES =
  'fill-zinc-800 stroke-zinc-600 cursor-pointer hover:fill-zinc-700 focus:outline-none focus-visible:stroke-zinc-300'
const FILLED_CLASSES =
  'fill-amber-500/40 stroke-amber-400 cursor-pointer hover:fill-amber-500/60 focus:outline-none focus-visible:stroke-amber-200'

const SHAPES: Record<
  BodyPart,
  { tag: 'circle' | 'rect'; attrs: Record<string, number> }[]
> = {
  head: [{ tag: 'circle', attrs: { cx: 50, cy: 20, r: 14 } }],
  torso: [
    { tag: 'rect', attrs: { x: 34, y: 38, width: 32, height: 55, rx: 6 } },
  ],
  arms: [
    { tag: 'rect', attrs: { x: 16, y: 40, width: 14, height: 55, rx: 7 } },
    { tag: 'rect', attrs: { x: 70, y: 40, width: 14, height: 55, rx: 7 } },
  ],
  legs: [
    { tag: 'rect', attrs: { x: 35, y: 97, width: 13, height: 70, rx: 6 } },
    { tag: 'rect', attrs: { x: 52, y: 97, width: 13, height: 70, rx: 6 } },
  ],
}

export function BodyDiagramEditor({ value, onChange }: Props) {
  const [editing, setEditing] = useState<BodyPart | null>(null)

  const save = (part: BodyPart, draft: string) => {
    const next = { ...value }
    const trimmed = draft.trim()
    if (trimmed) next[part] = trimmed
    else delete next[part]
    onChange(next)
    setEditing(null)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <svg
        viewBox="0 0 100 180"
        className="w-36 shrink-0 select-none"
        aria-label="Body diagram"
      >
        {BODY_PARTS.flatMap((part) =>
          SHAPES[part].map(({ tag, attrs }, i) => {
            const label = BODY_PART_LABELS[part]
            const shared = {
              role: 'button',
              tabIndex: 0,
              'aria-label': `Edit ${label} description`,
              strokeWidth: 1.5,
              className: value[part] ? FILLED_CLASSES : EMPTY_CLASSES,
              onClick: () => setEditing(part),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setEditing(part)
                }
              },
            }
            const key = `${part}-${i}`
            const title = <title>{label}</title>
            return tag === 'circle' ? (
              <circle key={key} {...shared} {...attrs}>
                {title}
              </circle>
            ) : (
              <rect key={key} {...shared} {...attrs}>
                {title}
              </rect>
            )
          }),
        )}
      </svg>

      <div className="flex-1 space-y-1">
        {BODY_PARTS.map((part) => (
          <button
            key={part}
            type="button"
            onClick={() => setEditing(part)}
            className="w-full text-left rounded px-2 py-1.5 hover:bg-zinc-800/60"
          >
            <span className="text-sm font-medium text-zinc-200">
              {BODY_PART_LABELS[part]}
            </span>{' '}
            {value[part] ? (
              <span className="text-sm text-zinc-300 line-clamp-2">
                {value[part]}
              </span>
            ) : (
              <span className="text-sm text-zinc-600 italic">—</span>
            )}
          </button>
        ))}
      </div>

      {editing && (
        <DescriptionDialog
          part={editing}
          initial={value[editing] ?? ''}
          onSave={(draft) => save(editing, draft)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function DescriptionDialog({
  part,
  initial,
  onSave,
  onClose,
}: {
  part: BodyPart
  initial: string
  onSave: (draft: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-zinc-100">
          {BODY_PART_LABELS[part]}
        </h3>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder={`Describe this character's ${BODY_PART_LABELS[part].toLowerCase()}...`}
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 resize-y"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-sm font-medium text-zinc-950"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
