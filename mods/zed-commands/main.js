// Quick commands for the project of the active space: a run button with a menu (status bar),
// the menu itself (props().menu) and the add/edit dialog (props().form), all in this one mod.
// Items live in the shared key `zed-commands.items`, grouped by project (see commands.js).

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextareaState, Textarea } from "gpui-base";
import { run, props, closeOverlay, openOverlay, theme, spaces, shared, setShared, knownAgents } from "herdr";
import { projectKey, itemsFor, saveItem, removeItem, validate, nextId, planRun } from "./commands.js";

const ITEMS = "zed-commands.items";
const LAST = "zed-commands.last";
const ROW = 52;

const active = () => spaces().find(s => s.active);
const store = () => shared(ITEMS) ?? {};

function execute(item, space) {
  const plan = planRun(item, space);
  setShared(LAST, { ...(shared(LAST) ?? {}), [projectKey(space)]: item.id });
  run(plan.command, plan.args);
}

const openMenu = space => {
  const n = itemsFor(store(), projectKey(space)).length;
  openOverlay({ mod: "zed-commands", kind: "popup", width: 340, height: 20 + n * ROW + 40, props: { menu: true, space } });
};
const openForm = (space, item) =>
  openOverlay({ mod: "zed-commands", kind: "dialog", width: 520, height: 420, props: { form: true, space, item } });

export default class ZedCommands extends View {
  init(_given, cx) {
    const p = props() ?? {};
    if (p.form) this.initForm(p, cx);
  }

  initForm(p, cx) {
    this.space = p.space;
    this.item = p.item ?? null;
    this.action = p.item?.action ?? "terminal";
    this.agent = p.item?.agent ?? null;
    this.agents = [];
    this.error = "";
    this.label = InputState.new({ value: p.item?.label ?? "", placeholder: "Start dev server" });
    this.command = TextareaState.new({ value: p.item?.command ?? "", placeholder: "npm run dev", rows: 8 });
    this.label.on("change", (_e, cx2) => { this.error = ""; cx2.notify(); });
    this.command.on("change", (_e, cx2) => { this.error = ""; cx2.notify(); });
    this.command.on("submit", (_e, cx2) => this.save(cx2));
    this.label.focus();
    cx.spawn(async cx2 => {
      try { this.agents = (await knownAgents({ on: this.space.machine ?? null })).filter(a => a.installed); } catch { this.failed = true; }
      if (!this.agent && this.agents[0]) this.agent = { key: this.agents[0].key, name: this.agents[0].name, run: this.agents[0].run };
      cx2.notify();
    });
  }

  close() { this.label?.release?.(); this.command?.release?.(); }

  save(cx) {
    const fields = { label: this.label.value(), command: this.command.value() };
    const problem = validate(fields);
    if (problem) { this.error = problem; cx.notify(); return; }
    const key = projectKey(this.space);
    const items = itemsFor(store(), key);
    const item = {
      id: this.item?.id ?? nextId(items),
      label: fields.label.trim(),
      action: this.action,
      command: fields.command.trim(),
      ...(this.action === "agent" && this.agent ? { agent: this.agent } : {}),
    };
    setShared(ITEMS, saveItem(store(), key, item));
    closeOverlay(props().overlay);
  }

  chip(id, label, selected, onClick, t) {
    return div().id(id).h(28).px(12).flex().items_center().rounded(6).cursor_pointer().flex_none().text_size(12.5)
      .border(1).border_color(selected ? t.accent : t.input)
      .bg(selected ? t.selected : t.background).text_color(selected ? t.foreground : t.muted)
      .hover(s => s.bg(t.hover)).on_click(onClick).child(label);
  }

  iconButton(id, glyph, onClick, t) {
    return div().id(id).size(22).flex().items_center().justify_center().rounded(4).cursor_pointer().text_color(t.muted)
      .hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(onClick).child(glyph);
  }

  button() {
    const t = theme();
    const space = active();
    const key = projectKey(space);
    const items = itemsFor(store(), key);
    const last = shared(LAST)?.[key];
    const main = items.find(i => i.id === last) ?? items[0];
    return h_flex().id("zed-commands-bar").size_full().px(6).items_center().justify_end().bg(t.chrome).text_size(12)
      .child(h_flex().h(22).rounded(5).items_center().border(1).border_color(t.border)
        .child(h_flex().id("zed-commands-run").h_full().px(8).gap(6).items_center().rounded_l(5).cursor_pointer()
          .text_color(space ? t.foreground : t.dim).hover(s => s.bg(t.hover))
          .on_click(() => { if (!space) return; if (main) execute(main, space); else openForm(space, null); })
          .child(div().text_size(9).text_color(t.accent).child("▶"))
          .child(div().max_w(150).truncate().child(main ? main.label : "Add command")))
        .child(div().id("zed-commands-menu").h_full().px(6).flex().items_center().rounded_r(5).cursor_pointer()
          .border_l(1).border_color(t.border).text_color(t.muted).hover(s => s.bg(t.hover))
          .on_click(() => { if (space) openMenu(space); }).child("▾")));
  }

