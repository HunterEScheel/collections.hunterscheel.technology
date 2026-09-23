// TextInputs rendered inside the system-overlay window can only summon the
// keyboard while the window is focusable; toggle the flag around focus.
import { Overlay } from "../native/Overlay";

export const focusableProps = {
  onFocus: () => Overlay.setOverlayFocusable(true),
  onBlur: () => Overlay.setOverlayFocusable(false),
};
