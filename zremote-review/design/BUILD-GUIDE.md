# zremote UI build guide

For the agent implementing the interface. Read `DESIGN.md` first; this file gives the order of
work, the contract of each component, and how each is checked. Section references (§) point
into `DESIGN.md`.

## 0. Ground rules

1. `tokens.css` is copied into `packages/ui/src/tokens.css` unchanged and imported once at the
   renderer entry. Components reference tokens only; a lint rule rejects hex colours, `rgb()`,
   and raw `px` radii or durations in component styles.
2. Every component ships with a story for each state listed in its contract, and a Playwright
   screenshot test of those stories in dark and light. The baseline for visual review is the
   matching file in `screens/`.
3. Compare your render to the reference by opening both images. Report differences you chose to
   keep and why. Do not claim a match you have not looked at.
4. Renderer components take data and callbacks as props. They do not call IPC. A thin
   container layer in `apps/desktop/src/renderer` wires them to the typed bridge. This keeps
   every component renderable in stories and tests with fixture data.
5. All user-visible strings come from `packages/ui/src/messages/en.ts` by key.
6. To regenerate the mockups: `ICONS=<path to @fluentui/svg-icons/icons> node mockups/build.mjs`.

## 1. Package layout

```
packages/ui/src/
  tokens.css
  theme/        fluentTheme.ts (tokens → Fluent Theme), accent.ts (§3.1), ThemeRoot.tsx
  primitives/   StateGlyph, Chip, Kbd, IconButton, InfoBar, Banner, PropertyRow, EnvSwatch
  shell/        AppShell, TitleBar, TabStrip, Sidebar, SidebarFooter, SessionBar, StatusBar,
                RightPanel, Splitter
  tree/         ConnectionTree, TreeRow, TreeFilter, treeModel.ts, MoveToDialog
  palette/      CommandPalette, parseAddress.ts, rank.ts
  inspector/    Inspector, sections/{General,Ssh,Telnet,Rdp,Vnc}.tsx
  session/      SessionSurface, ConnectingOverlay, DisconnectedBanner, CleartextBanner,
                TerminalHost, RemoteCanvasHost, FindBar, PaneLayout
  files/        FilesPanel, TransferQueue
  forwards/     ForwardsPanel
  dialogs/      HostKeyDialog, CertificateDialog, CredentialPrompt, ConfirmDialog
  pages/        HomePage, UnlockPage, CredentialsPage, ImportPage, SettingsPage, LogsPage
  feedback/     Toaster, NotificationList, LiveRegion
  keyboard/     keymap.ts, useFocusScope.ts, shortcuts.ts
  messages/     en.ts
  fixtures/     tree10k.ts, sessions.ts, credentials.ts, importPreview.ts
```

## 2. Shared types (define first, in `packages/shared`)

```ts
type Protocol = 'ssh' | 'telnet' | 'rdp' | 'vnc';
type SessionState = 'connecting' | 'authenticating' | 'awaiting-user' | 'connected'
                  | 'degraded' | 'failed' | 'closed';
type GlyphKind = 'idle' | 'busy' | 'ok' | 'warn' | 'bad';          // §4.1 mapping lives in one function
type SecurityLevel = 'verified' | 'session-trust' | 'cleartext' | 'legacy' | 'trust-failure';

interface TreeNode {
  id: string; parentId: string | null; kind: 'folder' | 'connection';
  name: string; protocol?: Protocol; host?: string; order: number;
  environmentId?: string;            // set on folders; resolved for descendants
  disabledReason?: string;           // unsupported imported protocol
}
interface ResolvedField<T> { value: T; inherited: boolean; sourceId?: string; sourceName?: string }
interface SessionView {
  id: string; connectionId: string | null; title: string; protocol: Protocol;
  state: SessionState; security: SecurityLevel; securityLabel: string;
  environment?: { name: string; color: EnvColor; frame: boolean };
  facts: { endpoint: string; cipher?: string; kex?: string; hostKey?: string;
           via?: string; latencyMs?: number; size?: string };
  failure?: { step: string; message: string; remedy?: string };
}
```

`glyphFor(state, security): GlyphKind` and `labelFor(...)` are the only places state turns into
presentation. Tree, tabs, status bar, palette, and Home all call them.

## 3. Build order

Each step lists what to build, the reference, and the checks that must pass before the next.
Steps 1–6 need no backend and correspond to the plan's Phase 1; they should run on fixtures.

### Step 1. Theme and primitives

Build `ThemeRoot`, `accent.ts`, `fluentTheme.ts`, and everything in `primitives/`.
Reference: `screens/12-components-dark.png`, `13-components-light.png`.

- [ ] Stories reproduce the component sheet in both themes and three densities.
- [ ] Unit test: for six accent inputs (Windows default blue, a yellow, a dark navy, a red, a
      grey, a mint), derived `--on-accent`/`--accent` and `--accent-text`/`--layer` reach 4.5:1
      in both themes.
