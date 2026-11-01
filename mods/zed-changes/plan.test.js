import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStatus, stagePlan, stageAllPlan, commitPlan, diffTarget } from "./plan.js";

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
