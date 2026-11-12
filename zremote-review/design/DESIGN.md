# zremote UI design specification

Status: proposed replacement for `docs/ui-design-spec.md` in `ZaxbyHub/zremote`.
Companion files in this folder:

| File | Role |
|---|---|
| `tokens.css` | Every colour, size, type, and motion value. Normative. |
| `mockups/*.html` + `mockups/zr.css` | Static reference renders of each screen. Geometry and colour are normative; class names are not. |
| `screens/*.png` | The mockups rendered at 1440×900 @2x. Compare implementation screenshots against these. |
| `BUILD-GUIDE.md` | Build order, component contracts, acceptance checks. |

Precedence when sources disagree: this document, then `tokens.css`, then the mockups.
The mockups were rendered in Chromium on Linux: Inter stands in for Segoe UI Variable and Mica
is approximated with a flat tint. On Windows 11 the type will be slightly narrower and the
sidebar and title bar will show the desktop tint.

## 1. Thesis

The remote session is the product. Chrome exists to answer three questions at a glance and
then get out of the way:

1. **Where am I?** Which host, which environment.
2. **Is it safe and alive?** Connection state and security state.
3. **How do I get somewhere else?** One keystroke to any of 10,000 hosts.

Design consequences, in priority order:

- **Vertical pixels belong to the session.** Total chrome is 100 px (title bar 40, session bar
  36, status bar 24), 64 px with the session bar hidden, 0 in full screen. The previous spec
  spent roughly 124 px.
- **State is shape first, colour second.** Five glyph shapes carry connection state everywhere
  (tree, tabs, status bar, palette). Colour reinforces and is never the only cue.
- **Abnormal states speak; normal states stay quiet.** An encrypted, verified session shows a
  neutral chip. An unencrypted or mismatched one shows a coloured chip, a banner, and a status
  bar entry. No green padlocks.
- **Environment is always visible.** A folder can be marked as an environment (for example
  Production). Its colour appears as a 2 px stripe on the tab and along the top of the session.
  This is the one place hue encodes something other than state.
- **Nothing is modal unless a decision is required.** Properties, files, and settings are
  panels and tabs. Dialogs are reserved for trust decisions and destructive confirmation.

## 2. Window anatomy

```
┌────────────────────────────┬───────────────────────────────────────┬──────────┐
│ ▤  Search or connect       │ tab  tab  tab  tab   +  ⌄    (drag)   │  –  ▢  ✕ │ 40  title bar (Mica Alt)
├────────────────────────────┼───────────────────────────────────────┴──────────┤
│ Connections      + ▣ …     │ Folder › Folder › host  [chip]     actions   …   │ 36  session bar (layer)
│ [ Filter           Ctrl F ]├──────────────────────────────────────┬───────────┤
│ ▾ Production          ■ 214│                                      │           │
│   ▾ Web tier               │           SESSION SURFACE            │ INSPECTOR │
│       web01.prod         ● │   terminal | remote desktop canvas   │ (optional)│
│       web02.prod         ● │                                      │  348 wide │
│ ▸ Staging              ■ 61│                                      │           │
├────────────────────────────┤                                      │           │
│ Vault unlocked      ⚿  ⚙   │                                      │           │ 40  sidebar footer
├────────────────────────────┴──────────────────────────────────────┴───────────┤
│ ● Connected  user@host:22  cipher  host key  latency      transfers  🔔  vault │ 24  status bar (Mica)
└────────────────────────────────────────────────────────────────────────────────┘
   sidebar 280 (200–480)                 main (layer, top-left radius 8)
```

Reference: `screens/01-shell-ssh.png`, `02-shell-rdp-inspector-light.png`.

| Region | Size | Surface | Notes |
|---|---|---|---|
| Title bar | 40 high | `--mica-alt` | Left block is as wide as the sidebar and holds the sidebar toggle and the search field. Tabs follow. Caption buttons are the native `titleBarOverlay` (46 wide each); never draw them in HTML. The 8 px above the tabs and all empty strip area are `app-region: drag`. |
| Sidebar | 280 default, 200–480, collapsible | `--mica` | Header 36, filter field 28, tree, footer 40. Collapsing it moves the search field to an icon button in the title bar (`screens/06-credentials.png`). |
| Main | remaining width | `--layer`, 1 px `--stroke-layer` edge, top-left radius 8 when the sidebar is open | Holds the session bar, the surface, and optionally the right panel. |
| Session bar | 36 (32 compact); hideable | `--layer` | Breadcrumb, security chip, session actions. Hidden in full screen and by setting. |
| Right panel | 348 default, 300–520 | `--layer`, left divider | Hosts exactly one of: Inspector (properties), Files (SFTP), Forwards. Opening one replaces the other. |
| Status bar | 24 | `--mica` | Left: facts about the focused session. Right: app-wide items. One bar, not two. |

Minimum window size 880×560. Below 1100 wide the right panel overlays the surface instead of
squeezing it. Tab-hosted pages (Home, Settings, Credentials, Import) replace the session bar and
surface with a page.

