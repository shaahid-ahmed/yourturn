// HeyPal intro timeline (brief part 5). Every duration, delay and
// distance lives here so the sequence can be tuned by eye.
export const HOLD_HEYPAL_MS = 2600;
export const SCENE_HOLD_MS = 1100;
export const SCENE_CROSSFADE_MS = 300;

// Full-sequence beats, in milliseconds from the start.
export const INTRO_BEATS = {
  stageReady: 400,
  payPalIn: 1700,
  payOut: 2700,
  heyIn: 3400,
  heyPalHeldUntil: 6000,
  washUntil: 6900,
  cascadeUntil: 12400,
  loginUntil: 13700,
} as const;

// Short mode for signed-in visitors: beats 0 to 4 compressed.
export const SHORT_HEYPAL_HOLD_MS = 1400;
export const SHORT_INTRO_TOTAL_MS = 3600;
