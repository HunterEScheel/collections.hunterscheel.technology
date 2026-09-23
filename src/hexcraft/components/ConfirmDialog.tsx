import { useEffect, useRef } from 'react'

interface Props {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'neutral'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'neutral',
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      else if (e.key === 'Enter') onConfirm()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, onConfirm])

  const confirmClass =
    tone === 'danger'
      ? 'bg-rose-700 hover:bg-rose-600 text-zinc-50'
      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl max-w-sm w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h3
            id="confirm-dialog-title"
            className="text-base font-medium text-zinc-100"
          >
            {title}
          </h3>
          {message && <p className="text-sm text-zinc-400">{message}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm text-zinc-200"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              'rounded px-3 py-2 text-sm font-medium ' + confirmClass
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
