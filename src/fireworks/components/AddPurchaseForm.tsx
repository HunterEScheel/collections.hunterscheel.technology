import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { FIREWORK_TYPES, fireworkLabel, formatMoney } from '../lib/types'
import type { FireworkType } from '../lib/types'

interface Props {
  eventId: string
  onAdded: () => void
}

/** Admin-only: record a firework purchase for the given event. */
export function AddPurchaseForm({ eventId, onAdded }: Props) {
  const [itemName, setItemName] = useState('')
  const [fireworkType, setFireworkType] = useState<FireworkType | ''>('')
  const [cost, setCost] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const parsedCost = Number(cost)
    const parsedQty = Number(quantity)
    if (!itemName.trim()) return setError('Item name is required.')
    if (Number.isNaN(parsedCost) || parsedCost < 0) return setError('Enter a valid cost.')
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) return setError('Enter a valid quantity.')

    setSubmitting(true)
    const { error: err } = await supabase.from('fireworks_purchases').insert({
      event_id: eventId,
      item_name: itemName.trim(),
      firework_type: fireworkType || null,
      cost: parsedCost,
      quantity: parsedQty,
      notes: notes.trim() || null,
    })
    setSubmitting(false)
    if (err) return setError(err.message)
    setItemName('')
    setFireworkType('')
    setCost('')
    setQuantity('1')
    setNotes('')
    setSuccess(true)
    onAdded()
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h3>Add purchase (admin)</h3>
      <label>
        Item name
        <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder='Willow shell 3"' required />
      </label>
      <label>
        Firework type
        <select value={fireworkType} onChange={(e) => setFireworkType(e.target.value as FireworkType | '')}>
          <option value="">— none —</option>
          {FIREWORK_TYPES.map((t) => (
            <option key={t} value={t}>
              {fireworkLabel(t)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cost per unit (USD)
        <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="12.99" required />
      </label>
      <label>
        Qty
        <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </label>
      {Number(cost) > 0 && Number(quantity) > 0 && (
        <p className="muted">Total: {formatMoney(Number(cost) * Number(quantity))}</p>
      )}
      <label>
        Notes
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">Purchase recorded.</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving…' : 'Add purchase'}
      </button>
    </form>
  )
}
