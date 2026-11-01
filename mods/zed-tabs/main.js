import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, shared, run, openOverlay, theme, layout } from "herdr";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class ZedTabs extends View {
  init() {
    this.pressed = null;
    this.panels = JSON.parse(localStorage.getItem("zed.panels") ?? "{}");
  }

  // The right panel is remembered per space. Closed stays closed.
  syncPanel(space, panel, body) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id;
      this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null;
        const want = stored === "files" || stored === "changes" ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("zed.panels", JSON.stringify(this.panels));
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
      const fileTab = shared("zed-file.tabs")?.[c.id]; // a file opened from the Files panel
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
        .when(!fileTab, el => el.child(div().size(8).rounded(4).flex_none().bg(c.status ? t[c.status] : t.dim)))
        .when(Boolean(fileTab?.icon), el => el.child(image(fileTab.icon).size(14)))
        .when(!fileTab && Boolean(program?.icon), el => el.child(program.tint
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

    this.syncPanel(space, find(layout(), "panel"), find(layout(), "panel-body"));

    return h_flex().size_full().min_w(0).items_center().bg(t.chrome).border_b(1).border_color(t.border)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      // The + is the last item of the tab row, so it sits right after the last tab. With more
      // tabs than fit, it scrolls with them instead of staying pinned at the edge.
      .child(h_flex().id("zed-tab-scroll").flex_1().min_w(0).h_full().items_center().overflow_x_scrollbar()
        .children(shown.map(item))
        .child(div().id("zed-tab-new").size(24).mx(6).flex_none().flex().items_center().justify_center().rounded(4)
          .text_color(t.muted)
          .hover(s => s.bg(t.hover).text_color(t.foreground))
          .on_mouse_down("left", stop)
          .on_click(() => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }))
          .child(svg("mods/workspace-chrome/plus.svg").size(14))));
  }
}
