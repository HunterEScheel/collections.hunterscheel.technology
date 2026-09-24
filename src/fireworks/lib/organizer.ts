import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface Organizer {
  ready: boolean
  session: Session | null
  isAdmin: boolean
}

// Anyone signed in to the site carries a session here, so a session alone does not
// make someone an organizer — the fireworks_admins allowlist does. RLS enforces the
// same check server-side; this only decides what to show.
export function useOrganizer(): Organizer {
  const [state, setState] = useState<Organizer>({ ready: false, session: null, isAdmin: false })

  useEffect(() => {
    let current = 0

    async function resolve(session: Session | null) {
      const call = ++current
      let isAdmin = false
      if (session) {
        const { data } = await supabase.rpc('fireworks_is_admin')
        isAdmin = data === true
      }
      if (call === current) setState({ ready: true, session, isAdmin })
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session))
    // Deferred: calling back into supabase from inside the auth callback can deadlock
    // on the client's auth lock.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setTimeout(() => resolve(s), 0)
    })
    return () => {
      current = -1
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}
