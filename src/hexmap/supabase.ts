/**
 * Hexmap shares the one Supabase project with the rest of the site, so this is a
 * re-export rather than a second client.
 *
 * It is reached without signing in — players identify themselves by name and admin
 * is a PIN checked server-side by the `admin-action` Edge Function — so the requests
 * here are usually anonymous. They work either way: the table policies allow public
 * reads, and the RPCs are granted to `anon` and `authenticated` alike.
 */
export { supabase } from '../lib/supabase';
