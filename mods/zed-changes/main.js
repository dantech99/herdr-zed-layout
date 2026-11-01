// Git panel: Changes stages and commits what is tracked. History is read-only.
// View Diff shows the selected file. Commit tracked never runs git add.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, TextareaState, Textarea, InputState, Input } from "gpui-base";
import { spaces, panes, focused, exec, readTextFile, watchFolder, theme, home, props, run, openOverlay } from "herdr";
import { parseStatus, stagePlan, stageAllPlan, commitPlan, diffTarget, branchLabel, tooManyChanges, parseBranches, switchArgs, BRANCH_FORMAT, deleteArgs, canDelete, deletedNote, filterBranches, canCreate, createArgs, unpushedArgs, parseCount, listHeight } from "./plan.js";

function location() {
  const space = spaces().find(s => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}
const key = () => JSON.stringify(location());
const READ = ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "diff.autoRefreshIndex=false"];

// The branches of a repository, ready for the picker (empty when git fails).
async function listBranches(root, on) {
  const r = await exec("git", [...READ, "for-each-ref", "--sort=-committerdate", `--format=${BRANCH_FORMAT}`, "refs/heads", "refs/remotes"], { cwd: root, on }).catch(() => null);
  return r?.code === 0 ? parseBranches(r.stdout) : [];
}

export default class ZedChanges extends View {
  init(_given, cx) {
    if (props()?.confirm) { this.dialog = props(); this.menuError = null; return; } // the delete modal: this same mod draws it
    if (props()?.menu) { // the branch popup: this same mod draws it
      this.menu = props(); this.menuError = null; this.menuNote = null;
      this.search = InputState.new({ placeholder: "Switch or type to create a branch..." });
      this.search.on("change", (_e, cx2) => cx2.notify());
      this.search.on("submit", (_e, cx2) => this.submitSearch(cx2));
      try { this.search.focus(); } catch { /* not ready yet: the box still takes a click */ }
      return;
    }
    this.files = [];
    this.history = [];
    this.tab = "changes";
    this.diff = false;
    this.selected = null;
    this.tooMany = false;
    this.lines = [];
    this.branch = "";
    this.message = "";
    this.handle = cx.focus_handle();
    this.input = TextareaState.new({ placeholder: "Enter commit message", rows: 5 });
    this.input.on("change", (_e, cx) => { this.message = this.input.value(); cx.notify(); });
    this.input.on("submit", (_e, cx) => this.commit(cx));
    this.refresh(cx);
    cx.timer.every(10000, cx => this.refresh(cx));
  }

  watch(root, cx) {
    if (this.on || this.watched === root) return;
    this.watched = root;
    const context = this.context;
    cx.spawn(async cx => {
      try {
        while (this.context === context) {
          await watchFolder(root);
          if (this.context === context) this.refresh(cx);
        }
      } catch { if (this.context === context) this.watched = null; }
    });
  }

