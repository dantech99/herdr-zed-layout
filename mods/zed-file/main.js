// A file shown as a tab: read-only, with syntax highlighting and line numbers. Opened by
// `tab.new {mod: "zed-file", props: {file, on}}` from the Files panel. It re-reads the file when
// its folder changes (agents edit files under you).

import { View, div, image } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState } from "gpui-base";
import { props, readTextFile, watchFolder, theme, settings, home } from "herdr";
import { languageFor, prepare, shortPath } from "./file.js";

export default class ZedFile extends View {
  init(_given, cx) {
    const p = props() ?? {};
    this.file = p.file ?? null;
    this.on = p.on ?? null;
    this.icon = p.icon ?? null; // worked out by the Files panel: mods cannot import each other
    this.state = { kind: "loading", text: "" };
    this.code = null;
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
    this.state = prepare(text);
    if (this.state.kind === "ok") {
      if (this.code) this.code.set_value(this.state.text);
      else {
        const t = theme();
        this.code = EditorState.new({
          language: languageFor(this.file), readonly: true, value: this.state.text,
          font_family: settings().font_family, font_size: 13,
          syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6 },
        });
      }
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
    return v_flex().id("zed-file").size_full().min_h(0).bg(t.background).text_color(t.foreground)
      .child(h_flex().h(28).px(12).gap(8).flex_none().items_center().border_b(1).border_color(t.border).text_size(12)
        .child(this.icon ? image(this.icon).size(14).flex_none() : div())
        .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(this.file ? shortPath(this.file, home()) : ""))
        .when(s.truncated, el => el.child(div().text_color(t.blocked).child("truncated")))
        .child(div().text_color(t.dim).child("read only")))
      .child(body);
  }
}
