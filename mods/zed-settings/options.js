// Pure helpers for the settings window (no Herdr imports, so they test outside the app).
// The quota defaults and the merge order mirror `options()` in mods/zed-quota/main.js: mods cannot
// import each other, so keep both in step.

export const QUOTA_DEFAULTS = { kinds: { session: true, weekly: true, monthly: true, model: false }, hidden: [], windows: {}, signedOut: false, names: false, remaining: false };

// Layout props are the starting point, what the user saved wins.
export function quotaOptions(start, saved) {
  const s = start ?? {}, v = saved ?? {};
  return { ...QUOTA_DEFAULTS, ...s, ...v, kinds: { ...QUOTA_DEFAULTS.kinds, ...(s.kinds ?? {}), ...(v.kinds ?? {}) } };
}

export function toggleHidden(hidden, id) {
  return hidden.includes(id) ? hidden.filter(x => x !== id) : [...hidden, id];
}

export function fileOptions(saved) {
  return { wrap: false, ...(saved ?? {}) };
}
