# zremote plan review and validation — 2026-11-12

Reviewed: `ZaxbyHub/zremote` at `c0993d2` (all 28 files). Validated against (a) the
`ZaxbyHub/zaxbyRemoteNG` source tree at `d939d19`, read directly, and (b) upstream sources as
of 2026-11-12 (FreeRDP 3.33.1, IronRDP HEAD, ssh2 HEAD, noVNC 1.7.0, xterm.js 6.0.0, Electron
45.3.1 docs and source, npm registry, Microsoft docs source).

Evidence grades used below: **[src]** read from upstream source/tags or the fork, **[reg]** npm
or release registry, **[doc]** vendor documentation, **[2nd]** secondary source only (search
snippet), **[unv]** could not be verified. Nothing graded [2nd] or [unv] should be treated as
settled.

## 1. Verdict

The plan is well structured (phased gates, threat model, a prior dual-critic pass) and Phase 0
can start after the pin corrections in F-14. It is **not ready to enter Phase 1** as written.
Four decisions rest on premises that do not hold, and the UI specification is too thin to build
from:

1. The RDP engine decision (ADR-003) excludes a canvas-rendered engine on a false premise and
   underprices the chosen path (F-01, F-02).
2. The security model credits `utilityProcess` with a sandbox it does not have and credits DPAPI
   with a binding it does not have (F-08, F-09).
3. The SSH engine analysis is built around an unsubstantiated CVE while missing three functional
   gaps in `ssh2` (F-06).
4. The keyboard model collides with terminal control characters (F-28), and half the screen
   inventory has no implementing task (F-21).

`design/DESIGN.md` in this folder replaces `docs/ui-design-spec.md` as the build specification.

## 2. Findings

Severity: **B** blocker (resolve before the phase named), **M** major, **m** minor, **n** nit.

### Architecture and protocol engines

