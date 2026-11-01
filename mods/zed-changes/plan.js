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

export function commitTask({ staged }) {
  const which = staged
    ? "Commit only the files that are already staged. Do not stage other files."
    : "Nothing is staged. Review the working tree and commit those changes.";
  return `Create one git commit in this repository. ${which} Use a conventional commit message and your default model. Do not pass a model flag. Do not push. Do not change git config.`;
}
