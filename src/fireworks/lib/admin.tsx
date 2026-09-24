import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'

/**
 * Admin is the hexmap's: a PIN sent to the `admin-action` Edge Function, which
 * checks it against the ADMIN_PIN secret and does the write with the service-role
 * key. The fireworks_ tables have no policies, so the browser cannot touch them
 * any other way.
 *
 * The PIN is kept in memory only — shared across the pages here, gone on refresh —
 * so changing the secret signs every admin out everywhere.
 */
interface AdminContextValue {
  pin: string | null
  verify: (pin: string) => Promise<boolean>
  logout: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [pin, setPin] = useState<string | null>(null)

  const verify = useCallback(async (candidate: string): Promise<boolean> => {
    try {
      await callAdminAction(candidate, 'verify_pin')
      setPin(candidate)
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => setPin(null), [])

  return <AdminContext.Provider value={{ pin, verify, logout }}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}

export async function callAdminAction<T = Record<string, unknown>>(
  pin: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-action', {
    body: { pin, action, payload },
  })
  if (error) {
    // A non-2xx reply arrives as an error whose body still holds the reason.
    const body = await (error as { context?: Response }).context?.json().catch(() => null)
    throw new Error((body as { error?: string } | null)?.error ?? error.message)
  }
  if (!data || (data as { ok?: boolean }).ok !== true) {
    throw new Error((data as { error?: string } | null)?.error ?? 'unknown error')
  }
  return data as T
}
