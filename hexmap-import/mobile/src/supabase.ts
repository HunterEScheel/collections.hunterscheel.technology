import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import Config from "react-native-config";

const url = Config.SUPABASE_URL ?? "";
const key = Config.SUPABASE_PUBLISHABLE_KEY ?? "";

if (!url || !key) {
  console.warn(
    "Supabase config missing — set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in mobile/.env"
  );
}

// No user auth in hexmap — anon key only, nothing to persist.
export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
