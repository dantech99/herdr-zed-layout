# Zed

A Herdr layout modeled on the Zed editor, in Tokyo Night colors. A slim title bar with breadcrumbs sits on top, a sidebar with a "New space" button, spaces and agents on the left, Zed-style flat tabs above the terminals, an optional Files/Changes panel on the right, and a status bar at the bottom with agent quota chips and the panel toggles.

![Zed](preview.png)

## What you see

Top to bottom, the window is a column (`titlebar: none`, so the layout draws its own title bar):

1. **Title bar, 32px**, background `chrome` (`#1f2335`), 1px `border` line below, 12px text, draggable. Left: a sidebar toggle button (22px square, `mods/workspace-chrome/sidebar.svg`). Next to it, breadcrumbs separated by a dim `·`: the active space name (`foreground`), its git branch with a branch icon (`muted`), and the focused agent's program name, or the tab name if the tab was renamed (`muted`). Each crumb truncates at 240px. With no space it shows `Zed` in `muted`. On Windows/Linux, when the window reports buttons, minimize, maximize/restore and close sit on the right; close turns `blocked`-yellow on hover. On macOS the left padding grows to leave room for the traffic lights (`traffic_lights: [10, 8]`).
2. **Body**, a row with 1px `border` dividers:
   - **Sidebar, 300px** (min 44, max 560, resizable), background `chrome`, three stacked blocks:
     - **New space, 48px:** a full-width pill button (`solid` blue `#7aa2f7`, dark text, 8px radius) with a plus icon and the label "New space". The label hides when the sidebar is narrower than 160px.
     - **Spaces:** the shipped `spaces` mod, weight 1, min 90px.
     - **Agents:** the shipped `agents` mod, weight 1, min 90px.
   - **Work area**, a column:
     - **Tab strip, 34px**, `chrome` background. Each tab is flat with a 1px right border; the active tab uses the `background` color (`#24283b`) and `foreground` text, inactive tabs use `chrome` and `muted`. A new-tab `+` button (24px, 6px margin each side) sits right after the last tab and scrolls with the tabs when there are more than fit.
     - **Panes**: the active tab's terminals with no gap, no radius, a 1px `border` frame, and a 1px `accent` (`#7aa2f7`) frame on the focused pane.
   - **Right panel, 320px** (min 220, max 640, resizable), hidden until opened, `chrome` background. A stack with two views: **Files** (project tree of the focused terminal's folder, with a Material Icon Theme icon per file and folder, open-folder variants when expanded; clicking a file opens it as a tab, see File tabs; no rounded card around it) and **Changes** (git panel: stage and commit tracked files, read-only history, a diff view for the selected file).
3. **Status bar, 28px**, a row on `chrome`: the shipped `workspace-status` mod (flexible), then the **agent quota bars** (400px), then two **panel toggle icons** (64px, 24px buttons with 16px Lucide icons: `folder-tree` for Files, `git-compare` for Changes).

Fonts: terminal `JetBrains Mono` 14px with `[6, 8]` terminal padding; UI font `Geist`.

Colors come from the custom theme `tokyo-night` (`themes/tokyo-night.json`): background `#24283b`, foreground `#c0caf5`, chrome/canvas `#1f2335`, border `#1b1e2e`, hover `#292e42`, selected `#3b4261`, muted `#565f89`, dim `#414868`, accent/solid `#7aa2f7`.

## How it behaves

**Agent status** appears as an 8px dot at the left of each tab, using the theme's status colors: `working` `#7aa2f7`, `blocked` `#e0af68`, `done` `#9ece6a`, `idle` `#565f89`. A tab with no status gets the `dim` dot (`#414868`). The sidebar's spaces and agents lists show status in the shipped mods' own style.

**Agent quota bars** (status bar): one slim bar per limit window reported by `quota-axi`: provider icon, window label (`5h`, `wk`), a thin bar and the percent used. Bars are quiet until it matters: amber from 60 %, orange from 80 %, red from 92 %. A tick marks how much of the window has passed. Clicking the strip opens a popup with reset times, pace ("ahead of / under pace"), the machine it reads from, a Refresh action and saved options (which limit kinds, which providers, signed-out providers, names, show remaining instead of used, Antigravity Claude/GPT limits). The layout hides `cursor` and `copilot` (`props.hidden`) and, for Grok, draws only its `credits` window (`props.windows: {"grok": ["credits"]}`) because Grok reports five weekly windows; the popup still lists all of them. Refreshes every 2 minutes; a result older than 10 minutes is marked stale. Windows of kind `unknown` (for example Codex's free-plan window) are not shown.

**File tabs**: clicking a file in the Files panel opens it as a tab of its own, named after the file, with its Material icon (no agent status dot). The view is editable for complete local text files: a thin header (icon, path with `~`, "modified" while there are unsaved edits, "changed on disk" when the file changed under unsaved edits or the save was rejected; Ctrl/Cmd-S saves; a "wrap" toggle (click, or Alt-Z) turns soft wrap on, off by default and per tab; "read only" for remote, truncated and binary files; "truncated" for files over 400 000 characters), then the file with syntax highlighting and line numbers. Binary files show "Binary file · no text view"; unreadable files, or files over 1 MiB, show "This file is not available". It re-reads the file when its folder changes, unless there are unsaved edits. Clicking the same file again selects its existing tab instead of opening a second one. The Files panel keeps showing the project's tree while a file tab is focused. The tab closes like any tab and survives an app restart.

**Panel toggles** (status bar): clicking Files or Changes shows the right panel on that view; clicking the active one hides the panel. The active icon is `accent` blue on a `selected` background, the inactive one `ansi7`.

**Tabs**
- Show the agent's program icon (tinted icons follow the text color) and the tab name. Unnamed tabs (`tb<N>`) are labeled with the program name, or `Terminal`. A zoomed tab appends ` Z`.
- Click selects. Double-click renames (`tab.rename`). Press on one tab and release over another to reorder (`tab.move`). Right-click opens the shipped `menu` popup (200px wide) for that tab.
- Mouse wheel over the strip switches to the previous/next tab (`tab.prev` / `tab.next`).
- The active tab shows an 18px close button (`tab.close`). The `+` opens the shipped `new-menu` popup (250 x 512).

**Title bar**
- Sidebar button runs `layout.toggle {id: "sidebar"}`.
- Window buttons run `window.minimize`, `window.maximize`, `window.close`. Dragging the empty bar moves the window.

**New space dialog** (a 460 x 340 `dialog` overlay opened by the sidebar button):
- Fields: Folder (prefilled with the focused pane's cwd, or the home folder; empty on a remote machine), a `Browse…` chip (hidden for remote machines, uses `pickFolder`), Agent chips (`Terminal` plus every installed agent from `knownAgents`), and an optional Branch.
- `Tab` switches between Folder and Branch, `Enter` creates, `Esc` cancels. The focused field gets an `accent` border.
- Create with an empty folder (local) shows `Choose a folder.` in `blocked` color and does nothing else.
- No branch: runs `space.new` with `folder`, `machine` (if remote) and `argv` (the chosen agent's `run`). With a branch: opens the shipped `worktree` dialog (460 x 280) with `folder`, `machine`, `branch`, `argv`.
- If agents fail to load, "Could not load agents" appears next to the chips.

## Built from

`layouts/zed.json` node tree: `root` (column) → `titlebar` (block, 32px, `window_drag`), `body` (row) → [`sidebar` (column, 300px) → `new-space` (48px), `spaces`, `agents`], [`work` (column) → `tabs` (34px), `main` (block with `tab: "active"` and the `pane` style above)], [`panel` (column, 320px, `hidden: true`) → `panel-body` (stack, `active: "files"`) → `files` (zed-file-icons), `changes` (zed-changes)], then `status` (row, 28px) → `status-main` (weight 1), `status-quota` (280px), `status-panels` (64px). Layout keys: `theme: "tokyo-night"`, `font`, `font_size`, `ui_font`, `background: "background"`, `terminal_padding`, `preview: "layouts/zed.svg"`.

Own mods (all `place: "none"`):
- `mods/zed-title` — title bar. Reads `theme()`, `window()`, `spaces()`, `agents()`, `focused()`, `layout()`; calls `run("layout.toggle")`, `run("window.minimize" | "window.maximize" | "window.close")`.
- `mods/zed-tabs` — tab strip. Reads `spaces()`, `panes()`, `theme()`; calls `run("tab.select" | "tab.rename" | "tab.move" | "tab.close" | "tab.prev" | "tab.next")`, `openOverlay({mod: "menu"})` and `openOverlay({mod: "new-menu"})`.
- `mods/zed-quota` — agent quota bars: a copy of `Lakris2407/herdr-quota` (MIT) with its six open pull requests applied (#3 `percentRemaining`, #4 used/remaining toggle, #5 popup controls, #6 remote machines, #7 Windows shim, #8 Antigravity toggle). Runs `quota-axi --json` on the selected space's machine, with a login-shell fallback. Modules: `main.js`, `quota-command.js`, `quota-windows.js`, `check.svg`, tests `*.test.mjs`. Shared state keys use the `zed-quota.` prefix.
- `mods/zed-settings` — the layout settings window (`mod.open {name: "zed-settings"}`, a dialog 420px wide): word wrap for newly opened file tabs (`zed-file.options`) and every quota option (`zed-quota.options`: used/remaining, limits shown, providers tracked, signed-out providers, provider names). Herdr's own Settings has no extension point, so this is a separate window. The quota bar publishes its layout props as `zed-quota.start`, so the window shows the real starting options. Pure logic in `options.js` with tests; the quota defaults duplicate `zed-quota` (mods cannot import each other). The quota popup now only shows details, with a "Settings…" row that opens it.
- `mods/zed-sidebar-footer` — the sidebar footer (112px block under Agents): three 32px rows, each with a Lucide icon: **Settings** (`run("app.settings")`, with a dot when an app update is ready), **Layout settings** (`mod.open {name: "zed-settings"}`) and **Add machine** (`mod.open {name: "machine-add"}`). Same idea as the 0oz-design footer, without the account chip. Icons in `icons/` (Lucide, ISC).
- `mods/zed-panel-switch` — the two toggle icons. Calls `layout.select {stack: "panel-body", child}`, `layout.show {id: "panel"}` and `layout.hide {id: "panel"}`. Icons in `icons/` (Lucide, ISC, see `icons/NOTICE.txt`).
- `mods/zed-file` — the file tab view: `tab.new {name, mod: "zed-file", props: {file, icon, on}}`. Reads with `readTextFile` (≤ 1 MiB, optionally on a remote machine), shows it with `Editor`/`EditorState` (`readonly` unless editable), saves with `writeTextFile(path, text, expected)`, watches the file's folder with `watchFolder`. Logic in `file.js` with tests.
- `mods/zed-file-icons` — the Files view: a copy of `amster93/herdr-file-icons` (Apache-2.0; Material Icon Theme icons, MIT) with the root card removed. Its `open-tab.js` opens a file with `tab.new`/`tab.select` and records tab → `{file, icon}` in shared key `zed-file.tabs`, which `zed-tabs` reads for the tab icon (mods cannot import each other, so the icon path travels in the tab's props). Lists folders with `sh` (`powershell` on Windows), runs `git` for change marks, watches the folder with `watchFolder`. 1184 SVGs in `icons/` indexed by `icons.js`. Credits in the README.
- `mods/zed-changes` — the Changes view; it runs `git` (status, diff, add, commit) in the focused terminal's folder, with tests for its planning logic.
- `mods/zed-new-space` — one mod, two roles: without `props().overlay` it renders the sidebar button; with it, the dialog. Uses `InputState`/`Input` from `gpui-base`, `knownAgents`, `pickFolder`, `home`, `panes`, `spaces`, `layout`, `openOverlay`, `closeOverlay`. Pure logic lives in `plan.js` (`planNewSpace`, `startingFolder`) with tests in `plan.test.js`. Its `mod.json` has `overlay: {width: 460, height: 340}`.

Shipped mods used: `spaces`, `agents`, `workspace-status`, `menu`, `new-menu`, `worktree`. Shipped assets used by path: `mods/workspace-chrome/{sidebar,branch,plus}.svg`, `mods/tabs/win-{min,max,restore,close}.svg`, `mods/pane/close.svg`.

Programs run: `git` (zed-changes, zed-file-icons), `sh`/`powershell` (zed-file-icons folder listing) and `quota-axi` (zed-quota; also through the user's login shell as a fallback). `quota-axi` contacts each provider's usage endpoint with the credentials already stored on the machine. No `hc`. File access: the folder picker, the folders the user browses in the panel, and whatever `quota-axi` reads for its providers.

Art: `layouts/zed.svg` is the layout's picker preview; `preview.png` is the screenshot for herdr.dev.

## Watch out

- Each mod ships its own `gpui-kit.d.ts` and `jsconfig.json` for editor typing. They are editor-only helpers and are optional for a fresh build.
- The theme `tokyo-night` is a custom file, not a shipped one. Without `themes/tokyo-night.json` the layout falls back to a different palette and the status dots lose their intended colors.
- `zed-title` assumes `traffic_lights` in the layout (`[10, 8]`) for macOS padding, and that window buttons only render when `window().buttons` is true.
- The close-button hover reuses the `blocked` color (yellow) as the danger color; there is no red in the title bar by design.
- Sidebar mods (`spaces`, `agents`) switch to a compact rail under 160px, and `zed-new-space` hides its label at the same threshold by reading the `sidebar` node's `size.px` from `layout()`. Toggling or resizing the sidebar through other means that don't change `size.px` won't hide the label.
- The branch field always hands off to the shipped `worktree` dialog; this layout never creates a checkout itself.
- The `−` / `□` / `❐` glyphs are used for the minimize/maximize/restore buttons on macOS and Linux; only Windows uses the shipped `win-*.svg` icons.
- Herdr does not serve SVG/PNG assets through symlinks, refuses `import` of modules that resolve outside its folder, and caches a failed load per path. Copy mods as real files (the repo's `install.sh` does) and use a new file name if an icon silently fails to appear.
- The quota bars need [`quota-axi`](https://github.com/kunchenguid/quota-axi) on the machine (`npm install -g quota-axi`; check with `quota-axi --json`). Newer versions report `percentRemaining`, not `percentUsed`; derive used as `100 - remaining`, never for a `shareOf` window.
- Too many bars overflow the 400px block and clip the left side. Keep `hidden` and `windows` in the block's `props` (or the popup's options) tight. `windows` is a local addition: a per-provider allowlist of window ids for the strip only, ignored when empty or when nothing matches. Codex's free-plan window is kind `unknown`, so it shows only its icon.

- It does not define `keys.json`; the title-bar toggle has no dedicated shortcut beyond the app's own `ctrl-shift-b`.

## Done when

- `herdr-app check` passes for every folder in `mods/`.
- `herdr-app do layout.switch '{"name":"zed"}'` shows the window described above, and `layout.error` is absent.
- The title bar shows `space · branch · agent` for the active space, and the sidebar button collapses and restores the sidebar.
- The tab strip shows one flat tab per tab of the active space, with a colored status dot; double-click renames, drag reorders, right-click opens the menu, wheel switches tabs.
- Clicking "New space" opens the dialog with the folder prefilled; Create with a folder runs `space.new`; Create with a branch opens the `worktree` dialog; an empty folder shows `Choose a folder.`.
- Clicking Files or Changes in the status bar opens the right panel on that view and clicking the active one closes it; the icons are visible against the bar.
- With `quota-axi` installed, the status bar shows a Claude `5h` and `wk` bar matching `quota-axi --json` (used = 100 - percentRemaining), and clicking it opens the popup.
- `node --test` passes for `mods/zed-new-space/plan.test.js`, `node --test mods/zed-quota/*.test.mjs`, and `mods/zed-changes/plan.test.js`.
