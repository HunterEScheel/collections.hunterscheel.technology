import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAdmin } from '../lib/admin'

// The same admin PIN as the hexmap, checked server-side by `admin-action`.
export function PinForm() {
  const { verify } = useAdmin()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const ok = await verify(pin)
    setSubmitting(false)
    if (!ok) setError('Wrong PIN.')
    // On success the provider holds the PIN and AdminPage re-renders.
  }

  return (
    <form className="card form login-form" onSubmit={handleSubmit}>
      <h3>Admin</h3>
      <label>
        Admin PIN
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Checking…' : 'Unlock admin'}
      </button>
    </form>
  )
}
