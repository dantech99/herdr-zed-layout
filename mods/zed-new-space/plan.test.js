import assert from "node:assert/strict";
import { test } from "node:test";
import { planNewSpace, startingFolder } from "./plan.js";

test("a local space needs a folder", () => {
  assert.deepEqual(planNewSpace({ folder: "  ", branch: "", agent: null, on: null }), {
    error: "Choose a folder.",
  });
});

test("no branch creates the space in that folder", () => {
  assert.deepEqual(
    planNewSpace({ folder: " /src/app ", branch: "", agent: null, on: null }),
    { command: "space.new", args: { folder: "/src/app" } },
  );
});

test("the chosen agent is the space's first program", () => {
  assert.deepEqual(
    planNewSpace({ folder: "/src/app", branch: "", agent: { run: ["claude"] }, on: null }),
    { command: "space.new", args: { folder: "/src/app", argv: ["claude"] } },
  );
});

test("a branch hands the folder and agent to the worktree dialog", () => {
  assert.deepEqual(
    planNewSpace({ folder: "/src/app", branch: " billing ", agent: { run: ["codex"] }, on: null }),
    {
      overlay: {
        mod: "worktree",
        kind: "dialog",
        width: 460,
        height: 280,
        props: { folder: "/src/app", machine: undefined, branch: "billing", argv: ["codex"] },
      },
    },
  );
});

test("a remote machine can start without a folder", () => {
  assert.deepEqual(planNewSpace({ folder: "", branch: "", agent: null, on: "vps" }), {
    command: "space.new",
    args: { machine: "vps" },
  });
});

test("the folder starts in the focused terminal, or home when there is none", () => {
  assert.equal(startingFolder({ on: null, cwd: "/src/app", homeDir: "/home/me" }), "/src/app");
  assert.equal(startingFolder({ on: null, cwd: "", homeDir: "/home/me" }), "/home/me");
  assert.equal(startingFolder({ on: "vps", cwd: "/src/app", homeDir: "/home/me" }), "");
});
