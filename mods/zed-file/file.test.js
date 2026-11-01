import assert from "node:assert/strict";
import { test } from "node:test";
import { languageFor, prepare, shortPath, MAX_CHARS } from "./file.js";

test("languageFor maps extensions to the editor's languages", () => {
  assert.equal(languageFor("a/b/app.ts"), "js");
  assert.equal(languageFor("x.tsx"), "js");
  assert.equal(languageFor("Cargo.toml"), "yaml");
  assert.equal(languageFor("README.md"), "md");
  assert.equal(languageFor("main.rs"), "rs");
  assert.equal(languageFor("Makefile"), "txt");
  assert.equal(languageFor(".gitignore"), "txt");
});

test("prepare reports missing, binary, empty and truncated files", () => {
  assert.deepEqual(prepare(null), { kind: "missing", text: "" });
  assert.deepEqual(prepare("a\0b"), { kind: "binary", text: "" });
  assert.deepEqual(prepare(""), { kind: "ok", text: "", truncated: false });
  assert.deepEqual(prepare("hello\n"), { kind: "ok", text: "hello\n", truncated: false });
  const big = prepare("x".repeat(MAX_CHARS + 10));
  assert.equal(big.kind, "ok");
  assert.equal(big.truncated, true);
  assert.equal(big.text.length, MAX_CHARS);
});

test("shortPath shows the home folder as ~", () => {
  assert.equal(shortPath("/home/me/dev/a.md", "/home/me"), "~/dev/a.md");
  assert.equal(shortPath("/etc/hosts", "/home/me"), "/etc/hosts");
  assert.equal(shortPath("/home/men/a.md", "/home/me"), "/home/men/a.md");
  assert.equal(shortPath("/home/me", "/home/me"), "~");
});
