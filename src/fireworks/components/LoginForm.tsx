import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

// The shared project signs people in by magic link (no passwords), so organizers
// do too. Signing in only proves who you are; fireworks_admins decides whether
// that makes you an organizer.
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/fireworks/admin` },
    })
    setSubmitting(false)
    if (authError) setError(authError.message)
    else setSent(true)
    // Following the link lands back here; onAuthStateChange re-renders the page.
  }

  if (sent) {
    return (
      <div className="card login-form">
        <h3>Check your email</h3>
        <p className="muted">We sent a sign-in link to {email}.</p>
      </div>
    )
  }

  return (
    <form className="card form login-form" onSubmit={handleSubmit}>
      <h3>Organizer sign in</h3>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  )
}