  refresh(cx) {
    if (this.loading || this.busy) return;
    const here = location(), context = key();
    if (context !== this.context) {
      this.context = context;
      this.root = null;
      this.files = [];
      this.history = [];
      this.selected = null;
      this.tooMany = false;
      this.lines = [];
      this.branch = "";
      this.error = null;
      this.note = null;
      this.watched = null;
    }
    if (!here.cwd) return;
    this.loading = true;
    cx.spawn(async cx => {
      try {
        const git = args => exec("git", [...READ, ...args], { cwd: here.cwd, on: here.on });
        const top = await git(["rev-parse", "--show-toplevel"]);
        if (key() !== context) return;
        if (top.code !== 0) { this.root = null; this.error = "Not a git repository"; return; }
        const root = top.stdout.trim();
        const at = args => exec("git", [...READ, ...args], { cwd: root, on: here.on });
        if (!here.on && tooManyChanges(root, home(), 0)) {
          // Never run `status` here: it would walk the whole home directory.
          this.root = root; this.on = here.on; this.files = []; this.history = []; this.selected = null; this.lines = [];
          this.branch = "—"; this.tooMany = true; this.error = "Your home folder is a git repository: too many changes to list";
          return;
        }
        const [status, branch, log] = await Promise.all([
          at(["status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"]),
          at(["symbolic-ref", "--short", "-q", "HEAD"]),
          at(["log", "-30", "--pretty=format:%h%x00%s"]),
        ]);
        if (key() !== context) return;
        if (status.code !== 0) throw new Error(status.stderr);
        this.root = root;
        this.on = here.on;
        this.history = log.code === 0
          ? log.stdout.split("\n").filter(Boolean).map(line => { const [hash, subject] = line.split("\0"); return { hash, subject }; })
          : [];
        this.branch = branchLabel(branch.code === 0 ? branch.stdout.trim() : "", log.code === 0);
        const all = parseStatus(status.stdout);
        this.tooMany = tooManyChanges(root, home(), all.length);
        this.files = this.tooMany ? [] : all.slice(0, 1000);
        if (this.selected && !this.files.some(file => file.path === this.selected)) { this.selected = null; this.lines = []; }
        if (this.diff) this.selected = diffTarget(this.selected, this.files);
        this.error = this.tooMany ? `Too many changes to list (${all.length})` : null;
        this.watch(root, cx);
        if (this.diff && this.selected) await this.loadDiff(this.selected, context);
      } catch (e) { if (key() === context) this.error = String(e.message || e); }
      finally { if (key() === context) this.loading = false; cx.notify(); }
    });
  }

  async loadDiff(path, context) {
    const file = this.files.find(item => item.path === path);
    if (!file || !this.root) return;
    let lines;
    if (file.xy === "??") {
      const text = await readTextFile(`${this.root}/${path}`, { on: this.on }).catch(() => null);
      lines = text === null || text.includes("\0") ? ["No text diff"] : text.replace(/\n$/, "").split("\n").slice(0, 400).map(line => `+${line}`);
    } else {
      const r = await exec("git", [...READ, "diff", "HEAD", "--no-ext-diff", "--no-color", "--", path], { cwd: this.root, on: this.on });
      if (r.code !== 0) throw new Error(r.stderr);
      const all = r.stdout.replace(/\n$/, "").split("\n");
      const first = all.findIndex(line => line.startsWith("@@"));
      lines = first < 0 ? ["No text diff"] : all.slice(first, first + 400);
    }
    if (key() === context && this.selected === path) this.lines = lines;
  }

  pick(path, cx) {
    this.selected = path;
    this.lines = [];
    if (this.diff) {
      const context = this.context;
      cx.spawn(async cx => {
        try { await this.loadDiff(path, context); }
        catch (e) { if (key() === context) this.note = String(e.message || e); }
        cx.notify();
      });
    }
    cx.notify();
  }

  // Lists the branches and opens the picker as a popup under the branch name.
  async openBranches() {
    if (!this.root || this.tooMany) return;
    const branches = await listBranches(this.root, this.on);
    openOverlay({ mod: "zed-changes", kind: "popup", width: 400, height: listHeight(branches, true) + 100, props: { menu: true, root: this.root, on: this.on, branches } });
  }

  async runGit(args) {
    const { root, on } = this.menu ?? this.dialog;
    return exec("git", [...READ, ...args], { cwd: root, on }).catch(e => ({ code: 1, stdout: "", stderr: String(e.message || e) }));
  }

  fail(r, cx) {
    this.menuError = (r.stderr || "git failed").trim().split("\n").slice(0, 3).join(" ");
    this.menuNote = null;
    cx.notify();
  }

  async pickBranch(branch, cx) {
    if (branch.current) { run("overlay.close"); return; }
    const r = await this.runGit(switchArgs(branch.name));
    if (r.code === 0) run("overlay.close"); else this.fail(r, cx);
  }

  async createBranch(name, cx) {
    const r = await this.runGit(createArgs(name));
    if (r.code === 0) run("overlay.close"); else this.fail(r, cx);
  }

  // Handlers below take the `cx` of a `cx.spawn` task: an event handler's own `cx` is only valid until
  // the handler returns, so `cx.notify()` after an `await` on it never redraws.
  // Enter in the search box: create the typed name if it is new, else switch to the first match.
  submitSearch(cx) {
    const query = this.search.value(), branches = this.menu.branches;
    if (canCreate(branches, query)) cx.spawn(async cx => this.createBranch(query.trim(), cx));
    else { const first = filterBranches(branches, query)[0]; if (first) cx.spawn(async cx => this.pickBranch(first, cx)); }
  }

