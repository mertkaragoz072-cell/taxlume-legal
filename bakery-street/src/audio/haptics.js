// Vibration wrapper: does nothing (and never throws) when disabled in settings or unsupported by the device.
export function vibrationSupported(nav = typeof navigator !== 'undefined' ? navigator : null) {
  return !!nav && typeof nav.vibrate === 'function';
}

/** @returns {boolean} true when a vibration was requested */
export function vibrate(settings, pattern = 20, nav = typeof navigator !== 'undefined' ? navigator : null) {
  if (!settings.vibration || !vibrationSupported(nav)) return false;
  try { nav.vibrate(pattern); return true; } catch { return false; }
}
