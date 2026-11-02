// Pure helpers for the diff tab (no Herdr imports, so they test outside the app).

export const MAX_ROWS = 4000;

// Unified diff text -> rows { kind: "hunk" | "add" | "del" | "ctx", old, new, text }.
// Everything before the first "@@" (the headers) is dropped.
export function parseDiff(text) {
  const rows = [];
  let oldNo = 0, newNo = 0, inHunk = false;
  for (const line of String(text ?? "").replace(/\n$/, "").split("\n")) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      oldNo = Number(hunk[1]); newNo = Number(hunk[2]); inHunk = true;
      rows.push({ kind: "hunk", old: null, new: null, text: line });
    } else if (!inHunk || line.startsWith("\\")) continue; // headers, "\ No newline at end of file"
    else if (line.startsWith("+")) rows.push({ kind: "add", old: null, new: newNo++, text: line.slice(1) });
    else if (line.startsWith("-")) rows.push({ kind: "del", old: oldNo++, new: null, text: line.slice(1) });
    else rows.push({ kind: "ctx", old: oldNo++, new: newNo++, text: line.slice(1) });
    if (rows.length >= MAX_ROWS) break;
  }
  return rows;
}

// The text of a new (untracked) file as an all-added diff.
export function addedRows(text) {
  const lines = String(text ?? "").replace(/\n$/, "").split("\n").slice(0, MAX_ROWS);
  return lines.map((line, i) => ({ kind: "add", old: null, new: i + 1, text: line }));
}

export const countRows = rows => ({
  added: rows.filter(r => r.kind === "add").length,
  removed: rows.filter(r => r.kind === "del").length,
});

const KEYWORDS = new Set(("abstract as async await break case catch class const continue def default defer delete do elif else enum " +
  "except export extends fn for from func function go if impl import in interface lambda let match mod new of package pass pub " +
  "raise return self static struct super switch this throw trait try type use var void while with yield").split(" "));
const CONSTANTS = new Set(["true", "false", "null", "nil", "None", "True", "False", "undefined", "NaN"]);

const LINE_COMMENT = { py: "#", rb: "#", sh: "#", bash: "#", zsh: "#", yaml: "#", yml: "#", toml: "#", conf: "#", sql: "--", lua: "--", hs: "--" };

// Splits one line into [{ text, kind }] with kind in keyword, string, comment, function, type,
// number, constant or null (plain). Not a parser: it colors the common shapes line by line.
export function tokenize(line, ext) {
  const out = [], marker = LINE_COMMENT[ext] ?? "//";
  const push = (text, kind) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text; else out.push({ text, kind });
  };
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i), c = line[i];
    if (rest.startsWith(marker) || (marker === "//" && rest.startsWith("/*")) || (marker === "//" && /^\s*\*/.test(line) && i === 0)) {
      push(rest, "comment"); break;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== c) j += line[j] === "\\" ? 2 : 1;
      push(line.slice(i, j + 1), "string"); i = j + 1; continue;
    }
    const num = /^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?)/.exec(rest);
    if (num && !/\w/.test(line[i - 1] ?? "")) { push(num[0], "number"); i += num[0].length; continue; }
    const word = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (word) {
      const w = word[0], next = line[i + w.length];
      const kind = KEYWORDS.has(w) ? "keyword" : CONSTANTS.has(w) ? "constant" : /^[A-Z]/.test(w) ? "type"
        : next === "(" ? "function" : null;
      push(w, kind); i += w.length; continue;
    }
    push(c, null); i += 1;
  }
  return out;
}

// Tokens cut into words and runs of spaces, so a wrapping row can break between them.
export function pieces(tokens) {
  return tokens.flatMap(tok => (tok.text.match(/\s+|\S+/g) ?? []).map(text => ({ text, kind: tok.kind })));
}