  // The trash icon deletes at once. Only a branch with commits no remote has asks first, in a modal.
  async requestDelete(branch, cx) {
    const count = parseCount((await this.runGit(unpushedArgs(branch.name))).stdout);
    if (count === 0) { await this.deleteNow(branch.name, cx); return; }
    const { root, on, overlay } = this.menu;
    run("overlay.close", { id: overlay });
    openOverlay({ mod: "zed-changes", kind: "dialog", width: 400, height: 190, props: { confirm: true, root, on, branch: branch.name, count } });
  }

  async deleteNow(name, cx) {
    const r = await this.runGit(deleteArgs(name));
    if (r.code !== 0) { this.fail(r, cx); return; }
    const { root, on } = this.menu;
    this.menu = { ...this.menu, branches: await listBranches(root, on) };
    this.menuError = null;
    this.menuNote = deletedNote(name, r.stdout);
    cx.notify();
  }

  // The modal: accept deletes the branch with its unpushed commits, cancel closes it.
  async acceptDelete(cx) {
    const r = await this.runGit(deleteArgs(this.dialog.branch));
    if (r.code === 0) run("overlay.close", { id: this.dialog.overlay }); else this.fail(r, cx);
  }

  renderDialog() {
    const t = theme(), { branch, count } = this.dialog;
    const button = (id, label, bg, color, act) => div().id(id).h(30).px(14).flex().items_center().rounded(6).cursor_pointer().text_size(12.5)
      .bg(bg).text_color(color).on_click((_e, cx) => act(cx)).child(label);
    return v_flex().id("zed-delete-branch").w_full().p(18).gap(10).bg(t.popover).text_color(t.foreground)
      .child(div().text_size(15).font_semibold().child(`Delete branch ${branch}?`))
      .child(div().text_size(12.5).text_color(t.muted).child(`It has ${count} commit${count === 1 ? "" : "s"} that no remote has. They will be lost from the branch; git reflog can still recover them for a while.`))
      .when(Boolean(this.menuError), el => el.child(div().text_size(11.5).text_color(t.ansi1).child(this.menuError)))
      .child(h_flex().gap(8).justify_end().pt(4)
        .child(button("delete-cancel", "Cancel", t.raised, t.muted, () => run("overlay.close", { id: this.dialog.overlay })))
        .child(button("delete-accept", "Accept", t.ansi1, t.background, cx => cx.spawn(async cx => this.acceptDelete(cx)))));
  }