## 3. Tokens

All values are in `tokens.css`. Rules for using them:

- **Never hard-code a colour, radius, or duration** in a component. If a value is missing, add
  a token.
- **Surfaces** stack in this order and no other: `--mica-alt` (title bar) → `--mica` (sidebar,
  status bar) → `--layer` (main) → `--layer-alt` (lists and groups inside pages) →
  `--surface-session`. Transient surfaces use `--flyout` (menus, palette, toasts) or `--dialog`.
- **Materials.** The window uses `backgroundMaterial: 'mica'`. `--mica` and `--mica-alt` are
  then applied at about 80% opacity so the tint shows; when `nativeTheme.prefersReducedTransparency`
  is true, or the material is unavailable, they are applied opaque. `--flyout` uses a CSS
  backdrop blur (30 px) as an Acrylic stand-in. `--layer` and everything above it are opaque.
- **Radius.** 4 for controls and rows, 8 for overlays, 6 for the top corners of tabs, 0 where
  edges abut. Nothing else.
- **Elevation.** Shadows only on transient surfaces. Persistent chrome separates with 1 px
  strokes.
- **Type.** Segoe UI Variable by name with fallbacks; one family for UI. Sizes: 12/16 caption,
  13 for dense rows and the session bar, 14/20 body, 20/28 subtitle, 28/36 page title. Weights
  400 and 600 only. Monospace (Cascadia Mono) is for machine data only: addresses, ports,
  fingerprints, ciphers, paths, terminal. Sentence case everywhere.
- **Density.** `data-density` on the root: compact (24 px rows), standard (28, default),
  comfortable (32). Density changes row height, indent, and session bar height; it does not
  change type size.
- **Motion.** 83 ms for hover and press colour, 167 ms for flyouts and the palette, 250 ms for
  dialogs and panel slides. Entrances use `--ease-out`, exits `--ease-in`. Motion only follows a
  user action or a state change of the thing the user is looking at. The connecting glyph is the
  only looping animation. All durations collapse to 0 under `prefers-reduced-motion`.

### 3.1 Accent

The accent is the user's Windows accent colour. Read `systemPreferences.getAccentColor()` at
startup and on `accent-color-changed`, then derive the tokens in main and push them to the
renderer as CSS variables before first paint:

| Token | Dark theme | Light theme |
|---|---|---|
| `--accent` | accent lightened to OKLCH L ≈ 0.80 | accent darkened to L ≈ 0.48 |
| `--accent-text` | L ≈ 0.90 | L ≈ 0.38 |
| `--accent-hover` / `--accent-pressed` | `--accent` mixed 10% / 20% toward the surface | same |
| `--on-accent` | black | white |
| `--accent-subtle` | `--accent` at 14% alpha | at 10% alpha |

Then verify `--on-accent` on `--accent` reaches 4.5:1 and `--accent-text` on `--layer` reaches
4.5:1; if either fails, step L by 0.04 until it passes. The defaults in `tokens.css` are the
Windows default blue. The user may override the accent in Settings. Accent is used for exactly
four things: the selection indicator, the primary button, focus underlines on inputs, and links.

### 3.2 Themes

Dark, light, and "use system setting" (default). Under Windows contrast themes
(`forced-colors: active`) the tokens map to system colours; state remains readable because the
glyph shapes and text carry it. The terminal has its own colour scheme setting and stays dark by
default in the light app theme.

## 4. State system

### 4.1 Connection state

One glyph set, drawn as 10 px SVG, used identically in the tree, tabs, status bar, palette, and
lists. See `screens/12-components-dark.png`.

| Session state (architecture §4) | Glyph | Colour token | Label |
|---|---|---|---|
| no session | none in the tree; hollow ring where a slot must be filled | `--neutral-state` | Idle |
| `connecting`, `authenticating`, waiting for a user decision | quarter-arc spinner | `--accent-text` | Connecting, Signing in, Waiting for you |
| `connected` | filled circle | `--ok` | Connected |
| connected but degraded, unencrypted, or reconnecting | filled triangle | `--warn` | Connected, not encrypted; Reconnecting |
| `failed`, or closed by the remote end | cross | `--danger` | Failed, Disconnected |

Every glyph has an accessible name equal to its label. State changes are announced through one
polite live region ("web01.prod connected").

### 4.2 Security state

Shown as a chip in the session bar and as text in the status bar.

| Situation | Chip | Extra surfaces |
|---|---|---|
| Encrypted and verified (SSH host key known, RDP NLA and trusted certificate, VNC or Telnet inside an SSH tunnel) | neutral: "Host key verified", "NLA, TLS 1.3", "Tunnelled through bastion01" | none |
| Encrypted, trust accepted this session only | neutral: "Trusted for this session" | none |
| Not encrypted (Telnet, VNC password auth without a tunnel) | warning: "Not encrypted" | top banner in the session until dismissed per host; status bar entry in `--warn` |
| Weakened by choice (RDP without NLA, legacy ciphers enabled) | warning: "Legacy security" | status bar entry |
| Trust failure (host key or certificate changed) | danger: "Host key mismatch" | blocking dialog; nothing is sent until resolved |

