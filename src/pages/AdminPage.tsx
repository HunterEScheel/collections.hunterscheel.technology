import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { FIREWORK_TYPES, fireworkLabel } from '../lib/types'
import type { AdminEvent, FireworkType } from '../lib/types'
import { LoginForm } from '../components/LoginForm'

export function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!authReady) return <p className="muted">Loading…</p>
  if (!session) return <LoginForm />
  return <AdminDashboard email={session.user.email ?? ''} />
}

function AdminDashboard({ email }: { email: string }) {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true, nullsFirst: false })
    if (err) setError(err.message)
    else setEvents((data ?? []) as AdminEvent[])
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  return (
    <div className="page">
      <div className="admin-bar">
        <span className="muted">Signed in as {email}</span>
        <button className="secondary" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="columns">
        <CreateEventForm onCreated={loadEvents} />
        <div className="card">
          <h3>Events</h3>
          {events.length === 0 ? (
            <p className="muted">No events yet — create one.</p>
          ) : (
            <ul className="list">
              {events.map((ev) => (
                <li key={ev.id}>
                  <strong>{ev.name}</strong>
                  {ev.event_date && <span className="muted"> · {ev.event_date}</span>}
                  <span className="muted"> · secret: </span>
                  <code>{ev.secret}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {events.length > 0 && <AddPurchaseForm events={events} />}
    </div>
  )
}

function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: err } = await supabase.from('events').insert({
      name: name.trim(),
      event_date: date || null,
      description: description.trim() || null,
      secret,
    })
    setSubmitting(false)
    if (err) return setError(err.message)
    setName('')
    setDate('')
    setDescription('')
    setSecret('')
    onCreated()
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h3>Create event</h3>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="4th of July 2026" required />
      </label>
      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <label>
        Event secret
        <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Share with contributors" required />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create event'}
      </button>
    </form>
  )
}

function AddPurchaseForm({ events }: { events: AdminEvent[] }) {
  const [eventId, setEventId] = useState(events[0].id)
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
    const { error: err } = await supabase.from('purchases').insert({
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
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h3>Add purchase (receipt)</h3>
      <label>
        Event
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </label>
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
        Cost (USD)
        <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required />
      </label>
      <label>
        Quantity
        <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </label>
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
