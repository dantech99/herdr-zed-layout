import assert from "node:assert/strict";
import { test } from "node:test";
import { projectKey, itemsFor, saveItem, removeItem, validate, planRun, nextId } from "./commands.js";

test("the project key joins machine and folder", () => {
  assert.equal(projectKey({ folder: "/src/app", machine: null }), "/src/app");
  assert.equal(projectKey({ folder: "/src/app", machine: "box" }), "box:/src/app");
  assert.equal(projectKey(undefined), null);
});

test("items are read per project and tolerate junk", () => {
  const store = { "/a": [{ id: "1", label: "dev", action: "terminal", command: "bun dev" }] };
  assert.equal(itemsFor(store, "/a").length, 1);
  assert.deepEqual(itemsFor(store, "/b"), []);
  assert.deepEqual(itemsFor(null, "/a"), []);
  assert.deepEqual(itemsFor({ "/a": "x" }, "/a"), []);
});

test("saving adds a new item and replaces an existing one by id", () => {
  const a = saveItem({}, "/a", { id: "1", label: "dev", action: "terminal", command: "bun dev" });
  assert.equal(a["/a"].length, 1);
  const b = saveItem(a, "/a", { id: "1", label: "dev2", action: "terminal", command: "bun dev" });
  assert.equal(b["/a"].length, 1);
  assert.equal(b["/a"][0].label, "dev2");
  assert.equal(a["/a"][0].label, "dev");
});

test("removing drops only that item in that project", () => {
  const s = { "/a": [{ id: "1" }, { id: "2" }], "/b": [{ id: "1" }] };
  const r = removeItem(s, "/a", "1");
  assert.deepEqual(r["/a"], [{ id: "2" }]);
  assert.deepEqual(r["/b"], [{ id: "1" }]);
});

test("validation needs a label and a command", () => {
  assert.equal(validate({ label: " ", command: "x" }), "Add a label.");
  assert.equal(validate({ label: "dev", command: "  " }), "Add a command.");
  assert.equal(validate({ label: "dev", command: "bun dev" }), null);
});

test("a terminal command runs in a new tab and leaves a shell open", () => {
  assert.deepEqual(
    planRun({ label: "dev", action: "terminal", command: "bun dev" }, { folder: "/src/app", machine: null }),
    { command: "tab.new", args: { name: "dev", folder: "/src/app", argv: ["sh", "-lc", 'bun dev\nexec "${SHELL:-sh}"'] } },
  );
});

test("a remote project opens in the selected space, so no machine is passed", () => {
  const p = planRun({ label: "dev", action: "terminal", command: "ls" }, { folder: "/src", machine: "box" });
  assert.equal("machine" in p.args, false);
});

test("an agent command starts the agent with the text as its first message", () => {
  assert.deepEqual(
    planRun({ label: "fix", action: "agent", command: "fix the tests", agent: { run: ["claude"] } }, { folder: "/src/app", machine: null }),
    { command: "tab.new", args: { name: "fix", folder: "/src/app", argv: ["claude"], task: "fix the tests" } },
  );
});

test("ids do not collide with existing ones", () => {
  assert.notEqual(nextId([{ id: "c1" }]), "c1");
  assert.equal(nextId([]), "c1");
});
