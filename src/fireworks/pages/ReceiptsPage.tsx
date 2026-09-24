import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useEventSession } from '../lib/eventSession'
import { useOrganizer } from '../lib/organizer'
import { fireworkLabel, formatMoney } from '../lib/types'
import type { Contribution, Purchase } from '../lib/types'
import { PasscodeGate } from '../components/PasscodeGate'
import { AddPurchaseForm } from '../components/AddPurchaseForm'

export function ReceiptsPage() {
  return (
    <PasscodeGate>
      <ReceiptsContent />
    </PasscodeGate>
  )
}

function ReceiptsContent() {
  const { session, lock } = useEventSession()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [pledged, setPledged] = useState(0)
  // Organizers (signed in via /admin) can record purchases right here.
  const { isAdmin } = useOrganizer()
  const secret = session!.secret
  const eventId = session!.event.id

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.rpc('fireworks_get_purchases', { p_secret: secret }),
      supabase.rpc('fireworks_get_contributions', { p_secret: secret }),
    ])
    if (p.error?.message.includes('INVALID_SECRET') || c.error?.message.includes('INVALID_SECRET'))
      return lock()
    setPurchases((p.data ?? []) as Purchase[])
    setPledged(((c.data ?? []) as Contribution[]).reduce((sum, r) => sum + Number(r.amount), 0))
  }, [secret, lock])

  useEffect(() => {
    load()
  }, [load])

  // cost is per unit; line total = cost * quantity
  const spent = purchases.reduce((sum, p) => sum + Number(p.cost) * p.quantity, 0)

  return (
    <div className="page">
      <div className="stats">
        <div className="card stat">
          <span className="muted">Pledged</span>
          <span className="total">{formatMoney(pledged)}</span>
        </div>
        <div className="card stat">
          <span className="muted">Spent</span>
          <span className="total">{formatMoney(spent)}</span>
        </div>
        <div className="card stat">
          <span className="muted">Remaining</span>
          <span className="total">{formatMoney(pledged - spent)}</span>
        </div>
      </div>

      <div className="card">
        <h3>Fireworks purchased</h3>
        {purchases.length === 0 ? (
          <p className="muted">Nothing purchased yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Cost per unit</th>
                  <th>Total</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td>{p.item_name}</td>
                    <td>{p.firework_type ? fireworkLabel(p.firework_type) : '—'}</td>
                    <td>{p.quantity}</td>
                    <td>{formatMoney(Number(p.cost))}</td>
                    <td>{formatMoney(Number(p.cost) * p.quantity)}</td>
                    <td className="muted">{p.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdmin && <AddPurchaseForm eventId={eventId} onAdded={load} />}
    </div>
  )
}
