// Sidebar footer: Settings (Herdr's own), Layout settings (this layout's window) and Add machine,
// as in the 0oz-design layout's footer.

import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, updates } from "herdr";

export default class ZedSidebarFooter extends View {
  render() {
    const t = theme();
    const row = (id, icon, label, action) => h_flex().id(id).h(32).px(10).gap(10).items_center().rounded(8).cursor_pointer()
      .text_color(t.muted).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_click(action).child(svg(`mods/zed-sidebar-footer/icons/${icon}.svg`).size(15).flex_none())
      .child(div().flex_1().min_w(0).truncate().child(label));
    return v_flex().id("zed-sidebar-footer").size_full().bg(t.chrome).px(8).py(6).gap(2).text_size(13)
      .child(row("settings", "settings", "Settings", () => run("app.settings"))
        .when(Boolean(updates().app.ready), el => el.child(div().size(6).rounded_full().bg(t.accent))))
      .child(row("layout-settings", "sliders", "Layout settings", () => run("mod.open", { name: "zed-settings" })))
      .child(row("machine", "plus", "Add machine", () => run("mod.open", { name: "machine-add" })));
  }
}
