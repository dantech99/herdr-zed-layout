import assert from "node:assert/strict";
import { test } from "node:test";
import { FILE_MENU, menuHeight, deleteCommand, deleteTitle, deleteNote, withoutPath } from "./menu.js";

test("the menu offers Delete and the two copy actions", () => {
  assert.deepEqual(FILE_MENU.filter(r => r !== "-").map(r => r.id), ["copy-path", "copy-relative", "delete"]);
  assert.equal(menuHeight(FILE_MENU), 12 + 3 * 30 + 9);
});

test("deleteCommand removes exactly the given path", () => {
  assert.deepEqual(deleteCommand("/repo", "docs/a b.md", false), { cmd: "rm", args: ["-rf", "--", "/repo/docs/a b.md"] });
  assert.deepEqual(deleteCommand("/repo", "-rf", false).args, ["-rf", "--", "/repo/-rf"]);
  const win = deleteCommand("C:/repo", "a.md", true);
  assert.equal(win.cmd, "powershell");
  assert.equal(win.args.at(-1), "C:/repo/a.md");
  assert.ok(win.args.some(a => a.includes("Remove-Item -LiteralPath $p -Recurse -Force")));
});

test("deleteCommand refuses the root and paths that leave it", () => {
  for (const path of ["", ".", "..", "../x", "a/../../x", "/etc", "a//b", "a/./b"]) assert.throws(() => deleteCommand("/repo", path, false), /Cannot delete/);
  assert.throws(() => deleteCommand("", "a.md", false), /Cannot delete/);
});

test("the dialog names what is deleted and says it is permanent", () => {
  assert.equal(deleteTitle("docs/notes.md"), "Delete notes.md?");
  assert.match(deleteNote(false), /permanently/);
  assert.match(deleteNote(true), /everything in it/);
});

test("withoutPath forgets a deleted folder and what was open inside it", () => {
  assert.deepEqual(withoutPath(["a", "a/b", "ab", "c"], "a"), ["ab", "c"]);
  assert.deepEqual(withoutPath(["a", "c"], "x.md"), ["a", "c"]);
});
