// Layout settings window: the options of this layout that Herdr's own Settings cannot host.
// Opened with `mod.open {name: "zed-settings"}`. It writes the same shared keys the other mods read:
// `zed-file.options` (word wrap for newly opened file tabs) and `zed-quota.options` (the quota bar).

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme, shared, setShared, spaces } from "herdr";
import { quotaOptions, toggleHidden, fileOptions } from "./options.js";

const KINDS = [["session", "5-hour limit"], ["weekly", "Weekly limit"], ["monthly", "Monthly limit"], ["model", "Model limits"]];

const quota = () => quotaOptions(shared("zed-quota.start"), shared("zed-quota.options"));
const setQuota = change => setShared("zed-quota.options", { ...quota(), ...change });
const files = () => fileOptions(shared("zed-file.options"));
const setFiles = change => setShared("zed-file.options", { ...files(), ...change });
// The quota bar publishes its providers under a key that names the machine it reads.
const providers = () => shared(`zed-quota.data:${JSON.stringify(spaces().find(s => s.active)?.machine ?? null)}`)?.providers ?? [];

export default class ZedSettings extends View {
  render() {
    const t = theme(), q = quota(), f = files(), all = providers();
    const toggle = (label, on, act, id) => h_flex().id(id).h(32).px(10).gap(10).rounded(6).items_center().cursor_pointer()
      .hover(s => s.bg(t.hover)).on_click(act)
      .child(div().flex_1().text_color(on ? t.foreground : t.muted).child(label))
      .child(div().size(16).flex_none().flex().items_center().justify_center()
        .when(on, el => el.child(svg("mods/zed-settings/check.svg").size(16).text_color(t.accent))));
    const heading = text => div().px(10).pt(12).pb(4).text_size(10.5).text_color(t.dim).child(text);
    return v_flex().id("zed-settings").w_full().p(8).bg(t.popover).text_color(t.foreground).text_size(12.5).overflow_y_scrollbar()
      .child(heading("Editor"))
      .child(toggle("Word wrap in new file tabs", f.wrap, () => setFiles({ wrap: !f.wrap }), "wrap"))
      .child(heading("Quota bar"))
      .child(toggle("Show remaining instead of used", q.remaining, () => setQuota({ remaining: !q.remaining }), "remaining"))
      .child(heading("Limits to show in the status bar"))
      .children(KINDS.map(([kind, label]) => toggle(label, q.kinds[kind], () => setQuota({ kinds: { ...q.kinds, [kind]: !q.kinds[kind] } }), `kind-${kind}`)))
      .child(heading("Models to track"))
      .children(all.map(p => toggle(p.label, !q.hidden.includes(p.id), () => setQuota({ hidden: toggleHidden(q.hidden, p.id) }), `prov-${p.id}`)))
      .when(all.some(p => p.id === "agy"), el => el.child(toggle("Antigravity: Claude/GPT limits", q.agyClaudeGpt !== false,
        () => setQuota({ agyClaudeGpt: q.agyClaudeGpt === false }), "agy-claude-gpt")))
      .child(heading("Display"))
      .child(toggle("Signed-out providers", q.signedOut, () => setQuota({ signedOut: !q.signedOut }), "signed-out"))
      .child(toggle("Provider names", q.names, () => setQuota({ names: !q.names }), "names"));
  }
}
