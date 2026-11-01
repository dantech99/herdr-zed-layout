// Pure helpers for the quota chips: parsing, severity and reset formatting.

const LABELS = { five_hour: "5h", seven_day: "7d" };

export const windowLabel = kind => LABELS[kind] ?? kind;

// Parses the sub-meter file Claude Code keeps in ~/.claude/plugins/store.
export function parseSubMeter(text) {
  let data;
  try { data = JSON.parse(text ?? ""); } catch { return []; }
  const limits = Array.isArray(data?.limits) ? data.limits : [];
  return limits
    .filter(l => typeof l?.kind === "string" && Number.isFinite(l?.percentUsed))
    .map(l => ({
      kind: l.kind,
      percent: Math.max(0, Math.min(100, l.percentUsed)),
      resetsAt: l.resetsAt,
    }));
}

// Theme status color name for a usage percentage.
export function severity(percent) {
  if (percent >= 90) return "unknown";
  if (percent >= 70) return "blocked";
  return "done";
}

export function formatReset(resetsAt, now = Date.now()) {
  const at = Date.parse(resetsAt ?? "");
  if (!Number.isFinite(at)) return "";
  const minutes = Math.floor((at - now) / 60000);
  if (minutes <= 0) return "now";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