| ID | Sev | Finding | File | Evidence | Required change |
|---|---|---|---|---|---|
| F-01 | **B** (Phase 1) | "Pure-JS/WASM RDP: no maintained implementation exists" is false. Devolutions **IronRDP** (Rust, MIT/Apache-2.0) is active (HEAD 2026-11-09, crate 0.17.0), ships a WASM web component (`@devolutions/iron-remote-desktop` 0.11.0), and is used by Cloudflare Access, Teleport, and Devolutions Gateway. Features per its README: NLA/CredSSP (NTLM + Kerberos), TLS 1.2/1.3, MS-TSGU gateway crate, RemoteFX, EGFX with AVC420/444 (native build, Media Foundation decoder), clipboard, audio, drive/smartcard redirection, display control. | `docs/research/2026-11-protocol-research.md` §1; ADR-003 | [src] IronRDP repo | Reopen ADR-003. Replace task 1.5 with the bake-off in §4 of this review. Caveats to test, not assume: the web build has no EGFX/H.264 path (RemoteFX/bitmap only); no napi-rs binding exists; Restricted Admin and Remote Credential Guard support is [unv]. |
| F-02 | **B** (Phase 1) | The chosen RDP path (reparent a foreign-process HWND into the Electron window) has three unpriced costs. (a) **Airspace:** Chromium cannot draw over a child HWND, so the command palette, menus, dialogs, tooltips, toasts, and the inspector cannot overlap an RDP session; the UI spec never mentions this. (b) **No supported path:** electron/electron#10547 has been open since 2017; the only workaround is undocumented window-style manipulation of Chromium's internal child window. (c) **Maintenance:** the FreeRDP 2026 changelog lists 196 GHSA advisories and 52 CVEs (60 in 3.32.0 alone), there are no official Windows binaries, and the plan commits to self-building and re-releasing on each. | `docs/architecture.md` §5; `docs/ui-design-spec.md`; ADR-003, ADR-010 | [src] FreeRDP ChangeLog; [doc] electron#10547 | If any HWND-embedded engine survives the bake-off, adopt the native-surface rule in `design/DESIGN.md` §7 and budget a security rebuild every 2–4 weeks. |
| F-03 | M | The plan embeds `sdl3-freerdp` with a custom `SetParent` module, but FreeRDP's own `/parent-window:<hwnd>` option is honoured by `wfreerdp` (and xfreerdp) and **not** by the SDL3 client. `wfreerdp` is deprecated but still built by default and still patched at 3.33.1. Also: `/from-stdin` works when piped to SDL3 but `wfreerdp` falls back to a GUI prompt when stdin is not a console; with `/from-stdin` the certificate prompt auto-rejects, so a `/cert:` policy is mandatory. Real syntax is `/cert:tofu`, `/cert:deny`, `/cert:fingerprint:<hash>:<hex>`; the `/cert-tofu` style is deprecated. | `docs/phases/phase-1-shell.md` 1.5; `phase-6-rdp.md` | [src] FreeRDP 3.33.1 `wf_client.c`, `client.c`, `cmdline.h` | Phase 6 entry checks (a) and (b) are answerable today; record the answers. Drive certificate trust from zremote's own store via `/cert:fingerprint:`; never let FreeRDP persist trust. |
| F-04 | M | VNC: the loopback WebSocket bridge is unnecessary. noVNC 1.7.0's `RFB(target, urlOrChannel)` accepts any object with a WebSocket-shaped interface, so a `MessagePort` shim can feed it directly. This deletes the listening socket, the token scheme, the Origin question (P1-15), threat T5's bridge-spoofing branch, and the `connect-src` exception that contradicts `default-src 'none'`. noVNC is also consumable from npm as an ES module; vendoring is not required. The plan's claim that in-stream TLS (VeNCrypt X509/TLS subtypes) is unsupported remains true; the cited issue #105 is stale. | `docs/architecture.md` §5 VNC; `phase-5-vnc.md` 5.1, 5.2; threat model §4 | [src] noVNC `core/websock.js`, `docs/API.md` | Replace task 5.2 with a channel shim plus a socket pump in a utility process. Keep 5.5 as written. |
| F-05 | M | Worker topology contradicts itself: architecture §1 says "1 per engine pool", §5 and research §2 say "per session-batch", threat model §5 mandates "worker-per-session, no shared pools". A `utilityProcess` costs tens of MB; fifty SSH sessions as fifty processes is a memory budget nobody set. | `docs/architecture.md` §1, §5; `docs/security-threat-model.md` §5 | internal | Pick one. Recommended: pooled workers with a per-session watchdog; per-session processes only for engines that parse hostile input in C. |
| F-06 | **B** (Phase 3) | SSH engine analysis is wrong in both directions. (a) CVE-2025-70034 exists but its advisory (GHSA-qrjm-6rpx-w2rx) is "Unreviewed" with no score, no affected range; the maintainer closed #1484 as "nobody sent details" and #1520 stating none of the cited regexes can backtrack. "CVSS 7.5, pre-auth" is [unv]. (b) `ssh2` has **no post-quantum KEX** (no `mlkem768x25519-sha256`, no `sntrup761`; OpenSSH 10.0 defaults to it and 10.1 warns without it [2nd]), **no OpenSSH certificates**, **no FIDO `sk-*` keys**, and has had no release since 2025-08-20. (c) "Used by VS Code Remote-SSH" is false: it requires the system OpenSSH client. Tabby moved from ssh2 to `russh` in v1.0.216; its algorithm list includes ML-KEM. | research §2; ADR-004; threat model §5; `phase-3-ssh.md` | [src] ssh2 `kex.js`; [doc] vscode-docs `remote/ssh.md`; [reg] `russh` 0.1.38 | Rewrite threat model §5 as generic hostile-server containment, not CVE-specific. ADR-011 (SSH engine) criteria must include PQ KEX, certificates, `sk-*` keys, strict-KEX, agent support, release cadence. Evaluate `russh` first. |
| F-07 | M | `protocol-core` FreeRDP argument builder, the hash-verified spawn, and the stub executable tests are all sunk cost if F-01 selects a library engine. | `phase-6-rdp.md` 6.2, 6.3 | — | Do not start Phase 6 tasks until the bake-off verdict is recorded. |

### Security model

