// Git panel decisions. Commit tracked never stages; that is a separate action.

export function parseStatus(text) {
  return text.split("\0").filter(Boolean).map(entry => {
    const xy = entry.slice(0, 2);
    return { path: entry.slice(3), xy, staged: xy[0] !== " " && xy[0] !== "?" };
  });
}

export function stagePlan(file) {
  if (file.xy[0] !== " " && file.xy[0] !== "?" && file.xy[1] === " ") return ["restore", "--staged", "--", file.path];
  return ["add", "--", file.path];
}

export function stageAllPlan() {
  return ["add", "-A"];
}

export function commitPlan(message, files) {
  const text = (message ?? "").trim();
  if (!text) return { error: "Enter a commit message." };
  if (!files.some(file => file.staged)) return { error: "Nothing staged." };
  return { args: ["commit", "-m", text] };
}

export const MAX_CHANGES = 5000;

// What the panel calls the current branch. `symbolic` is the branch name from `symbolic-ref` (it
// works before the first commit); `hasCommits` is false for a repository with none yet.
export function branchLabel(symbolic, hasCommits) {
  if (!symbolic) return "detached";
  return hasCommits ? symbolic : `${symbolic} · no commits yet`;
}

// A folder the panel should not list: the home directory (an accidental repository there sees
// everything under it) or more changes than anyone reviews in a side panel.
export function tooManyChanges(root, home, count) {
  return (Boolean(home) && root === home) || count > MAX_CHANGES;
}

// `git for-each-ref` format for the branch picker: "<* or space>\t<full ref>\t<author>\t<age>\t<subject>".
export const BRANCH_FORMAT = "%(HEAD)%09%(refname)%09%(authorname)%09%(committerdate:relative)%09%(contents:subject)";

// Local branches (as git sorted them), then remote branches that have no local one yet.
export function parseBranches(text) {
  const local = [], remote = [];
  for (const line of String(text).split("\n")) {
    const [head, ref, author = "", age = "", ...subject] = line.split("\t");
    if (!ref) continue;
    const info = { author, age, subject: subject.join("\t") };
    if (ref.startsWith("refs/heads/")) local.push({ name: ref.slice(11), current: head === "*", remote: null, ...info });
    else if (ref.startsWith("refs/remotes/")) {
      const [name, ...rest] = ref.slice(13).split("/"), branch = rest.join("/");
      if (branch && branch !== "HEAD") remote.push({ name: branch, current: false, remote: name, ...info });
    }
  }
  const have = new Set(local.map(b => b.name)), seen = new Set();
  return [...local, ...remote.filter(b => !have.has(b.name) && !seen.has(b.name) && seen.add(b.name))];
}

// A name starting with "-" must not be read as an option.
export const switchArgs = name => name.startsWith("-") ? ["switch", "--", name] : ["switch", name];

// One click deletes, as in Zed: `-D`, so a branch git calls unmerged goes too (the note tells how to restore it).
export const deleteArgs = name => ["branch", "-D", "--", name];

export function deletedNote(name, stdout) {
  const hash = /\(was ([0-9a-f]+)\)/.exec(String(stdout ?? ""))?.[1];
  return hash ? `Deleted ${name}. To restore it: git branch ${name} ${hash}` : `Deleted ${name}.`;
}

// Remote branches are never deleted from here, and git refuses the current one.
export const canDelete = branch => !branch.current && !branch.remote;

export function filterBranches(branches, query) {
  const q = String(query ?? "").trim().toLowerCase();
  return q ? branches.filter(b => `${b.remote ? `${b.remote}/` : ""}${b.name}`.toLowerCase().includes(q)) : branches;
}

// Typing a name that no branch has yet offers to create it; a name starting with "-" is not a branch.
export const canCreate = (branches, query) => {
  const name = String(query ?? "").trim();
  return name !== "" && !name.startsWith("-") && !branches.some(b => b.name === name);
};

export const createArgs = name => ["switch", "-c", name.trim()];

// Commits of `name` that no remote has: deleting the branch would lose them.
export const unpushedArgs = name => ["rev-list", "--count", name, "--not", "--remotes"];

export const parseCount = stdout => { const n = Number.parseInt(String(stdout ?? "").trim(), 10); return Number.isFinite(n) && n > 0 ? n : 0; };

export const LIST_MAX = 340;

// Height of the branch list in px: a heading per section, a row per branch, one more row to create
// a branch; past LIST_MAX the list scrolls inside that height.
export function listHeight(branches, creating = false) {
  const local = branches.filter(b => !b.remote).length, remote = branches.length - local;
  const px = (local ? 30 + local * 52 : 0) + (remote ? 30 + remote * 52 : 0) + (creating ? 40 : 0);
  return Math.min(LIST_MAX, px);
}

// Entries of the sync menu, in order; `-` is a separator.
export const SYNC_MENU = [
  ["fetch", "Fetch"], ["fetch-from", "Fetch From…"], ["pull", "Pull"], ["pull-rebase", "Pull (Rebase)"],
  "-", ["push", "Push"], ["push-to", "Push To…"], ["force-push", "Force Push"],
];

export const needsRemote = op => op === "fetch-from" || op === "push-to";
export const isForce = op => op === "force-push";