- [ ] Unit test: every text token on every surface token it is used with reaches 4.5:1; state
      colours on their `-bg` reach 4.5:1.
- [ ] `StateGlyph` renders five shapes that remain distinguishable in a forced-colors
      screenshot.
- [ ] No flash of the wrong theme: theme attributes and accent variables are set by the preload
      script before the renderer bundle runs.

### Step 2. Shell frame

Build `AppShell`, `TitleBar`, `Sidebar` (empty), `SidebarFooter`, `SessionBar`, `StatusBar`,
`RightPanel`, `Splitter`. Reference: `screens/01-shell-ssh.png`, `14-shell-ssh-light-compact.png`.

- [ ] Region sizes match §2 exactly (assert computed heights 40 / 36 / 24 and widths).
- [ ] Sidebar resizes 200–480 by pointer and by keyboard on the focused splitter; double-click
      resets to 280; state persists.
- [ ] Sidebar collapse moves search to an icon button; main loses its top-left radius.
- [ ] On Windows: caption buttons are the native overlay; hovering maximise shows Snap Layouts;
      empty title-bar area drags the window; tabs and buttons do not.
- [ ] Minimum window size enforced at 880×560; at 1000 px wide the right panel overlays.
- [ ] F6 cycles regions in the order given in §9.

### Step 3. Tab strip

Reference: tabs in `01`, `04`, `12`. Contract:

```ts
interface TabStripProps {
  tabs: Array<{ id: string; title: string; icon: IconName; glyph?: GlyphKind;
                glyphLabel?: string; envColor?: EnvColor; closable: boolean }>;
  activeId: string;
  onActivate(id: string): void; onClose(id: string): void;
  onReorder(id: string, toIndex: number): void; onNew(): void;
  onContextAction(id: string, action: TabAction): void;
}
```

- [ ] States: default, hover, selected, focus, dragging. Widths clamp 100–240 and shrink evenly.
- [ ] 40 fixture tabs: strip scrolls, the active tab stays visible, the chevron list filters.
- [ ] Middle-click closes. Delete closes the focused tab. Context menu has Move left and Move
      right.
- [ ] `role="tablist"`; each tab `role="tab"` with `aria-selected`; the glyph label is part of
      the accessible name ("web01.prod, connected").

### Step 4. Connection tree

Reference: sidebar in `01`, rows in `12`, filter and menu in `09`. Use `fixtures/tree10k.ts`
(10,482 nodes, depth up to 6) and a 100k variant.

```ts
interface ConnectionTreeProps {
  nodes: TreeNode[];                                  // flat; tree order derived
  sessionsByConnection: Map<string, GlyphKind>;
  environments: Map<string, { name: string; color: EnvColor }>;
  expanded: Set<string>; selected: Set<string>; filter: string;
  onExpandedChange, onSelectedChange, onFilterChange;
  onActivate(id: string, opts: { newSession: boolean }): void;
  onRename(id: string, name: string): void;
  onMove(ids: string[], target: { parentId: string; index: number }): void;
  onContextAction(ids: string[], action: TreeAction): void;
}
```

- [ ] All row states in §5.3 have stories.
- [ ] Keyboard: arrows, Home/End, type-ahead, Enter, Shift+Enter, F2, Delete, Ctrl+Up/Down,
      Shift and Ctrl multi-select, context-menu key.
- [ ] Filter at 10k nodes updates within 50 ms; at 100k within 150 ms (worker).
- [ ] Scrolling 10k nodes: no dropped frames on the reference machine; record the trace.
- [ ] Focused row stays mounted when scrolled out of view; focus is not lost on scroll.
- [ ] Drag between, drag into, and "Move to…" all call `onMove` with identical arguments for the
      same result.
- [ ] Accessibility tree: `tree`/`treeitem`, correct `aria-level`, `aria-setsize`,
      `aria-posinset`, `aria-expanded`, `aria-selected`.
- [ ] Record the library benchmark (headless-tree + TanStack Virtual vs react-arborist) as an
      ADR.

### Step 5. Command palette

Reference: `screens/03-command-palette.png`.

- [ ] `parseAddress` unit tests: `host`, `host:22`, `user@host`, `ssh://u@h:2222`,
      `rdp://h`, `ssh user@host -p 2222`, IPv6 literals with and without brackets, a path ending
      in `.rdp`, and rejections (spaces, shell metacharacters).
- [ ] Ranking tests for the order in §5.9.
- [ ] Empty query shows Recent then Favorites. Prefix modes `>`, `@`, `:` work.
- [ ] Opens within 50 ms; keystroke to results within 30 ms on the 10k fixture.
- [ ] Focus returns to the previously focused element on close, including a terminal.
- [ ] `role="combobox"` with `aria-activedescendant` over a `listbox`.

### Step 6. Session surface shells and overlays

Build `SessionSurface`, `ConnectingOverlay`, `DisconnectedBanner`, `CleartextBanner`,
`PaneLayout`, `FindBar` against a fake session driver that walks the state machine on a timer.
Reference: `05`, `09`, `10`.

