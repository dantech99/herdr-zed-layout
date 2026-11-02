import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDiff, addedRows, countRows, tokenize } from "./diff.js";

const SAMPLE = ["diff --git a/a.js b/a.js", "index 1..2 100644", "--- a/a.js", "+++ b/a.js",
  "@@ -2,3 +2,4 @@ fn", " keep", "-old", "+new", "+extra", " tail", "\\ No newline at end of file", ""].join("\n");

test("parseDiff drops headers and numbers each side", () => {
  assert.deepEqual(parseDiff(SAMPLE), [
    { kind: "hunk", old: null, new: null, text: "@@ -2,3 +2,4 @@ fn" },
    { kind: "ctx", old: 2, new: 2, text: "keep" },
    { kind: "del", old: 3, new: null, text: "old" },
    { kind: "add", old: null, new: 3, text: "new" },
    { kind: "add", old: null, new: 4, text: "extra" },
    { kind: "ctx", old: 4, new: 5, text: "tail" },
  ]);
});

test("parseDiff of nothing is empty, and addedRows numbers a new file from 1", () => {
  assert.deepEqual(parseDiff(""), []);
  assert.deepEqual(addedRows("a\nb\n"), [
    { kind: "add", old: null, new: 1, text: "a" },
    { kind: "add", old: null, new: 2, text: "b" },
  ]);
  assert.deepEqual(countRows(parseDiff(SAMPLE)), { added: 2, removed: 1 });
});

test("tokenize colors keywords, strings, numbers, calls, types and comments", () => {
  const kinds = line => tokenize(line, "js").filter(t => t.kind).map(t => `${t.kind}:${t.text}`);
  assert.deepEqual(kinds('const x = new Map(); // note'), ["keyword:const", "keyword:new", "type:Map", "comment:// note"]);
  assert.deepEqual(kinds('sign("a", 3600)'), ["function:sign", 'string:"a"', "number:3600"]);
  assert.deepEqual(tokenize("x # y", "py").map(t => t.kind), [null, "comment"]);
  assert.equal(tokenize("a  b", "js").map(t => t.text).join(""), "a  b");
});
