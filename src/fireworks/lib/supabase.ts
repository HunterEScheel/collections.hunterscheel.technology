/**
 * Firework Fund shares the one Supabase project with the rest of the site, so this
 * is a re-export rather than a second client.
 *
 * Visitors never sign in — they unlock an event with its passcode, and every read
 * and write goes through a `security definer` RPC that checks it. Only organizers
 * sign in, and being signed in is not enough: the session is shared with the rest
 * of the site, so admin access is decided by the `fireworks_admins` allowlist (see
 * `useOrganizer`).
 */
export { supabase } from '../../lib/supabase'