  menu() {
    const t = theme();
    const space = props().space;
    const key = projectKey(space);
    const items = itemsFor(store(), key);
    const close = () => closeOverlay(props().overlay);
    return v_flex().id("zed-commands-popup").size_full().p(6).gap(2).bg(t.popover).text_size(13)
      .children(items.map(item => h_flex().id(`cmd-${item.id}`).h(ROW - 2).px(10).gap(10).items_center().rounded(6).cursor_pointer()
        .hover(s => s.bg(t.hover))
        .on_click(() => { close(); execute(item, space); })
        .child(div().text_size(10).text_color(t.dim).child("▶"))
        .child(v_flex().flex_1().min_w(0).gap(2)
          .child(div().truncate().text_color(t.foreground).child(item.label))
          .child(div().truncate().text_size(11).text_color(t.dim).child(item.action === "agent" ? `${item.agent?.name ?? "agent"}: ${item.command}` : item.command)))
        .child(this.iconButton(`copy-${item.id}`, "⧉", (_e, cx) => { cx.write_to_clipboard(item.command); close(); }, t))
        .child(this.iconButton(`edit-${item.id}`, "✎", () => { close(); openForm(space, item); }, t))
        .child(this.iconButton(`del-${item.id}`, "✕", () => { setShared(ITEMS, removeItem(store(), key, item.id)); close(); }, t))))
      .child(h_flex().id("zed-commands-add").h(34).px(10).gap(8).items_center().rounded(6).cursor_pointer().text_color(t.muted)
        .hover(s => s.bg(t.hover).text_color(t.foreground))
        .on_click(() => { close(); openForm(space, null); })
        .child(svg("mods/workspace-chrome/plus.svg").size(14))
        .child("Command"));
  }

  form() {
    const t = theme();
    const label = text => div().text_size(11).text_color(t.dim).child(text);
    const agent = this.action === "agent";
    return v_flex().id("zed-commands-form").size_full().p(16).gap(8).bg(t.popover).text_size(13)
      .child(div().font_semibold().text_color(t.foreground).child(this.item ? "Edit Quick Command" : "Add Quick Command"))
      .child(div().text_size(11.5).text_color(t.dim).child("Saved for this project. Runs in a new tab and keeps a shell open when it ends."))
      .child(h_flex().gap(12).items_end()
        .child(v_flex().flex_1().gap(4).child(label("Label"))
          .child(Input.new(this.label).h(32).px(10).items_center().rounded(6).border(1).border_color(t.input).bg(t.background).text_color(t.foreground)))
        .child(v_flex().gap(4).child(label("Action"))
          .child(h_flex().gap(6)
            .child(this.chip("action-terminal", "Terminal", !agent, (_e, cx) => { this.action = "terminal"; cx.notify(); }, t))
            .child(this.chip("action-agent", "Agent", agent, (_e, cx) => { this.action = "agent"; cx.notify(); }, t)))))
      .when(agent, el => el.child(h_flex().gap(6).flex_wrap()
        .children(this.agents.map(a => this.chip(`agent-${a.key}`, a.name, this.agent?.key === a.key,
          (_e, cx) => { this.agent = { key: a.key, name: a.name, run: a.run }; cx.notify(); }, t)))
        .when(this.failed, e => e.child(div().text_color(t.dim).child("Could not load agents")))))
      .child(label(agent ? "Message for the agent" : "Command"))
      .child(div().flex_1().px(10).py(8).rounded(6).border(1).border_color(t.input).bg(t.background)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .child(Textarea.new(this.command).size_full().text_size(12).text_color(t.foreground)))
      .when(Boolean(this.error), el => el.child(div().text_color(t.blocked).child(this.error)))
      .child(h_flex().justify_end().gap(8).items_center()
        .child(div().id("form-cancel").h(30).px(14).flex().items_center().rounded(7).cursor_pointer().border(1).border_color(t.border)
          .text_color(t.foreground).hover(s => s.bg(t.hover)).on_click(() => closeOverlay(props().overlay)).child("Cancel"))
        .child(div().id("form-save").h(30).px(14).flex().items_center().gap(8).rounded(7).cursor_pointer()
          .bg(t.solid).text_color(t.solid_foreground).font_medium().hover(s => s.bg(t.foreground))
          .on_click((_e, cx) => this.save(cx)).child("Save")));
  }

  render() {
    const p = props() ?? {};
    if (p.form) return this.form();
    if (p.menu) return this.menu();
    return this.button();
  }
}
