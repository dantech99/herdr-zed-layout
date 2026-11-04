import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStatus, stagePlan, stageAllPlan, commitPlan, branchLabel, tooManyChanges, MAX_CHANGES, parseBranches, switchArgs, BRANCH_FORMAT, deleteArgs, canDelete, deletedNote, filterBranches, canCreate, createArgs, unpushedArgs, parseCount, listHeight, LIST_MAX, syncArgs, needsRemote, isForce, parseAheadBehind, primaryAction, summarize, pickRemote, prState, parsePrView, parsePrUrl, prCreateArgs, prDefaults } from "./plan.js";

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

test("parseBranches lists local branches, then remote-only ones, with author, age and subject", () => {
  const out = [
    " \trefs/heads/feat/x\tAna\t3 months ago\tchore: guitar",
    "*\trefs/heads/main\tBob\t2 days ago\tfeat(social): add reel",
    " \trefs/remotes/origin/HEAD\tBob\t2 days ago\tx", " \trefs/remotes/origin/main\tBob\t2 days ago\tx",
    " \trefs/remotes/origin/hotfix\tCy\t1 hour ago\tfix: a\tb", " \trefs/remotes/upstream/feat/x\tA\t1 day ago\ty", " \trefs/tags/v1\tA\t1 day ago\ty",
  ].join("\n");
  assert.deepEqual(parseBranches(out), [
    { name: "feat/x", current: false, remote: null, author: "Ana", age: "3 months ago", subject: "chore: guitar" },
    { name: "main", current: true, remote: null, author: "Bob", age: "2 days ago", subject: "feat(social): add reel" },
    { name: "hotfix", current: false, remote: "origin", author: "Cy", age: "1 hour ago", subject: "fix: a\tb" },
  ]);
  assert.deepEqual(parseBranches(""), []);
});

test("switchArgs switches by name and BRANCH_FORMAT asks for HEAD and the full ref", () => {
  assert.deepEqual(switchArgs("feat/x"), ["switch", "feat/x"]);
  assert.deepEqual(switchArgs("-weird"), ["switch", "--", "-weird"]);
  assert.match(BRANCH_FORMAT, /%\(HEAD\)/);
  assert.match(BRANCH_FORMAT, /%\(refname\)/);
});

test("deleteArgs deletes without asking git to refuse unmerged branches", () => {
  assert.deepEqual(deleteArgs("wip"), ["branch", "-D", "--", "wip"]);
  assert.deepEqual(deleteArgs("-x"), ["branch", "-D", "--", "-x"]);
});

test("deletedNote tells how to get the branch back", () => {
  assert.equal(deletedNote("wip", "Deleted branch wip (was 8e8bcb7).\n"), "Deleted wip. To restore it: git branch wip 8e8bcb7");
  assert.equal(deletedNote("wip", ""), "Deleted wip.");
});

test("filterBranches matches names and remotes, ignoring case", () => {
  const list = [{ name: "main", remote: null }, { name: "Feat/Wait", remote: null }, { name: "hotfix", remote: "origin" }];
  assert.equal(filterBranches(list, "").length, 3);
  assert.deepEqual(filterBranches(list, "feat").map(b => b.name), ["Feat/Wait"]);
  assert.deepEqual(filterBranches(list, "origin/hot").map(b => b.name), ["hotfix"]);
});

test("canCreate needs a new, option-free name; createArgs switches to it", () => {
  const list = [{ name: "main", remote: null }, { name: "hotfix", remote: "origin" }];
  assert.equal(canCreate(list, "new-thing"), true);
  assert.equal(canCreate(list, "  "), false);
  assert.equal(canCreate(list, "main"), false);
  assert.equal(canCreate(list, "-x"), false);
  assert.equal(canCreate(list, "hotfix"), false); // already there on the remote: switch to it instead
  assert.deepEqual(createArgs("new-thing"), ["switch", "-c", "new-thing"]);
});

test("only local branches other than the current one can be deleted", () => {
  assert.equal(canDelete({ name: "a", current: false, remote: null }), true);
  assert.equal(canDelete({ name: "a", current: true, remote: null }), false);
  assert.equal(canDelete({ name: "a", current: false, remote: "origin" }), false);
});

test("unpushedArgs counts the commits of a branch that no remote has; parseCount reads it", () => {
  assert.deepEqual(unpushedArgs("wip"), ["rev-list", "--count", "wip", "--not", "--remotes"]);
  assert.equal(parseCount("3\n"), 3);
  assert.equal(parseCount("0\n"), 0);
  assert.equal(parseCount(""), 0);
  assert.equal(parseCount("junk"), 0);
});

