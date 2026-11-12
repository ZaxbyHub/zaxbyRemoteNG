// Generates the static reference mockups (*.html) in this folder.
// Usage: ICONS=/path/to/node_modules/@fluentui/svg-icons/icons node build.mjs
// The HTML output is committed; this script exists so the mockups stay reproducible.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));
const ICONS = process.env.ICONS;
const cache = new Map();
function i(name, cls = "i") {
  const size = cls === "i20" ? 20 : 16;
  const key = `${name}_${size}`;
  if (!cache.has(key)) {
    let src;
    try { src = readFileSync(join(ICONS, `${name}_${size}_regular.svg`), "utf8"); }
    catch { src = readFileSync(join(ICONS, `${name}_${size === 16 ? 20 : 16}_regular.svg`), "utf8"); }
    const vb = /viewBox="([^"]+)"/.exec(src)?.[1] ?? `0 0 ${size} ${size}`;
    cache.set(key, { vb, body: src.replace(/<svg[^>]*>|<\/svg>/g, "").replace(/ fill="[^"]*"/g, "") });
  }
  const { vb, body } = cache.get(key);
  return `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
}

// Shape-coded state glyphs (DESIGN.md §5). Shape is the signal; colour reinforces.
const G = {
  ok: `<svg class="g ok" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor"/></svg>`,
  busy: `<svg class="g busy" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="1.5"/><path d="M5 1.5A3.5 3.5 0 0 1 8.5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  warn: `<svg class="g warn" viewBox="0 0 10 10"><path d="M5 .8 9.6 9H.4Z" fill="currentColor"/></svg>`,
  bad: `<svg class="g bad" viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  idle: `<svg class="g idle" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
};
const PROTO = { rdp: "desktop", ssh: "window_console", vnc: "desktop_cursor", telnet: "plug_connected", folder: "folder", folderOpen: "folder_open" };
const env = (c) => `var(--env-${c})`;

const caption = `<div class="caption">
  <div><svg viewBox="0 0 10 10"><path d="M0 5h10"/></svg></div>
  <div><svg viewBox="0 0 10 10"><rect x=".5" y=".5" width="9" height="9" rx="1.5"/></svg></div>
  <div><svg viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10"/></svg></div></div>`;

function tab(t) {
  const glyph = t.state ? G[t.state] : "";
  return `<div class="tab${t.sel ? " sel" : ""}${t.hover ? " hover" : ""}">${t.env ? `<span class="env" style="background:${env(t.env)}"></span>` : ""}${i(t.icon ?? PROTO[t.proto])}<span class="grow ell">${t.name}</span>${t.extra ?? ""}${glyph}<span class="x">${i("dismiss")}</span></div>`;
}
function titlebar(tabs, { collapsed = false } = {}) {
  const left = collapsed
    ? `<div class="tb-left collapsed"><div class="iconbtn">${i("panel_left")}</div><div class="iconbtn">${i("search")}</div></div>`
    : `<div class="tb-left"><div class="iconbtn on">${i("panel_left")}</div><div class="searchpill">${i("search")}<span class="grow">Search or connect</span><kbd>Ctrl Shift P</kbd></div></div>`;
  return `<div class="titlebar">${left}<div class="tabs">${tabs.map(tab).join("")}</div>
  <div class="tabs-end"><div class="iconbtn sm">${i("add")}</div><div class="iconbtn sm">${i("chevron_down")}</div></div><div class="drag"></div>${caption}</div>`;
}

function row(r) {
  const pad = 4 + (r.d ?? 0) * 16;
  const chev = r.kids === undefined ? `<span class="chev"></span>` : `<span class="chev">${i(r.kids ? "chevron_down" : "chevron_right")}</span>`;
  const icon = r.kids !== undefined ? (r.kids ? PROTO.folderOpen : PROTO.folder) : PROTO[r.proto];
  const tail = [
    r.env ? `<span class="envdot" style="background:${env(r.env)}"></span>` : "",
    r.count !== undefined ? `<span class="count">${r.count}</span>` : "",
    r.proto && !r.state ? `<span class="tag">${r.proto}</span>` : "",
    r.state ? G[r.state] : "",
  ].join("");
  return `<div class="row${r.sel ? " sel" : ""}${r.hover ? " hover" : ""}${r.focus ? " focus" : ""}${r.dim ? " dim" : ""}" style="padding-left:${pad}px">${chev}<span class="ico">${i(icon)}</span><span class="grow ell">${r.name}</span>${tail}</div>`;
}
const TREE = [
  { name: "Production", kids: 1, env: "red", count: 214 },
  { name: "Web tier", kids: 1, d: 1 },
  { name: "web01.prod", proto: "ssh", d: 2, state: "ok", sel: 1 },
  { name: "web02.prod", proto: "ssh", d: 2, state: "ok" },
  { name: "web03.prod", proto: "ssh", d: 2 },
  { name: "lb01.prod", proto: "ssh", d: 2 },
  { name: "Database", kids: 1, d: 1 },
  { name: "sql01.prod", proto: "rdp", d: 2, state: "ok" },
  { name: "sql02.prod", proto: "rdp", d: 2 },
  { name: "pg-primary", proto: "ssh", d: 2, state: "busy" },
  { name: "Domain controllers", kids: 0, d: 1, count: 4 },
  { name: "Staging", kids: 0, env: "orange", count: 61 },
  { name: "Network", kids: 1, count: 38 },
  { name: "core-sw-01", proto: "telnet", d: 1, state: "warn" },
  { name: "core-sw-02", proto: "telnet", d: 1 },
  { name: "edge-fw-01", proto: "ssh", d: 1 },
  { name: "Lab", kids: 1, env: "blue", count: 12 },
  { name: "kvm2.lab", proto: "vnc", d: 1, state: "bad" },
  { name: "esx-console-3", proto: "vnc", d: 1 },
  { name: "Imported 2026-11-12", kids: 0, count: 1337 },
];
function sidebar({ rows = TREE, filter, vault = "unlocked", foot = true } = {}) {
  const f = filter
    ? `<div class="filter focus">${i("filter")}<span class="grow" style="color:var(--text-1)">${filter}</span><span class="cap">7 of 10,482</span></div>`
    : `<div class="filter">${i("filter")}<span class="grow">Filter</span><kbd>Ctrl F</kbd></div>`;
  return `<div class="sidebar"><div class="side-head"><span class="title grow">Connections</span>
    <div class="iconbtn sm" title="New connection">${i("add")}</div><div class="iconbtn sm" title="New folder">${i("folder_add")}</div><div class="iconbtn sm">${i("more_horizontal")}</div></div>
    ${f}<div class="tree" role="tree">${rows.map(row).join("")}</div>
    ${foot ? `<div class="side-foot"><div class="vaultbtn grow">${i(vault === "locked" ? "lock_closed" : "lock_open")}<span>Vault ${vault}</span></div><div class="iconbtn sm">${i("key_multiple")}</div><div class="iconbtn sm">${i("settings")}</div></div>` : ""}</div>`;
}
function statusbar(left, right) {
  return `<div class="statusbar"><div class="grow" style="display:flex">${left.join("")}</div>${right.join("")}</div>`;
}
const sb = (html, cls = "") => `<span class="sb ${cls}">${html}</span>`;
const SB_RIGHT = [sb(`${i("arrow_swap")}2 transfers`), sb(`${i("alert")}1`), sb(`${i("lock_open")}Vault unlocked`)];

function page({ title, theme = "dark", density, tabs, body, status, overlay = "", collapsed }) {
  return `<!doctype html><html lang="en" data-theme="${theme}"${density ? ` data-density="${density}"` : ""}><head><meta charset="utf-8"><title>zremote — ${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="zr.css"></head><body>
<div class="win">${titlebar(tabs, { collapsed })}<div class="body">${body}</div>${status}${overlay}</div></body></html>`;
}

const TABS = [
  { proto: "ssh", name: "web01.prod", state: "ok", env: "red", sel: 1 },
  { proto: "ssh", name: "web02.prod", state: "ok", env: "red" },
  { proto: "rdp", name: "sql01.prod", state: "ok", env: "red" },
  { proto: "ssh", name: "pg-primary", state: "busy", env: "red" },
  { proto: "telnet", name: "core-sw-01", state: "warn" },
  { proto: "vnc", name: "kvm2.lab", state: "bad", env: "blue" },
];
const selTab = (n) => TABS.map((t, k) => ({ ...t, sel: k === n ? 1 : 0 }));

const TERM = `<span class="d">Last login: Thu Nov 12 08:41:07 2026 from 10.20.4.17</span>
<span class="g1">deploy@web01</span>:<span class="b1">~</span>$ systemctl status nginx --no-pager
<span class="g1">●</span> nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled; preset: enabled)
     Active: <span class="g1">active (running)</span> since Mon 2026-11-09 02:14:55 UTC; 3 days ago
   Main PID: 1184 (nginx)
      Tasks: 9 (limit: 38346)
     Memory: 41.2M (peak: 58.9M)
     CGroup: /system.slice/nginx.service
             ├─1184 "nginx: master process /usr/sbin/nginx -g daemon on; master_process on;"
             ├─1186 "nginx: worker process"
             └─1187 "nginx: worker process"

<span class="g1">deploy@web01</span>:<span class="b1">~</span>$ sudo tail -n 6 /var/log/nginx/access.log
10.20.1.5 - - [12/Nov/2026:08:52:10 +0000] "GET /healthz HTTP/1.1" <span class="g1">200</span> 2 "-" "kube-probe/1.33"
10.20.1.5 - - [12/Nov/2026:08:52:20 +0000] "GET /healthz HTTP/1.1" <span class="g1">200</span> 2 "-" "kube-probe/1.33"
172.16.8.44 - - [12/Nov/2026:08:52:21 +0000] "POST /api/v2/orders HTTP/2.0" <span class="g1">201</span> 512 "-" "okhttp/5.1"
172.16.8.91 - - [12/Nov/2026:08:52:23 +0000] "GET /api/v2/orders/88213 HTTP/2.0" <span class="y1">404</span> 153 "-" "curl/8.11"
172.16.9.12 - - [12/Nov/2026:08:52:24 +0000] "GET /api/v2/catalog HTTP/2.0" <span class="r1">502</span> 166 "-" "Mozilla/5.0"
10.20.1.5 - - [12/Nov/2026:08:52:30 +0000] "GET /healthz HTTP/1.1" <span class="g1">200</span> 2 "-" "kube-probe/1.33"
<span class="g1">deploy@web01</span>:<span class="b1">~</span>$ <span class="cur"> </span>`;

function sessbar({ path, name, chips = [], actions = [] }) {
  return `<div class="sessbar"><div class="crumbs">${path.map((p) => `<span>${p}</span>${i("chevron_right")}`).join("")}<b>${name}</b></div>
  <div class="sep"></div>${chips.join("")}<div class="grow"></div>${actions.join("")}<div class="iconbtn sm">${i("more_horizontal")}</div></div>`;
}
const tb = (icon, label, on) => `<div class="tbtn${on ? " on" : ""}">${i(icon)}${label ? `<span>${label}</span>` : ""}</div>`;
const SSH_BAR = (extraOn) => sessbar({ path: ["Production", "Web tier"], name: "web01.prod",
  chips: [`<span class="chip">${i("shield_checkmark")}Host key verified</span>`],
  actions: [tb("folder_arrow_right", "Files", extraOn === "files"), tb("arrow_routing", "Forwards"), tb("search", ""), tb("split_horizontal", ""), tb("live", "", extraOn === "broadcast")] });
const SSH_STATUS = statusbar([
  sb(`${G.ok}Connected`), sb(`<span class="mono">deploy@10.20.4.31:22</span>`), sb(`${i("lock_closed")}<span class="mono">chacha20-poly1305</span>`), sb(`<span class="mono">mlkem768x25519</span>`),
  sb(`<span class="mono">ed25519 SHA256:Zq1k…f9Tw</span>`), sb(`via bastion01`), sb(`<span class="mono">18 ms</span>`), sb(`<span class="mono">132×38</span>`)], SB_RIGHT);
const main = (inner, cls = "") => `<div class="main ${cls}">${inner}</div>`;
const sshMain = (extra = "", barOn) => main(`${SSH_BAR(barOn)}<div class="work"><div class="surface"><div class="frame-env" style="border-color:${env("red")};border-width:2px 0 0 0"></div><div class="term">${TERM}</div>${extra}</div></div>`);

const pages = {};

// 01 — main shell, SSH session
pages["01-shell-ssh"] = page({ title: "Shell with SSH session", tabs: TABS, body: sidebar() + sshMain(), status: SSH_STATUS });

// 02 — RDP session with inspector, light theme
const rdpDesk = `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#0a3d6b,#062a4d)">
  <div style="position:absolute;left:36px;top:30px;width:560px;height:340px;background:#f3f3f3;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.4);overflow:hidden;font:12px/16px var(--font-ui);color:#222">
  <div style="height:32px;background:#e6e6e6;display:flex;align-items:center;padding:0 12px">Server Manager</div>
  <div style="padding:16px 18px;display:grid;gap:10px"><div style="font-size:18px">Dashboard</div><div style="height:74px;background:#fff;border:1px solid #ddd"></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"><div style="height:110px;background:#fff;border-top:3px solid #107c10;border:1px solid #ddd"></div><div style="height:110px;background:#fff;border:1px solid #ddd"></div><div style="height:110px;background:#fff;border:1px solid #ddd"></div></div></div></div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:40px;background:rgba(20,28,40,.92)"></div></div>`;
const field = (label, value, o = {}) => `<div class="f${o.over ? " over" : ""}"><label>${label}</label><div class="inp${o.inh ? " inh" : ""}${o.focus ? " focus" : ""}${o.err ? " err" : ""}"><span class="grow ell${o.mono ? " mono" : ""}">${value}</span>${o.dd ? i("chevron_down") : ""}</div><div class="inh-btn${o.inh ? " on" : ""}" title="${o.inh ? "Inherited — click to override" : "Overridden — click to inherit"}">${o.noinh ? "" : i(o.inh ? "link" : "link_dismiss")}</div>${o.src ? `<div class="src">From <u>${o.src}</u></div>` : ""}</div>`;
const toggle = (label, on, o = {}) => `<div class="f${o.over ? " over" : ""}"><label>${label}</label><div style="display:flex;align-items:center;gap:8px"><span class="sw${on ? " on" : ""}"></span><span class="cap t2">${on ? "On" : "Off"}</span></div><div class="inh-btn${o.inh ? " on" : ""}">${i(o.inh ? "link" : "link_dismiss")}</div>${o.src ? `<div class="src">From <u>${o.src}</u></div>` : ""}</div>`;
const inspector = `<div class="inspector"><div class="insp-head"><div class="grow"><h2>sql01.prod</h2><div class="cap t3">Production / Database</div></div><div class="iconbtn sm">${i("arrow_undo")}</div><div class="iconbtn sm">${i("dismiss")}</div></div>
  <div class="seg"><div class="on">General</div><div>Display</div><div>Resources</div><div>Gateway</div><div>Advanced</div></div><div class="insp-body">
  <div class="grp">Connection</div>
  ${field("Name", "sql01.prod", { noinh: 1, over: 1 })}${field("Protocol", "RDP", { dd: 1, noinh: 1, over: 1 })}
  ${field("Host", "10.20.6.11", { mono: 1, over: 1, noinh: 1 })}${field("Port", "3389", { mono: 1, inh: 1, src: "Production" })}
  <div class="grp">Sign-in</div>
  ${field("Credential", "PROD\\svc-dba", { inh: 1, dd: 1, src: "Database" })}${field("Domain", "PROD", { inh: 1, src: "Production" })}
  <div class="grp">Security</div>
  ${toggle("Require NLA", 1, { inh: 1, src: "Connections (root)" })}${toggle("Restricted Admin", 1, { over: 1 })}${toggle("Remote Credential Guard", 0, { inh: 1, src: "Connections (root)" })}
  ${field("Certificate", "Trust on first use", { dd: 1, inh: 1, src: "Production" })}
  <div class="grp">Appearance</div>
  ${field("Environment", `<span style="display:inline-flex;align-items:center;gap:6px"><span class="envdot" style="width:8px;height:8px;border-radius:2px;background:${env("red")}"></span>Production</span>`, { inh: 1, dd: 1, src: "Production" })}
  </div></div>`;
const rdpTree = TREE.map((r) => ({ ...r, sel: r.name === "sql01.prod" ? 1 : 0 }));
pages["02-shell-rdp-inspector-light"] = page({ title: "RDP session with inspector (light)", theme: "light", tabs: selTab(2), body: sidebar({ rows: rdpTree }) + main(
  `${sessbar({ path: ["Production", "Database"], name: "sql01.prod", chips: [`<span class="chip">${i("shield_checkmark")}NLA, TLS 1.3</span>`], actions: [tb("zoom_fit", "Fit to window"), tb("keyboard", "Ctrl+Alt+Del"), tb("full_screen_maximize", ""), tb("panel_right", "", 1)] })}
  <div class="work"><div class="surface"><div class="frame-env" style="border-color:${env("red")};border-width:2px 0 0 0"></div>${rdpDesk}</div>${inspector}</div>`),
  status: statusbar([sb(`${G.ok}Connected`), sb(`<span class="mono">PROD\\svc-dba@10.20.6.11:3389</span>`), sb(`${i("lock_closed")}NLA, TLS 1.3`), sb(`<span class="mono">1568×790</span>`), sb(`<span class="mono">100%</span>`), sb(`<span class="mono">9 ms</span>`)], SB_RIGHT) });

// 03 — command palette
const pr = (icon, html, path, o = {}) => `<div class="pal-row${o.sel ? " sel" : ""}">${icon}<span class="grow ell">${html}</span>${o.state ? G[o.state] : ""}<span class="path">${path}</span>${o.kbd ? `<kbd>${o.kbd}</kbd>` : ""}</div>`;
const palette = `<div class="scrim" style="background:rgba(0,0,0,.2)"></div><div class="palette" role="dialog" aria-label="Search or connect">
  <div class="pal-in">${i("search", "i20")}<span>web0</span><span class="caret"></span><span class="grow"></span><kbd>Esc</kbd></div>
  <div class="pal-sec">Connections</div>
  ${pr(i(PROTO.ssh), "<mark>web0</mark>1.prod", "Production / Web tier", { sel: 1, state: "ok", kbd: "Enter" })}
  ${pr(i(PROTO.ssh), "<mark>web0</mark>2.prod", "Production / Web tier", { state: "ok" })}
  ${pr(i(PROTO.ssh), "<mark>web0</mark>3.prod", "Production / Web tier")}
  ${pr(i(PROTO.ssh), "<mark>web0</mark>1.stage", "Staging / Web tier")}
  ${pr(i(PROTO.rdp), "iis-<mark>web0</mark>4", "Production / Legacy")}
  <div class="pal-sec">Connect to address</div>
  ${pr(i("flash"), `Connect to <span class="mono">web0</span> with SSH`, "Quick connect", { kbd: "Ctrl Enter" })}
  <div class="pal-sec">Commands</div>
  ${pr(i("add"), "New connection in Web tier", "", { kbd: "Ctrl N" })}
  <div class="pal-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span><span><kbd>Enter</kbd> Switch to session</span><span><kbd>Shift Enter</kbd> New session</span><span><kbd>Alt Enter</kbd> Properties</span><span class="grow"></span><span><kbd>&gt;</kbd> Commands</span></div></div>`;
pages["03-command-palette"] = page({ title: "Command palette", tabs: TABS, body: sidebar() + sshMain(), status: SSH_STATUS, overlay: palette });

// 04 — home (no session focused)
const li = (icon, name, sub, tail = "") => `<div class="li">${icon}<div class="grow"><div class="ell">${name}</div><div class="sub ell">${sub}</div></div>${tail}</div>`;
const home = main(`<div class="page"><div class="page-main"><div class="narrow" style="margin:0 auto">
  <div style="display:flex;align-items:center;gap:12px;height:44px;padding:0 14px;border-radius:4px;background:var(--fill-input);border:1px solid var(--stroke-control);border-bottom:2px solid var(--accent)">${i("flash", "i20")}<span class="mono grow" style="font-size:14px">ssh admin@edge-fw-02.corp:2222</span><span class="cap t3">Connect with SSH to edge-fw-02.corp, port 2222, as admin</span><kbd>Enter</kbd></div>
  <h2>Recent</h2><div class="list">
  ${li(i(PROTO.ssh, "i20"), "web01.prod", "Production / Web tier", `${G.ok}<span class="cap t2">Open</span>`)}
  ${li(i(PROTO.rdp, "i20"), "sql01.prod", "Production / Database", `${G.ok}<span class="cap t2">Open</span>`)}
  ${li(i(PROTO.ssh, "i20"), "edge-fw-01", "Network", `<span class="cap t3">Yesterday 17:42</span>`)}
  ${li(i(PROTO.vnc, "i20"), "kvm2.lab", "Lab", `${G.bad}<span class="cap t2">Failed 08:31, connection refused</span>`)}
  ${li(i(PROTO.rdp, "i20"), "dc02.prod", "Production / Domain controllers", `<span class="cap t3">Monday 09:05</span>`)}</div>
  <h2>Favorites</h2><div class="list">
  ${li(i(PROTO.ssh, "i20"), "bastion01", "Production", `<kbd>Ctrl 1</kbd>`)}
  ${li(i(PROTO.rdp, "i20"), "dc01.prod", "Production / Domain controllers", `<kbd>Ctrl 2</kbd>`)}
  ${li(i(PROTO.telnet, "i20"), "core-sw-01", "Network", `<kbd>Ctrl 3</kbd>`)}</div>
  <div class="rowset" style="margin-top:20px"><span class="btn sm">${i("add")}New connection</span><span class="btn sm">${i("arrow_import")}Import</span><span class="grow"></span><span class="cap t3">10,482 connections in 317 folders</span></div>
  </div></div></div>`);
pages["04-home"] = page({ title: "Home", tabs: [{ icon: "home", name: "Home", sel: 1 }, ...selTab(-1)], body: sidebar({ rows: TREE.map((r) => ({ ...r, sel: 0 })) }) + home,
  status: statusbar([sb(`4 sessions open`), sb(`${G.bad}1 failed`, "")], SB_RIGHT) });

// 05 — host key changed dialog
const hostkey = `<div class="scrim"></div><div class="dialog" role="alertdialog" style="width:560px"><div class="dlg-body">
  <h1><span style="color:var(--danger);display:grid">${i("shield_error", "i20")}</span>Host key changed for pg-primary</h1>
  <p class="t2" style="font-size:13.5px">The server presented a different key from the one saved on 3 March 2026. This happens when a server is rebuilt, or when someone is intercepting the connection. Nothing has been sent to the server.</p>
  <dl class="kv"><dt>Host</dt><dd class="mono">pg-primary.prod (10.20.6.20:22)</dd><dt>Key type</dt><dd class="mono">ssh-ed25519</dd></dl>
  <div><div class="cap t3" style="margin-bottom:4px">Saved fingerprint</div><div class="fp">SHA256:Zq1k 8mPw Lr0c YtN4 vB7e Hs2J xD9a Qf6T uW3o f9Tw</div></div>
  <div><div class="cap t3" style="margin-bottom:4px">Presented fingerprint</div><div class="fp">SHA256:<span class="diff">K4tn Wb1R aa9X Yp0Q cV5m Tz8L eJ2h Ns7D gU6i r3Ey</span></div></div>
  <div class="infobar">${i("info")}<span>Verify the presented fingerprint with the server owner before you trust it. On the server: <span class="mono">ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub</span></span></div>
  </div><div class="dlg-foot"><span class="btn subtle" style="margin-right:auto">Replace saved key…</span><span class="btn">Copy details</span><span class="btn pri">Disconnect</span></div></div>`;
pages["05-hostkey-changed"] = page({ title: "Host key changed", tabs: selTab(3), body: sidebar({ rows: TREE.map((r) => ({ ...r, sel: r.name === "pg-primary" ? 1 : 0 })) }) +
  main(`${sessbar({ path: ["Production", "Database"], name: "pg-primary", chips: [`<span class="chip bad">${i("shield_error")}Host key mismatch</span>`] })}<div class="work"><div class="surface"><div class="term"><span class="d">Connecting to 10.20.6.20:22 via bastion01…
Key exchange complete (mlkem768x25519-sha256).
Verifying host key…</span></div></div></div>`),
  status: statusbar([sb(`${G.busy}Waiting for your decision`), sb(`<span class="mono">postgres@10.20.6.20:22</span>`)], SB_RIGHT), overlay: hostkey });

// 06 — credential vault
const cred = (name, user, kind, used, sel) => `<div class="li${sel ? " sel" : ""}">${i(kind === "SSH key" ? "key" : "person_key", "i20")}<div style="width:220px"><div class="ell">${name}</div></div><div class="mono t2 ell" style="width:190px">${user}</div><div class="cap t3" style="width:120px">${kind}</div><div class="cap t3 grow">${used}</div></div>`;
const vault = main(`<div class="page"><div class="page-main" style="padding-right:24px"><div style="display:flex;align-items:flex-end;gap:12px"><div class="grow"><h1>Credentials</h1><p class="t2" style="font-size:13.5px">Secrets stay in the vault. Connections reference them, so rotating one updates every connection that uses it.</p></div><span class="btn">${i("lock_closed")}Lock now</span><span class="btn pri">${i("add")}New credential</span></div>
  <div class="list" style="margin-top:20px"><div class="th"><span style="width:20px"></span><span style="width:220px">Name</span><span style="width:190px">Username</span><span style="width:120px">Type</span><span>Used by</span></div>
  ${cred("Prod DBA service", "PROD\\svc-dba", "Password", "38 connections", 1)}${cred("Deploy key (ed25519)", "deploy", "SSH key", "212 connections")}${cred("Bastion", "ops", "SSH agent", "1 connection")}
  ${cred("Network gear enable", "netadmin", "Password", "38 connections")}${cred("Lab KVM", "none", "Password", "12 connections")}${cred("Domain admin (ask)", "PROD\\adm-brett", "Ask every time", "4 connections")}</div></div>
  <div class="inspector" style="width:380px"><div class="insp-head"><div class="grow"><h2>Prod DBA service</h2><div class="cap t3">Changed 14 October 2026</div></div><div class="iconbtn sm">${i("more_horizontal")}</div></div><div class="insp-body">
  ${field("Name", "Prod DBA service", { noinh: 1 })}${field("Type", "Password", { dd: 1, noinh: 1 })}${field("Username", "svc-dba", { mono: 1, noinh: 1 })}${field("Domain", "PROD", { mono: 1, noinh: 1 })}
  <div class="f"><label>Password</label><div class="inp"><span class="grow mono">••••••••••••••••••••</span>${i("eye")}${i("copy")}</div><div></div><div class="src">Copying clears the clipboard after 30 seconds.</div></div>
  <div class="grp">Used by</div><div style="padding:2px 16px;display:grid;gap:2px;font-size:13px"><div class="t2">Production / Database <span class="t3">(folder, inherited by 36)</span></div><div class="t2">sql-report01.stage</div><div class="t2">sql-report02.stage</div></div>
  <div style="padding:16px"><div class="infobar ok">${i("shield_checkmark")}<span>Sealed with your Windows account and master password. Auto-locks after 15 minutes idle and when Windows locks.</span></div></div></div></div></div>`);
pages["06-credentials"] = page({ title: "Credentials", tabs: [{ icon: "key_multiple", name: "Credentials", sel: 1 }, ...selTab(-1).slice(0, 3)], collapsed: true, body: vault.replace('class="main "', 'class="main flush"'),
  status: statusbar([sb(`6 credentials`)], SB_RIGHT) });

// 07 — import wizard, preview step
const ir = (d, icon, name, cls, note) => `<div class="row" style="padding-left:${12 + d * 16}px;height:26px">${i(icon)}<span class="grow ell">${name}</span><span class="cap ${cls}">${note}</span></div>`;
const imp = main(`<div class="page"><div class="page-main"><div class="narrow" style="max-width:920px;margin:0 auto">
  <h1>Import from mRemoteNG</h1><div class="steps"><span class="done">1 Choose file</span><span class="done">2 Unlock</span><span class="on">3 Review</span><span>4 Import</span></div>
  <div class="infobar">${i("document")}<span><span class="mono">confCons.xml</span>, format 2.8, AES-GCM, 10,000 KDF iterations. Decrypted in an isolated process; nothing is saved until you choose Import.</span></div>
  <div style="display:grid;grid-template-columns:1fr 300px;gap:16px;margin-top:14px"><div class="list" style="padding:6px 4px;height:392px;overflow:hidden">
  ${ir(0, "folder_open", "Production", "add", "214 new")}${ir(1, "folder_open", "Web tier", "add", "62 new")}${ir(2, PROTO.ssh, "web01.prod", "skip", "Already exists, identical")}${ir(2, PROTO.ssh, "web02.prod", "chg", "Exists, port differs (22, file has 2222)")}${ir(2, PROTO.ssh, "web03.prod", "add", "New")}
  ${ir(1, "folder", "Database", "add", "36 new")}${ir(0, "folder_open", "Legacy", "chg", "41 need attention")}${ir(1, "globe", "intranet-wiki", "skip", "HTTP, kept as an external link")}${ir(1, "plug_disconnected", "as400-console", "chg", "Rlogin is not supported, imported disabled")}
  ${ir(1, PROTO.ssh, "old-sun-box", "chg", "SSH1 is not supported, converted to SSH")}${ir(0, "folder", "Network", "add", "38 new")}${ir(0, "folder", "Lab", "add", "12 new")}${ir(0, "folder", "PuTTY Saved Sessions", "skip", "Not in this file")}</div>
  <div><div class="list"><div class="li" style="min-height:36px"><span class="grow">New connections</span><b class="add">1,296</b></div><div class="li" style="min-height:36px"><span class="grow">Changed</span><b class="chg">3</b></div><div class="li" style="min-height:36px"><span class="grow">Need attention</span><b class="chg">41</b></div><div class="li" style="min-height:36px"><span class="grow">Identical, skipped</span><b>38</b></div><div class="li" style="min-height:36px"><span class="grow">Credentials to add to vault</span><b>17</b></div></div>
  <h2 style="margin-top:16px">When a connection already exists</h2><div style="display:grid;gap:6px;font-size:13.5px"><div>◉ Keep mine, add only new</div><div class="t2">○ Replace mine with imported</div><div class="t2">○ Keep both</div></div>
  <h2 style="margin-top:16px">Import into</h2><div class="inp"><span class="grow">Imported 2026-11-12 (new folder)</span>${i("chevron_down")}</div></div></div>
  <div class="rowset" style="margin-top:18px;justify-content:flex-end"><span class="btn subtle" style="margin-right:auto">Export review as CSV</span><span class="btn">Back</span><span class="btn pri">Import 1,299 connections</span></div></div></div></div>`);
pages["07-import-review"] = page({ title: "Import review", tabs: [{ icon: "arrow_import", name: "Import", sel: 1 }], body: sidebar({ rows: TREE.slice(0, 2).concat(TREE.slice(11)).map((r) => ({ ...r, sel: 0, state: undefined })) }) + imp,
  status: statusbar([sb(`Reviewing 1,378 items`)], [sb(`${i("lock_open")}Vault unlocked`)]) });

// 08 — settings
const nav = (icon, name, sel) => `<div class="row${sel ? " sel" : ""}" style="padding-left:12px;height:32px;gap:10px">${i(icon)}<span>${name}</span></div>`;
const setrow = (name, sub, ctl) => `<div class="li" style="min-height:56px"><div class="grow"><div>${name}</div><div class="sub">${sub}</div></div>${ctl}</div>`;
const dd = (v, w = 180) => `<div class="inp" style="width:${w}px"><span class="grow">${v}</span>${i("chevron_down")}</div>`;
const settings = main(`<div class="page"><div class="page-nav"><div class="filter" style="margin:0 0 8px">${i("search")}<span>Search settings</span></div>
  ${nav("color", "Appearance", 1)}${nav("window_console", "Terminal")}${nav("desktop", "Remote desktop")}${nav("desktop_cursor", "VNC")}${nav("shield_keyhole", "Security and vault")}${nav("keyboard", "Keyboard")}${nav("arrow_routing", "Tunnels and proxies")}${nav("save", "Backup and export")}${nav("arrow_sync", "Updates")}${nav("info", "About")}</div>
  <div class="page-main"><div class="narrow"><h1>Appearance</h1><h2>Theme</h2><div class="list">
  ${setrow("App theme", "Follows Windows by default.", dd("Use system setting"))}${setrow("Accent color", "Used for selection and focus.", dd("Use Windows accent"))}${setrow("Window material", "Mica draws the desktop tint behind the sidebar and title bar. Off when transparency effects are disabled in Windows.", `<span class="sw on"></span>`)}</div>
  <h2>Density</h2><div class="list">${setrow("Row height", "Applies to the connection tree, lists, and tables.", `<div style="display:flex;border:1px solid var(--stroke-control);border-radius:4px;overflow:hidden;font-size:13px"><span style="padding:5px 12px" class="t2">Compact</span><span style="padding:5px 12px;background:var(--fill-subtle-selected)">Standard</span><span style="padding:5px 12px" class="t2">Comfortable</span></div>`)}
  ${setrow("Show session bar", "Path, security state, and session actions above each session. Hidden in full screen.", `<span class="sw on"></span>`)}${setrow("Show protocol labels in tree", "Adds ssh, rdp, vnc, or telnet next to each connection.", `<span class="sw on"></span>`)}</div>
  <h2>Environments</h2><div class="list">${setrow(`<span style="display:inline-flex;gap:8px;align-items:center"><span class="envdot" style="width:10px;height:10px;border-radius:2px;background:${env("red")}"></span>Production</span>`, "Tab stripe, session frame, and a confirmation before input is broadcast.", `<span class="btn sm">Edit</span>`)}
  ${setrow(`<span style="display:inline-flex;gap:8px;align-items:center"><span class="envdot" style="width:10px;height:10px;border-radius:2px;background:${env("orange")}"></span>Staging</span>`, "Tab stripe only.", `<span class="btn sm">Edit</span>`)}${setrow(`<span style="display:inline-flex;gap:8px;align-items:center"><span class="envdot" style="width:10px;height:10px;border-radius:2px;background:${env("blue")}"></span>Lab</span>`, "Tab stripe only.", `<span class="btn sm">Edit</span>`)}</div>
  </div></div></div>`);
pages["08-settings"] = page({ title: "Settings", tabs: [{ icon: "settings", name: "Settings", sel: 1 }, ...selTab(-1).slice(0, 2)], collapsed: true, body: settings.replace('class="main "', 'class="main flush"'), status: statusbar([sb(`Changes save automatically`)], SB_RIGHT) });

// 09 — session states: insecure telnet banner + context menu + toast
const telnetTerm = `

core-sw-01 con0 is now available

Press RETURN to get started.

User Access Verification

Username: netadmin
Password:
core-sw-01&gt;<span class="cur"> </span>`;
const ctx = `<div class="menu" style="left:150px;top:286px"><div class="mi hover">${i("play")}Connect<kbd>Enter</kbd></div><div class="mi">${i("window_new")}Connect in new window</div><div class="mi">${i("person_key")}Connect as…</div><div class="msep"></div>
  <div class="mi">${i("edit")}Properties<kbd>Alt Enter</kbd></div><div class="mi">${i("copy")}Duplicate<kbd>Ctrl D</kbd></div><div class="mi">${i("folder_arrow_right")}Move to…<kbd>Ctrl Shift M</kbd></div><div class="mi">${i("star")}Add to favorites</div><div class="mi">${i("copy")}Copy address</div><div class="msep"></div><div class="mi danger">${i("delete")}Delete<kbd>Del</kbd></div></div>`;
pages["09-telnet-insecure-context-menu"] = page({ title: "Telnet cleartext warning, tree context menu", tabs: selTab(4), body: sidebar({ rows: TREE.map((r) => ({ ...r, sel: r.name === "core-sw-01" ? 1 : 0, hover: r.name === "sql02.prod" })) }) + main(
  `${sessbar({ path: ["Network"], name: "core-sw-01", chips: [`<span class="chip warn">${G.warn}Not encrypted</span>`], actions: [tb("search", ""), tb("split_horizontal", "")] })}
  <div class="work"><div class="surface"><div class="term" style="top:40px">${telnetTerm}</div><div class="banner top warn">${G.warn}<span class="grow">Telnet sends everything, including passwords, as readable text. Anyone on the network path can read this session.</span><span class="btn sm">Reconnect through SSH tunnel</span><span class="btn sm subtle">Don’t warn for this host</span></div></div></div>`),
  status: statusbar([sb(`${G.warn}Connected, not encrypted`, "warn"), sb(`<span class="mono">10.30.0.2:23</span>`), sb(`<span class="mono">80×24</span>`)], SB_RIGHT), overlay: ctx });

// 10 — disconnected + SFTP panel
const fr = (icon, name, size, date, sel) => `<div class="row${sel ? " sel" : ""}" style="padding-left:10px;height:26px;font-size:13px">${i(icon)}<span class="grow ell">${name}</span><span class="cap t3 mono" style="width:64px;text-align:right">${size}</span><span class="cap t3" style="width:92px;text-align:right">${date}</span></div>`;
const sftp = `<div class="inspector" style="width:420px"><div class="insp-head" style="align-items:center;padding-bottom:6px"><h2 class="grow">Files</h2><div class="iconbtn sm">${i("arrow_upload")}</div><div class="iconbtn sm">${i("folder_add")}</div><div class="iconbtn sm">${i("arrow_clockwise")}</div><div class="iconbtn sm">${i("dismiss")}</div></div>
  <div style="padding:0 12px 8px"><div class="inp"><span class="mono grow ell">/var/www/releases/2026-11-12</span></div></div><div class="th" style="padding-left:14px"><span class="grow">Name</span><span style="width:64px;text-align:right">Size</span><span style="width:92px;text-align:right">Modified</span></div>
  <div style="padding:4px;flex:1">${fr("folder", "..", "", "")}${fr("folder", "assets", "", "Today 08:40")}${fr("folder", "config", "", "Today 08:40")}${fr("document", "app.tar.zst", "184 MB", "Today 08:39", 1)}${fr("document", "CHANGELOG.md", "12 KB", "Today 08:39")}${fr("document", "manifest.json", "3 KB", "Today 08:39")}${fr("document", "nginx.conf", "4 KB", "9 Nov")}</div>
  <div style="border-top:1px solid var(--stroke-divider);padding:10px 14px;display:grid;gap:8px"><div style="display:flex;gap:8px;font-size:13px">${i("arrow_download")}<span class="grow ell">app.tar.zst</span><span class="cap t3 mono">112 of 184 MB, 21 MB/s</span></div><div style="height:3px;border-radius:2px;background:var(--fill-control)"><div style="width:61%;height:3px;border-radius:2px;background:var(--accent)"></div></div><div class="cap t3">Drop files here to upload to this folder.</div></div></div>`;
pages["10-sftp-and-disconnected"] = page({ title: "SFTP panel and disconnected state", tabs: TABS, body: sidebar() + main(`${SSH_BAR("files")}<div class="work"><div class="surface"><div class="term" style="opacity:.55">${TERM.replace('<span class="cur"> </span>', "")}</div>
  <div class="banner bad">${G.bad}<span class="grow"><b>Disconnected.</b> The server closed the connection (keepalive timed out after 45 s).</span><span class="btn sm pri">Reconnect<kbd style="color:inherit;background:none;border:none;padding:0;opacity:.7">Enter</kbd></span><span class="btn sm">Close tab</span></div></div>${sftp}</div>`),
  status: statusbar([sb(`${G.bad}Disconnected 08:53:02`, "bad"), sb(`<span class="mono">deploy@10.20.4.31:22</span>`), sb(`Scrollback kept`)], SB_RIGHT) });

// 11 — vault unlock (launch)
pages["11-vault-unlock"] = page({ title: "Vault unlock", tabs: [], collapsed: true, body: `<div style="flex:1;display:grid;place-items:center"><div style="width:360px;display:grid;gap:14px">
  <div style="display:grid;gap:4px"><div style="font:var(--type-subtitle)">Unlock zremote</div><div class="t2" style="font-size:13.5px">Enter your master password to open the vault.</div></div>
  <div class="inp focus" style="height:36px"><span class="grow mono">••••••••••••</span>${i("eye")}</div>
  <div class="rowset"><span class="btn pri grow">Unlock</span><span class="btn">${i("person")}Use Windows Hello</span></div>
  <div class="cap t3">Connections stay hidden until the vault is unlocked. <span class="link">Open without secrets</span></div></div></div>`,
  status: statusbar([sb(`${i("lock_closed")}Vault locked`)], []) });

// 12 — component sheet
const sw = (name, v) => `<div><div class="swatch" style="background:var(${v})"></div><div class="note mono" style="margin-top:3px">${name}</div></div>`;
const sheet = (theme) => `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><title>zremote — Components (${theme})</title><link rel="stylesheet" href="zr.css"></head><body><div class="sheet" style="grid-template-columns:1fr 1fr">
  <div><h3>Surfaces</h3><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">${sw("mica-alt", "--mica-alt")}${sw("mica", "--mica")}${sw("layer", "--layer")}${sw("layer-alt", "--layer-alt")}${sw("dialog", "--dialog")}${sw("session", "--surface-session")}</div>
  <h3 style="margin-top:18px">Accent, state, environment</h3><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px">${sw("accent", "--accent")}${sw("ok", "--ok")}${sw("warn", "--warn")}${sw("danger", "--danger")}${sw("env-red", "--env-red")}${sw("env-orange", "--env-orange")}${sw("env-blue", "--env-blue")}${sw("env-purple", "--env-purple")}</div>
  <h3 style="margin-top:18px">State glyphs (shape first, color second)</h3><div class="rowset">${["idle", "busy", "ok", "warn", "bad"].map((k, n) => `<span class="chip">${G[k]}${["Idle", "Connecting", "Connected", "Needs attention", "Failed"][n]}</span>`).join("")}</div>
  <h3 style="margin-top:18px">Type</h3><div style="display:grid;gap:4px"><div style="font:var(--type-title)">Title 28/36 semibold</div><div style="font:var(--type-subtitle)">Subtitle 20/28 semibold</div><div style="font:var(--type-body-strong)">Body strong 14/20 semibold</div><div>Body 14/20 regular</div><div class="cap t2">Caption 12/16 regular</div><div class="mono">Mono 12.5/18 — 10.20.4.31:22 SHA256:Zq1k8mPw</div></div>
  <h3 style="margin-top:18px">Buttons</h3><div class="rowset"><span class="btn pri">Connect</span><span class="btn">Cancel</span><span class="btn subtle">Skip</span><span class="btn danger">Delete 3 connections</span><span class="btn sm">${i("add")}New</span><span class="iconbtn">${i("settings")}</span><span class="iconbtn on">${i("panel_right")}</span></div>
  <h3 style="margin-top:18px">Chips and info bars</h3><div class="rowset"><span class="chip">${i("shield_checkmark")}Host key verified</span><span class="chip warn">${G.warn}Not encrypted</span><span class="chip bad">${i("shield_error")}Host key mismatch</span><kbd>Ctrl Shift P</kbd></div>
  <div style="display:grid;gap:6px;margin-top:10px"><div class="infobar warn">${i("warning")}<span>VNC password authentication is weak. Use an SSH tunnel on untrusted networks.</span></div><div class="infobar bad">${i("error_circle")}<span>Could not reach 10.20.6.20:22. The connection timed out after 10 s. Check the jump host.</span></div></div></div>
  <div><h3>Tree rows</h3><div style="width:300px;background:var(--mica);padding:4px;border-radius:6px;border:1px solid var(--stroke-divider)">${[{ name: "Production", kids: 1, env: "red", count: 214 }, { name: "Default row", proto: "ssh", d: 1 }, { name: "Hover", proto: "ssh", d: 1, hover: 1 }, { name: "Selected, connected", proto: "rdp", d: 1, sel: 1, state: "ok" }, { name: "Keyboard focus", proto: "vnc", d: 1, focus: 1 }, { name: "Connecting", proto: "ssh", d: 1, state: "busy" }, { name: "Failed", proto: "vnc", d: 1, state: "bad" }, { name: "Disabled (unsupported protocol)", proto: "telnet", d: 1, dim: 1 }, { name: "Filter <mark>mat</mark>ch", proto: "ssh", d: 1 }].map(row).join("")}</div>
  <h3 style="margin-top:18px">Tabs</h3><div style="background:var(--mica-alt);padding:8px 8px 0;border-radius:6px;display:flex;align-items:flex-end;gap:2px">${[{ proto: "ssh", name: "Selected", state: "ok", env: "red", sel: 1 }, { proto: "rdp", name: "Default", state: "ok" }, { proto: "ssh", name: "Hover", state: "busy", hover: 1 }, { proto: "vnc", name: "Failed", state: "bad", env: "blue" }].map(tab).join("")}</div>
  <h3 style="margin-top:18px">Property rows (inherit / override)</h3><div style="width:348px;background:var(--layer);border:1px solid var(--stroke-divider);border-radius:6px;padding:6px 0">${field("Port", "22", { mono: 1, inh: 1, src: "Production" })}${field("Port", "2222", { mono: 1, over: 1 })}${field("Port", "2222", { mono: 1, over: 1, focus: 1 })}${field("Port", "70000", { mono: 1, over: 1, err: 1 })}<div class="f"><label></label><div class="cap" style="color:var(--danger)">Enter a port from 1 to 65535.</div><div></div></div>${toggle("Require NLA", 1, { inh: 1, src: "Connections (root)" })}</div>
  <h3 style="margin-top:18px">Menu</h3><div style="position:relative;height:150px"><div class="menu" style="left:0;top:0"><div class="mi hover">${i("play")}Connect<kbd>Enter</kbd></div><div class="mi">${i("edit")}Properties<kbd>Alt Enter</kbd></div><div class="msep"></div><div class="mi danger">${i("delete")}Delete<kbd>Del</kbd></div></div></div></div></div></body></html>`;
pages["12-components-dark"] = sheet("dark");
pages["13-components-light"] = sheet("light");
pages["14-shell-ssh-light-compact"] = page({ title: "Shell, light, compact density", theme: "light", density: "compact", tabs: TABS, body: sidebar() + sshMain(), status: SSH_STATUS });

for (const [name, html] of Object.entries(pages)) writeFileSync(join(OUT, `${name}.html`), html);
console.log(Object.keys(pages).join("\n"));
