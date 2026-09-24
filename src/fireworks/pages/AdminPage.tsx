import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { callAdminAction, useAdmin } from '../lib/admin'
import { fireworkLabel, formatMoney } from '../lib/types'
import type { AdminEvent, Contribution, Purchase } from '../lib/types'
import { PinForm } from '../components/PinForm'

export function AdminPage() {
  const { pin } = useAdmin()
  if (!pin) return <PinForm />
  return <AdminDashboard pin={pin} />
}

function AdminDashboard({ pin }: { pin: string }) {
  const { logout } = useAdmin()
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      const { events } = await callAdminAction<{ events: AdminEvent[] }>(pin, 'fireworks_list_events')
      setEvents(events)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [pin])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  async function deleteEvent(ev: AdminEvent) {
    if (!confirm(`Delete "${ev.name}" and ALL of its contributions and purchases? This cannot be undone.`))
      return
    try {
      await callAdminAction(pin, 'fireworks_delete_event', { id: ev.id })
      loadEvents()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="page">
      <div className="admin-bar">
        <span className="muted">Admin unlocked</span>
        <button className="secondary" onClick={logout}>
          Lock
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="columns">
        <CreateEventForm pin={pin} onCreated={loadEvents} />
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
                  <button className="row-del" onClick={() => deleteEvent(ev)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {events.length > 0 && <ManageEventData pin={pin} events={events} />}
      <p className="muted">
        To record purchases, unlock the event on the Receipts page while signed in — the
        add-purchase form appears there.
      </p>
    </div>
  )
}

function ManageEventData({ pin, events }: { pin: string; events: AdminEvent[] }) {
  const [eventId, setEventId] = useState(events[0].id)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [error, setError] = useState<string | null>(null)

  // Keep selection valid when the selected event gets deleted.
  useEffect(() => {
    if (!events.some((e) => e.id === eventId)) setEventId(events[0].id)
  }, [events, eventId])

  const load = useCallback(async () => {
    try {
      const data = await callAdminAction<{ contributions: Contribution[]; purchases: Purchase[] }>(
        pin,
        'fireworks_list_event_data',
        { eventId },
      )
      setError(null)
      setContributions(data.contributions)
      setPurchases(data.purchases)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [pin, eventId])

  useEffect(() => {
    load()
  }, [load])

  async function deleteRow(kind: 'contribution' | 'purchase', id: string) {
    try {
      await callAdminAction(pin, `fireworks_delete_${kind}`, { id })
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="card">
      <h3>Manage event data</h3>
      <label className="event-picker">
        Event
        <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error">{error}</p>}

      <div className="columns" style={{ marginTop: 16 }}>
        <div>
          <h4>Contributions</h4>
          {contributions.length === 0 ? (
            <p className="muted">None.</p>
          ) : (
            <ul className="list">
              {contributions.map((c) => (
                <li key={c.id}>
                  <strong>{c.contributor_name}</strong> — {formatMoney(Number(c.amount))}
                  <span className="muted"> · {fireworkLabel(c.firework_type, c.firework_other)}</span>
                  <button className="row-del" onClick={() => deleteRow('contribution', c.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4>Purchases</h4>
          {purchases.length === 0 ? (
            <p className="muted">None.</p>
          ) : (
            <ul className="list">
              {purchases.map((p) => (
                <li key={p.id}>
                  <strong>{p.item_name}</strong> — {p.quantity} × {formatMoney(Number(p.cost))}
                  {p.firework_type && <span className="muted"> · {fireworkLabel(p.firework_type)}</span>}
                  <button className="row-del" onClick={() => deleteRow('purchase', p.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateEventForm({ pin, onCreated }: { pin: string; onCreated: () => void }) {
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
    try {
      await callAdminAction(pin, 'fireworks_create_event', {
        name: name.trim(),
        eventDate: date || null,
        description: description.trim() || null,
        secret,
      })
    } catch (err) {
      setSubmitting(false)
      return setError((err as Error).message)
    }
    setSubmitting(false)
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
