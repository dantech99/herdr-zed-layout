import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme, run, window, spaces, agents, focused, layout } from "herdr";

export default class ZedTitle extends View {
  button(id, glyph, action, hover) {
    const t = theme();
    return div().id(id).size(22).flex_none().flex().items_center().justify_center().rounded(4)
      .text_color(t.muted)
      .hover(s => hover ? hover(s, t) : s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(action)
      .child(glyph);
  }

  render() {
    const t = theme();
    const w = window();
    const space = spaces().find(s => s.active);
    const focus = focused();
    const tab = space?.tabs?.find(c => c.id === focus?.tab) ?? space?.tabs?.find(c => c.active);
    const agent = agents().find(a => a.focused) ?? (focus?.agent ? agents().find(a => a.address === focus.agent) : null);
    const crumbs = [];
    if (space?.name) crumbs.push({ text: space.name, color: t.foreground });
    if (space?.branch) crumbs.push({ text: space.branch, color: t.muted, icon: "branch" });
    const who = agent?.program?.name || (tab && !/^tb\d+$/.test(tab.name) ? tab.name : null);
    if (who) crumbs.push({ text: who, color: t.muted });

    const macos = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen;
    const lights = layout()?.traffic_lights;
    const pad = macos && lights ? Math.max(8, lights[0] + 64) : 8;
    const parts = [];
    if (crumbs.length === 0) {
      parts.push(div().text_color(t.muted).child("Zed"));
    } else {
      crumbs.forEach((c, i) => {
        if (i) parts.push(div().text_color(t.dim).child("·"));
        const bit = h_flex().gap(4).items_center().min_w(0);
        if (c.icon) bit.child(svg(`mods/workspace-chrome/${c.icon}.svg`).size(12).text_color(c.color));
        bit.child(div().truncate().max_w(240).text_color(c.color).child(c.text));
        parts.push(bit);
      });
    }

    return h_flex().size_full().items_center().gap(8).pr(6).pl(pad).bg(t.chrome)
      .border_b(1).border_color(t.border).text_size(12)
      .child(this.button("zed-sidebar", svg("mods/workspace-chrome/sidebar.svg").size(14), () => run("layout.toggle", { id: "sidebar" })))
      .child(h_flex().flex_1().min_w(0).gap(8).items_center().children(parts))
      .when(Boolean(w?.buttons), el => el
        .child(this.button("zed-min", w.platform === "windows" ? svg("mods/tabs/win-min.svg").size(14) : "−", () => run("window.minimize")))
        .child(this.button("zed-max", w.platform === "windows" ? svg(`mods/tabs/${w.maximized ? "win-restore" : "win-max"}.svg`).size(14) : (w.maximized ? "❐" : "□"), () => run("window.maximize")))
        .child(this.button("zed-close", w.platform === "windows" ? svg("mods/tabs/win-close.svg").size(14) : svg("mods/pane/close.svg").size(12), () => run("window.close"), (s, theme) => s.bg(theme.blocked).text_color(theme.background))));
  }
}
