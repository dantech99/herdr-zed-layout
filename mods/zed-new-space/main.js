// New space: the sidebar button, and the dialog it opens.
// Folder, agent, and an optional branch. A branch hands off to the
// shipped worktree dialog, which creates the checkout and the space.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { run, props, closeOverlay, openOverlay, theme, spaces, panes, home, knownAgents, pickFolder, layout } from "herdr";
import { planNewSpace, startingFolder } from "./plan.js";

const field = (input, focused, t) => Input.new(input).h(32).px(10).items_center().rounded(6).border(1)
  .border_color(focused ? t.accent : t.input).bg(t.background).text_color(t.foreground);

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

export default class ZedNewSpace extends View {
  init(_given, cx) {
    this.handle = cx.focus_handle();
    const on = spaces().find(s => s.active)?.machine ?? null;
    this.on = on;
    this.agents = [];
    this.agent = null;
    this.focus = "folder";
    this.error = "";

    const cwd = !on && panes().find(p => p.focused)?.cwd;
    this.folder = InputState.new({ value: startingFolder({ on, cwd, homeDir: home() }), placeholder: "folder" });
    this.branch = InputState.new({ value: "", placeholder: "branch (optional, new or existing)" });
    for (const [name, input] of [["folder", this.folder], ["branch", this.branch]]) {
      input.on("focus", (_e, cx) => { this.focus = name; cx.notify(); });
      input.on("change", (_e, cx) => { this.error = ""; cx.notify(); });
      input.on("submit", (_e, cx) => this.go(cx));
    }
    if (props()?.overlay) this.folder.focus();

    cx.spawn(async cx => {
      try { this.agents = (await knownAgents({ on })).filter(a => a.installed); }
      catch { this.failed = true; }
      cx.notify();
    });
  }

  async browse(cx) {
    const picked = await pickFolder({ prompt: "Folder for the new space" });
    if (picked) { this.folder.set_value(picked); this.error = ""; }
    cx.notify();
  }

  go(cx) {
    const plan = planNewSpace({
      folder: this.folder.value(),
      branch: this.branch.value(),
      agent: this.agent,
      on: this.on,
    });
    if (plan.error) { this.error = plan.error; cx.notify(); return; }
    closeOverlay(props().overlay);
    if (plan.overlay) openOverlay(plan.overlay);
    else run(plan.command, plan.args);
  }

  chip(id, label, selected, onClick, t) {
    return div().id(id).h(28).px(10).flex().items_center().rounded(6).cursor_pointer().flex_none()
      .border(1).border_color(selected ? t.accent : t.input)
      .bg(selected ? t.selected : t.background).text_color(selected ? t.foreground : t.muted)
      .hover(s => s.bg(t.hover)).on_click(onClick).child(label);
  }

  button() {
    const t = theme();
    const collapsed = narrow();
    return v_flex().id("zed-new-space-bar").size_full().bg(t.chrome)
      .child(h_flex().id("zed-new-space-brand").h(40).px(8).gap(9).items_center().justify_center()
        .child(image("frame/welcome/herdr.png").size(22).flex_none().rounded(6))
        .when(!collapsed, el => el.child(div().font_semibold().text_size(14).text_color(t.foreground).child("Herdr"))))
      .child(h_flex().px(8).h(48).items_center()
        .child(h_flex().id("zed-new-space-open").flex_1().h(32).gap(7).items_center().justify_center().rounded(8)
          .bg(t.solid).text_color(t.solid_foreground).font_medium().cursor_pointer()
          .hover(s => s.bg(t.foreground))
          .on_click(() => openOverlay({ mod: "zed-new-space", kind: "dialog", width: 460, height: 340 }))
          .child(svg("mods/workspace-chrome/plus.svg").size(14).text_color(t.solid_foreground))
          .when(!collapsed, el => el.child("New space"))));
  }

  render() {
    if (!props()?.overlay) return this.button();
    const t = theme();
    const label = text => div().text_size(11).text_color(t.dim).child(text);
    return v_flex().id("zed-new-space").track_focus(this.handle).size_full().p(16).gap(8).bg(t.popover).text_size(13)
      .on_key_down(e => {
        if (e.key === "tab") (this.focus === "folder" ? this.branch : this.folder).focus();
      })
      .child(div().font_semibold().text_color(t.foreground).child("New space"))
      .child(label("Folder"))
      .child(h_flex().gap(6)
        .child(div().flex_1().child(field(this.folder, this.focus === "folder", t)))
        .when(!this.on, el => el.child(this.chip("browse", "Browse…", false, (_e, cx) => this.browse(cx), t))))
      .child(label("Agent"))
      .child(h_flex().gap(6).flex_wrap()
        .child(this.chip("agent-none", "Terminal", this.agent === null, (_e, cx) => { this.agent = null; cx.notify(); }, t))
        .children(this.agents.map(a => this.chip(`agent-${a.key}`, a.name, this.agent?.key === a.key,
          (_e, cx) => { this.agent = a; cx.notify(); }, t)))
        .when(this.failed, el => el.child(div().text_color(t.dim).child("Could not load agents"))))
      .child(label("Branch"))
      .child(field(this.branch, this.focus === "branch", t))
      .when(Boolean(this.error), el => el.child(div().text_color(t.blocked).child(this.error)))
      .child(div().flex_1())
      .child(h_flex().justify_between().items_center()
        .child(div().text_size(11).text_color(t.dim).child("Tab switches field · Enter creates · Esc cancels"))
        .child(div().id("create").h(30).px(14).flex().items_center().rounded(7).cursor_pointer()
          .bg(t.solid).text_color(t.solid_foreground).font_medium().hover(s => s.bg(t.foreground))
          .on_click((_e, cx) => this.go(cx)).child("Create")));
  }
}
