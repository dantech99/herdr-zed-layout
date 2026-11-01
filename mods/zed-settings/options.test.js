import assert from "node:assert/strict";
import { test } from "node:test";
import { quotaOptions, toggleHidden, fileOptions, QUOTA_DEFAULTS } from "./options.js";

test("quotaOptions: defaults, then layout props, then saved choices", () => {
  assert.deepEqual(quotaOptions(null, null), QUOTA_DEFAULTS);
  const o = quotaOptions({ hidden: ["cursor"], kinds: { model: true } }, { remaining: true, kinds: { weekly: false } });
  assert.deepEqual(o.hidden, ["cursor"]);
  assert.equal(o.remaining, true);
  assert.deepEqual(o.kinds, { session: true, weekly: false, monthly: true, model: true });
});

test("toggleHidden adds and removes without mutating", () => {
  const h = ["a"];
  assert.deepEqual(toggleHidden(h, "b"), ["a", "b"]);
  assert.deepEqual(toggleHidden(h, "a"), []);
  assert.deepEqual(h, ["a"]);
});

test("fileOptions defaults wrap off", () => {
  assert.deepEqual(fileOptions(null), { wrap: false });
  assert.deepEqual(fileOptions({ wrap: true }), { wrap: true });
});