- [ ] Every row of the §6.3 table has a story.
- [ ] Clicking Connect in the tree shows the tab and connecting overlay within 100 ms with the
      fake driver's network delay set to 5 s.
- [ ] Disconnected: Enter reconnects when the surface has focus; content stays at 55% opacity.
- [ ] Banners push content; they never cover terminal rows.
- [ ] Split right and down up to 4 panes; Alt+Arrow moves focus; the session bar and status bar
      follow the focused pane.

### Step 7. Keyboard routing

Build `useFocusScope` and `keymap.ts` (§9).

- [ ] Test matrix: for each chord in §9, with focus in (a) a terminal, (b) a remote-desktop
      surface, (c) the tree, assert whether the app handled it or the surface received it.
      `Ctrl+K`, `Ctrl+W`, `Ctrl+F`, `Ctrl+N`, `Ctrl+D` reach a focused terminal.
- [ ] Rebinding a shortcut updates the palette hint and tooltips.

### Step 8. Inspector and property rows

Needs the store's inheritance resolver. Reference: `02`, property rows in `12`.

```ts
interface PropertyRowProps<T> {
  label: string; field: ResolvedField<T>; inheritable: boolean;
  error?: string; mixed?: boolean;
  onChange(value: T): void; onInheritChange(inherit: boolean): void;
  onGoToSource?(sourceId: string): void;
  children: (p: { value: T; onChange(v: T): void; invalid: boolean }) => ReactNode;
}
```

- [ ] States: inherited, overridden, focused, invalid, not inheritable, mixed.
- [ ] Clicking an inherited value overrides it, seeded with the inherited value, and focuses
      the control.
- [ ] Invalid input is not saved; the previous value stays in effect.
- [ ] Multi-select edit applies to all selected; Undo reverts all in one step.
- [ ] Changing a folder value updates the "From …" caption of open descendants live.
- [ ] End to end: Ctrl+N, type a host, Enter, connection exists and is connectable.

### Step 9. Trust dialogs and credential prompt

Reference: `05`. Driven by the SSH engine's host-key callback (plan Phase 3).

- [ ] Changed-key dialog: default button is Disconnect; Enter and Escape both disconnect;
      "Replace saved key…" requires typing the host name.
- [ ] Fingerprint grouping is identical in both blocks; differing groups are marked with more
      than colour (underline).
- [ ] `role="alertdialog"`; the assertive live region announces the finding once.

### Step 10. Pages

Home (`04`), Unlock (`11`), Credentials (`06`), Import (`07`), Settings (`08`), Logs.

- [ ] Home first-run variant with an empty store.
- [ ] Unlock: paste works; wrong password shows the inline message; delay after 5 failures.
- [ ] Credentials: the renderer never receives a secret value unless Reveal or Copy is invoked;
      assert at the IPC contract level. Copy clears the clipboard after the configured time and
      sets the clipboard-history exclusion format.
- [ ] Import review renders 10k rows virtualised; totals equal the sum of row dispositions;
      executable fields appear under "Needs attention".
- [ ] Settings search filters rows across sections.

### Step 11. Files and forwards panels

Reference: `10`. Needs the SSH engine.

- [ ] 1 GiB transfer does not grow renderer memory; progress updates at most 10 times a second.
- [ ] Upload by drop and by button; download by drag-out and by double-click.

### Step 12. Final pass

- [ ] Screenshot of every reference screen in dark and light at 100% and 150% scaling,
      side by side with `screens/`.
- [ ] axe scan of every story and page with zero serious findings.
- [ ] Keyboard-only walkthrough: import a file, find a host, connect, split, open Files,
      disconnect, lock the vault.
- [ ] Contrast-theme screenshots of the shell, tree, and a dialog.
- [ ] Budgets in §13 measured on the reference machine and recorded.

## 4. Mapping to the plan's phases

| Plan phase | Steps here | Notes |
|---|---|---|
| 1 (shell) | 1–7 | Step 7 is new; the plan had no keyboard model. |
| 2 (store, vault, import) | 8, and Unlock, Credentials, Import from 10 | Moves the connection editor from Phase 3.8 to Phase 2 so the phase ends with a usable manager. |
| 3 (SSH) | 9, 11, terminal host inside 6 | |
| 4, 5, 6 | Protocol sections of 8; `RemoteCanvasHost` | §7 applies only if the RDP engine is a native window. |
| 7 | 12, and Settings, Logs from 10 | Settings should start in Phase 1 with Appearance and grow per phase. |

## 5. What the mockups do not show

Build these from the text of `DESIGN.md`; no reference image exists: unknown-host dialog (§8.5),
connecting overlay (§6.3), credential prompt, Forwards panel (§5.8), broadcast state (§6.1),
split panes, full-screen bar (§6.2), notification list, tab list flyout, log viewer, first-run
Home, Move to… dialog, Keyboard settings. Produce a screenshot of each for review before
building on top of it.
