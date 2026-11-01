// A file shown as a tab, with syntax highlighting and line numbers. Opened by
// `tab.new {mod: "zed-file", props: {file, on}}` from the Files panel. Local complete text files
// are editable (Ctrl/Cmd-S saves); remote, truncated and binary ones stay read-only. It re-reads
// the file when its folder changes (agents edit files under you), unless there are unsaved edits.

import { View, div, image } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState } from "gpui-base";
import { props, readTextFile, writeTextFile, watchFolder, theme, settings, home } from "herdr";
import { languageFor, prepare, shortPath, isEditable, statusLabel } from "./file.js";

export default class ZedFile extends View {
  init(_given, cx) {
    const p = props() ?? {};
    this.file = p.file ?? null;
    this.on = p.on ?? null;
    this.icon = p.icon ?? null; // worked out by the Files panel: mods cannot import each other
    this.state = { kind: "loading", text: "" };
    this.code = null;
    this.disk = null; // the text as last read from or written to disk
    this.editable = false;
    this.dirty = false;
    this.conflict = false;
    this.wrap = false;
    this.alive = true;
    if (!this.file) { this.state = { kind: "missing", text: "" }; return; }
    this.load(cx);
    cx.spawn(async cx => {
      const dir = this.file.slice(0, Math.max(this.file.lastIndexOf("/"), 1));
      try {
        while (this.alive) {
          await watchFolder(dir);
          if (this.alive) await this.load(cx);
        }
      } catch { /* no watcher: the file stays as read */ }
    });
  }

  async load(cx) {
    let text = null;
    try { text = await readTextFile(this.file, { on: this.on }); } catch { text = null; }
    const next = prepare(text);
    if (this.dirty && this.code) {
      // Unsaved edits win: never replace the buffer, only flag that the disk moved on.
      this.conflict = next.kind !== "ok" || next.text !== this.disk;
      cx.notify();
      return;
    }
    this.state = next;
    if (this.state.kind === "ok") {
      this.disk = text;
      this.conflict = false;
      if (this.code) this.code.set_value(this.state.text);
      else {
        this.editable = isEditable(this.state, this.on);
        this.build(this.state.text);
      }
      this.dirty = false;
    }
    cx.notify();
  }

  build(value) {
    const t = theme();
    this.code = EditorState.new({
      language: languageFor(this.file), readonly: !this.editable, value, soft_wrap: this.wrap,
      font_family: settings().font_family, font_size: 13,
      syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 },
    });
    this.code.on("change", (_e, cx) => { this.dirty = this.code.value() !== this.disk; cx.notify(); });
  }

  // soft_wrap is fixed when the editor is created, so toggling rebuilds it around the same text.
  toggleWrap(cx) {
    if (!this.code) return;
    const text = this.code.value();
    this.code.release();
    this.wrap = !this.wrap;
    this.build(text);
    cx.notify();
  }

  async save(cx) {
    if (!this.editable || !this.dirty || !this.code) return;
    const text = this.code.value();
    try {
      await writeTextFile(this.file, text, this.disk);
      this.disk = text;
      this.dirty = false;
      this.conflict = false;
    } catch {
      this.conflict = true; // the file changed under us (or cannot be written): keep the buffer
    }
    cx.notify();
  }

  async close() {
    this.alive = false;
    this.code?.release();
    this.code = null;
  }

  message(text, t) {
    return div().flex_1().flex().items_center().justify_center().text_color(t.dim).child(text);
  }

  render() {
    const t = theme(), s = this.state;
    const body = s.kind === "ok" && this.code ? Editor.new(this.code).flex_1().min_h(0)
      : s.kind === "binary" ? this.message("Binary file · no text view", t)
      : s.kind === "missing" ? this.message("This file is not available", t)
      : this.message("Loading…", t);
    const label = statusLabel({ editable: this.editable, dirty: this.dirty, conflict: this.conflict });
    return v_flex().id("zed-file").key_context("ZedFile").size_full().min_h(0).bg(t.background).text_color(t.foreground)
      .on_key_down((e, cx) => { if (e.keystroke === "cmd-s" || e.keystroke === "ctrl-s") { cx.stop_propagation(); this.save(cx); }
        else if (e.keystroke === "alt-z") { cx.stop_propagation(); this.toggleWrap(cx); } })
      .child(h_flex().h(28).px(12).gap(8).flex_none().items_center().border_b(1).border_color(t.border).text_size(12)
        .child(this.icon ? image(this.icon).size(14).flex_none() : div())
        .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(this.file ? shortPath(this.file, home()) : ""))
        .when(s.truncated, el => el.child(div().text_color(t.blocked).child("truncated")))
        .when(this.state.kind === "ok", el => el.child(div().id("wrap").cursor_pointer().text_color(this.wrap ? t.foreground : t.dim)
          .on_click((_e, cx) => this.toggleWrap(cx)).child("wrap")))
        .child(div().text_color(this.conflict ? t.blocked : t.dim).child(label)))
      .child(body);
  }
}
