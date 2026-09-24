import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganizer } from '../lib/organizer'
import { fireworkLabel, formatMoney } from '../lib/types'
import type { AdminEvent, Contribution, Purchase } from '../lib/types'
import { LoginForm } from '../components/LoginForm'

export function AdminPage() {
  const { ready, session, isAdmin } = useOrganizer()

  if (!ready) return <p className="muted">Loading…</p>
  if (!session) return <LoginForm />
  if (!isAdmin) return <NotAnOrganizer email={session.user.email ?? ''} />
  return <AdminDashboard email={session.user.email ?? ''} />
}

function NotAnOrganizer({ email }: { email: string }) {
  return (
    <div className="card login-form">
      <h3>Not an organizer</h3>
      <p className="muted">
        {email || 'This account'} is signed in but isn&apos;t on the organizer list. Ask the
        site owner to add you, or sign in with another account.
      </p>
      <button className="secondary" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </div>
  )
}

function AdminDashboard({ email }: { email: string }) {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('fireworks_events')
      .select('*')
      .order('event_date', { ascending: true, nullsFirst: false })
    if (err) setError(err.message)
    else setEvents((data ?? []) as AdminEvent[])
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  async function deleteEvent(ev: AdminEvent) {
    if (!confirm(`Delete "${ev.name}" and ALL of its contributions and purchases? This cannot be undone.`))
      return
    const { error: err } = await supabase.from('fireworks_events').delete().eq('id', ev.id)
    if (err) setError(err.message)
    else loadEvents()
  }

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
                  <button className="row-del" onClick={() => deleteEvent(ev)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {events.length > 0 && <ManageEventData events={events} />}
      <p className="muted">
        To record purchases, unlock the event on the Receipts page while signed in — the
        add-purchase form appears there.
      </p>
    </div>
  )
}

function ManageEventData({ events }: { events: AdminEvent[] }) {
  const [eventId, setEventId] = useState(events[0].id)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [error, setError] = useState<string | null>(null)

  // Keep selection valid when the selected event gets deleted.
  useEffect(() => {
    if (!events.some((e) => e.id === eventId)) setEventId(events[0].id)
  }, [events, eventId])

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabase.from('fireworks_contributions').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
      supabase.from('fireworks_purchases').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
    ])
    if (c.error || p.error) return setError((c.error ?? p.error)!.message)
    setError(null)
    setContributions((c.data ?? []) as Contribution[])
    setPurchases((p.data ?? []) as Purchase[])
  }, [eventId])

  useEffect(() => {
    load()
  }, [load])

  async function deleteRow(table: 'fireworks_contributions' | 'fireworks_purchases', id: string) {
    const { error: err } = await supabase.from(table).delete().eq('id', id)
    if (err) setError(err.message)
    else load()
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
                  <button className="row-del" onClick={() => deleteRow('fireworks_contributions', c.id)}>
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
                  <button className="row-del" onClick={() => deleteRow('fireworks_purchases', p.id)}>
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
    const { error: err } = await supabase.from('fireworks_events').insert({
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
