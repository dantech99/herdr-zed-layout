export function sortEntries(entries) {
  return [...entries].sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name));
}

export function visibleRows(entries, open) {
  const rows = [];
  const walk = (prefix, depth) => {
    if (depth > 40) return;
    for (const entry of entries.get(prefix) ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      rows.push({ path, name: entry.name, dir: entry.dir, depth, open: open.has(path) });
      if (entry.dir && open.has(path)) walk(path, depth + 1);
    }
  };
  walk("", 0);
  return rows;
}
