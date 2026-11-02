// Project quick commands: storage per project and the plan for running one.
// A terminal command runs in a new tab and leaves a shell open when it ends.

export function projectKey(space) {
  if (!space?.folder) return null;
  return space.machine ? `${space.machine}:${space.folder}` : space.folder;
}

export function itemsFor(store, key) {
  const list = store?.[key];
  return Array.isArray(list) ? list : [];
}

export function saveItem(store, key, item) {
  const list = itemsFor(store, key);
  const next = list.some(i => i.id === item.id) ? list.map(i => (i.id === item.id ? item : i)) : [...list, item];
  return { ...store, [key]: next };
}

export function removeItem(store, key, id) {
  return { ...store, [key]: itemsFor(store, key).filter(i => i.id !== id) };
}

export function validate({ label, command }) {
  if (!(label ?? "").trim()) return "Add a label.";
  if (!(command ?? "").trim()) return "Add a command.";
  return null;
}

export function nextId(items) {
  const used = new Set(items.map(i => i.id));
  let n = 1;
  while (used.has(`c${n}`)) n++;
  return `c${n}`;
}

export function planRun(item, space) {
  // tab.new has no machine argument: it opens in the selected space, which is where the item lives.
  const args = { name: item.label, folder: space.folder };
  if (item.action === "agent") {
    args.argv = item.agent?.run ?? [];
    args.task = item.command;
  } else {
    args.argv = ["sh", "-lc", `${item.command}\nexec "\${SHELL:-sh}"`];
  }
  return { command: "tab.new", args };
}