### 4.3 Environments

An environment is a named colour assigned to a folder and inherited by its descendants. Eight
hues are available (`--env-*`). An environment may also enable two guards: a 2 px frame stripe
on the session surface, and a confirmation before broadcast input reaches its sessions.
Environment colour appears on: the tab's top stripe, the session's top edge, a 6 px square on the
folder row, and a swatch in the inspector. It never colours text or icons.

## 5. Components

Each entry gives geometry, states, and behaviour. Visual reference for all states:
`screens/12-components-dark.png`, `13-components-light.png`.

### 5.1 Search field (title bar)

28 high, fills the title bar's left block. Placeholder "Search or connect", shortcut hint on the
right. It is a button: clicking it or pressing the shortcut opens the palette (§5.9) anchored
below the title bar. It is not an inline text field.

### 5.2 Tab strip

- Tab: 32 high, bottom-aligned in the title bar; width 240 max, 100 min, shrinking evenly.
  Content left to right: protocol icon 16, name (ellipsis), state glyph, close button 20×20.
  Environment stripe 2 px along the top, inset 8 px each side.
- States: default (text `--text-2`, no fill), hover (`--fill-subtle-hover`, close button
  appears), selected (`--layer` fill joined to the main area, text `--text-1`, close button
  visible), dragging (80% opacity, 167 ms settle on drop), keyboard focus (2 px focus ring
  inside).
- A 1 px divider separates adjacent unselected tabs.
- After the last tab: New (opens the palette in connect mode) and a chevron listing all tabs
  with a filter field. When tabs reach minimum width the strip scrolls horizontally with the
  wheel and the selected tab stays in view.
- Behaviour: click selects; middle-click closes; double-click renames the tab label for this
  session only; drag reorders; drag out of the strip tears the tab into a new window (v1.1).
  Context menu: Reconnect, Duplicate session, Rename tab, Move left, Move right, Move to new
  window, Close, Close others, Close to the right.
- Closing a connected session asks nothing by default; a setting enables "Confirm before closing
  connected sessions". Closing the window with connected sessions always confirms once with the
  count.
- Page tabs (Home, Settings, Credentials, Import) use the same component with a page icon and no
  state glyph. Each page is a singleton.
- Fluent's `TabList` is not suitable (no close, no reorder); build this component.

### 5.3 Connection tree

- Row: `--h-row` high, radius 4, full sidebar width minus 4 px margins. Indent `--tree-indent`
  per level. Left to right: chevron slot 16, icon 16, name, then right-aligned trailing slot.
- Trailing slot shows one thing by priority: state glyph if a session is open; else the protocol
  label (ssh, rdp, vnc, telnet, in caption `--text-3`; can be turned off); folders show the
  descendant count, preceded by the environment square if one is set.
- States: default, hover (`--fill-subtle-hover`), selected (`--fill-subtle-selected` plus a
  3 px accent bar at the left edge), keyboard focus (2 px ring), multi-selected (same as
  selected, without the bar on non-primary rows), drop target (accent outline for "into", 2 px
  accent line for "between"), disabled (text `--text-3`; used for unsupported imported
  protocols), filter match (matched characters in `--accent-text`, weight 600).
- Icons: folder and open folder; `desktop` (RDP), `window_console` (SSH), `desktop_cursor`
  (VNC), `plug_connected` (Telnet). Fluent System Icons, regular weight, 16 px.
- Behaviour: single click selects; double click or Enter connects (or focuses the existing
  session; Shift+Enter always opens a new one); F2 renames in place; typing with the tree
  focused does type-ahead to the next match; Ctrl+F focuses the filter.
- Filter: fuzzy on name, host, and path. The tree keeps its hierarchy, shows only matches and
  their ancestors, expands them, and shows "7 of 10,482" in the field. Escape clears it and
  restores the previous expansion.
- Reorder and move: drag and drop, plus Ctrl+Up / Ctrl+Down, plus "Move to…" (a folder picker)
  in the context menu. Every drag has a non-drag equivalent.
- Context menu: see `screens/09-telnet-insecure-context-menu.png`. For folders add: Connect all
  (confirm above 10), New connection here, New folder here, Set environment, Sort.
- Delete moves items to a Trash that is kept 30 days. A toast offers Undo. No confirmation
  dialog unless the selection includes a folder with more than 20 descendants.
- Empty tree: one line of text, "No connections yet.", and two buttons: Import from mRemoteNG,
  New connection.
- Implementation: a flat virtualised list. The focused row must stay mounted while scrolled out
  of view. Roles: `tree` / `treeitem` with `aria-level`, `aria-setsize`, `aria-posinset`,
  `aria-expanded`.

### 5.4 Sidebar footer

