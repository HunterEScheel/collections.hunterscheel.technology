import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useEventSession } from '../lib/eventSession'
import { fireworkLabel, formatMoney } from '../lib/types'
import type { Contribution, Purchase } from '../lib/types'
import { PasscodeGate } from '../components/PasscodeGate'

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
  const secret = session!.secret

  useEffect(() => {
    supabase.rpc('get_purchases', { p_secret: secret }).then(({ data, error }) => {
      if (error?.message.includes('INVALID_SECRET')) return lock()
      setPurchases((data ?? []) as Purchase[])
    })
    supabase.rpc('get_contributions', { p_secret: secret }).then(({ data, error }) => {
      if (error?.message.includes('INVALID_SECRET')) return lock()
      const rows = (data ?? []) as Contribution[]
      setPledged(rows.reduce((sum, r) => sum + Number(r.amount), 0))
    })
  }, [secret, lock])

  const spent = purchases.reduce((sum, p) => sum + Number(p.cost), 0)

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
                  <th>Cost</th>
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
                    <td className="muted">{p.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
