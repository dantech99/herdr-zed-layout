// The right-click menu of a row in the Files panel, and the delete it offers. Pure: no Herdr imports.

export const FILE_MENU = [
  { id: "copy-path", label: "Copy Path" },
  { id: "copy-relative", label: "Copy Relative Path" },
  "-",
  { id: "delete", label: "Delete", danger: true },
];

export const menuHeight = rows => {
  const dividers = rows.filter(r => r === "-").length;
  return 12 + (rows.length - dividers) * 30 + dividers * 9;
};

// The command that deletes `path` (relative to `root`), a file or a whole folder. It throws for
// anything that is not strictly inside the root, so a bad path can never reach `rm`.
export function deleteCommand(root, path, windows) {
  const parts = String(path ?? "").split("/");
  if (!root || !path || path.startsWith("/") || parts.some(p => p === "" || p === "." || p === "..")) throw new Error(`Cannot delete "${path}"`);
  const abs = `${root}/${path}`;
  return windows
    ? { cmd: "powershell", args: ["-NoProfile", "-Command", "& { param($p) Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction Stop }", abs] }
    : { cmd: "rm", args: ["-rf", "--", abs] };
}

export const deleteTitle = path => `Delete ${String(path).split("/").pop()}?`;

export const deleteNote = dir => dir
  ? "This folder and everything in it will be deleted permanently. This cannot be undone."
  : "This file will be deleted permanently. This cannot be undone.";

// The open folders that survive deleting `path`: not the folder itself, nor anything inside it.
export const withoutPath = (folders, path) => [...folders].filter(f => f !== path && !f.startsWith(`${path}/`));
