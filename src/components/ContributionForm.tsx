import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { FIREWORK_TYPES, fireworkLabel } from '../lib/types'
import type { FireworkType } from '../lib/types'

interface Props {
  secret: string
  onSubmitted: () => void
  onInvalidSecret: () => void
}

export function ContributionForm({ secret, onSubmitted, onInvalidSecret }: Props) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [fireworkType, setFireworkType] = useState<FireworkType>('fountain')
  const [otherText, setOtherText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const parsedAmount = Number(amount)
    if (!name.trim()) return setError('Please enter your name.')
    if (!parsedAmount || parsedAmount <= 0) return setError('Please enter a valid amount.')
    if (fireworkType === 'other' && !otherText.trim())
      return setError('Please describe the firework you want.')

    setSubmitting(true)
    const { error: rpcError } = await supabase.rpc('submit_contribution', {
      p_secret: secret,
      p_name: name.trim(),
      p_amount: parsedAmount,
      p_type: fireworkType,
      p_other: fireworkType === 'other' ? otherText.trim() : null,
    })
    setSubmitting(false)

    if (rpcError) {
      if (rpcError.message.includes('INVALID_SECRET')) {
        // Passcode no longer valid (event deleted or secret changed) — relock.
        onInvalidSecret()
        return
      }
      setError(`Submission failed: ${rpcError.message}`)
      return
    }

    setSuccess(true)
    setName('')
    setAmount('')
    setFireworkType('fountain')
    setOtherText('')
    onSubmitted()
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h3>Contribute to the show</h3>

      <label>
        Your name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          required
        />
      </label>

      <label>
        Amount (USD)
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="25.00"
          required
        />
      </label>

      <label>
        Firework request
        <select
          value={fireworkType}
          onChange={(e) => setFireworkType(e.target.value as FireworkType)}
        >
          {FIREWORK_TYPES.map((t) => (
            <option key={t} value={t}>
              {fireworkLabel(t)}
            </option>
          ))}
        </select>
      </label>

      {fireworkType === 'other' && (
        <label>
          Describe your firework
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="e.g. purple strobe rockets"
            required
          />
        </label>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="success">Contribution recorded — thank you! 🎆</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Contribute'}
      </button>
    </form>
  )
}