test("listHeight sizes the scrolling list: headings plus rows, capped", () => {
  const l = { remote: null }, r = { remote: "origin" };
  assert.equal(listHeight([]), 0);
  assert.equal(listHeight([l]), 30 + 52);
  assert.equal(listHeight([l, r]), 30 + 52 + 30 + 52);
  assert.equal(listHeight(Array(20).fill(l)), LIST_MAX);
  assert.equal(listHeight([l], true), 30 + 52 + 40); // + the "Create branch" row
});

test("syncArgs builds the git command for each menu entry", () => {
  assert.deepEqual(syncArgs("fetch", {}), ["fetch"]);
  assert.deepEqual(syncArgs("fetch-from", { remote: "up" }), ["fetch", "up"]);
  assert.deepEqual(syncArgs("pull", {}), ["pull", "--no-edit"]);
  assert.deepEqual(syncArgs("pull-rebase", {}), ["pull", "--rebase"]);
  assert.deepEqual(syncArgs("push", { upstream: true }), ["push"]);
  assert.deepEqual(syncArgs("push", { upstream: false }), ["push", "--set-upstream", "origin", "HEAD"]);
  assert.deepEqual(syncArgs("push", { upstream: false, remote: "up" }), ["push", "--set-upstream", "up", "HEAD"]);
  assert.deepEqual(syncArgs("push-to", { upstream: true, remote: "up" }), ["push", "up", "HEAD"]);
  assert.deepEqual(syncArgs("push-to", { upstream: false, remote: "up" }), ["push", "--set-upstream", "up", "HEAD"]);
  assert.deepEqual(syncArgs("force-push", { upstream: true }), ["push", "--force-with-lease"]);
  assert.deepEqual(syncArgs("force-push", { upstream: false }), ["push", "--force-with-lease", "--set-upstream", "origin", "HEAD"]);
  assert.equal(syncArgs("rm -rf", {}), null);
});

test("only Fetch From and Push To ask for a remote; only Force Push is a force", () => {
  assert.deepEqual(["fetch", "fetch-from", "pull", "push", "push-to", "force-push"].map(needsRemote), [false, true, false, false, true, false]);
  assert.deepEqual(["push", "force-push"].map(isForce), [false, true]);
});

test("parseAheadBehind reads `rev-list --left-right --count @{upstream}...HEAD`", () => {
  assert.deepEqual(parseAheadBehind("2\t5\n"), { behind: 2, ahead: 5 });
  assert.deepEqual(parseAheadBehind("0\t0"), { behind: 0, ahead: 0 });
  assert.equal(parseAheadBehind(""), null);
  assert.equal(parseAheadBehind("junk"), null);
});

test("primaryAction picks the button next to the branch name", () => {
  const base = { remotes: ["origin"], upstream: true, ahead: 0, behind: 0 };
  assert.equal(primaryAction({ ...base, remotes: [] }), null);
  assert.deepEqual(primaryAction({ ...base, upstream: false }), { op: "push", label: "Publish" });
  assert.deepEqual(primaryAction({ ...base, behind: 2, ahead: 1 }), { op: "pull", label: "Pull ↓2" });
  assert.deepEqual(primaryAction({ ...base, ahead: 3 }), { op: "push", label: "Push ↑3" });
  assert.deepEqual(primaryAction(base), { op: "fetch", label: "Fetch" });
});

test("summarize keeps git's first lines, preferring stderr (where git writes progress)", () => {
  assert.equal(summarize("", ""), "Done");
  assert.equal(summarize("Already up to date.\n", ""), "Already up to date.");
  assert.equal(summarize("x", "To github.com:a/b\n   1a2b..3c4d  main -> main\n"), "To github.com:a/b 1a2b..3c4d  main -> main");
  assert.equal(summarize("", "a\nb\nc\nd\ne"), "a b c");
});

import { fileMenu, discardArgs, ignoreLine, isUntracked } from "./plan.js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLineScript } from "./plan.js";

const enabled = file => Object.fromEntries(fileMenu(file).filter(e => e !== "-").map(e => [e.id, e.enabled]));

test("file menu: ignore entries need an untracked file, View File a file that exists", () => {
  assert.equal(enabled({ path: "a", xy: " M" })["gitignore"], false);
  assert.equal(enabled({ path: "a", xy: "??" })["exclude"], true);
  assert.equal(enabled({ path: "a", xy: " D" })["view-file"], false);
  assert.equal(enabled({ path: "a", xy: " M" })["view-file"], true);
});