40 high, top divider. Left: vault state button (icon and "Vault unlocked" / "Vault locked";
click locks or opens the unlock prompt). Right: Credentials and Settings icon buttons, each
opening its page tab.

### 5.5 Session bar

Left: breadcrumb of folder names (caption-sized, `--text-3`) ending in the connection name in
600 weight; clicking a folder reveals it in the tree. Then a divider and the security chip
(§4.2). Right: protocol actions as subtle buttons, 28 high, icon plus label where space allows,
icon-only below 1100 px with tooltips, then an overflow menu.

| Protocol | Actions, in order |
|---|---|
| SSH | Files, Forwards, Find, Split, Broadcast, overflow (Duplicate, Clear scrollback, Save output, Reconnect, Properties) |
| Telnet | Find, Split, overflow (Send break, Reconnect through SSH tunnel, Properties) |
| RDP | Fit mode (Fit to window / Actual size / Match window resolution), Ctrl+Alt+Del, Full screen, Properties, overflow (Screenshot, Reconnect, Send key…) |
| VNC | Fit mode, View only, Ctrl+Alt+Del, Full screen, Properties, overflow (Screenshot, Refresh, Clipboard sync) |

A toggled action (panel open, view only, broadcast on) uses `--fill-subtle-selected`.

### 5.6 Status bar

24 high, caption type. Items are separated by 16 px of space, not by punctuation. Each item is a
button when it has a detail flyout.

- Left, focused session: state glyph and label; `user@host:port` (mono); cipher and key exchange
  for SSH, or security protocol for RDP (mono; flyout lists all negotiated algorithms); host key
  fingerprint, truncated (click copies); jump path ("via bastion01"); round-trip latency;
  terminal size or remote resolution.
- Left, when a page tab is focused: a one-line summary for that page.
- Right, app-wide: transfers (count; flyout lists progress), notifications (bell and unread
  count; flyout is the notification list), vault state.
- A warning or failure state colours only its own item.

### 5.7 Inspector and property rows

The inspector edits the selected tree item. It opens with Alt+Enter, the Properties menu item,
or the session bar toggle, and follows the tree selection. With several items selected it shows
shared values and "Multiple values" where they differ; editing applies to all.

- Header: name (15 px, 600), path (caption), Undo, Close.
- Sections switch with an underlined tab row. General is identical for every protocol
  (Connection, Sign-in, Security, Appearance); the remaining sections are per protocol.
- Edits save on blur or Enter. There is no Save button. Undo reverts the last change; the tree's
  Undo covers the last 50 changes.

Property row (`screens/12-components-dark.png`, "Property rows"): a three-column grid of label
(112 px), control, and inherit toggle (24 px); minimum height 34.

| State | Appearance | Behaviour |
|---|---|---|
| Inherited | Value as plain text in `--text-2`, no field chrome; caption beneath: "From *Folder name*" (a link that selects that folder); link icon in `--accent-text` | Clicking the value or the icon switches to Overridden, seeded with the inherited value, and focuses the control |
| Overridden | Normal control; label in `--text-1`; 4 px accent dot left of the label; broken-link icon | Clicking the icon returns to Inherited after no confirmation; Undo restores |
| Focused | Bottom edge 2 px `--accent` | |
| Invalid | Bottom edge 2 px `--danger`; message below in caption `--danger`, stating the valid range or format | The invalid value is not saved; the last valid value stays in effect |
| Not inheritable (Name, Protocol, Host) | No toggle | |

On a folder, every row sets the value its descendants inherit; a folder row additionally shows
"Used by 36 connections" in its caption when overridden.

Credential field: a dropdown of vault credentials with search, plus "Ask every time" and "New
credential…". It never shows a password. Secrets are edited only on the Credentials page.

### 5.8 Right-panel variants

- **Files (SFTP)**: `screens/10-sftp-and-disconnected.png`. Path field (mono, editable, with
  completion), column header (Name, Size, Modified; click to sort), rows 26 high, transfer queue
  pinned at the bottom with a 3 px progress bar. Drag files in from Explorer to upload; drag out
  to download; double-click downloads to the configured folder. Context menu: Download, Upload
  here, Rename, Delete, Copy path, Permissions. Follows the terminal's working directory only
  on request ("Go to terminal folder").
- **Forwards**: a table of local, remote, and dynamic forwards with state glyph, listen address,
  destination, bytes in and out, and a toggle per row; "Add forward" opens an inline row.

### 5.9 Command palette

`screens/03-command-palette.png`. 720 wide, top 56 px, centred on the window, `--flyout`
surface, radius 8, dialog shadow, light scrim (20% black) over the window.

- Input row 48 high, 15 px text. Results rows 36 high; at most 10 visible, then scroll.
- Sections, in order, each shown only when non-empty: Open sessions matching, Connections,
  Connect to address, Commands. With an empty query: Recent (8), then Favorites.
- Row: icon, name with matched characters highlighted, state glyph if open, path in caption on
  the right, and the key hint on the selected row.
