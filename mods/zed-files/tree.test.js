import assert from "node:assert/strict";
import { test } from "node:test";
import { sortEntries, visibleRows } from "./tree.js";

test("folders come before files, then by name", () => {
  assert.deepEqual(
    sortEntries([
      { name: "README.md", dir: false },
      { name: "mods", dir: true },
      { name: "layouts", dir: true },
      { name: ".gitignore", dir: false },
    ]).map(e => e.name),
    ["layouts", "mods", ".gitignore", "README.md"],
  );
});

test("a closed folder hides its children", () => {
  const entries = new Map([
    ["", [{ name: "mods", dir: true }, { name: "README.md", dir: false }]],
    ["mods", [{ name: "zed-tabs", dir: true }]],
  ]);
  assert.deepEqual(visibleRows(entries, new Set()).map(r => r.path), ["mods", "README.md"]);
  assert.deepEqual(
    visibleRows(entries, new Set(["mods"])).map(r => r.path),
    ["mods", "mods/zed-tabs", "README.md"],
  );
});