test("file menu: the first entry unstages a staged-only file and stages anything else", () => {
  assert.equal(fileMenu({ path: "a", xy: "M " })[0].label, "Unstage File");
  assert.equal(fileMenu({ path: "a", xy: "MM" })[0].label, "Stage File");
  assert.equal(fileMenu({ path: "a", xy: "??" })[0].label, "Stage File");
});

test("discard restores tracked files from HEAD and cleans new ones", () => {
  assert.deepEqual(discardArgs({ path: "a b.js", xy: "M " }), ["restore", "--source=HEAD", "--staged", "--worktree", "--", "a b.js"]);
  assert.deepEqual(discardArgs({ path: "n.js", xy: "??" }), ["clean", "-f", "--", "n.js"]);
  assert.equal(isUntracked({ xy: "??" }), true);
});

test("ignoreLine anchors the path and escapes glob characters", () => {
  assert.equal(ignoreLine("src/a.js"), "/src/a.js");
  assert.equal(ignoreLine("a[1]*.txt"), "/a\\[1\\]\\*.txt");
  assert.equal(ignoreLine("#x"), "/#x");
});

test("appendLineScript adds the line once, on its own line, creating folders", () => {
  const dir = mkdtempSync(join(tmpdir(), "zc-"));
  try {
    const file = join(dir, "info", "exclude");
    const add = line => execFileSync("sh", ["-c", appendLineScript, "sh", file, line]);
    add("/a"); add("/a"); add("/b");
    assert.equal(readFileSync(file, "utf8"), "/a\n/b\n");
    writeFileSync(file, "/x"); // no trailing newline
    add("/y");
    assert.equal(readFileSync(file, "utf8"), "/x\n/y\n");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the PR remote prefers origin, else the first one", () => {
  assert.equal(pickRemote(["up", "origin"]), "origin");
  assert.equal(pickRemote(["up"]), "up");
  assert.equal(pickRemote([]), null);
});

test("the PR button: create on any non-default branch without an open PR, view when one is open", () => {
  const base = { branch: "feat/x", defaultBranch: "main", ahead: 2, upstream: true, remotes: ["origin"], url: null };
  assert.deepEqual(prState(base), { kind: "create" });
  assert.deepEqual(prState({ ...base, ahead: 0, upstream: false }), { kind: "create" }); // unpublished branch
  assert.deepEqual(prState({ ...base, ahead: 0 }), { kind: "create" }); // pushed already, still no PR
  assert.deepEqual(prState({ ...base, ahead: 0, url: "https://github.com/o/r/pull/1" }), { kind: "view", url: "https://github.com/o/r/pull/1" });
  assert.equal(prState({ ...base, branch: "main" }), null);
  assert.equal(prState({ ...base, branch: "" }), null);
  assert.equal(prState({ ...base, defaultBranch: null }), null); // gh missing or signed out
  assert.equal(prState({ ...base, remotes: [] }), null);
});

test("gh pr view output: only an open PR counts", () => {
  assert.equal(parsePrView('{"state":"OPEN","url":"https://github.com/o/r/pull/3"}'), "https://github.com/o/r/pull/3");
  assert.equal(parsePrView('{"state":"MERGED","url":"https://github.com/o/r/pull/3"}'), null);
  assert.equal(parsePrView("not json"), null);
});

test("the PR url is the last https line gh prints", () => {
  assert.equal(parsePrUrl("Creating pull request\nhttps://github.com/o/r/pull/9\n"), "https://github.com/o/r/pull/9");
  assert.equal(parsePrUrl("nothing"), null);
});

test("gh pr create takes title and body as separate arguments, draft optional", () => {
  assert.deepEqual(prCreateArgs({ title: " T ", body: "B", draft: false }), ["pr", "create", "--title", "T", "--body", "B"]);
  assert.deepEqual(prCreateArgs({ title: "T", body: "", draft: true }), ["pr", "create", "--title", "T", "--body", "", "--draft"]);
  assert.deepEqual(prCreateArgs({ title: "  ", body: "" }), { error: "Enter a title." });
});

test("PR defaults come from the last commit", () => {
  assert.deepEqual(prDefaults("feat: a\0body text\n"), { title: "feat: a", body: "body text" });
  assert.deepEqual(prDefaults(""), { title: "", body: "" });
});