  // The branch popup, laid out like Zed's: sections, two-line rows (name, then author · age · subject),
  // a trash icon on deletable rows, and a search box at the bottom that also creates branches.
  renderMenu() {
    const t = theme(), query = this.search?.value() ?? "", all = this.menu.branches;
    const shown = filterBranches(all, query), local = shown.filter(b => !b.remote), remote = shown.filter(b => b.remote);
    const heading = text => div().px(10).pt(10).pb(4).text_size(11.5).text_color(t.dim).child(text);
    const row = b => h_flex().id(`branch-${b.remote ?? "local"}-${b.name}`).px(10).py(7).gap(10).items_center().rounded(8).cursor_pointer()
      .hover(s => s.bg(t.selected)).on_click((_e, cx) => cx.spawn(async cx => this.pickBranch(b, cx)))
      .child(div().size(16).flex_none().flex().items_center().justify_center()
        .child(svg(b.current ? "mods/zed-changes/icons/check.svg" : b.remote ? "mods/zed-changes/icons/cloud.svg" : "mods/zed-changes/icons/git-branch.svg").size(15)
          .text_color(b.current ? t.accent : t.dim)))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(div().truncate().text_size(13.5).text_color(t.foreground).child(b.remote ? `${b.remote}/${b.name}` : b.name))
        .child(div().truncate().text_size(11.5).text_color(t.dim).child([b.author, b.age, b.subject].filter(Boolean).join("  •  "))))
      .when(canDelete(b), el => el.child(div().id(`branch-trash-${b.name}`).size(26).flex_none().flex().items_center().justify_center().rounded(6)
        .hover(s => s.bg(t.raised)).tooltip(`Delete ${b.name}`)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { cx.stop_propagation(); cx.spawn(async cx => this.requestDelete(b, cx)); })
        .child(svg("mods/zed-changes/icons/trash.svg").size(14).text_color(t.dim))));
    const create = canCreate(all, query)
      ? h_flex().id("branch-create").px(10).py(9).gap(10).items_center().rounded(8).cursor_pointer().text_size(13).text_color(t.accent)
        .hover(s => s.bg(t.selected)).on_click((_e, cx) => cx.spawn(async cx => this.createBranch(query.trim(), cx)))
        .child(`Create branch “${query.trim()}”`)
      : null;
    return v_flex().id("zed-branches").w_full().p(6).bg(t.popover)
      .child(v_flex().id("branch-list").h(Math.max(40, listHeight(shown, Boolean(create)))).overflow_y_scrollbar()
        .when(local.length > 0, el => el.child(heading("Local Branches")).children(local.map(row)))
        .when(remote.length > 0, el => el.child(heading("Remote Branches")).children(remote.map(row)))
        .when(shown.length === 0 && !create, el => el.child(div().px(10).py(10).text_size(12).text_color(t.dim).child("No matching branches")))
        .when(Boolean(create), el => el.child(create)))
      .when(Boolean(this.menuError), el => el.child(div().px(10).py(6).text_size(11.5).text_color(t.ansi1).child(this.menuError)))
      .when(Boolean(this.menuNote), el => el.child(div().px(10).py(6).text_size(11.5).text_color(t.muted).child(this.menuNote)))
      .child(div().mt(4).h(36).px(10).flex().items_center().border_t(1).border_color(t.border).text_size(12.5)
        .child(Input.new(this.search).size_full().text_color(t.foreground)));
  }

  toggleDiff(cx) {
    this.diff = !this.diff;
    const path = this.diff ? diffTarget(this.selected, this.files) : null;
    if (path) this.pick(path, cx); else cx.notify();
  }

  git(args, cx, after) {
    if (!this.root || this.busy) return;
    const context = this.context;
    this.busy = true;
    this.note = null;
    cx.spawn(async cx => {
      try {
        const r = await exec("git", args, { cwd: this.root, on: this.on });
        if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim());
        if (key() === context && after) after();
      } catch (e) { if (key() === context) this.note = String(e.message || e); }
      finally { this.busy = false; this.refresh(cx); cx.notify(); }
    });
    cx.notify();
  }

  commit(cx) {
    const plan = commitPlan(this.message, this.files);
    if (plan.error) { this.note = plan.error; cx.notify(); return; }
    this.git(plan.args, cx, () => { this.message = ""; this.input.set_value(""); });
  }

  chip(id, label, on, action, t) {
    return div().id(id).h(24).px(8).flex().items_center().rounded(5).cursor_pointer().flex_none().text_size(12)
      .bg(on ? t.selected : t.chrome).text_color(on ? t.foreground : t.muted)
      .hover(s => s.bg(t.hover)).on_click((_e, cx) => action(cx)).child(label);
  }

  render() {
    if (this.dialog) return this.renderDialog();
    if (this.menu) return this.renderMenu();
    const t = theme();
    const letter = xy => xy.includes("U") ? "U" : xy.includes("D") ? "D" : xy.includes("A") || xy === "??" ? "A" : "M";
    return v_flex().id("zed-changes").size_full().min_h(0).bg(t.chrome).text_color(t.foreground).text_size(13).track_focus(this.handle)
      .child(h_flex().h(34).flex_none().px(8).gap(6).items_center().border_b(1).border_color(t.border)
        .child(this.chip("zed-changes-tab", "Changes", this.tab === "changes", cx => { this.tab = "changes"; cx.notify(); }, t))
        .child(this.chip("zed-history-tab", "History", this.tab === "history", cx => { this.tab = "history"; cx.notify(); }, t))
        .child(div().flex_1())
        .when(this.tab === "changes", el => el
          .child(this.chip("zed-view-diff", "View Diff", this.diff, cx => this.toggleDiff(cx), t))
          .when(!this.tooMany, el => el.child(this.chip("zed-stage-all", "Stage All", false, cx => this.git(stageAllPlan(), cx), t)))))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar()
        .when(this.tab === "history", el => el.children(this.history.map(commit =>
          h_flex().h(28).flex_none().px(12).gap(8).items_center()
            .child(div().text_color(t.dim).text_size(12).child(commit.hash))
            .child(div().flex_1().min_w(0).truncate().child(commit.subject)))))
        .when(this.tab === "changes" && this.files.length > 0, el => el.children(this.files.map(file =>
          h_flex().id(`zed-change-${file.path}`).h(26).flex_none().px(8).gap(8).items_center().cursor_pointer()
            .bg(this.selected === file.path ? t.selected : t.chrome)
            .hover(s => s.bg(t.hover))
            .on_click((_e, cx) => this.pick(file.path, cx))
            .child(div().id(`zed-stage-${file.path}`).size(16).flex_none().flex().items_center().justify_center().rounded(3)
              .border(1).border_color(file.staged ? t.accent : t.border).bg(file.staged ? t.accent : t.chrome)
              .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
              .on_click((_e, cx) => { cx.stop_propagation(); this.git(stagePlan(file), cx); }))
            .child(div().w(12).text_size(11).text_color(letter(file.xy) === "D" ? t.ansi1 : letter(file.xy) === "A" ? t.ansi2 : t.blocked).child(letter(file.xy)))
            .child(div().flex_1().min_w(0).truncate().child(file.path)))))
        .when(this.tab === "changes" && !this.files.length, el => el.child(div().flex_1().flex().items_center().justify_center().text_color(t.dim)
          .child(this.error || (this.loading ? "Loading…" : this.root ? "No changes to commit" : "No folder"))))
        .when(this.tab === "history" && !this.history.length, el => el.child(div().p(12).text_color(t.dim).child(this.loading ? "Loading…" : "No commits"))))
      .when(this.tab === "changes" && this.diff, el => el.child(v_flex().id("zed-diff").h(220).flex_none().min_h(0).border_t(1).border_color(t.border).py(4).overflow_y_scrollbar()
        .when(this.lines.length === 0, el => el.child(div().p(10).text_size(12).text_color(t.dim).child(this.files.length ? "Loading…" : "No changes to diff")))
        .children(this.lines.map((line, i) => div().id(`zed-diff-${i}`).px(10).h(18).flex_none().truncate().text_size(11)
          .text_color(line.startsWith("+") ? t.ansi2 : line.startsWith("-") ? t.ansi1 : t.dim).child(line)))))
      .when(Boolean(this.note), el => el.child(div().px(10).py(4).text_size(11).text_color(t.ansi1).child(this.note)))
      .when(this.tab === "changes", el => el.child(v_flex().flex_none().gap(8).p(8).border_t(1).border_color(t.border)
        .child(h_flex().child(div().id("zed-branch").px(6).py(2).rounded(5).text_size(12).text_color(t.muted)
          .when(Boolean(this.root) && !this.tooMany, el => el.cursor_pointer().hover(s => s.bg(t.hover).text_color(t.foreground)).on_click(() => this.openBranches()))
          .child(`${this.branch || "detached"}${this.root && !this.tooMany ? " ▾" : ""}`)))
        .child(div().h(112).px(8).py(6).rounded(6).border(1).border_color(t.border).bg(t.background)
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .child(Textarea.new(this.input).size_full().text_size(12).text_color(t.foreground)))
        .child(h_flex().gap(8).justify_end().items_center()
          .child(div().id("zed-commit").h(30).px(10).flex().items_center().rounded(6).text_size(12)
            .bg(this.message.trim() && this.files.some(file => file.staged) ? t.solid : t.raised)
            .text_color(this.message.trim() && this.files.some(file => file.staged) ? t.solid_foreground : t.dim)
            .cursor_pointer().on_click((_e, cx) => this.commit(cx)).child(this.busy ? "Committing…" : "Commit Tracked")))));
  }
}
