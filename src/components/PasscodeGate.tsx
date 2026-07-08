import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useEventSession } from '../lib/eventSession'

/** Blocks children until the visitor unlocks an event with its passcode. */
export function PasscodeGate({ children }: { children: ReactNode }) {
  const { session, unlock, lock } = useEventSession()
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) {
    return (
      <>
        <div className="admin-bar">
          <span className="muted">
            Event: <strong>{session.event.name}</strong>
            {session.event.event_date && ` — ${session.event.event_date}`}
          </span>
          <button className="secondary" onClick={lock}>
            Switch event
          </button>
        </div>
        {children}
      </>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!passcode) return
    setSubmitting(true)
    const err = await unlock(passcode)
    setSubmitting(false)
    if (err) setError(err)
  }

  return (
    <form className="card form login-form" onSubmit={handleSubmit}>
      <h3>Enter event passcode</h3>
      <p className="muted">
        Contributions and receipts are private. Enter the passcode shared by the event organizer.
      </p>
      <label>
        Passcode
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Ask the organizer"
          autoFocus
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Checking…' : 'Unlock'}
      </button>
    </form>
  )
}
