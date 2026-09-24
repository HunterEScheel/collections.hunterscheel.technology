/**
 * Firework Fund shares the one Supabase project with the rest of the site, so this
 * is a re-export rather than a second client.
 *
 * Nobody signs in here. Visitors unlock an event with its passcode, and every read
 * and write they make goes through a `security definer` RPC that checks it. Admin
 * is the hexmap's PIN, checked by the `admin-action` Edge Function (see `admin.tsx`).
 */
export { supabase } from '../../lib/supabase'
