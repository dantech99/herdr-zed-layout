import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, run, openOverlay, theme } from "herdr";

export default class ZedTabs extends View {
  init() {
    this.pressed = null;
  }

  render() {
    const t = theme();
    const space = spaces().find(p => p.active);
    const shown = space?.tabs ?? [];
    const stop = (_e, cx) => cx.stop_propagation();
    const item = (c, i) => {
      const program = panes().find(p => p.tab === c.id && p.program?.agent)?.program
        ?? panes().find(p => p.tab === c.id)?.program;
      const name = /^tb\d+$/.test(c.name) ? program?.name ?? "Terminal" : c.name;
      return h_flex().id(`tab-${c.id}`).h_full().pl(12).pr(6).gap(8).items_center().flex_none()
        .border_r(1).border_color(t.border)
        .bg(c.active ? t.background : t.chrome)
        .text_color(c.active ? t.foreground : t.muted)
        .hover(s => c.active ? s : s.bg(t.hover))
        .on_mouse_down("left", (e, cx) => {
          cx.stop_propagation();
          this.pressed = i;
          if (e.click_count === 2) run("tab.rename", { id: c.id });
        })
        .on_mouse_up("left", () => {
          const from = this.pressed;
          this.pressed = null;
          if (from !== null && from !== i) {
            run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          } else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", (_e, cx) => {
          cx.stop_propagation();
          openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } });
        })
        .child(div().size(8).rounded(4).flex_none().bg(c.status ? t[c.status] : t.dim))
        .when(Boolean(program?.icon), el => el.child(program.tint
          ? svg(program.icon).size(14).text_color(c.active ? t.foreground : t.muted)
          : image(program.icon).size(14)))
        .child(div().max_w(180).truncate().text_size(12).child(c.zoomed ? `${name} Z` : name))
        .when(c.active, el => el.child(
          div().id(`close-${c.id}`).size(18).flex().items_center().justify_center().rounded(4)
            .text_color(t.muted)
            .hover(s => s.bg(t.hover).text_color(t.foreground))
            .on_mouse_down("left", stop)
            .on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); })
            .child(svg("mods/pane/close.svg").size(11))));
    };

    return h_flex().size_full().min_w(0).items_center().bg(t.chrome).border_b(1).border_color(t.border)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .child(h_flex().id("zed-tab-scroll").flex_1().min_w(0).h_full().items_center().overflow_x_scrollbar().children(shown.map(item)))
      .child(div().id("zed-tab-new").size(24).mr(6).flex_none().flex().items_center().justify_center().rounded(4)
        .text_color(t.muted)
        .hover(s => s.bg(t.hover).text_color(t.foreground))
        .on_mouse_down("left", stop)
        .on_click(() => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }))
        .child(svg("mods/workspace-chrome/plus.svg").size(14)));
  }
}