| ID | Sev | Finding | File | Evidence | Required change |
|---|---|---|---|---|---|
| F-08 | **B** (Phase 0) | `utilityProcess` is **not sandboxed**. Electron source at v45.3.1: "Currently utility process is not sandboxed" (`electron_api_utility_process.cc`). The README, fork review, and threat model T1 call the workers "sandboxed". They provide crash and hang isolation only; a compromised worker has the user's full privileges and holds the session's credentials. The larger exposure is the FreeRDP child process: a C parser facing hostile servers, also unsandboxed. | `README.md`; `docs/review/mremoteng-fork-review.md`; threat model T1 | [src] Electron | Correct the wording everywhere. State the residual risk. Prefer memory-safe engines for hostile-input parsing; if FreeRDP stays, evaluate launching it under a restricted token or AppContainer and record the result. |
| F-09 | **B** (Phase 2) | `safeStorage` is described as "user+machine bound"; Electron documents user scope only and states it does not protect against other apps in the same user session. The synchronous API specified in task 2.3 (`safeStorage.encryptString`) is deprecated in Electron 45 and removed in 46. The default vault mode therefore gives the same protection class as mRemoteNG's DPAPI option; the plan presents it as an improvement over it. | architecture §6; threat model T2, §3; `phase-2` 2.3 | [doc] Electron `safe-storage.md` | Use `encryptStringAsync`/`decryptStringAsync`. Reword T2: DPAPI mode defends against offline theft of the data directory, not against same-user malware. Say so in the product (see `DESIGN.md` §8.3). |
| F-10 | M | Master-password envelope `DPAPI( AEAD_KEK( DEK ) )` with "no independent DEK recovery path anywhere (including backups and exports)" makes the vault unrecoverable after a Windows reinstall, profile reset, or machine replacement, even with the correct master password. "Rolling encrypted backups" then restore nothing on a new machine. The envelope for DPAPI-only mode (`v1|alg|iv|tag|ct` with which key?) is unspecified. Argon2id is not available from Electron's Node (BoringSSL lacks it); a package such as `@node-rs/argon2` is required. | threat model §3; architecture §6; `phase-2` 2.3, 2.4, 2.7 | [src] Node `ncrypto.h` gate, by inference | Add a portable export: password-only Argon2id envelope, explicitly user-initiated, with the trade-off stated. Specify the DPAPI-mode envelope key. Add a machine-migration acceptance test. |
| F-11 | M | Threat model omits terminal-content and import-content attacks: OSC 52 clipboard writes, OSC 8 hyperlinks, title-setting sequences, multi-line paste without bracketed-paste confirmation, SSH agent forwarding defaults; and imported fields that execute (`OpeningCommand`, `ExternalToolBefore/After`, `RDPStartProgram`, `SshOptions` exist in the fork's model). An imported connection must never run a command the user has not seen. | threat model §2 | [src] fork `AbstractConnectionRecord.cs` | Add T7 (terminal content) and extend T3 (executable fields quarantined on import; surfaced in the review step). |
| F-12 | m | Renderer origin is assumed to be `file://`. Electron's security checklist says to serve from a custom protocol and disable the `GrantFileProtocolExtraPrivileges` fuse. The fuse list also omits `WasmTrapHandlers`. ASAR integrity on Windows is still labelled experimental. | threat model §4 | [doc] Electron `security.md`, `fuses.md` | Use `protocol.handle('app', …)`; update the checklist. |
| F-13 | m | Hash-verifying a helper binary at spawn is a TOCTOU check. | `phase-6-rdp.md` 6.3 | — | Ship helpers Authenticode-signed inside the install directory and verify the signature, or keep the hash check and state its limit. |

### Toolchain and release

| ID | Sev | Finding | File | Evidence | Required change |
|---|---|---|---|---|---|
| F-14 | **B** (Phase 0) | Pins are stale. Electron stable is **45** (Chromium 156, Node 24); 44 leaves support when 47 ships. `pnpm@10.0.0` is two majors behind (12.18.0); pnpm 11+ fails installs on unapproved build scripts and replaced `onlyBuiltDependencies` with `allowBuilds` [2nd]. Node 22 is the oldest line; 24 and 26 are LTS. TypeScript is 7.x. `actions/checkout` and `setup-node` are v7. `better-sqlite3` 13 is N-API with bundled prebuilds including win32-arm64, so the "Electron ABI" risk in Phase 2 is obsolete. xterm.js 6 removed the canvas renderer, so task 3.2's "canvas/DOM fallback" is DOM only. | `package.json`; `ci.yml`; `phase-0`, `phase-2`, `phase-3` | [reg], [src] | Pin Electron 45.x, Node 24, pnpm 12 with an explicit build allowlist, TS 7. Verify electron-vite 6 on Electron 45 (its changelog names 42–44 only) or use Forge + Vite. |
| F-15 | M | "electron-builder → NSIS + MSIX" is not available: electron-builder stable (26.x) has AppX only; MSIX is in the 27 alpha. Electron's docs recommend **Forge**, whose MSIX maker is itself experimental. Azure Trusted Signing is now "Azure Artifact Signing"; individuals are eligible only in the US and Canada [2nd]; neither it nor EV grants instant SmartScreen reputation [2nd]; other code-signing certificates are capped at 460 days [2nd]. | architecture §9; `phase-7` 7.2, 7.3 | [src] electron-builder; [doc] Electron | Decide packaging in Phase 0, not Phase 7. Start signing eligibility checks now. Add enterprise deployment requirements (silent install, updater off by policy, offline). |
| F-16 | m | `backgroundMaterial` with a frameless window has a history of maximize/restore defects (#42393 fixed, #46753 status [unv]). Hand-drawn caption buttons, the first option in task 1.2, lose the Windows 11 Snap Layouts flyout; `titleBarOverlay` returns `HTMAXBUTTON` and keeps it. | `phase-1-shell.md` 1.2 | [src] Electron `win_caption_button_container.cc` | Make `titleBarStyle:'hidden'` + `titleBarOverlay` the only option. |

### Scope, sequencing, and process

| ID | Sev | Finding | File | Evidence | Required change |
|---|---|---|---|---|---|
| F-17 | M | "Successor to mRemoteNG" understates what is dropped. The fork's `ProtocolType` has 15 entries; zremote keeps 4. Dropped without a recorded decision: PowerShell, WSL and local Terminal, Serial, Raw, Rlogin, HTTP/HTTPS, ARD, AnyDesk, External tool. Features absent from the inventory: external tools, opening command, multi-session broadcast input, tab and frame colours with environment tags, favorites, Wake-on-LAN, screenshot manager, Active Directory import, shared SQL connection store, external credential providers (the fork ships AWS, CyberArk, Delinea, 1Password, OpenBao connectors), Hyper-V VM-ID connect, and importers for RDCMan, Royal TS, SecureCRT, CSV. | `README.md`; fork review "Feature inventory" | [src] fork `ProtocolType.cs`, `Config/Import/`, `ExternalConnectors/` | Add an explicit non-goals table with a disposition per item. Local shell (PowerShell/WSL) and serial are cheap on a terminal host and are the most likely adoption blockers; reconsider. |
| F-18 | M | Importer specification is incomplete against the reference: the deserializer handles ConfVersion 0.2 through **2.9** (the plan lists 2.6–2.8); cipher engines are AES, **Twofish**, Serpent and modes GCM, CCM, **EAX** (the plan lists two of each); files older than 2.6 use `LegacyRijndaelCryptographyProvider` (AES-CBC, MD5-derived key). Inheritance is a boolean per field, not "tri-state". | `phase-2` 2.5, 2.2; research §7 | [src] fork `XmlConnectionsDeserializer.cs`, `BlockCipherEngines.cs`, `BlockCipherModes.cs` | Generate the support matrix from the code. Each unsupported cell gets the fail-safe message, not silence. |
| F-19 | M | "Clean-room reimplementation" is not what the plan does: agents are told to read the GPLv2 source as the specification and to generate the wire-format document from it. That is acceptable for format interoperability but it constrains the licence choice deferred to Phase 7. | ADR-008; `phase-2` entry criteria, 2.5 | — | Either choose a GPL-compatible licence now, or run a two-role process: one agent writes the format spec from source, a second implements from the spec with no source access. Record which. |
| F-20 | M | Dependency errors. Phase 5 is declared independent of Phase 3 but 5.3 needs the SSH tunnel. Phase 1.5 Tier B needs the pinned `sdl3-freerdp` binary that Phase 6.1 builds. Phase 2.7 (import wizard UI) and 2.4 (unlock dialog) need Phase 1 tokens and shell while Phase 2 is declared parallel with Phase 1. | `docs/phases/README.md` table; `phase-1`, `phase-2`, `phase-5` | internal | Fix the table; move the engine build ahead of the spike. |
| F-21 | M | Orphan screens: no task builds Settings (#6), the credential manager UI (#3), the session log viewer (#9), or the update notice (#10). Quick connect is "visual only" in 1.4 and is never wired. The connection editor first appears in 3.8, so Phases 1 and 2 end with no way to create a connection. The fork-review inventory item 2 (panel and tab rearrangement) has no task at all. | `ui-design-spec.md` §7; all phase docs | internal | See the task map in `design/BUILD-GUIDE.md`. |
| F-22 | m | Two ADRs are numbered 011 (tree library in 1.3, SSH engine in 3.9). The README refers to "10 ADRs" but only ADR-003b exists as a file. | `phase-1`, `phase-3`, `README.md` | internal | Renumber; write the ADR files. |
| F-23 | m | Non-reproducible references: `~/.hermes/plans/`, `~/projects/zaxbyremoteng-study/`, `~/.cache/donsetch/`, skills "installed in Hermes". An agent in CI or a cloud session cannot resolve them. | several | internal | Reference repositories and commits. |
| F-24 | m | The UI reference image is a screenshot of mremoteng.com, a third-party download site, not of the application. The fork contains 62 real screenshots under `mRemoteNGDocumentation/images/`. | fork review "Reference UI" | [src] fork | Use `mremoteng_main_ui_connect_win_server.png`, `connections_config.png`, `folders_and_inheritance_*.png`. |
| F-25 | m | Task 5.4 proposes a TigerVNC server "in CI container (windows runner docker)"; Windows runners run Windows containers only. The global definition of done requires all checks on `windows-latest` while 0.4 puts them on Ubuntu. | `phase-5` 5.4; phases README | — | Use an in-process mock or a separate Ubuntu job. |
| F-26 | m | Internationalisation is deferred post-v1 with no requirement to externalise strings from the first commit. | fork review item 8 | — | Externalise from Phase 1; ship English only. |
| F-27 | m | No budget for cold start, memory, or installer size; "window open → interactive (warm) ≤ 2 s" is loose for a tool whose pitch is speed. | `ui-design-spec.md` §5 | — | See `DESIGN.md` §13. |

### UI specification

| ID | Sev | Finding | File | Required change |
|---|---|---|---|---|
| F-28 | **B** (Phase 1) | Keyboard model collides with the terminal. `Ctrl+K` (kill line), `Ctrl+W` (delete word), and `Ctrl+F` are bound to palette, close tab, and tree search, with no rule for what happens when a terminal or remote desktop has focus. | `ui-design-spec.md` §2, §6 | `DESIGN.md` §9 defines focus-scoped routing: inside a session only `Ctrl+Shift+…` and `Ctrl+Tab` chords belong to the app. |
| F-29 | M | The specification cannot be built from: no component states, no colour values, no inheritance interaction, no error or empty states per screen, no focus order, no multi-select, no bulk edit. Two status bars spend 56 px of height that remote desktops need. | `ui-design-spec.md` | Replaced by `DESIGN.md`. |
| F-30 | M | "Fluent UI v9 + system accent" does not by itself produce a Windows 11 look. The stock `webDarkTheme` is the Office/Teams palette; the accent needs a generated 16-step brand ramp. Fluent's `TabList` has no closable or reorderable tabs, and `Tree` virtualisation is a recipe with a known focus-loss defect (#31323) on `@fluentui/react-virtualizer`, which is still alpha. | `ui-design-spec.md` §3; research §6 | `DESIGN.md` §12. |
| F-31 | m | WCAG 2.2 AA is claimed but 2.5.7 (dragging movements) is unmet: tree and tab reordering have drag only. | `ui-design-spec.md` §6 | Every drag has a menu and keyboard equivalent (`DESIGN.md` §10). |
| F-32 | n | The wireframe uses `⌘K`/`⌘F` in a Windows-only product and middle-dot chains in the status bar that rule 4 of the same document bans. | `ui-design-spec.md` §2, §4 | — |

## 3. Claims verified as correct

| Claim | Status |
|---|---|
| FreeRDP Windows binaries are nightly-only; `wfreerdp` deprecated; SDL3 client "rough edges" (issue #11459) | Correct as of 2025-04; the SDL3 client has since gained clipboard, multi-monitor, dynamic resolution, HiDPI [src] |
| guacd is Linux-only | Not re-verified; no reason to doubt |
| mRemoteNG default key `mR3m`; PBKDF2 floor 1,000; `ThisIsNotProtected` marker; 16-byte salt as AAD; 128-bit nonce, 88-bit for CCM | Correct [src] `RootNodeInfo.cs:68`, `Pkcs5S2KeyGenerator.cs`, `AeadCryptographyProvider.cs`, `XmlConnectionsDecryptor.cs` |
| PuTTY embedding via `SetParent`, `SW_HIDE` before reparent, `#32770` dialog filtering, named-pipe `-pwfile` with ACL | Correct [src] `PuttyBase.cs` |
| `ssh2` latest is 1.17.0 (2025-08-20); supports strict-KEX, Windows OpenSSH agent pipe, Pageant | Correct [src] |
| `backgroundMaterial` values and Windows 11 22H2+ requirement; `utilityProcess` can pass `MessagePort`s to a renderer | Correct [doc] |
| Fluent UI React v9 is the current, maintained line (9.75.2, 2026-11-10); no v10 | Correct [reg] |
| noVNC lacks in-stream TLS | Correct [src] |

## 4. Recommended engine bake-off (replaces Phase 1 task 1.5)

The criterion that should dominate: **does the session render into a DOM surface?** A DOM
surface (canvas) gets overlays, split panes, tab thumbnails, screenshots, tear-off windows, and
automated visual testing for free. An embedded HWND gets none of them.

| Option | Renders to | Parser language | Unknowns to resolve in the spike |
|---|---|---|---|
| A. IronRDP as a native library in a utility process (napi-rs), frames to a renderer canvas | Canvas | Rust | Binding does not exist; frame transport cost (shared memory or WebCodecs for AVC); Restricted Admin, Remote Credential Guard, gateway coverage |
| B. IronRDP WASM in the renderer with an RDCleanPath proxy in main | Canvas | Rust | No H.264 in the web build; proxy must be written (`ironrdp-rdcleanpath` crate exists) |
| C. libfreerdp3 in a helper process, frames to canvas | Canvas | C | Custom client code; inherits the FreeRDP advisory cadence |
| D. `wfreerdp /parent-window` | HWND | C | Deprecated client; stdin credentials fall back to GUI |
| E. `sdl3-freerdp` + `SetParent` (current plan) | HWND | C | Everything in F-02 and F-03 |

Gate, measured against one Windows 11 host and one Windows Server host with NLA: connect with
vault credentials without argv exposure; certificate first-use and changed flows driven by
zremote's dialog; dynamic resize; clipboard text; 1080p at 30 fps or better on the reference
machine; clean teardown. Options are tried in order A, B, C; D and E are run only if all three
fail. I have not run any of these; the ordering is a recommendation from the evidence above,
not a result.

## 5. What was not validated

- No code was built or run; zremote has none.
- Items marked [2nd] and [unv] above.
- Sysadmin sentiment (Reddit, mRemoteNG issue tracker) could not be read from this environment.
- IronRDP and `russh` suitability is inferred from their repositories and adopters, not tested.
- Real Windows rendering: the mockups were rendered in Chromium on Linux with Inter standing in
  for Segoe UI Variable, and Mica is simulated.
