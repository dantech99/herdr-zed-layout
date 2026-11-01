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

// The file whose diff View Diff shows: the selected one if it still has changes, else the first.
export function diffTarget(selected, files) {
  if (selected && files.some(file => file.path === selected)) return selected;
  return files[0]?.path ?? null;
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
