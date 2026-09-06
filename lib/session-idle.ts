/** No pointer/keyboard activity for this long → pause non-live polls (Neon can suspend). */
export const SESSION_IDLE_PAUSE_POLLS_MS = 5 * 60 * 1000;

/** Still idle after this → sign out and clear session. */
export const SESSION_IDLE_LOGOUT_MS = 30 * 60 * 1000;

export const SESSION_IDLE_ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "touchstart",
  "scroll",
  "mousemove",
] as const;