// The git arguments of a menu entry (null for anything else). `upstream`: the branch tracks one;
// without it a push publishes the branch and sets its upstream. A force push uses --force-with-lease,
// which refuses to overwrite commits someone else pushed since the last fetch.
export function syncArgs(op, { remote, upstream } = {}) {
  const publish = remote2 => ["--set-upstream", remote2, "HEAD"];
  switch (op) {
    case "fetch": return ["fetch"];
    case "fetch-from": return ["fetch", remote];
    case "pull": return ["pull", "--no-edit"];
    case "pull-rebase": return ["pull", "--rebase"];
    case "push": return upstream ? ["push"] : ["push", ...publish(remote ?? "origin")];
    case "push-to": return upstream ? ["push", remote, "HEAD"] : ["push", ...publish(remote)];
    case "force-push": return upstream ? ["push", "--force-with-lease"] : ["push", "--force-with-lease", ...publish(remote ?? "origin")];
    default: return null;
  }
}

// `git rev-list --left-right --count @{upstream}...HEAD` prints "<behind>\t<ahead>".
export function parseAheadBehind(stdout) {
  const m = /^(\d+)\s+(\d+)$/.exec(String(stdout ?? "").trim());
  return m ? { behind: Number(m[1]), ahead: Number(m[2]) } : null;
}

// The button beside the branch name: publish a new branch, pull when behind, push when ahead, else fetch.
export function primaryAction({ remotes, upstream, ahead, behind }) {
  if (!remotes.length) return null;
  if (!upstream) return { op: "push", label: "Publish" };
  if (behind > 0) return { op: "pull", label: `Pull ↓${behind}` };
  if (ahead > 0) return { op: "push", label: `Push ↑${ahead}` };
  return { op: "fetch", label: "Fetch" };
}

// One line of what git said: it writes progress to stderr, so that comes first.
export function summarize(stdout, stderr) {
  const text = String(stderr ?? "").trim() || String(stdout ?? "").trim();
  return text ? text.split("\n").slice(0, 3).map(l => l.trim()).join(" ") : "Done";
}

// --- Right-click menu of a changed file.
export const isUntracked = file => file.xy === "??";
export const isDeleted = file => file.xy.includes("D");
const isStagedOnly = file => file.xy[0] !== " " && file.xy[0] !== "?" && file.xy[1] === " ";

// The entries, in order; "-" is a divider. `enabled` is false when the action does not apply
// (ignore entries need an untracked file, View File needs a file that still exists).
export function fileMenu(file) {
  return [
    { id: "stage", label: isStagedOnly(file) ? "Unstage File" : "Stage File", enabled: true },
    { id: "discard", label: "Discard Changes", enabled: true },
    "-",
    { id: "copy-path", label: "Copy Path", enabled: true },
    { id: "copy-relative", label: "Copy Relative Path", enabled: true },
    "-",
    { id: "gitignore", label: "Add to .gitignore", enabled: isUntracked(file) },
    { id: "exclude", label: "Add to .git/info/exclude", enabled: isUntracked(file) },
    "-",
    { id: "open-diff", label: "Open Diff", enabled: true },
    { id: "view-file", label: "View File", enabled: !isDeleted(file) },
  ];
}

// Throws the change away: tracked files go back to HEAD (index and work tree), new files are removed.
export const discardArgs = file => isUntracked(file)
  ? ["clean", "-f", "--", file.path]
  : ["restore", "--source=HEAD", "--staged", "--worktree", "--", file.path];

export const discardNote = file => isUntracked(file)
  ? "This file is new: it will be deleted and git cannot bring it back."
  : "Your edits to this file, staged or not, are lost and cannot be recovered.";

// The line that makes git ignore exactly this file: anchored to the root (so a leading # or ! is literal), glob characters escaped.
export const ignoreLine = path => `/${String(path).replace(/[\\*?[\]]/g, "\\$&")}`;

// Appends `line` to a file, creating it (and its folder) when needed, and never twice.
export const appendLineScript = 'f="$1"; mkdir -p "$(dirname "$f")"; touch "$f"; grep -qxF -- "$2" "$f" || { [ -s "$f" ] && [ -n "$(tail -c1 "$f")" ] && echo >> "$f"; printf "%s\\n" "$2" >> "$f"; }';

// --- Pull requests (gh). Create or view one for the current branch.
export const pickRemote = remotes => remotes.includes("origin") ? "origin" : remotes[0] ?? null;

// What the PR button shows. `defaultBranch` is null when gh is missing or signed out: no button then.
// `url` is the open PR of this branch, if any.
export function prState({ branch, defaultBranch, ahead, upstream, remotes, url }) {
  if (!branch || !defaultBranch || branch === defaultBranch || !remotes.length) return null;
  if (url) return { kind: "view", url };
  return ahead > 0 || !upstream ? { kind: "create" } : null;
}

// `gh pr view --json url,state`: the URL of an open PR, else null (a merged or closed one allows a new PR).
export function parsePrView(stdout) {
  try { const pr = JSON.parse(stdout); return pr?.state === "OPEN" && pr.url ? pr.url : null; } catch { return null; }
}

// `gh pr create` prints progress first and the PR URL last.
export function parsePrUrl(stdout) {
  const lines = String(stdout ?? "").split("\n").map(l => l.trim()).filter(l => /^https:\/\/\S+$/.test(l));
  return lines.length ? lines[lines.length - 1] : null;
}

export function prCreateArgs({ title, body, draft }) {
  if (!String(title ?? "").trim()) return { error: "Enter a title." };
  return ["pr", "create", "--title", title.trim(), "--body", String(body ?? "").trim(), ...(draft ? ["--draft"] : [])];
}

// `git log -1 --format=%s%x00%b`: the last commit's subject and body prefill the dialog.
export function prDefaults(text) {
  const [subject = "", body = ""] = String(text ?? "").split("\0");
  return { title: subject.trim(), body: body.trim() };
}
