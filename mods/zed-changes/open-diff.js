// Opens a file's diff as a tab of its own (the zed-diff mod), or shows its tab when it is already
// open. The mods cannot import each other, so the bookkeeping lives here.
import { run, spaces, shared, setShared } from "herdr";

const SHARED_TABS = "zed-diff.tabs";
const tabIds = () => spaces().flatMap(space => (space.tabs ?? []).map(tab => tab.id));

// `root` is the repository, `path` relative to it, `xy` its status code, `on` the machine (null = this one).
// Call it from a click handler: it needs that event's `cx` for the timer.
export function openDiff({ root, path, xy, on }, cx) {
  const id = `${on ?? ""}:${root}/${path}`;
  const live = tabIds();
  const map = shared(SHARED_TABS) ?? {};
  const existing = Object.entries(map).find(([tab, file]) => file === id && live.includes(tab))?.[0];
  if (existing) return run("tab.select", { id: existing });
  run("tab.new", { name: `${path.split("/").pop()} (diff)`, mod: "zed-diff", props: { root, path, xy, on: on ?? null } });
  // tab.new returns nothing, so find the new tab once it is in the model and remember it.
  cx.timer.after(300, () => {
    const added = tabIds().find(tab => !live.includes(tab));
    if (!added) return;
    const kept = Object.fromEntries(Object.entries(shared(SHARED_TABS) ?? {}).filter(([tab]) => tabIds().includes(tab)));
    setShared(SHARED_TABS, { ...kept, [added]: id });
  });
}
