// Project tree for the focused terminal's folder. Folders expand in place.
// A file is selected, not opened: Herdr has no editor.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, panes, focused, exec, watchFolder, theme, window } from "herdr";
import { sortEntries, visibleRows } from "./tree.js";

function location() {
  const space = spaces().find(s => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}
const key = () => JSON.stringify(location());
const PER_FOLDER = 500;

async function directory(path, on) {
  if (!on && window()?.platform === "windows") {
    const r = await exec("powershell", ["-NoProfile", "-Command", "& { param($p) @(Get-ChildItem -LiteralPath $p -Force -ErrorAction Stop | Where-Object Name -ne '.git' | Select-Object -First 501 | ForEach-Object { @{ name=$_.Name; dir=($_.PSIsContainer -and -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint)) } }) | ConvertTo-Json -Compress } '" + path.replaceAll("'", "''") + "'"]);
    if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
    const result = JSON.parse(r.stdout || "[]");
    return sortEntries(Array.isArray(result) ? result : [result]);
  }
  const script = 'n=0; for p in "$1"/* "$1"/.[!.]* "$1"/..?*; do [ -e "$p" ] || [ -L "$p" ] || continue; name=${p##*/}; [ "$name" = .git ] && continue; if [ -d "$p" ] && [ ! -L "$p" ] ; then kind=d; else kind=f; fi; printf "%s\\0%s\\0" "$kind" "$name"; n=$((n+1)); [ "$n" -gt 500 ] && break; done; test -d "$1"';
  const r = await exec("sh", ["-c", script, "files", path], { on });
  if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
  const fields = r.stdout.split("\0"), out = [];
  for (let i = 0; i + 1 < fields.length; i += 2) out.push({ name: fields[i + 1], dir: fields[i] === "d" });
  return sortEntries(out);
}

export default class ZedFiles extends View {
  init(_props, cx) {
    this.entries = new Map();
    this.open = new Set();
    this.selected = null;
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
          if (this.context === context && key() === context) this.refresh(cx);
        }
      } catch { if (this.context === context) this.watched = null; }
    });
  }

  async load(path, here) {
    const entries = await directory(path ? `${here.cwd}/${path}` : here.cwd, here.on);
    if (this.context !== here.key || (path && !this.open.has(path))) return;
    this.entries.set(path, entries.slice(0, PER_FOLDER));
    if (entries.length > PER_FOLDER) this.limited = true;
  }

  refresh(cx) {
    const here = location(), next = key();
    if (next !== this.context) {
      this.context = next;
      this.cwd = here.cwd;
      this.on = here.on;
      this.entries = new Map();
      this.open = new Set();
      this.selected = null;
      this.error = null;
      this.limited = false;
      this.watched = null;
      this.loading = false;
    }
    if (!here.cwd || this.loading) return;
    const context = next;
    this.loading = true;
    cx.spawn(async cx => {
      try {
        for (const path of ["", ...this.open]) {
          if (this.context !== context) return;
          await this.load(path, { ...here, key: context });
        }
        if (this.context === context) { this.error = null; this.watch(here.cwd, cx); }
      } catch (e) { if (this.context === context) this.error = String(e.message || e); }
      finally { if (this.context === context) this.loading = false; cx.notify(); }
    });
  }

  toggle(path, cx) {
    if (this.open.has(path)) { this.open.delete(path); cx.notify(); return; }
    this.open.add(path);
    const here = { cwd: this.cwd, on: this.on, key: this.context };
    cx.spawn(async cx => {
      try { await this.load(path, here); }
      catch (e) { if (this.context === here.key) this.error = String(e.message || e); }
      cx.notify();
    });
  }

  render() {
    const t = theme();
    const name = this.cwd?.split(/[\\/]/).filter(Boolean).pop() ?? "Files";
    const rows = visibleRows(this.entries, this.open);
    return v_flex().id("zed-files").size_full().min_h(0).bg(t.chrome).text_color(t.foreground).text_size(13)
      .child(h_flex().h(32).flex_none().px(12).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().truncate().child(name)))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar().py(4).children(rows.map(row =>
        h_flex().id(`zed-file-${row.path}`).h(24).flex_none().pl(8 + row.depth * 14).pr(8).gap(6).items_center().cursor_pointer()
          .bg(this.selected === row.path ? t.selected : t.chrome)
          .hover(s => s.bg(t.hover))
          .on_click((_e, cx) => {
            this.selected = row.path;
            if (row.dir) this.toggle(row.path, cx);
            else cx.notify();
          })
          .child(row.dir
            ? svg(`mods/files/chevron-${row.open ? "down" : "right"}.svg`).size(12).flex_none().text_color(t.dim)
            : div().w(12).flex_none())
          .child(svg(`mods/files/${row.dir ? "folder" : "file"}.svg`).size(14).flex_none().text_color(t.muted))
          .child(div().flex_1().min_w(0).truncate().child(row.name)))))
      .when(Boolean(this.error) || !rows.length, el => el.child(div().px(12).py(8).text_size(12).text_color(t.dim)
        .child(this.error || (this.loading ? "Loading…" : this.cwd ? "Empty folder" : "No folder"))))
      .when(this.limited, el => el.child(div().px(12).py(4).text_size(11).text_color(t.dim).child("Showing the first 500 entries of a folder")));
  }
}
