// Files and Changes sit at the right end of the status bar.

import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { layout, run, theme } from "herdr";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

const ICONS = {
  files: "mods/zed-panel-switch/icons/tree.svg",
  changes: "mods/zed-panel-switch/icons/compare.svg",
  settings: "mods/zed-panel-switch/icons/settings.svg",
};

export default class ZedPanelSwitch extends View {
  toggle(id, on) {
    if (on) run("layout.hide", { id: "panel" });
    else {
      run("layout.select", { stack: "panel-body", child: id });
      run("layout.show", { id: "panel" });
    }
  }

  render() {
    const t = theme();
    const panel = find(layout(), "panel");
    const body = find(layout(), "panel-body");
    const open = Boolean(panel && !panel.hidden);
    const button = (id) => {
      const on = open && body?.active === id;
      return div().id(`zed-panel-${id}`)
        .size(24).flex().items_center().justify_center().rounded(4).cursor_pointer()
        .bg(on ? t.selected : t.chrome).text_color(on ? t.accent : t.ansi7)
        .hover(s => s.bg(t.hover).text_color(t.accent))
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => this.toggle(id, on))
        .child(svg(ICONS[id]).size(16).text_color(on ? t.accent : t.ansi7));
    };
    return h_flex().id("zed-panel-switch").size_full().pr(8).gap(4).items_center().justify_end().bg(t.chrome)
      .border_t(1).border_color(t.border)
      .child(button("files")).child(button("changes"))
      .child(div().id("zed-open-settings").size(24).flex().items_center().justify_center().rounded(4).cursor_pointer().bg(t.chrome)
        .hover(s => s.bg(t.hover)).on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => run("mod.open", { name: "zed-settings" }))
        .child(svg(ICONS.settings).size(16).text_color(t.ansi7)));
  }
}