- Modes by prefix: none (connections first), `>` commands, `@` credentials, `:` settings.
- **Connect to address** parses free text: `host`, `host:port`, `user@host`, `proto://…`,
  `ssh user@host -p 2222`, and pasted `.rdp` paths. Protocol defaults to the last one used for an
  ad hoc connection; the row states exactly what will happen ("Connect to web0 with SSH").
  Tab cycles the protocol.
- Keys: Up/Down move; Enter runs (focuses the open session if there is one); Shift+Enter opens a
  new session; Ctrl+Enter runs the address row regardless of selection; Alt+Enter opens
  properties; Escape closes and returns focus to where it was.
- Ranking: exact prefix, then word-boundary matches, then fuzzy; ties broken by recency. Results
  must update within 50 ms for 10,000 items; run matching in a worker above that.

### 5.10 Menus, dialogs, bars, toasts

- **Menu**: `--flyout`, radius 8, 4 px padding, rows 30 high with icon, label, right-aligned key
  hint. Destructive items in `--danger`, last, after a separator.
- **Dialog**: 520 wide (560 for trust dialogs), radius 8, body padding 24, footer band
  `--dialog-footer` with right-aligned buttons, primary rightmost. Title is the question or the
  finding, in subtitle type. Used only for: trust decisions, destructive confirmation above the
  thresholds in §5.3, vault unlock when triggered mid-task, and unsaved transfer on close.
- **Info bar** (inside pages and dialogs): icon, one or two sentences, optional button. Neutral,
  warning, danger variants.
- **Session banner** (inside the session surface, top or bottom edge): same variants; pushes
  content, does not cover it. Used for the cleartext warning (top) and disconnection (bottom).
- **Toast**: bottom right above the status bar, 360 wide, one at a time, 6 s, with at most one
  action (Undo, Show). Only for results of the user's own action that happened off-screen, or
  Undo. Everything else goes to the notification list silently. A session failing while its tab
  is in the background changes the tab glyph and adds a notification; it does not toast.

### 5.11 Buttons and inputs

