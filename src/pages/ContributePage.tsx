import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useEventSession } from '../lib/eventSession'
import { fireworkLabel, formatMoney } from '../lib/types'
import type { Contribution } from '../lib/types'
import { ContributionForm } from '../components/ContributionForm'
import { PasscodeGate } from '../components/PasscodeGate'

export function ContributePage() {
  return (
    <PasscodeGate>
      <ContributeContent />
    </PasscodeGate>
  )
}

function ContributeContent() {
  const { session, lock } = useEventSession()
  const [contributions, setContributions] = useState<Contribution[]>([])
  const secret = session!.secret

  const loadContributions = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_contributions', { p_secret: secret })
    if (error?.message.includes('INVALID_SECRET')) return lock()
    setContributions((data ?? []) as Contribution[])
  }, [secret, lock])

  useEffect(() => {
    loadContributions()
  }, [loadContributions])

  const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0)

  return (
    <div className="page">
      {session!.event.description && <p className="muted">{session!.event.description}</p>}

      <div className="columns">
        <ContributionForm
          secret={secret}
          contributorName={session!.name}
          onSubmitted={loadContributions}
          onInvalidSecret={lock}
        />

        <div className="card">
          <h3>
            Raised so far: <span className="total">{formatMoney(total)}</span>
          </h3>
          {contributions.length === 0 ? (
            <p className="muted">No contributions yet — be the first!</p>
          ) : (
            <ul className="list">
              {contributions.map((c) => (
                <li key={c.id}>
                  <strong>{c.contributor_name}</strong> gave {formatMoney(Number(c.amount))}
                  <span className="muted"> · wants {fireworkLabel(c.firework_type)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
