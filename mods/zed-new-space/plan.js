// Decides what Create does. A branch is a worktree; otherwise it is a space.

export function startingFolder({ on, cwd, homeDir }) {
  if (!on && cwd) return cwd;
  if (on) return "";
  return homeDir ?? "";
}

export function planNewSpace({ folder, branch, agent, on }) {
  const trimmedFolder = (folder ?? "").trim();
  const trimmedBranch = (branch ?? "").trim();
  if (!trimmedFolder && !on) return { error: "Choose a folder." };
  const argv = agent?.run;
  if (trimmedBranch) {
    return {
      overlay: {
        mod: "worktree",
        kind: "dialog",
        width: 460,
        height: 280,
        props: { folder: trimmedFolder, machine: on ?? undefined, branch: trimmedBranch, argv },
      },
    };
  }
  const args = {};
  if (trimmedFolder) args.folder = trimmedFolder;
  if (on) args.machine = on;
  if (argv) args.argv = argv;
  return { command: "space.new", args };
}
