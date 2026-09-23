/**
 * Hexcraft shares the one Supabase project and the one signed-in session with the
 * rest of Collections, so this is a re-export rather than a second client.
 *
 * It keeps the shape the Hexcraft code was written against — a possibly-absent
 * client plus a `supabaseConfigured` flag — because the shared client throws on a
 * missing key rather than returning null, and the graceful degradation those checks
 * give (custom skills still work without a database) is worth keeping.
 */
export { supabase } from '../../lib/supabase';

export const supabaseConfigured = true;
