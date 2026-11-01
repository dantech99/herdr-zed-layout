// Quota chips for the status bar: one chip per agent that reports usage windows.
// Claude Code: read from the sub-meter plugin's file in ~/.claude/plugins/store.

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { exec, theme } from "herdr";
import { parseSubMeter, severity, formatReset, windowLabel } from "./quota.js";

const REFRESH_MS = 60000;

export default class ZedQuota extends View {
  init(_props, cx) {
    this.agents = [];
    cx.timer.every(REFRESH_MS, cx => this.refresh(cx));
    this.refresh(cx);
  }

  refresh(cx) {
    cx.spawn(async cx => {
      const next = [];
      try {
        const r = await exec("sh", ["-c", "cat \"$HOME\"/.claude/plugins/store/sub-meter_*.json 2>/dev/null"]);
        const windows = parseSubMeter(r.stdout);
        if (windows.length) next.push({ key: "claude", name: "Claude", windows });
      } catch { /* no source: no chip */ }
      this.agents = next;
      cx.notify();
    });
  }

  chip(agent, t) {
    return h_flex().id(`quota-${agent.key}`).h(20).px(8).gap(8).items_center().flex_none().rounded(4)
      .bg(t.raised).text_size(11)
      .child(div().text_color(t.foreground).child(agent.name))
      .children(agent.windows.map(w => h_flex().gap(4).items_center()
        .child(div().size(6).rounded(3).flex_none().bg(t[severity(w.percent)]))
        .child(div().text_color(t.muted).child(`${windowLabel(w.kind)} ${Math.round(w.percent)}%`))
        .child(div().text_color(t.dim).child(formatReset(w.resetsAt)))));
  }

  render() {
    const t = theme();
    return h_flex().size_full().px(8).gap(6).items_center().justify_end().bg(t.chrome)
      .children(this.agents.map(a => this.chip(a, t)));
  }
}
