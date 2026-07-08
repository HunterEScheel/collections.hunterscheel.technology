import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'
import type { PublicEvent } from './types'

interface EventSession {
  event: PublicEvent
  secret: string
}

interface EventSessionContextValue {
  session: EventSession | null
  unlock: (secret: string) => Promise<string | null> // returns error message or null
  lock: () => void
}

const EventSessionContext = createContext<EventSessionContextValue | null>(null)

const STORAGE_KEY = 'ff-event-session'

function readStored(): EventSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as EventSession) : null
  } catch {
    return null
  }
}

export function EventSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<EventSession | null>(readStored)

  const unlock = useCallback(async (secret: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc('get_event_by_secret', { p_secret: secret })
    if (error) return `Something went wrong: ${error.message}`
    const rows = (data ?? []) as PublicEvent[]
    if (rows.length === 0) return 'Wrong passcode — check with the event organizer.'
    const next = { event: rows[0], secret }
    setSession(next)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return null
  }, [])

  const lock = useCallback(() => {
    setSession(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <EventSessionContext.Provider value={{ session, unlock, lock }}>
      {children}
    </EventSessionContext.Provider>
  )
}

export function useEventSession(): EventSessionContextValue {
  const ctx = useContext(EventSessionContext)
  if (!ctx) throw new Error('useEventSession must be used within EventSessionProvider')
  return ctx
}
