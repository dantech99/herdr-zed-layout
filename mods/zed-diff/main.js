// A file's changes as a tab: read-only unified diff with line numbers, red/green rows and syntax
// colors. Opened by `tab.new {mod: "zed-diff", props: {root, path, xy, on}}` from the Changes
// panel. It re-reads the diff when the folder changes (agents edit files under you).

import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { props, exec, readTextFile, watchFolder, theme, settings } from "herdr";
import { parseDiff, addedRows, countRows, tokenize, MAX_ROWS } from "./diff.js";

const READ = ["--no-optional-locks", "-c", "core.fsmonitor=false", "-c", "diff.autoRefreshIndex=false"];
const GUTTER = 44;

export default class ZedDiff extends View {
  init(_given, cx) {
    const p = props() ?? {};
    this.root = p.root ?? null;
    this.path = p.path ?? null;
    this.untracked = p.xy === "??";
    this.on = p.on ?? null;
    this.ext = this.path?.includes(".") ? this.path.split(".").pop().toLowerCase() : "";
    this.rows = null; // null while loading
    this.note = null;
    this.alive = true;
    if (!this.root || !this.path) { this.rows = []; this.note = "This diff is not available"; return; }
    this.load(cx);
    cx.spawn(async cx => {
      try {
        while (this.alive) {
          await watchFolder(this.root);
          if (this.alive) await this.load(cx);
        }
      } catch { /* no watcher: the diff stays as read */ }
    });
  }

  async load(cx) {
    try {
      if (this.untracked) {
        const text = await readTextFile(`${this.root}/${this.path}`, { on: this.on }).catch(() => null);
        if (text === null || text.includes("\0")) { this.rows = []; this.note = "No text diff"; }
        else { this.rows = addedRows(text); this.note = null; }
      } else {
        const r = await exec("git", [...READ, "diff", "HEAD", "-U10", "--no-ext-diff", "--no-color", "--", this.path], { cwd: this.root, on: this.on });
        if (r.code !== 0) throw new Error(r.stderr);
        this.rows = parseDiff(r.stdout);
        this.note = this.rows.length ? null : "No text diff";
      }
    } catch (e) { this.rows = []; this.note = String(e.message || e); }
    cx.notify();
  }

  async close() { this.alive = false; }

  line(row, i, t) {
    const add = row.kind === "add", del = row.kind === "del";
    const tint = add ? "#9ece6a" : "#f7768e";
    const color = { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 };
    if (row.kind === "hunk") {
      return h_flex().id(`d${i}`).h(22).flex_none().px(12).items_center().bg(t.chrome).text_color(t.dim).child(div().whitespace_nowrap().child(row.text));
    }
    const row_ = h_flex().id(`d${i}`).h(22).flex_none().items_center().min_w(0)
      .when(add || del, el => el.bg(`${tint}22`).border_l(2).border_color(tint))
      .child(div().w(GUTTER).flex_none().pr(8).text_right().text_color(t.dim).child(String(row.old ?? "")))
      .child(div().w(GUTTER).flex_none().pr(8).text_right().text_color(add ? t.ansi2 : t.dim).child(String(row.new ?? "")))
      .child(div().w(16).flex_none().text_color(add ? t.ansi2 : t.ansi1).child(add ? "+" : del ? "-" : ""));
    return row_.child(h_flex().flex_1().min_w(0).whitespace_nowrap()
      .children(tokenize(row.text, this.ext).map(tok => div().text_color(tok.kind ? color[tok.kind] : t.foreground).child(tok.text))));
  }

  render() {
    const t = theme();
    const rows = this.rows ?? [], { added, removed } = countRows(rows);
    return v_flex().id("zed-diff-tab").size_full().min_h(0).bg(t.background).text_color(t.foreground)
      .child(h_flex().h(28).px(12).gap(8).flex_none().items_center().border_b(1).border_color(t.border).text_size(12)
        .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(this.path ?? ""))
        .when(rows.length > 0, el => el.child(div().text_color(t.ansi2).child(`+${added}`)).child(div().text_color(t.ansi1).child(`-${removed}`)))
        .when(rows.length >= MAX_ROWS, el => el.child(div().text_color(t.blocked).child("truncated")))
        .child(div().text_color(t.dim).child("read only")))
      .child(this.rows === null || this.note
        ? div().flex_1().flex().items_center().justify_center().text_color(t.dim).child(this.note ?? "Loading…")
        : v_flex().id("zed-diff-body").flex_1().min_h(0).py(4).overflow_y_scrollbar()
          .font_family(settings().font_family ?? "JetBrains Mono").text_size(13)
          .children(rows.map((row, i) => this.line(row, i, t))));
  }
}