- Button 32 high (28 small), radius 4, min width 80 for text buttons. Variants: primary (accent
  fill; one per surface), standard, subtle, danger. Labels name the effect ("Import 1,299
  connections", "Trust and save").
- Text input: 28 high in panels, 32 on pages; bottom edge `--stroke-control-strong`, 2 px accent
  when focused.
- Switch 40×20 with a text state beside it ("On"/"Off").
- Focus: 2 px outer ring `--stroke-focus-outer` with a 1 px inner ring `--stroke-focus-inner`,
  visible on keyboard focus only.
- Tooltips appear after 600 ms on hover and immediately on keyboard focus; they name the action
  and its shortcut.

## 6. Session surfaces

### 6.1 Terminal (SSH, Telnet)

- xterm.js with the WebGL renderer and DOM fallback. 8 px top/bottom, 12 px side padding in the
  terminal background colour. Default font Cascadia Mono 13/18, no ligatures by default.
- Selection copies on Ctrl+Shift+C or right-click (configurable to copy-on-select). Paste on
  Ctrl+Shift+V or right-click. A paste containing a newline shows a confirmation bar with the
  first lines unless bracketed paste is active.
- Find (Ctrl+Shift+F): a 280 px field at the top right of the surface with match count,
  previous/next, case and regex toggles.
- Links are underlined on Ctrl+hover and open on Ctrl+click after showing the target.
- Resize shows the new size ("132×38") centred for 800 ms.
- Split: Split right and Split down divide the surface; each pane is a session with its own
  thin header (name, state glyph, close). The focused pane has a 1 px accent top edge. The
  session bar and status bar follow the focused pane. Maximum 4 panes per tab in v1.
- Broadcast input: toggled from the session bar. While on, the status bar shows "Broadcasting
  to 4 sessions" in `--warn`, each receiving tab and pane shows a broadcast icon, and the
  session bar button stays highlighted. Turning it on with a guarded environment among the
  targets requires confirmation naming those sessions. It turns off when the tab loses focus
  for more than 5 minutes.

### 6.2 Remote desktop (RDP, VNC)

- The remote image is centred on `--surface-session`. Fit modes: Fit to window (scale,
  preserving aspect), Actual size (scroll if larger), Match window resolution (RDP only;
  renegotiates on resize after a 250 ms pause).
- Keyboard and pointer are captured while the surface has focus. Ctrl+Alt+Home releases focus
  to the tab strip (§9). The session bar offers Ctrl+Alt+Del and "Send key…".
- Full screen (F11) hides all chrome. Moving the pointer to the top edge for 400 ms reveals a
  pinned-off bar: host name, environment stripe, Exit full screen, Minimise, Disconnect.
- View-only (VNC) dims nothing; it adds "View only" to the session bar chip and the status bar.

### 6.3 Surface overlays (all protocols)

| State | Treatment |
|---|---|
| Connecting | Surface background; centred column: host name (body strong), a step list that fills in as it happens ("Resolving", "Connecting to 10.20.6.20:22 through bastion01", "Verifying host key", "Signing in"), and Cancel. No spinner larger than the 10 px glyph. Elapsed time appears after 3 s. |
| Waiting for a decision | The step list stops at the pending step; the dialog is shown. |
| Credential prompt | A dialog with user name and password fields, "Save to vault" unchecked by default, and the host named in the title. |
| Disconnected | The last content stays, at 55% opacity. Bottom banner (danger): what happened and why in one sentence, Reconnect (primary; Enter), Close tab. Scrollback is kept. No automatic reconnect unless the connection enables it; when it does, the banner counts attempts ("Reconnecting, attempt 2 of 5") and offers Stop. |
| Failed to connect | Same banner over an empty surface, with the failing step and the remedy ("Could not reach 10.20.6.20:22. The connection timed out after 10 s. Check the jump host."). Secondary button: Edit connection. |
| Unencrypted | Top banner (warning), §4.2. |

## 7. Native-surface rule

If the RDP engine draws in a native child window instead of a canvas (plan review F-02), HTML
cannot appear above it. In that case, and only for that surface:

1. Before any transient surface opens over the session area (palette, menu, dialog, tooltip
   that would overlap, right-panel overlay, toast), capture the current frame, show it as an
   image in the surface, and hide the native window. Restore the native window when the last
   transient closes.
2. Session banners and the connecting overlay are laid out outside the native window's
   rectangle, never on top of it.
3. Split panes, tab thumbnails, and tear-off are unavailable for that engine.

A canvas-rendered engine needs none of this, which is the main reason to prefer one.

## 8. Screens

### 8.1 Home

`screens/04-home.png`. Shown in a Home tab that opens at launch and whenever the last session
tab closes. Content column 760 wide, centred.

1. An address field (44 high) bound to the same parser as the palette, with a live description
   of what Enter will do.
2. Recent: up to 8 rows (icon, name, path, and on the right either "Open" with a glyph, the last
   connect time, or the last failure and its reason).
3. Favorites: rows with Ctrl+1 … Ctrl+9 assigned in order.
4. A footer row: New connection, Import, and the totals.

First run (no connections): items 2 and 3 are replaced by three rows that each start a task:
Import from mRemoteNG, Add your first connection, Set a master password. No illustration.

### 8.2 Vault unlock

`screens/11-vault-unlock.png`. With a master password set, launch shows only this: title bar
without tabs, a 360 px column with a title, one sentence, the password field (focused; paste
allowed), Unlock, and "Use Windows Hello" when available. "Open without secrets" shows the tree
with every credential marked unavailable. A wrong password shakes nothing; the field gets the
invalid state and the message "That password is not correct." After 5 failures the button is
disabled for an increasing delay, shown as a countdown. Auto-lock returns to this screen and
keeps sessions running behind it; their content is not visible while locked.

### 8.3 Credentials

`screens/06-credentials.png`. A page tab. Table (Name, Username, Type, Used by) with a detail
panel on the right for the selected record. Types: Password, SSH key, SSH agent, Ask every
time. The secret field is masked; Reveal requires the vault to have been unlocked in the last
5 minutes or re-prompts; Copy places the secret on the clipboard excluded from clipboard history
and clears it after 30 s (configurable). "Used by" lists folders and connections and links to
them. Deleting a credential in use requires choosing a replacement or "Ask every time".

The bottom info bar states the protection in force, honestly: in the default mode, "Sealed with
your Windows account. Other programs running as you can read these secrets. Set a master
password for stronger protection."

### 8.4 Connection properties

The inspector (§5.7); `screens/02-shell-rdp-inspector-light.png`. New connection (Ctrl+N)
creates an item named "New connection" in the selected folder, selects it, opens the inspector,
and focuses Host. Protocol defaults to the folder's most common protocol. Escape before any edit
discards it.

Sections per protocol (General is shared):

| Protocol | Sections and fields |
|---|---|
| SSH | Sign-in (credential, key, agent, auth order); Route (jump host, proxy); Forwards; Terminal (scheme, font, scrollback, keepalive, opening command); Advanced (ciphers, key exchange, host key policy, agent forwarding off by default) |
| Telnet | Terminal (type, line mode, local echo, keepalive); Route (SSH tunnel); Advanced (option overrides) |
| RDP | Display (fit mode, resolution, colour depth, multi-monitor); Resources (clipboard, drives, printers, audio, smart cards; all off by default except clipboard); Gateway; Advanced (NLA, Restricted Admin, Remote Credential Guard, certificate policy, console session, start program) |
| VNC | Display (fit mode, quality, encoding); Sign-in (password, view only); Route (SSH tunnel); Advanced (clipboard sync direction) |

### 8.5 Host-key and certificate dialogs

Unknown host (first connection): title "Trust web03.prod?", the fingerprint in grouped blocks of
four, key type, and where the saved key will be stored. Buttons: Cancel, Trust once, **Trust and
save** (primary). When the same key is already saved for another name or address, say so ("This
key is already trusted for web03 at 10.20.4.33").

Changed key: `screens/05-hostkey-changed.png`. Title states the finding. Body explains the two
possible causes and that nothing has been sent. Saved and presented fingerprints are stacked in
identical grouping with differing blocks marked. An info bar gives the verification command.
Buttons: **Disconnect** (primary, default), Copy details, and on the far left "Replace saved
key…", which opens a second confirmation requiring the user to type the host name. There is no
"connect anyway".

RDP certificate dialogs follow the same two shapes with subject, issuer, validity, and SHA-256
thumbprint.

### 8.6 Import

`screens/07-import-review.png`. A page tab with four steps: Choose file, Unlock, Review, Import.

- Choose file: drop zone and file picker; detects format and version and states them.
- Unlock: only if encrypted; password field; states the cipher and iteration count found.
- Review: left, the imported tree with a per-row disposition (new, identical, differs, needs
  attention with the reason); right, totals, the conflict rule (keep mine / replace / keep
  both), and the destination folder. Unsupported protocols are listed with what will happen to
  each. Fields that would execute commands are listed under "Needs attention" and are imported
  disabled. "Export review as CSV" for large migrations.
- Import: progress by count, then a summary with "Show imported folder" and Undo import.

### 8.7 Settings

`screens/08-settings.png`. A page tab: left navigation (220) with a search field; right, a 760
column of grouped rows (title, one-line description, control at the right). Changes apply
immediately. Sections: Appearance, Terminal, Remote desktop, VNC, Security and vault, Keyboard
(searchable, rebindable, conflict detection), Tunnels and proxies, Backup and export, Updates,
About (version, licences, data folder).

### 8.8 Remaining surfaces

- **Notifications**: flyout from the status bar bell; newest first; each row has a glyph, one
  sentence, time, and a "Show" action. "Clear all" at the top.
- **Session log viewer**: a page tab; left list of sessions by date; right, the log in the
  terminal component, read-only, with Find and "Open folder".
- **Update notice**: a notification and a row in Settings → Updates. Never a dialog at launch.
- **Tab list**: the chevron flyout; filter field, tabs grouped by window.

## 9. Keyboard and focus

Focus is in one of two scopes, and the scope decides who gets a key.

**Session scope** (a terminal or remote desktop has focus). The session receives everything
except the chords below. `Ctrl+K`, `Ctrl+W`, `Ctrl+F`, `Ctrl+N`, `Ctrl+D` reach the remote
shell untouched.

| Chord | Terminal sessions | Remote desktop sessions |
|---|---|---|
| Ctrl+Shift+P | Command palette | sent to remote |
| Ctrl+Tab / Ctrl+Shift+Tab | Next / previous tab | Next / previous tab (setting: send to remote) |
| Ctrl+Alt+1 … 9 | Go to tab n | sent to remote |
| Ctrl+Shift+W | Close tab | sent to remote |
| Ctrl+Shift+C / V / F | Copy / paste / find | sent to remote |
| Ctrl+Shift+D / E | Split right / split down | sent to remote |
| Alt+Arrow | Move between panes | sent to remote |
| Ctrl+Alt+Home | Move focus to the tab strip | Move focus to the tab strip |
| F11 | Full screen | Full screen (setting: send to remote) |

**Chrome scope** (tree, tab strip, pages, panels). All of the above work, plus:

| Chord | Action |
|---|---|
| Ctrl+K | Command palette (alias) |
| Ctrl+F or / | Filter the tree |
| Ctrl+N / Ctrl+Shift+N | New connection / new folder |
| Enter / Shift+Enter | Connect / connect in a new session |
| Alt+Enter | Properties |
| F2, Delete, Ctrl+D | Rename, delete, duplicate |
| Ctrl+Up / Ctrl+Down, Ctrl+Shift+M | Move item, Move to… |
| Ctrl+Z / Ctrl+Y | Undo / redo tree and property changes |
| Ctrl+B | Toggle sidebar |
| Ctrl+W | Close tab (alias) |
| Ctrl+1 … 9 | Connect to favorite n |
| Ctrl+, | Settings |
| Ctrl+L | Lock vault |
| F6 / Shift+F6 | Cycle regions: tab strip, sidebar, session bar, surface, right panel, status bar |
| Escape | Close the transient; else return focus to the session |

Focus rules: activating a tab focuses its surface. Closing a transient returns focus to the
element that opened it. Opening the right panel does not take focus from the session unless
opened by keyboard. All shortcuts are rebindable; the palette and tooltips show the current
binding.

## 10. Accessibility

Target WCAG 2.2 AA.

- Every action is reachable by keyboard. Every drag (tree reorder, tab reorder, pane resize,
  file transfer) has a menu or keyboard equivalent (2.5.7). Splitters are focusable and move
  with arrow keys in 16 px steps.
- Targets are at least 24×24 px in every density (2.5.8).
- Focus is always visible and never hidden under the status bar or a banner (2.4.11).
- Text contrast 4.5:1, non-text 3:1, checked for every token pair in both themes as an automated
  test. `--text-3` is for supplementary text only and must still reach 4.5:1 on `--mica` and
  `--layer`.
- State is conveyed by glyph shape and text, never colour alone.
- The vault unlock field accepts paste and password managers (3.3.8).
- Patterns: tree view, tabs with deletable tabs (Delete closes the focused tab), combobox with
  listbox for the palette, window splitter, toolbar for the session bar, dialog and alertdialog.
- One polite live region for state changes; an assertive one only for trust failures.
- Terminal: enable xterm.js screen-reader mode on request (setting and palette command).

## 11. Copy

- Sentence case. No exclamation marks. No "please", "sorry", "oops", "successfully".
- Buttons state the effect: "Connect", "Trust and save", "Import 1,299 connections", "Delete 3
  connections". Never "OK" or "Yes".
- Errors: what happened, why if known, what to do. "Could not sign in to sql01.prod. The server
  rejected the password for PROD\svc-dba. Update the credential or connect as another user."
- Same word for the same thing everywhere: connection (a saved item), session (a live one),
  folder, credential, vault, environment, host key, forward, tunnel.
- Numbers use the user's locale grouping. Times are relative within a week, absolute after.
- All strings live in a message catalogue from the first commit, keyed, with no concatenation.

## 12. Implementation mapping

| Concern | Use | Notes |
|---|---|---|
| Primitives (Button, Input, Switch, Dropdown, Combobox, Menu, Dialog, Popover, Tooltip, Toast, MessageBar) | `@fluentui/react-components` v9 | With a custom `Theme` built from `tokens.css`. Do not ship `webDarkTheme`/`webLightTheme`; they are the Office palette. Generate the 16-step brand ramp from the accent (§3.1). |
| Tokens outside Fluent | CSS custom properties on `:root`, written before first paint | Consumed by the tree, tab strip, status bar, xterm theme, and canvases. |
| Styling | Griffel `makeStyles` with build-time compilation | No runtime-generated styles in hot paths (tree rows, tabs). |
| Icons | `@fluentui/react-icons`, named imports, 16 and 20 regular | The mockups use the same set. |
| Title bar | `titleBarStyle: 'hidden'` + `titleBarOverlay` (height 40, transparent colour, symbol colour from theme) | Keeps Snap Layouts. Lay out with `env(titlebar-area-*)`. |
| Tab strip | Custom component | Pragmatic drag and drop for reorder. |
| Tree | Custom flat list on TanStack Virtual, tree logic from `@headless-tree/react` | Benchmark against `react-arborist` 4 at 10k and 100k nodes before committing; record the result as an ADR. |
| Panes and splitters | `react-resizable-panels` | Tab groups and tear-off windows (v1.1): evaluate `dockview`. |
| Palette | Custom, on Fluent `Dialog` primitives; `uFuzzy` for matching | Worker above 50k items. |
| Terminal | `@xterm/xterm` 6 + `addon-webgl`, `addon-fit`, `addon-search`, `addon-unicode-graphemes` | Theme from tokens. |

Windows-specific behaviours to verify on a real Windows 11 machine, not in CI: Mica rendering
and its loss on maximise or minimise, Snap Layouts on the overlay maximise button, accent change
propagation, contrast themes, 100/150/200% scaling, Segoe UI Variable optical sizing.

## 13. Performance budgets

| Measure | Budget | Where measured |
|---|---|---|
| Cold start to interactive tree, 10k connections | ≤ 1.5 s | Reference machine, packaged build |
| Warm start | ≤ 700 ms | same |
| Palette open to first results | ≤ 50 ms; each keystroke ≤ 30 ms at 10k items | CI, software timing |
| Tree filter keystroke at 10k items | ≤ 50 ms | CI |
| Tree scroll at 10k items | no frame over 16 ms at standard density | Reference machine |
| Tab switch to painted surface | ≤ 50 ms | Reference machine |
| Terminal key to paint, loopback | ≤ 16 ms median, ≤ 32 ms p95 | Reference machine |
| Click Connect to first visible feedback | ≤ 100 ms (the tab and connecting overlay appear before any network I/O) | CI |
| Idle memory, no sessions | ≤ 300 MB across all processes | Reference machine |
| Each added terminal session | ≤ 25 MB plus scrollback | Reference machine |
| Installer | ≤ 150 MB | CI |

The reference machine is named in the repository and is not a CI runner. CI enforces the
software-timed rows as regression thresholds.

## 14. Open decisions

1. RDP engine (plan review §4). Decides whether §7 applies.
2. Whether local shells (PowerShell, WSL) and serial are in v1. The terminal host supports them
   at low cost; the design above accommodates them with a `window_console` icon variant and no
   new surfaces.
3. Tab tear-off and multi-window in v1 or v1.1.
4. Whether the master password is offered during first run or left in Settings.
