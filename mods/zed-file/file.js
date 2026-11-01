// Pure helpers for the file tabs (no Herdr imports, so they test outside the app).

export const MAX_CHARS = 400000;

// Extensions the editor has no grammar for, mapped to one it has (as the Files preview does).
const LANG = { ts: "js", tsx: "js", mts: "js", cts: "js", jsx: "js", mjs: "js", toml: "yaml", jsonc: "json", svelte: "html", vue: "html" };

const baseName = path => String(path ?? "").split(/[\\/]/).pop();

export function languageFor(path) {
  const name = baseName(path), dot = name.lastIndexOf(".");
  if (dot < 1) return "txt";
  const ext = name.slice(dot + 1).toLowerCase();
  return LANG[ext] ?? ext;
}

// What to show for the text readTextFile returned (null = gone or unreadable).
export function prepare(text) {
  if (text === null || text === undefined) return { kind: "missing", text: "" };
  if (text.includes("\0")) return { kind: "binary", text: "" };
  if (text.length > MAX_CHARS) return { kind: "ok", text: text.slice(0, MAX_CHARS), truncated: true };
  return { kind: "ok", text, truncated: false };
}

export function shortPath(path, home) {
  if (home && path === home) return "~";
  return home && path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}
