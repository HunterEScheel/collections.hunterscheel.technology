import { useState, useCallback } from "react";
import { supabase } from "../supabase";

/**
 * Admin auth is server-validated. The PIN is held by the user, sent to the
 * `admin-action` Edge Function which checks it against the ADMIN_PIN secret.
 * On success the PIN is kept in memory for the session and attached to every
 * subsequent admin write. Logout / page refresh drops it.
 *
 * Nothing about admin lives in the browser bundle anymore — flipping the
 * Supabase secret instantly invalidates every active admin everywhere.
 */
export function useAdminMode() {
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  const promptPin = useCallback(() => {
    setShowPinModal(true);
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-action", {
        body: { pin, action: "verify_pin" },
      });
      if (error) return false;
      if ((data as { ok?: boolean })?.ok !== true) return false;
      setAdminPin(pin);
      setShowPinModal(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const closePinModal = useCallback(() => {
    setShowPinModal(false);
  }, []);

  const logout = useCallback(() => {
    setAdminPin(null);
  }, []);

  return {
    isAdmin: adminPin != null,
    adminPin,
    showPinModal,
    promptPin,
    verifyPin,
    closePinModal,
    logout,
  };
}
