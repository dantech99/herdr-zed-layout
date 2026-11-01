import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStatus, stagePlan, stageAllPlan, commitPlan, diffTarget, branchLabel, tooManyChanges, MAX_CHANGES, parseBranches, switchArgs, BRANCH_FORMAT } from "./plan.js";

test("status lines split the index from the work tree", () => {
  assert.deepEqual(parseStatus(" M src/a.js\0?? src/b.js\0M  src/c.js\0"), [
    { path: "src/a.js", xy: " M", staged: false },
    { path: "src/b.js", xy: "??", staged: false },
    { path: "src/c.js", xy: "M ", staged: true },
  ]);
});

test("stage all adds everything, and a staged file is unstaged", () => {
  assert.deepEqual(stageAllPlan(), ["add", "-A"]);
  assert.deepEqual(stagePlan({ path: "src/a.js", xy: " M" }), ["add", "--", "src/a.js"]);
  assert.deepEqual(stagePlan({ path: "src/c.js", xy: "M " }), ["restore", "--staged", "--", "src/c.js"]);
});

test("commit tracked needs a message and something staged", () => {
  const files = [{ path: "src/a.js", xy: " M", staged: false }];
  assert.deepEqual(commitPlan("  ", files), { error: "Enter a commit message." });
  assert.deepEqual(commitPlan("fix tabs", files), { error: "Nothing staged." });
  assert.deepEqual(commitPlan(" fix tabs ", [{ path: "src/c.js", xy: "M ", staged: true }]), {
    args: ["commit", "-m", "fix tabs"],
  });
});

test("diffTarget keeps a valid selection, else falls back to the first file", () => {
  const files = [{ path: "a.js" }, { path: "b.js" }];
  assert.equal(diffTarget("b.js", files), "b.js");
  assert.equal(diffTarget(null, files), "a.js");
  assert.equal(diffTarget("gone.js", files), "a.js");
  assert.equal(diffTarget(null, []), null);
});

test("branchLabel names an unborn branch instead of calling it detached", () => {
  assert.equal(branchLabel("main", true), "main");
  assert.equal(branchLabel("master", false), "master · no commits yet");
  assert.equal(branchLabel("", true), "detached");
  assert.equal(branchLabel(null, false), "detached");
});

test("tooManyChanges flags the home folder and very large change sets", () => {
  assert.equal(tooManyChanges("/home/u", "/home/u", 3), true);
  assert.equal(tooManyChanges("/home/u/proj", "/home/u", 3), false);
  assert.equal(tooManyChanges("/home/u/proj", "/home/u", MAX_CHANGES), false);
  assert.equal(tooManyChanges("/home/u/proj", "/home/u", MAX_CHANGES + 1), true);
  assert.equal(tooManyChanges("/srv/x", null, 0), false);
});

test("parseBranches lists local branches, then remote-only ones, and marks the current", () => {
  const out = [
    " \trefs/heads/feat/x", "*\trefs/heads/main",
    " \trefs/remotes/origin/HEAD", " \trefs/remotes/origin/main", " \trefs/remotes/origin/hotfix",
    " \trefs/remotes/upstream/feat/x", " \trefs/tags/v1",
  ].join("\n");
  assert.deepEqual(parseBranches(out), [
    { name: "feat/x", current: false, remote: null },
    { name: "main", current: true, remote: null },
    { name: "hotfix", current: false, remote: "origin" },
  ]);
  assert.deepEqual(parseBranches(""), []);
});

test("switchArgs switches by name and BRANCH_FORMAT asks for HEAD and the full ref", () => {
  assert.deepEqual(switchArgs("feat/x"), ["switch", "feat/x"]);
  assert.deepEqual(switchArgs("-weird"), ["switch", "--", "-weird"]);
  assert.match(BRANCH_FORMAT, /%\(HEAD\)/);
  assert.match(BRANCH_FORMAT, /%\(refname\)/);
});
