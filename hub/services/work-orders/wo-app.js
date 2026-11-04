/* =====================================================================
   Work Order Manager by Outreachdev: the screens

   Reads and writes through WOStore (wo-store.js); rules and checks live in
   WOCore (wo-core.js). Everything here is drawing and reacting to clicks.
   ===================================================================== */
(function () {
  "use strict";
  var W = window.WOCore, St = window.WOStore, app = document.getElementById("app");

  /* ------------------------------------------------------------------
     Icons
     ------------------------------------------------------------------ */
  var ICONS = {
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    building: '<path d="M4 21V5l8-2v18M12 8h8v13M8 9h.01M8 13h.01M8 17h.01M16 12h.01M16 16h.01"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.8 2.5 3 5.2"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    check: '<path d="m5 12 5 5 9-10"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    play: '<path d="M7 4v16l13-8z"/>', flag: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
    note: '<path d="M4 5h16v11H9l-5 4z"/>', file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>', sparkle: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>', columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
    up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18h2"/>', history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 8v4l3 2"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>', wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h3v4"/>'
  };
  function icon(n, cls) { return '<svg class="i ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || "") + "</svg>"; }

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAY3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function plural(n, w, p) { return n + " " + (n === 1 ? w : p || w + "s"); }
  function today() { return W.iso(new Date()); }
  function S() { return St.settings(); }
  function role() { return U.preview ? "staff" : St.myRole(); }
  function fmtDate(s, withDay) {
    if (!s) return "";
    var d = W.parseISO(s); if (isNaN(d)) return s;
    return (withDay ? DAY3[d.getDay()] + " " : "") + MONTHS[d.getMonth()] + " " + d.getDate() + (d.getFullYear() !== new Date().getFullYear() ? ", " + d.getFullYear() : "");
  }
  function relDue(o) {
    if (!o.due) return "No due date";
    var n = W.daysBetween(today(), o.due);
    if (W.isClosed(o, S())) return "Due " + fmtDate(o.due);
    if (n < 0) return plural(-n, "day") + " late";
    if (n === 0) return "Due today";
    if (n === 1) return "Due tomorrow";
    return "Due in " + n + " days";
  }
  function ago(ms) {
    if (!ms) return "";
    var s = (Date.now() - ms) / 1000;
    if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago"; if (s < 86400) return Math.floor(s / 3600) + " h ago";
    var d = new Date(ms); if (s < 172800) return "yesterday";
    return MONTHS[d.getMonth()] + " " + d.getDate() + (d.getFullYear() !== new Date().getFullYear() ? ", " + d.getFullYear() : "");
  }
  function fullTime(ms) { if (!ms) return ""; var d = new Date(ms); return d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); }
  var PAL = 8;
  function stInfo(id) { return W.statusById(S(), id) || { name: "Unknown", cat: "open", color: 7 }; }
  function stPill(id) { var s = stInfo(id), c = (s.color || 0) % PAL; return '<span class="st" style="background:var(--p' + c + "-bg);color:var(--p" + c + "-fg);border-color:var(--p" + c + '-bd)">' + esc(s.name) + "</span>"; }
  function stColor(id) { var c = (stInfo(id).color || 0) % PAL; return "var(--p" + c + "-fg)"; }
  function pname(pid) { var p = St.data.people[pid]; return p ? p.name : ""; }
  function dueHTML(o) { var u = W.urgency(o, S(), today()); return '<span class="due ' + u + '" title="' + esc(relDue(o)) + '">' + (o.due ? fmtDate(o.due) : "—") + "</span>"; }
  function prioHTML(p) { return p === "rush" ? '<span class="prio rush">Rush</span>' : p === "high" ? '<span class="prio high">High</span>' : ""; }
  function ord(n) { return St.data.orders[W.docId(n)] || null; }
  function allOrders() { return Object.keys(St.data.orders).map(function (k) { return St.data.orders[k]; }); }
  function noun() { return (S().business && S().business.noun) || "Work order"; }
  function lnoun() { return noun().toLowerCase(); }
  function initials(n) { var p = String(n || "?").trim().split(/\s+/); return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); }
  function hashC(id) { var h = 0; String(id).split("").forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return h % 7; }
  function avatar(pid, size) { var p = St.data.people[pid]; if (!p) return ""; var c = hashC(pid), s = size || 24; return '<span class="avatar" style="width:' + s + "px;height:" + s + "px;font-size:" + Math.round(s * 0.42) + "px;background:var(--p" + c + "-bg);color:var(--p" + c + '-fg)">' + esc(initials(p.name)) + "</span>"; }
  function natCmp(a, b) { return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" }); }
  function download(name, text, type) {
    if (!(text instanceof Blob) && /csv/.test(type || "")) text = "\ufeff" + text;
    var blob = text instanceof Blob ? text : new Blob([text], { type: type || "text/plain" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  var toastTimer;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("on"); }, 3400); }
  function errMsg(e) { return (e && e.message) || "Something went wrong. Try again."; }
  function sel(name, opts, value, extra) {
    return '<select class="input' + (extra && extra.sm ? " input-sm" : "") + '" ' + name + (extra && extra.disabled ? " disabled" : "") + ">" +
      opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value == null ? "" : value) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
  }
  function peopleOpts(blank) { var list = Object.keys(St.data.people).map(function (k) { return St.data.people[k]; }).sort(function (a, b) { return natCmp(a.name, b.name); }); return [["", blank || "Unassigned"]].concat(list.map(function (p) { return [p.id, p.name]; })); }
  function statusOpts() { return S().statuses.map(function (s) { return [s.id, s.name]; }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ---------- theme: one color in, a full palette out (shared with Scheduling Agent) ---------- */
  function hexRgb(h) { h = String(h || "").replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); var n = parseInt(h, 16); return isNaN(n) ? [47, 111, 222] : [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgbHex(c) { return "#" + c.map(function (x) { x = Math.max(0, Math.min(255, Math.round(x))); return (x < 16 ? "0" : "") + x.toString(16); }).join("").toUpperCase(); }
  function mix(a, b, t) { var A = hexRgb(a), B = hexRgb(b); return rgbHex([0, 1, 2].map(function (i) { return A[i] * (1 - t) + B[i] * t; })); }
  function lum(h) { var c = hexRgb(h).map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  var THEMES = [["Ocean", "#2F6FDE"], ["Steel", "#4A5568"], ["Teal", "#0E8A86"], ["Forest", "#2E8550"], ["Safety orange", "#E0702B"], ["Lavender", "#6A58D6"], ["Berry", "#C2386B"], ["Rust", "#A4472B"]];
  var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function brand() { return (St.data.settings && St.data.settings.brand) || (U.wiz && U.wiz.settings && U.wiz.settings.brand) || { accent: "#2F6FDE", mode: "light" }; }
  function applyTheme() {
    var b = brand(), m = b.mode || "light", dark = (m === "system" ? (mql && mql.matches) : m === "dark"), root = document.documentElement, a = b.accent || "#2F6FDE", t;
    root.setAttribute("data-theme", dark ? "dark" : "light");
    if (!dark) {
      var acc = a; for (var i = 0; i < 6 && contrast(acc, "#FFFFFF") < 3.2; i++) acc = mix(acc, "#000000", 0.12);
      t = { accent: acc, "accent-ink": mix(acc, "#000000", 0.22), "accent-soft": mix(a, "#FFFFFF", 0.88), "accent-soft-2": mix(a, "#FFFFFF", 0.8), "accent-line": mix(a, "#FFFFFF", 0.72), "accent-wash": mix(a, "#FFFFFF", 0.965), glow1: mix(a, "#FFFFFF", 0.86), glow2: mix(a, "#F6F7FB", 0.93) };
    } else {
      var accD = a; for (var j = 0; j < 6 && contrast(accD, "#191A21") < 4; j++) accD = mix(accD, "#FFFFFF", 0.15);
      t = { accent: accD, "accent-ink": mix(accD, "#FFFFFF", 0.3), "accent-soft": mix(accD, "#191A21", 0.8), "accent-soft-2": mix(accD, "#191A21", 0.7), "accent-line": mix(accD, "#191A21", 0.6), "accent-wash": mix(accD, "#111217", 0.9), glow1: mix(accD, "#111217", 0.84), glow2: mix(accD, "#111217", 0.92) };
    }
    t["on-accent"] = contrast(t.accent, "#FFFFFF") >= 3 ? "#FFFFFF" : "#16171D";
    Object.keys(t).forEach(function (k) { root.style.setProperty("--" + k, t[k]); });
  }
  if (mql && mql.addEventListener) mql.addEventListener("change", function () { if (brand().mode === "system") render(); });
  function logoColor(img) {
    var c = document.createElement("canvas"), n = 48; c.width = c.height = n;
    var x = c.getContext("2d"); x.drawImage(img, 0, 0, n, n);
    var d = x.getImageData(0, 0, n, n).data, buckets = {};
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
      if (sat < 0.28 || l < 0.12 || l > 0.9) continue;
      var h = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4, k = Math.floor(h * 4);
      var B = buckets[k] || (buckets[k] = { w: 0, r: 0, g: 0, b: 0 });
      B.w += sat; B.r += d[i] * sat; B.g += d[i + 1] * sat; B.b += d[i + 2] * sat;
    }
    var best = null; Object.keys(buckets).forEach(function (k) { if (!best || buckets[k].w > best.w) best = buckets[k]; });
    return best && best.w > 3 ? rgbHex([best.r / best.w, best.g / best.w, best.b / best.w]) : null;
  }
  function loadLogo(file, done) {
    if (!file || !/^image\//.test(file.type)) { toast("Choose an image file, like a PNG, JPG or SVG."); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 240, sc = Math.min(1, max / Math.max(img.width || max, img.height || max)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round((img.width || max) * sc)); c.height = Math.max(1, Math.round((img.height || max) * sc));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        done(c.toDataURL("image/png"), logoColor(img));
      };
      img.onerror = function () { toast("That image couldn't be read. Try a PNG or JPG."); };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* ------------------------------------------------------------------
     Screen state (per viewer; only small conveniences are remembered)
     ------------------------------------------------------------------ */
  var DEFAULT_COLS = ["number", "customer", "part", "qty", "title", "due", "assignee", "status"];
  var saved = store("wo.ui") || {};
  var U = {
    view: saved.view || "dashboard", q: "", f: Object.assign({ cat: "active", status: "", who: "", cust: "", src: "" }, saved.f || {}),
    sort: saved.sort || { k: "due", dir: 1 }, cols: saved.cols || DEFAULT_COLS.slice(), showN: 150, sel: {},
    drawer: null, modal: null, pop: null, wiz: null, imp: null, preview: false, floor: { tab: "mine", job: null, q: "" }, authMode: null
  };
  function remember() { store("wo.ui", { view: U.view, f: U.f, sort: U.sort, cols: U.cols }); }

  /* ------------------------------------------------------------------
     Render
     ------------------------------------------------------------------ */
  var brandMark = '<span class="mark"><svg viewBox="0 0 28 28" aria-hidden="true"><use href="#o-mark"/></svg></span>';
  var brandHTML = '<a class="brand" href="#" data-act="nav" data-v="dashboard">' + brandMark + '<span><b>Work Order Manager</b><small>by Outreachdev</small></span></a>';
  function fkey(el) {
    if (!el || el === document.body) return null;
    if (el.id) return "#" + CSS.escape(el.id);
    var a = ["data-f", "data-scope", "data-item", "data-k", "data-change", "data-i", "data-in", "data-pf", "data-cf", "data-id", "data-row", "data-col", "data-v"].filter(function (x) { return el.hasAttribute(x); });
    if (!a.length) return null;
    return el.tagName.toLowerCase() + a.map(function (x) { return "[" + x + '="' + CSS.escape(el.getAttribute(x)) + '"]'; }).join("");
  }
  // Panels slide in once. The screen is redrawn on every change, so remember when each panel
  // first appeared: a redraw during the slide resumes it, and after that it stays still.
  var shownDrawer = null, shownModal = null, drawerAt = 0, modalAt = 0;
  function nowMs() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function animAttr(key, shown, at) {
    if (!key || key !== shown) return "";
    var t = nowMs() - at;
    return t > 260 ? " still" : '" style="--ad:-' + Math.round(t) + 'ms';
  }
  function overlayKey(o) { return o ? [o.type, o.number, o.id].join("|") : null; }
  function render() {
    var act = document.activeElement, key = fkey(act), selS = null, selE = null;
    try { if (act && act.selectionStart != null) { selS = act.selectionStart; selE = act.selectionEnd; } } catch (e) { }
    var mainEl = $(".main"), y = mainEl ? mainEl.scrollTop : 0, dbody = $(".drawer-body"), dy = dbody ? dbody.scrollTop : 0, fb = $(".floor-scroll"), fy = fb ? fb.scrollTop : 0;
    applyTheme();
    var html;
    if (St.status === "loading" || (St.status === "member" && !St.data.loaded)) html = renderSplash();
    else if (St.status === "new-org") html = renderWizard();
    else if (St.status !== "member") html = renderAuth();
    else {
      var r = St.myRole();
      if (U.preview) html = renderPreview();
      else if (r === "staff") html = renderFloor();
      else html = renderFrame();
      html += renderOverlays();
      html += renderAssistant();
      var acc = St.access();
      if (acc.state === "locked") html += renderLock();
    }
    app.innerHTML = html;
    var m2 = $(".main"); if (m2) m2.scrollTop = y;
    var d2 = $(".drawer-body"); if (d2) d2.scrollTop = dy;
    var dk = overlayKey(U.drawer), mk = overlayKey(U.modal);
    if (dk !== shownDrawer) drawerAt = nowMs();
    if (mk !== shownModal) modalAt = nowMs();
    shownDrawer = dk; shownModal = mk;
    var f2 = $(".floor-scroll"); if (f2) f2.scrollTop = fy;
    if (key) { var el = $(key); if (el && !el.disabled) { el.focus({ preventScroll: true }); try { if (selS != null && el.setSelectionRange) el.setSelectionRange(selS, selE); } catch (e) { } } }
    if (U.focus) { var fe = $(U.focus); U.focus = null; if (fe) fe.focus(); }
    positionPop();
    var cl = $("#chat-log"); if (cl) cl.scrollTop = cl.scrollHeight;
  }
  St.onChange(function () {
    if (U.pendingOpen && ord(U.pendingOpen)) { var n = U.pendingOpen; U.pendingOpen = null; openOrder(n); }
    syncDrawer(); render();
  });

  function renderSplash() {
    return '<div class="onboard"><div class="ob-card" style="width:min(460px,100%)"><div class="ob-head">' + brandHTML + '<h1 style="font-size:20px">Loading…</h1><p>Getting your work orders.</p></div><div class="ob-body" style="padding-bottom:28px">' +
      (St.error ? '<div class="note note-warn">' + icon("alert") + "<span>" + esc(St.error) + "</span></div>" : "") + "</div></div></div>";
  }

  /* ------------------------------------------------------------------
     Sign in, create, join (online only)
     ------------------------------------------------------------------ */
  function renderAuth() {
    var inv = St.invite && St.invite.data, h = '<div class="onboard"><div class="ob-card" style="width:min(460px,100%)"><div class="ob-head">' + brandHTML;
    var err = St.error ? '<div class="note note-warn">' + icon("alert") + "<span>" + esc(St.error) + "</span></div>" : "";
    if (St.invite && !St.invite.checked && St.status === "signed-out") return renderSplash();
    if (St.status === "error") return h + "<h1>Can't connect right now</h1></div><div class=\"ob-body\">" + err + '</div><div class="ob-foot"><button class="btn btn-primary" data-act="reload">Try again</button>' + (St.user ? '<button class="btn btn-ghost" data-act="sign-out">Sign out</button>' : "") + "</div></div></div>";
    if (St.status === "need-email") {
      return h + "<h1>Confirm your email</h1><p>Enter the email address the sign-in link was sent to.</p></div><div class=\"ob-body\">" + err +
        '<label class="field"><span>Email</span><input class="input" id="au-email" type="email" autocomplete="email"></label></div><div class="ob-foot"><span class="spacer"></span><button class="btn btn-primary" data-act="au-finish">Sign in</button></div></div></div>';
    }
    if (St.status === "joining") {
      return h + "<h1>" + (inv ? "Join " + esc(inv.orgName || "your team") : "Invite not found") + "</h1><p>" + (inv ? "You're joining as <b>" + esc(inv.name || "a team member") + "</b>. You'll see the shop's work orders and can update the jobs you work on." : "This invite link isn't valid anymore. Ask your manager for a new one.") + "</p></div>" +
        '<div class="ob-body">' + err + '<div class="note">' + icon("user") + "<span>Signed in as " + esc((St.user && St.user.email) || "") + '. <a href="#" data-act="sign-out">Not you?</a></span></div></div>' +
        '<div class="ob-foot"><span class="spacer"></span>' + (inv ? '<button class="btn btn-primary" data-act="au-join">' + icon("check") + "Join</button>" : "") + "</div></div></div>";
    }
    if (U.authMode == null) U.authMode = St.invite ? "signup" : "signin";
    var up = U.authMode === "signup";
    h += "<h1>" + (inv ? "You're invited" : up ? "Create your account" : "Sign in") + "</h1><p>" +
      (inv ? esc(inv.orgName || "Your shop") + " tracks its work orders here. Sign in or create an account to join as <b>" + esc(inv.name || "a team member") + "</b>."
        : up ? "For shop owners and managers setting up their work orders." : "Welcome back.") + "</p></div><div class=\"ob-body\">" + err;
    if (St.linkSentTo) return h + '<div class="note">' + icon("send") + "<span>Check <b>" + esc(St.linkSentTo) + "</b> for a sign-in link. Open it on this device.</span></div></div></div></div>";
    h += '<button class="btn" style="height:44px" data-act="au-google"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>Continue with Google</button>' +
      '<div class="row" style="gap:10px;color:var(--faint);font-size:12px"><span style="flex:1;height:1px;background:var(--line)"></span>or with email<span style="flex:1;height:1px;background:var(--line)"></span></div>' +
      '<label class="field"><span>Email</span><input class="input" id="au-email" type="email" autocomplete="email" value="' + esc(U.authEmail || "") + '"></label>' +
      (U.authLink ? "" : '<label class="field"><span>Password</span><input class="input" id="au-pw" type="password" autocomplete="' + (up ? "new-password" : "current-password") + '" value="' + esc(U.authPw || "") + '" data-enter="au-email-go"></label>') +
      (up ? '<p class="faint" style="font-size:12px;margin:0">By creating an account you agree to the <a href="../terms.html" target="_blank" rel="noopener">Terms</a> and <a href="../privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>' : "") + "</div>";
    h += '<div class="ob-foot">' + (U.authLink ? '<button class="btn btn-ghost btn-sm" data-act="au-mode" data-v="pw">Use a password instead</button>'
      : '<button class="btn btn-ghost btn-sm" data-act="au-mode" data-v="' + (up ? "in" : "up") + '">' + (up ? "I have an account" : "Create an account") + '</button><button class="btn btn-ghost btn-sm" data-act="au-mode" data-v="link">Email me a link</button>') +
      '<span class="spacer"></span><button class="btn btn-primary" data-act="au-email-go">' + (U.authLink ? "Send link" : up ? "Create account" : "Sign in") + "</button></div></div></div>";
    return h;
  }

  /* ------------------------------------------------------------------
     Setup wizard
     ------------------------------------------------------------------ */
  function wiz() {
    if (!U.wiz) {
      var s = W.defaultSettings("machine");
      U.wiz = { step: 0, settings: s, answers: {}, people: [], start: "import", ownerName: "" };
    }
    return U.wiz;
  }
  var WIZ_STEPS = ["Your shop", "What gets in the way", "Statuses", "Numbers", "Team", "Start"];
  function renderWizard() {
    var z = wiz(), s = z.settings, step = z.step, h = '<div class="onboard"><div class="ob-card">';
    if (step === 0) {
      return h + '<div class="ob-head">' + brandHTML + "<h1>Replace the work order spreadsheet</h1><p>Every job gets a number that never repeats, a status everyone can see, and a history of who changed what. Setup takes about three minutes, and you can bring in your spreadsheet at the end.</p></div>" +
        '<div class="ob-body"><div class="choice-grid">' +
        '<button class="choice" data-act="wiz-next"><span class="ico">' + icon("wrench") + "</span><b>Set up my shop</b><span>Answer a few questions. Each yes turns on a feature you need.</span></button>" +
        (St.mode === "local" ? '<button class="choice" data-act="wiz-sample"><span class="ico">' + icon("eye") + "</span><b>Look around first</b><span>Open a fictional machine shop with 160 sample work orders.</span></button>" : "") + "</div>" +
        (St.mode === "local" ? '<div class="note">' + icon("info") + "<span>" + (window.WO_DEMO ? "This is a demo. Pick <b>Look around first</b> for a sample shop, or set up your own. It all stays in this tab and is erased when you close it." : "This copy saves only in this browser. Once it's connected online, your team can sign in from any phone or computer.") + "</span></div>" : '<div class="note">' + icon("sparkle") + "<span>Free for " + St.trialDays + " days. No card needed. Unlimited team members.</span></div>") +
        (St.error ? '<div class="note note-warn">' + icon("alert") + "<span>" + esc(St.error) + "</span></div>" : "") +
        "</div><div class=\"ob-foot\">" + (St.mode !== "local" ? '<span class="faint" style="font-size:12.5px">Signed in as ' + esc((St.user && St.user.email) || "") + '</span><button class="btn btn-ghost btn-sm" data-act="sign-out">Not you?</button>' : "") + "</div></div></div>";
    }
    h += '<div class="steps" style="margin-top:22px">' + WIZ_STEPS.map(function (x, i) { return '<span class="' + (i < step ? "on" : "") + '"></span>'; }).join("") + "</div>";
    h += '<div class="step-label">Step ' + step + " of " + WIZ_STEPS.length + " · " + WIZ_STEPS[step - 1] + "</div>";
    if (step === 1) {
      var bm = (s.brand && s.brand.mode) || "light";
      h += '<div class="ob-head" style="padding-top:8px"><h1>Tell us about your shop</h1><p>This picks sensible statuses and words. You can change everything later.</p></div><div class="ob-body">' +
        '<div class="field"><span>Light or dark?</span><div class="mode-pick">' + [["light", "Light"], ["dark", "Dark"], ["system", "Match my device"]].map(function (m) {
          return '<button class="mode-card' + (bm === m[0] ? " on" : "") + '" data-act="wz-mode" data-v="' + m[0] + '" aria-pressed="' + (bm === m[0]) + '"><span class="mode-prev mode-' + m[0] + '"><i></i><i></i><i></i></span><b>' + m[1] + "</b></button>";
        }).join("") + "</div></div>" +
        '<label class="field"><span>Shop name</span><input class="input" data-change="wz-name" value="' + esc(s.business.name) + '" placeholder="e.g. Ridgeline Precision"></label>' +
        '<div class="field"><span>Your name</span><input class="input" data-change="wz-owner" value="' + esc(z.ownerName) + '" placeholder="Shown in the history"></div>' +
        '<div class="field"><span>What kind of shop?</span><div class="choice-grid">' + Object.keys(W.PRESETS).map(function (k) {
          var p = W.PRESETS[k];
          return '<button class="choice' + (s.business.industry === k ? " on" : "") + '" data-act="wz-ind" data-v="' + k + '"><b>' + esc(p.label) + "</b><span>" + esc(p.statuses.slice(0, 4).map(function (x) { return x[0]; }).join(" → ")) + "…</span></button>";
        }).join("") + "</div></div></div>";
    } else if (step === 2) {
      var allYes = W.OPT.every(function (k) { return z.answers[k] === true; }), allNo = W.OPT.every(function (k) { return z.answers[k] === false; });
      h += '<div class="ob-head" style="padding-top:8px"><h1>What gets in the way today?</h1><p>Each yes turns on a feature. Skip anything; you can turn features on and off in Settings.</p></div><div class="ob-body">' +
        '<div class="row"><button class="btn btn-sm' + (allNo ? " btn-soft" : "") + '" data-act="wz-all" data-v="no">All no (Simple)</button><button class="btn btn-sm' + (allYes ? " btn-soft" : "") + '" data-act="wz-all" data-v="yes">All yes (Advanced)</button></div>' +
        W.FEATURES.map(function (f) {
          var a = z.answers[f.key];
          return '<div class="q"><div class="txt"><b>' + esc(f.q) + "</b><span>" + esc(f.qd) + '</span></div><div class="yn"><button class="yes' + (a === true ? " on" : "") + '" data-act="wz-yn" data-k="' + f.key + '" data-v="1">Yes</button><button class="no' + (a === false ? " on" : "") + '" data-act="wz-yn" data-k="' + f.key + '" data-v="0">No</button></div></div>';
        }).join("") +
        '<div class="note">' + icon("check") + "<span>Always included: numbers that never repeat, search and filters, overdue alerts, spreadsheet import and export, and the full change history.</span></div></div>";
    } else if (step === 3) {
      h += '<div class="ob-head" style="padding-top:8px"><h1>Your statuses</h1><p>Use the words your shop already uses. Each status belongs to a type, so the dashboard knows what\'s waiting, working, on hold or done.</p></div><div class="ob-body">' +
        statusEditor(s, "wz") + "</div>";
    } else if (step === 4) {
      var prev = W.previewNumber(s.numbering, new Date());
      h += '<div class="ob-head" style="padding-top:8px"><h1>Work order numbers</h1><p>Numbers are assigned automatically when an order is saved. They never repeat, even if two people save at the same moment.</p></div><div class="ob-body">' +
        numberingEditor(s, "wz") +
        '<div class="note">' + icon("info") + "<span>Already have numbers in a spreadsheet? Import keeps them exactly as they are, and new orders continue after the highest one.</span></div></div>";
    } else if (step === 5) {
      var rolesOn = s.features.roles;
      h += '<div class="ob-head" style="padding-top:8px"><h1>Who works here?</h1><p>Optional. Add people now so you can assign jobs to them' + (St.mode !== "local" ? ", then send each one an invite link. They just open it on their phone; no app to download" : "") + ".</p></div><div class=\"ob-body\">" +
        '<div class="row"><input class="input" id="wz-person" placeholder="Name, then press Enter" data-enter="wz-add-person" style="flex:1;min-width:200px">' + (rolesOn ? sel('id="wz-role"', W.ROLES.filter(function (r) { return r[0] !== "admin"; }).map(function (r) { return [r[0], r[1]]; }), "staff") : "") + '<button class="btn" data-act="wz-add-person">' + icon("plus") + "Add</button></div>" +
        (z.people.length ? '<div class="list">' + z.people.map(function (p, i) { return '<div class="li"><span class="grow"><b>' + esc(p.name) + "</b>" + (rolesOn ? '<span class="faint" style="font-size:12px">' + esc((W.ROLES.find(function (r) { return r[0] === p.role; }) || [0, "Shop staff"])[1]) + "</span>" : "") + '</span><button class="btn btn-icon btn-ghost btn-sm" data-act="wz-del-person" data-i="' + i + '" aria-label="Remove">' + icon("x") + "</button></div>"; }).join("") + "</div>" : '<p class="faint" style="font-size:13px">No one yet. That\'s fine; add people from the Team page any time.</p>') +
        (rolesOn ? "" : '<div class="note">' + icon("info") + "<span>Roles are off, so everyone you add can create and edit work orders. Turn on roles in Settings to limit shop staff to status updates.</span></div>") + "</div>";
    } else if (step === 6) {
      h += '<div class="ob-head" style="padding-top:8px"><h1>How do you want to start?</h1><p>You can always import later from the Import page.</p></div><div class="ob-body"><div class="choice-grid">' +
        [["import", "table", "Bring in my spreadsheet", "Upload an Excel or CSV file. You'll match your columns, then see a report of what came in."], ["empty", "plus", "Start empty", "Create work orders as they come in."]].concat(St.mode === "local" ? [["sample", "eye", "Fill with sample data", "A fictional machine shop's orders, to try things out. Not for real use."]] : []).map(function (o) {
          return '<button class="choice' + (z.start === o[0] ? " on" : "") + '" data-act="wz-start" data-v="' + o[0] + '"><span class="ico">' + icon(o[1]) + "</span><b>" + o[2] + "</b><span>" + o[3] + "</span></button>";
        }).join("") + "</div>" + (St.error ? '<div class="note note-warn">' + icon("alert") + "<span>" + esc(St.error) + "</span></div>" : "") + "</div>";
    }
    h += '<div class="ob-foot"><button class="btn btn-ghost" data-act="wiz-back">' + icon("left") + "Back</button><span class=\"spacer\"></span>" +
      (step < 6 ? '<button class="btn btn-primary" data-act="wiz-next">Continue' + icon("right") + "</button>" : '<button class="btn btn-primary" data-act="wiz-finish"' + (z.busy ? " disabled" : "") + ">" + icon("check") + (z.busy ? "Setting up…" : "Finish setup") + "</button>") + "</div></div></div>";
    return h;
  }
  // shared by the wizard and Settings
  function statusEditor(s, scope) {
    var used = {}; if (scope !== "wz") allOrders().forEach(function (o) { used[o.status] = (used[o.status] || 0) + 1; });
    return '<div class="card set-list" style="box-shadow:none">' + s.statuses.map(function (st, i) {
      var c = (st.color || 0) % PAL;
      return '<div class="st-row"><button class="dotpick" style="background:var(--p' + c + '-fg)" data-act="' + scope + '-st-color" data-i="' + i + '" title="Change color" aria-label="Change color"></button>' +
        '<input class="input input-sm" data-change="' + scope + '-st-name" data-i="' + i + '" value="' + esc(st.name) + '">' +
        sel('data-change="' + scope + '-st-cat" data-i="' + i + '"', W.CAT_ORDER.map(function (k) { return [k, W.CATS[k].name]; }), st.cat, { sm: true }) +
        '<span class="row" style="gap:2px;flex-wrap:nowrap"><button class="btn btn-icon btn-ghost btn-sm" data-act="' + scope + '-st-move" data-i="' + i + '" data-d="-1" aria-label="Move up"' + (i === 0 ? " disabled" : "") + ">" + icon("up") + '</button><button class="btn btn-icon btn-ghost btn-sm" data-act="' + scope + '-st-move" data-i="' + i + '" data-d="1" aria-label="Move down"' + (i === s.statuses.length - 1 ? " disabled" : "") + ">" + icon("down") + "</button>" +
        '<button class="btn btn-icon btn-ghost btn-sm" data-act="' + scope + '-st-del" data-i="' + i + '" aria-label="Remove"' + (used[st.id] || s.statuses.length <= 2 ? ' disabled title="' + (used[st.id] ? plural(used[st.id], "order") + " use this status" : "Keep at least two") + '"' : "") + ">" + icon("trash") + "</button></span></div>";
    }).join("") + '</div><div class="row" style="margin-top:8px"><button class="btn btn-sm" data-act="' + scope + '-st-add">' + icon("plus") + "Add a status</button>" +
      (["open", "done"].every(function (c) { return s.statuses.some(function (x) { return x.cat === c; }); }) ? "" : '<span class="faint" style="font-size:12.5px">Keep at least one "Not started" and one "Done" status.</span>') + "</div>";
  }
  function numberingEditor(s, scope) {
    var n = s.numbering, prev = scope === "wz" ? W.previewNumber(n, new Date()) : nextNumberGuess();
    return '<div class="form-grid"><label class="field c2"><span>Starts with</span><input class="input" data-change="' + scope + '-num-prefix" value="' + esc(n.prefix) + '" maxlength="12" placeholder="WO-"></label>' +
      '<div class="field c2"><span>Year</span><div class="seg">' + [["YYYY", "2026"], ["YY", "26"], ["", "None"]].map(function (y) { return '<button class="' + (n.year === y[0] ? "on" : "") + '" data-act="' + scope + '-num-year" data-v="' + y[0] + '">' + y[1] + "</button>"; }).join("") + "</div></div>" +
      '<label class="field c1"><span>Digits</span>' + sel('data-change="' + scope + '-num-digits"', [[3, "3"], [4, "4"], [5, "5"], [6, "6"]], n.digits) + "</label>" +
      '<label class="field c1"><span>First number</span><input class="input" type="number" min="1" data-change="' + scope + '-num-start" value="' + esc(n.start || 1) + '"></label></div>' +
      '<div class="row" style="margin-top:6px"><span class="muted" style="font-size:13px">Next new order:</span><span class="numprev">' + esc(prev) + "</span>" + (n.year ? '<span class="faint" style="font-size:12.5px">Starts over at ' + esc(W.formatNumber(W.resolvePrefix(n, new Date(new Date().getFullYear() + 1, 0, 1)), 1, n.digits)) + " next January.</span>" : "") + "</div>";
  }

  /* ------------------------------------------------------------------
     The main frame
     ------------------------------------------------------------------ */
  function navItems() {
    var r = role(), s = S(), items = [["dashboard", "Dashboard", "home"], ["orders", noun() + "s", "list"]];
    if (s.features.board) items.push(["board", "Board", "board"]);
    items.push(["customers", "Customers", "building"]);
    if (W.canAdmin(r)) items.push(["team", "Team", "users"], ["import", "Import", "upload"]);
    return items;
  }
  function renderFrame() {
    var r = role(), s = S(), items = navItems(), view = U.view;
    if (!items.some(function (n) { return n[0] === view; }) && !(view === "settings" && W.canAdmin(r))) view = U.view = "dashboard";
    var b = s.brand || {}, acc = St.access();
    var h = '<div class="frame"><header class="topbar' + (b.logo || s.business.name ? " has-co" : "") + '">' + brandHTML +
      (b.logo || s.business.name ? '<span class="co">' + (b.logo ? '<img src="' + b.logo + '" alt="">' : "") + (s.business.name ? "<span>" + esc(s.business.name) + "</span>" : "") + "</span>" : "") +
      '<span class="top-spacer"></span>' +
      (acc.state === "trial" ? '<button class="pill ' + (acc.days <= 3 ? "pill-warn" : "pill-draft") + '" style="border:0" data-act="nav" data-v="settings">Trial: ' + plural(acc.days, "day") + " left</button>" : "") +
      (W.canEdit(r) ? '<button class="btn btn-primary btn-sm" data-act="new-order" title="New ' + esc(lnoun()) + ' (N)">' + icon("plus") + '<span class="hide-sm">New ' + esc(lnoun()) + "</span></button>" : "") +
      (W.canEdit(r) ? '<button class="btn btn-sm btn-ghost" data-act="preview" title="See what shop staff see on their phones">' + icon("phone") + '<span class="hide-sm">Shop view</span></button>' : "") +
      "</header>";
    h += '<nav class="sidenav" aria-label="Sections">' + items.map(function (n) {
      var badge = n[0] === "orders" ? allOrders().filter(function (o) { return W.isOverdue(o, s, today()); }).length : 0;
      return '<button class="navi' + (view === n[0] ? " on" : "") + '" data-act="nav" data-v="' + n[0] + '">' + icon(n[2]) + esc(n[1]) + (badge ? '<span class="badge" style="background:var(--bad)" title="Overdue">' + badge + "</span>" : "") + "</button>";
    }).join("");
    if (W.canAdmin(r)) h += '<div class="nav-sep"></div><button class="navi' + (view === "settings" ? " on" : "") + '" data-act="nav" data-v="settings">' + icon("settings") + "Settings</button>";
    h += '<div class="nav-foot">' + (St.mode === "local" ? (window.WO_DEMO ? "Demo. Erased when you close this tab." : "Saved in this browser only.") : St.error ? '<span style="color:var(--bad)">' + esc(St.error) + "</span>" : "Live. Changes appear for everyone.") + "</div></nav>";
    h += '<main class="main">' + ({ dashboard: viewDashboard, orders: viewOrders, board: viewBoard, customers: viewCustomers, team: viewTeam, import: viewImport, settings: viewSettings }[view] || viewDashboard)() + "</main></div>";
    return h;
  }

  /* ------------------------------------------------------------------
     Dashboard
     ------------------------------------------------------------------ */
  function viewDashboard() {
    var s = S(), t = today(), list = allOrders(), open = list.filter(function (o) { return !W.isClosed(o, s); });
    var late = open.filter(function (o) { return W.isOverdue(o, s, t); }), soon = open.filter(function (o) { return W.isDueSoon(o, s, t); }), hold = open.filter(function (o) { return W.catOf(s, o.status) === "hold"; });
    var weekAgo = Date.now() - 7 * 864e5, closedWeek = list.filter(function (o) { return W.catOf(s, o.status) === "done" && (o.closedAt || 0) >= weekAgo; }).length;
    var h = '<div class="page-head"><div class="page-title"><h1>' + esc(s.business.name || "Dashboard") + "</h1><p>" + fmtDate(t, true) + " · " + plural(closedWeek, "job") + " finished in the last 7 days</p></div>" +
      (list.some(function (o) { return o.source === "sample"; }) ? '<span class="row" style="gap:8px"><span class="tag-sample">Sample data</span>' + (W.canAdmin(role()) ? '<button class="btn btn-sm" data-act="sample-remove">' + icon("trash") + "Remove sample data</button>" : "") + "</span>" : "") + "</div>";
    if (!list.length) {
      return h + '<div class="card empty"><span class="ico">' + icon("list") + "</span><h3>No " + esc(lnoun()) + "s yet</h3><p>Create your first one, or bring in your spreadsheet.</p><div class=\"row\">" +
        (W.canEdit(role()) ? '<button class="btn btn-primary" data-act="new-order">' + icon("plus") + "New " + esc(lnoun()) + "</button>" : "") +
        (W.canAdmin(role()) ? '<button class="btn" data-act="nav" data-v="import">' + icon("upload") + "Import a spreadsheet</button>" : "") + "</div></div>";
    }
    h += '<div class="kpis">' +
      '<button class="card kpi" data-act="kpi" data-v="active"><b>' + open.length + "</b><span>Open " + esc(lnoun()) + "s</span></button>" +
      '<button class="card kpi' + (late.length ? " bad" : "") + '" data-act="kpi" data-v="overdue"><b>' + late.length + "</b><span>Overdue</span></button>" +
      '<button class="card kpi' + (soon.length ? " warn" : "") + '" data-act="kpi" data-v="soon"><b>' + soon.length + "</b><span>Due in " + plural(s.business.dueSoonDays || 3, "day") + "</span></button>" +
      '<button class="card kpi" data-act="kpi" data-v="hold"><b>' + hold.length + "</b><span>On hold</span></button></div>";
    var attn = late.concat(soon).sort(function (a, b) { return natCmp(a.due, b.due); }).slice(0, 10);
    h += '<div class="dash"><div style="display:grid;gap:16px">';
    h += '<div class="card panel"><h3>' + icon("alert") + "Needs attention<span class=\"spacer\"></span>" + (late.length + soon.length > 10 ? '<button class="btn btn-xs btn-ghost" data-act="kpi" data-v="overdue">See all</button>' : "") + "</h3>" +
      (attn.length ? attn.map(miniRow).join("") : '<p class="muted" style="font-size:13px">Nothing overdue or due soon. Nice.</p>') + "</div>";
    if (hold.length) h += '<div class="card panel"><h3>' + icon("pause") + "On hold</h3>" + hold.slice(0, 8).map(function (o) {
      return '<div class="mini" data-act="open" data-n="' + esc(o.number) + '"><span class="wo-num">' + esc(o.number) + '</span><span class="grow"><b>' + esc(o.customer) + "</b><span>" + esc(stInfo(o.status).name + (o.holdReason && W.norm(o.holdReason) !== W.norm(stInfo(o.status).name) ? ": " + o.holdReason : "")) + "</span></span>" + dueHTML(o) + "</div>";
    }).join("") + "</div>";
    h += "</div><div style=\"display:grid;gap:16px\">";
    var counts = {}; open.forEach(function (o) { counts[o.status] = (counts[o.status] || 0) + 1; });
    var max = Math.max.apply(null, [1].concat(Object.keys(counts).map(function (k) { return counts[k]; })));
    h += '<div class="card panel"><h3>' + icon("columns") + "Open by status</h3>" + s.statuses.filter(function (x) { return x.cat !== "done" && x.cat !== "canceled"; }).map(function (x) {
      var n = counts[x.id] || 0;
      return '<div class="sbar" data-act="kpi-status" data-v="' + x.id + '"><span>' + esc(x.name) + '</span><span class="track"><i style="width:' + (n / max * 100) + "%;background:" + stColor(x.id) + '"></i></span><span class="n">' + n + "</span></div>";
    }).join("") + "</div>";
    h += '<div class="card panel"><h3>' + icon("history") + 'Recent activity</h3><div class="feed">' + (St.data.recent.slice(0, 12).map(function (e) {
      return '<div class="ev" data-act="open" data-n="' + esc(e.order) + '" style="cursor:pointer"><span><b>' + esc(evName(e)) + "</b> " + esc(evSummary(e)) + ' <span class="wo-num">' + esc(e.order) + '</span></span><span class="when">' + ago(e.at) + "</span></div>";
    }).join("") || '<p class="muted" style="font-size:13px">Changes will show up here.</p>') + "</div></div>";
    h += "</div></div>";
    return h;
  }
  function miniRow(o) {
    return '<div class="mini" data-act="open" data-n="' + esc(o.number) + '"><span class="wo-num">' + esc(o.number) + '</span><span class="grow"><b>' + esc(o.customer) + "</b><span>" + esc([o.part, o.qty ? "Qty " + o.qty : "", pname(o.assignee)].filter(Boolean).join(" · ")) + "</span></span>" + stPill(o.status) + '<span style="min-width:96px;text-align:right">' + '<span class="due ' + W.urgency(o, S(), today()) + '">' + esc(relDue(o)) + "</span></span></div>";
  }
  // who did it: the person's current name (sample entries keep their made-up names)
  function evName(e) { return (!e.sample && e.pid && pname(e.pid)) || e.byName || "Someone"; }
  function evSummary(e) {
    if (e.type === "created") return "created";
    if (e.type === "note") return "added a note to";
    if (e.type === "import") return (e.changes && e.changes.length ? "updated from a spreadsheet" : "imported");
    if (e.type === "file") return "added a file to";
    var st = (e.changes || []).find(function (c) { return c[0] === "status"; });
    if (st) return "moved to " + stInfo(st[2]).name + ":";
    var due = (e.changes || []).find(function (c) { return c[0] === "due"; });
    if (due) return "changed the due date of";
    return "edited";
  }

  /* ------------------------------------------------------------------
     Work orders: the list
     ------------------------------------------------------------------ */
  var COLS = {
    number: ["Work order #", function (o) { return '<span class="wo-num">' + esc(o.number) + "</span>"; }, function (o) { return o.number; }],
    customer: ["Customer", function (o) { return '<span class="name-cell">' + esc(o.customer) + "</span>"; }, function (o) { return o.customer; }],
    po: ["Customer PO", function (o) { return esc(o.po); }, function (o) { return o.po; }],
    part: ["Part", function (o) { return esc(o.part) + (o.rev ? ' <span class="faint">rev ' + esc(o.rev) + "</span>" : ""); }, function (o) { return o.part; }],
    qty: ["Qty", function (o) { return '<span class="tnum">' + esc(o.qty) + "</span>"; }, function (o) { return +o.qty || 0; }],
    title: ["Description", function (o) { return '<span title="' + esc(o.title) + '">' + esc(o.title) + "</span>"; }, function (o) { return o.title; }],
    received: ["Received", function (o) { return '<span class="tnum">' + fmtDate(o.received) + "</span>"; }, function (o) { return o.received || ""; }],
    due: ["Due", function (o) { return dueHTML(o); }, function (o) { return o.due || "9999"; }],
    assignee: ["Assigned", function (o) { return o.assignee ? '<span class="who">' + avatar(o.assignee, 22) + esc(pname(o.assignee)) + "</span>" : '<span class="faint">—</span>'; }, function (o) { return pname(o.assignee) || "~"; }],
    priority: ["Priority", function (o) { return prioHTML(o.priority); }, function (o) { return { rush: 0, high: 1 }[o.priority] != null ? { rush: 0, high: 1 }[o.priority] : 2; }],
    status: ["Status", function (o) { return stPill(o.status) + (o.holdReason && W.catOf(S(), o.status) === "hold" ? ' <span class="faint" style="font-size:12px" title="' + esc(o.holdReason) + '">' + icon("info") + "</span>" : ""); }, function (o) { return S().statuses.findIndex(function (x) { return x.id === o.status; }); }],
    updated: ["Updated", function (o) { return '<span class="faint">' + ago(o.updatedAt) + "</span>"; }, function (o) { return -(o.updatedAt || 0); }]
  };
  function colDef(k) {
    if (COLS[k]) return COLS[k];
    if (k.indexOf("c:") === 0) {
      var f = (S().fields || []).find(function (x) { return x.id === k.slice(2); });
      if (!f) return null;
      return [f.label, function (o) { return esc((o.custom || {})[f.id]); }, function (o) { return (o.custom || {})[f.id] || ""; }];
    }
    return null;
  }
  // lower case without accents, so "cafe" finds "Café"
  function fold(s) { s = String(s == null ? "" : s).toLowerCase(); try { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { return s; } }
  function matches(o, q) {
    if (!q) return true;
    var hay = fold([o.number, o.customer, o.po, o.part, o.rev, o.title, o.notes, pname(o.assignee), stInfo(o.status).name, o.holdReason].concat(Object.keys(o.custom || {}).map(function (k) { return o.custom[k]; })).concat((o.items || []).map(function (it) { return it.part; })).join(" "));
    return fold(q).split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function filtered() {
    var s = S(), t = today(), f = U.f;
    return allOrders().filter(function (o) {
      var c = W.catOf(s, o.status);
      if (f.status) { if (o.status !== f.status) return false; }
      else if (f.cat === "active" && (c === "done" || c === "canceled")) return false;
      else if (["open", "hold", "done", "canceled"].indexOf(f.cat) >= 0 && c !== f.cat) return false;
      else if (f.cat === "working" && c !== "active") return false;
      else if (f.cat === "overdue" && !W.isOverdue(o, s, t)) return false;
      else if (f.cat === "soon" && !W.isDueSoon(o, s, t)) return false;
      if (f.who === "none" && o.assignee) return false;
      if (f.who === "me" && o.assignee !== St.me) return false;
      if (f.who && f.who !== "none" && f.who !== "me" && o.assignee !== f.who) return false;
      if (f.cust && W.norm(o.customer) !== W.norm(f.cust)) return false;
      if (f.src && o.source !== f.src) return false;
      return matches(o, U.q);
    }).sort(function (a, b) {
      var def = colDef(U.sort.k) || COLS.due, x = def[2](a), y = def[2](b);
      var r = typeof x === "number" && typeof y === "number" ? x - y : natCmp(x, y);
      return (r || natCmp(a.number, b.number)) * U.sort.dir;
    });
  }
  function filterBar(withCols) {
    var f = U.f, s = S(), custs = {}, cats = [["active", "All open"], ["overdue", "Overdue"], ["soon", "Due soon"], ["open", "Not started"], ["working", "Working"], ["hold", "On hold"], ["done", "Done"], ["all", "Everything"]];
    allOrders().forEach(function (o) { if (o.customer) custs[o.customer] = 1; });
    return '<div class="flt"><label class="search">' + icon("search") + '<input class="input" id="q" type="search" placeholder="Search number, customer, part, PO, notes…" value="' + esc(U.q) + '" autocomplete="off"></label>' +
      sel('data-change="f-cat" aria-label="Which orders"', cats.concat(s.statuses.map(function (x) { return ["s:" + x.id, "Status: " + x.name]; })), f.status ? "s:" + f.status : f.cat) +
      sel('data-change="f-who" aria-label="Assigned to"', [["", "Anyone"], ["me", "Assigned to me"], ["none", "Unassigned"]].concat(peopleOpts().slice(1)), f.who) +
      sel('data-change="f-cust" aria-label="Customer"', [["", "All customers"]].concat(Object.keys(custs).sort(natCmp).map(function (c) { return [c, c]; })), f.cust) +
      (f.src ? '<button class="chip chip-toggle on" data-act="f-clear-src">Imported only ' + icon("x", "x") + "</button>" : "") +
      '<span class="spacer"></span>' + (withCols ? '<button class="btn btn-sm btn-ghost" data-act="cols">' + icon("columns") + "Columns</button>" : "") +
      '<button class="btn btn-sm btn-ghost" data-act="export-csv" title="Download these orders as a spreadsheet">' + icon("download") + "Export</button></div>";
  }
  function viewOrders() {
    var list = filtered(), r = role(), edit = W.canEdit(r), cols = U.cols.filter(colDef);
    var h = '<div class="page-head"><div class="page-title"><h1>' + esc(noun()) + 's</h1><p>' + plural(list.length, lnoun()) + (U.q ? ' matching "' + esc(U.q) + '"' : "") + ' · press <kbd>/</kbd> to search' + (edit ? ", <kbd>N</kbd> for new" : "") + "</p></div></div>";
    h += filterBar(true);
    if (!list.length) return h + '<div class="card empty"><span class="ico">' + icon("search") + "</span><h3>Nothing here</h3><p>No " + esc(lnoun()) + "s match these filters.</p><button class=\"btn\" data-act=\"f-reset\">Clear filters</button></div>";
    var shown = list.slice(0, U.showN), allSel = shown.every(function (o) { return U.sel[o.number]; });
    if (window.innerWidth < 640) {
      return h + '<div class="cards">' + shown.map(function (o) { return floorCard(o).replace('data-act="floor-open"', 'data-act="open"'); }).join("") + "</div>" + (list.length > shown.length ? '<div class="more-row"><button class="btn btn-sm" data-act="show-more">Show more</button></div>' : "");
    }
    h += '<div class="card table-card"><div class="tbl-scroll"><table class="tbl"><thead><tr>' + (edit ? '<th style="width:34px"><input type="checkbox" data-change="sel-all" aria-label="Select all"' + (allSel ? " checked" : "") + "></th>" : "") +
      cols.map(function (k) { var d = colDef(k); return '<th class="sortable" data-act="sort" data-v="' + esc(k) + '">' + esc(d[0]) + (U.sort.k === k ? '<span class="arr">' + (U.sort.dir > 0 ? "▲" : "▼") + "</span>" : "") + "</th>"; }).join("") + "</tr></thead><tbody>";
    shown.forEach(function (o) {
      var late = W.isOverdue(o, S(), today());
      h += '<tr class="click' + (U.sel[o.number] ? " sel" : "") + (late ? " late" : "") + '" data-act="open" data-n="' + esc(o.number) + '">' + (edit ? '<td data-stop="1"><input type="checkbox" data-change="sel" data-n="' + esc(o.number) + '"' + (U.sel[o.number] ? " checked" : "") + ' aria-label="Select ' + esc(o.number) + '"></td>' : "") +
        cols.map(function (k) { return "<td" + (k === "title" ? ' class="cell-desc"' : "") + ">" + colDef(k)[1](o) + "</td>"; }).join("") + "</tr>";
    });
    h += "</tbody></table></div>" + (list.length > shown.length ? '<div class="more-row"><button class="btn btn-sm" data-act="show-more">Show ' + Math.min(150, list.length - shown.length) + " more (" + (list.length - shown.length) + " hidden)</button></div>" : "") + "</div>";
    var nSel = Object.keys(U.sel).filter(function (k) { return U.sel[k] && ord(k); }).length;
    if (nSel && edit) {
      h += '<div class="bulk"><b>' + nSel + " selected</b>" + sel('data-change="bulk-status" aria-label="Move to status"', [["", "Move to…"]].concat(statusOpts()), "", { sm: true }) +
        sel('data-change="bulk-assign" aria-label="Assign to"', [["", "Assign to…"], ["__none", "Unassigned"]].concat(peopleOpts().slice(1)), "", { sm: true }) +
        '<button class="btn btn-sm" data-act="export-sel">' + icon("download") + "Export</button>" + (S().features.travelers ? '<button class="btn btn-sm" data-act="print-sel">' + icon("printer") + "Print travelers</button>" : "") +
        (W.canAdmin(role()) ? '<button class="btn btn-sm" style="color:var(--bad)" data-act="sel-del">' + icon("trash") + "Delete</button>" : "") +
        '<span class="spacer" style="flex:1"></span><button class="btn btn-sm" data-act="sel-none">Clear</button></div>';
    }
    return h;
  }

  /* ------------------------------------------------------------------
     Board (whiteboard view)
     ------------------------------------------------------------------ */
  function viewBoard() {
    var s = S(), list = filtered(), r = role();
    var h = '<div class="page-head"><div class="page-title"><h1>Board</h1><p>' + (W.canWork(r) ? "Drag a card to another column to change its status." : "Every open job, by status.") + "</p></div></div>" + filterBar(false);
    var cols = s.statuses.filter(function (x) { return x.cat !== "canceled"; });
    h += '<div class="board">' + cols.map(function (st) {
      var items = list.filter(function (o) { return o.status === st.id; }), done = st.cat === "done", shown = done ? items.slice(0, 12) : items;
      return '<div class="bcol" data-col="' + st.id + '"><div class="bcol-head"><span style="width:10px;height:10px;border-radius:50%;background:' + stColor(st.id) + '"></span>' + esc(st.name) + '<span class="n">' + items.length + "</span></div>" +
        shown.map(function (o) {
          return '<div class="bcard" draggable="' + (W.canWork(r) ? "true" : "false") + '" data-drag="' + esc(o.number) + '" data-act="open" data-n="' + esc(o.number) + '"><div class="top"><span class="wo-num">' + esc(o.number) + "</span>" + prioHTML(o.priority) + dueHTML(o) + '</div><b style="font-size:13px">' + esc(o.customer) + '</b><span class="sub">' + esc([o.part, o.qty ? "Qty " + o.qty : ""].filter(Boolean).join(" · ")) + "</span>" + (o.assignee ? '<span class="who-sm">' + esc(pname(o.assignee)) + "</span>" : "") + (o.holdReason && st.cat === "hold" ? '<span class="sub" style="color:var(--warn-ink)">' + esc(o.holdReason) + "</span>" : "") + "</div>";
        }).join("") + (done && items.length > shown.length ? '<button class="btn btn-xs btn-ghost" data-act="kpi-status" data-v="' + st.id + '">+' + (items.length - shown.length) + " more</button>" : "") + "</div>";
    }).join("") + "</div>";
    if (U.f.cat === "active") h += '<p class="faint" style="font-size:12.5px;margin-top:8px">Done jobs are hidden by the "All open" filter. Choose "Everything" to see them.</p>';
    return h;
  }

  /* ------------------------------------------------------------------
     Order drawer: details, files, history
     ------------------------------------------------------------------ */
  var histUnsub = null;
  function openOrder(number, tab) {
    var o = ord(number); if (!o) { toast("That " + lnoun() + " isn't here anymore."); return; }
    closeDrawer();
    var base0 = clone(o), draft0 = clone(o);
    if (S().features.items && !(o.items && o.items.length) && (o.part || o.qty)) { var seed = [{ part: o.part || "", rev: o.rev || "", qty: o.qty || "" }]; base0.items = clone(seed); draft0.items = clone(seed); } // orders made before "several parts" was turned on
    U.drawer = { type: "order", number: o.number, tab: tab || "details", base: base0, draft: draft0, errors: {}, reason: "", history: null, merged: false };
    histUnsub = St.history(o.number, function (list) { if (U.drawer && U.drawer.number === o.number) { U.drawer.history = list; render(); } });
    if (location.hash !== "#wo/" + o.number) history.replaceState(null, "", "#wo/" + encodeURIComponent(o.number));
  }
  function closeDrawer() {
    if (histUnsub) { try { histUnsub(); } catch (e) { } histUnsub = null; }
    U.drawer = null;
    if (/^#wo\//.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  }
  function dirtyChanges() { var dr = U.drawer; return dr && dr.type === "order" ? W.diff(dr.base, dr.draft).filter(function (c) { return c[0] !== "files"; }) : []; }
  // live updates: if someone else changed the open order, refresh it (or note it if I'm mid-edit)
  function syncDrawer() {
    var dr = U.drawer; if (!dr || dr.type !== "order") return;
    var cur = ord(dr.number); if (!cur) return;
    if ((cur.ver || 0) !== (dr.base.ver || 0)) {
      if (!dirtyChanges().length) { dr.base = clone(cur); dr.draft = clone(cur); dr.merged = false; }
      else dr.merged = true;
    }
  }
  function field(label, key, inner, opts) {
    opts = opts || {};
    var e = U.drawer && U.drawer.errors ? U.drawer.errors[key] : (U.modal && U.modal.errors ? U.modal.errors[key] : null);
    return '<label class="field ' + (opts.cls || "c2") + (e ? " err" : "") + (opts.locked ? " locked" : "") + '"><span>' + esc(label) + (opts.locked ? " " + icon("lock") : "") + "</span>" + inner + (e ? '<span class="msg">' + esc(e) + "</span>" : opts.hint ? '<span class="hint">' + esc(opts.hint) + "</span>" : "") + "</label>";
  }
  function orderForm(o, scope, r) {
    var s = S(), can = function (k) { return scope === "new" ? true : W.canEditField(r, k); };
    var inp = function (k, type, extra) { return '<input class="input" data-f="' + k + '" data-scope="' + scope + '" type="' + (type || "text") + '" value="' + esc(o[k] == null ? "" : o[k]) + '"' + (can(k) ? "" : " disabled") + (extra || "") + ">"; };
    var custList = '<datalist id="custlist">' + Object.keys(St.data.customers).map(function (id) { return '<option value="' + esc(St.data.customers[id].name) + '">'; }).join("") + "</datalist>";
    var h = '<div class="form-grid">' +
      field("Customer", "customer", inp("customer", "text", ' list="custlist" autocomplete="off"'), { cls: "c3", locked: !can("customer") }) +
      field("Customer PO", "po", inp("po"), { cls: "c3", locked: !can("po") });
    if (!s.features.items) {
      h += field("Part number", "part", inp("part"), { cls: "c2", locked: !can("part") }) + field("Rev", "rev", inp("rev"), { cls: "c1 half", locked: !can("rev") }) +
        field("Quantity", "qty", inp("qty", "number", ' min="1" step="1" inputmode="numeric"'), { cls: "c1 half", locked: !can("qty") });
    }
    h += '<div class="field c2"><span>Priority</span><div class="seg">' + W.PRIORITIES.map(function (p) { return '<button type="button" class="' + ((o.priority || "normal") === p[0] ? "on" : "") + '" data-act="set-prio" data-scope="' + scope + '" data-v="' + p[0] + '"' + (can("priority") ? "" : " disabled") + ">" + p[1] + "</button>"; }).join("") + "</div></div>";
    h += field("Description", "title", inp("title", "text", ' placeholder="What is being made or fixed"'), { cls: "c6", locked: !can("title") });
    if (s.features.items) {
      var items = o.items && o.items.length ? o.items : [{ part: "", rev: "", qty: "" }], e = (U.drawer && U.drawer.errors && U.drawer.errors.items) || (U.modal && U.modal.errors && U.modal.errors.items);
      h += '<div class="field c6' + (e ? " err" : "") + '"><span>Parts' + (can("items") ? "" : " " + icon("lock")) + '</span><table class="items-tbl"><thead><tr><th>Part number</th><th style="width:80px">Rev</th><th style="width:100px">Qty</th><th style="width:36px"></th></tr></thead><tbody>' +
        items.map(function (it, i) {
          var dis = can("items") ? "" : " disabled";
          return '<tr><td><input class="input" data-item="' + i + '" data-k="part" data-scope="' + scope + '" value="' + esc(it.part) + '"' + dis + '></td><td><input class="input" data-item="' + i + '" data-k="rev" data-scope="' + scope + '" value="' + esc(it.rev) + '"' + dis + '></td><td><input class="input" type="number" min="1" data-item="' + i + '" data-k="qty" data-scope="' + scope + '" value="' + esc(it.qty) + '"' + dis + "></td><td>" +
            (can("items") && items.length > 1 ? '<button type="button" class="btn btn-icon btn-ghost btn-sm" data-act="item-del" data-scope="' + scope + '" data-i="' + i + '" aria-label="Remove part">' + icon("x") + "</button>" : "") + "</td></tr>";
        }).join("") + "</tbody></table>" + (can("items") ? '<div><button type="button" class="btn btn-xs" data-act="item-add" data-scope="' + scope + '">' + icon("plus") + "Add a part</button></div>" : "") + (e ? '<span class="msg">' + esc(e) + "</span>" : "") + "</div>";
    }
    h += field("Received", "received", inp("received", "date"), { cls: "c2", locked: !can("received") }) +
      field("Due", "due", inp("due", "date"), { cls: "c2", locked: !can("due") }) +
      field("Assigned to", "assignee", sel('data-f="assignee" data-scope="' + scope + '"', peopleOpts(), o.assignee || "", { disabled: !can("assignee") }), { cls: "c2", locked: !can("assignee") });
    if (scope === "new") h += field("Status", "status", sel('data-f="status" data-scope="new"', statusOpts(), o.status), { cls: "c2" });
    if (W.catOf(s, o.status) === "hold") h += field("Why is it on hold?", "holdReason", inp("holdReason", "text", ' placeholder="e.g. Waiting on bar stock"'), { cls: "c6", locked: !can("holdReason") });
    if (s.features.fields) (s.fields || []).forEach(function (f) {
      var v = (o.custom || {})[f.id], k = "custom." + f.id, dis = can("custom") ? "" : " disabled", inner;
      if (f.type === "select") inner = sel('data-f="' + k + '" data-scope="' + scope + '"', [["", "—"]].concat((f.options || []).map(function (x) { return [x, x]; })), v || "", { disabled: !can("custom") });
      else inner = '<input class="input" data-f="' + k + '" data-scope="' + scope + '" type="' + (f.type === "number" ? "number" : f.type === "date" ? "date" : "text") + '" value="' + esc(v == null ? "" : v) + '"' + dis + ">";
      h += field(f.label + (f.required ? " *" : ""), k, inner, { cls: "c2", locked: !can("custom") });
    });
    h += '<label class="field c6' + (can("notes") ? "" : " locked") + '"><span>Instructions / notes' + (can("notes") ? "" : " " + icon("lock")) + '</span><textarea class="input" rows="3" data-f="notes" data-scope="' + scope + '"' + (can("notes") ? "" : " disabled") + ">" + esc(o.notes || "") + "</textarea></label>";
    return h + "</div>" + custList;
  }
  function renderOrderDrawer() {
    var dr = U.drawer, o = ord(dr.number), s = S(), r = role();
    if (!o) return '<div class="drawer-body"><p>This ' + esc(lnoun()) + " isn't here anymore.</p></div>";
    var ch = dirtyChanges(), next = W.nextStatuses(s, o.status, r).filter(function (x) { return x.ok || x.warn; });
    var h = '<div class="drawer-head"><div class="wo-title"><div class="row"><span class="big-num">' + esc(o.number) + "</span>" + stPill(o.status) + prioHTML(o.priority) + (o.source === "sample" ? '<span class="tag-sample">Sample</span>' : "") + '</div><span class="muted" style="font-size:13px">' + esc(o.customer) + " · " + '<span class="due ' + W.urgency(o, s, today()) + '">' + esc(relDue(o)) + "</span>" + (o.assignee ? " · " + esc(pname(o.assignee)) : "") + "</span></div>" +
      (s.features.travelers ? '<button class="btn btn-sm btn-ghost" data-act="print" data-n="' + esc(o.number) + '" title="Print traveler">' + icon("printer") + "</button>" : "") +
      '<button class="btn btn-icon btn-ghost" data-act="close" aria-label="Close">' + icon("x") + "</button></div>";
    h += '<div class="drawer-body">';
    if (W.canWork(r) && next.length) {
      h += '<div class="status-row"><span class="lbl">Move to</span>' + next.map(function (x) {
        return '<button class="btn btn-sm' + (x.warn && x.ok ? " warnish" : "") + (x.inFlow && x.ok && !x.warn ? " btn-soft" : "") + '" data-act="move" data-v="' + x.id + '"' + (x.ok ? "" : " disabled") + (x.warn ? ' title="' + esc(x.warn) + '"' : "") + ">" + esc(x.name) + "</button>";
      }).join("") + "</div>";
    }
    var nFiles = (o.files || []).filter(function (f) { return f.current !== false; }).length;
    h += '<div class="tabs"><button class="' + (dr.tab === "details" ? "on" : "") + '" data-act="tab" data-v="details">Details</button>' +
      (s.features.files ? '<button class="' + (dr.tab === "files" ? "on" : "") + '" data-act="tab" data-v="files">Files<span class="n">' + nFiles + "</span></button>" : "") +
      '<button class="' + (dr.tab === "history" ? "on" : "") + '" data-act="tab" data-v="history">History<span class="n">' + (dr.history ? dr.history.length : "") + "</span></button></div>";
    if (dr.tab === "details") {
      if (dr.merged) h += '<div class="merge-note">' + icon("info") + "<span>Someone else just changed this " + esc(lnoun()) + ". Your edits will be combined with theirs when you save.</span></div>";
      h += orderForm(dr.draft, "edit", r);
      if (s.features.reasons && ch.some(function (c) { return c[0] === "due"; })) {
        h += '<div class="reason-box' + (dr.errors.reason ? " err" : "") + '"><b>' + icon("clock") + " Why did the due date change?</b><input class=\"input\" id=\"reason\" placeholder=\"e.g. Customer moved the ship date\" value=\"" + esc(dr.reason) + '">' + (dr.errors.reason ? '<span class="msg" style="color:var(--bad);font-size:12px;font-weight:600">' + esc(dr.errors.reason) + "</span>" : "") + "</div>";
      }
      h += '<div class="faint" style="font-size:12px">Created ' + fullTime(o.createdAt) + (o.createdByName ? " by " + esc(o.createdByName) : "") + (o.source === "import" ? " (imported)" : "") + (o.closedAt ? " · Closed " + fullTime(o.closedAt) : "") + "</div>" +
        (W.canAdmin(r) ? '<div style="margin-top:14px"><button class="btn btn-sm btn-ghost" style="color:var(--bad)" data-act="order-del">' + icon("trash") + "Delete this " + esc(lnoun()) + "</button></div>" : "");
    } else if (dr.tab === "files") h += renderFiles(o, r);
    else h += renderHistory(dr.history, r, o);
    h += "</div>";
    if (dr.tab === "details" && W.canWork(r) && ch.length) {
      h += '<div class="savebar"><span class="chg">' + plural(ch.length, "change") + ": " + esc(ch.map(function (c) { return fieldLabel(c[0]); }).join(", ")) + '</span><span class="spacer"></span><button class="btn btn-sm" data-act="discard">Discard</button><button class="btn btn-sm btn-primary" data-act="save-order"' + (dr.saving ? " disabled" : "") + ">" + icon("check") + (dr.saving ? "Saving…" : "Save") + "</button></div>";
    }
    return h;
  }
  function fieldLabel(k) { if (k.indexOf("custom.") === 0) { var f = (S().fields || []).find(function (x) { return x.id === k.slice(7); }); return f ? f.label : "Extra field"; } return W.FIELD_LABEL[k] || k; }
  function showVal(k, v) {
    if (v == null || v === "") return "(blank)";
    if (k === "status") return stInfo(v).name;
    if (k === "assignee") return pname(v) || "(removed person)";
    if (k === "due" || k === "received") return fmtDate(v);
    if (k === "priority") return { normal: "Normal", high: "High", rush: "Rush" }[v] || v;
    if (k === "items") return (v || []).map(function (it) { return it.part + (it.qty ? " × " + it.qty : ""); }).join(", ");
    if (k === "files") return (v || []).filter(function (f) { return f.current !== false; }).map(function (f) { return f.name; }).join(", ") || "(none)";
    return String(v);
  }
  function renderHistory(list, r, o) {
    var h = "";
    if (W.canWork(r)) h += '<div class="note-in"><textarea class="input" id="note-text" rows="2" placeholder="Add a note for the team…"></textarea><button class="btn btn-sm btn-primary" data-act="add-note">' + icon("send") + "Add</button></div>";
    if (!list) return h + '<p class="muted">Loading history…</p>';
    if (!list.length) return h + '<p class="muted">No history yet.</p>';
    h += '<div class="tl">' + list.map(function (e) {
      var ico = { note: "note", status: "flag", created: "plus", import: "upload", file: "file" }[e.type] || "edit", cls = { note: "note", status: "status", import: "import" }[e.type] || "";
      var title = e.type === "created" ? "Created this " + lnoun() : e.type === "note" ? "Note" : e.type === "import" ? (e.changes && e.changes.length ? "Updated from a spreadsheet" : "Imported") : e.type === "file" ? "Files changed" : e.type === "status" ? "Status changed" : "Edited";
      var body = "";
      if (e.changes && e.changes.length) body += '<div class="chg-list">' + e.changes.filter(function (c) { return c[0] !== "files" || e.type === "file"; }).map(function (c) {
        return '<div><span class="fld">' + esc(fieldLabel(c[0])) + ':</span> <span class="old">' + esc(showVal(c[0], c[1])) + '</span> → <span class="new">' + esc(showVal(c[0], c[2])) + "</span></div>";
      }).join("") + "</div>";
      if (e.reason) body += '<div class="why">Why: ' + esc(e.reason) + "</div>";
      if (e.note) body += '<div class="txt">' + esc(e.note) + "</div>";
      return '<div class="tl-item"><span class="tl-ico ' + cls + '">' + icon(ico) + '</span><div class="tl-body"><div><b>' + esc(evName(e)) + "</b> · " + esc(title) + '</div><div class="meta" title="' + esc(fullTime(e.at)) + '">' + esc(fullTime(e.at)) + "</div>" + body + "</div></div>";
    }).join("") + "</div>";
    return h + '<p class="faint" style="font-size:12px;margin-top:10px">' + icon("lock") + " History entries can't be edited or deleted, by anyone.</p>";
  }
  function renderFiles(o, r) {
    var files = o.files || [], cur = files.filter(function (f) { return f.current !== false; }), old = files.filter(function (f) { return f.current === false; });
    var row = function (f) {
      var img = /^image\//.test(f.type || "") && f.url, isLink = f.kind === "link";
      return '<div class="file' + (f.current === false ? " old" : "") + '"><span class="thumb">' + (img ? '<img src="' + esc(f.url) + '" alt="">' : icon(isLink ? "link" : "file")) + '</span><span class="grow"><b>' + esc(f.name) + "</b><span>" + (isLink ? "Link" : fmtSize(f.size)) + " · " + esc(f.byName || "") + " · " + ago(f.at) + "</span></span>" +
        (!isLink ? '<span class="revtag">' + (f.current === false ? "Old " : "") + "v" + (f.revNo || 1) + "</span>" : "") + '<a class="btn btn-sm btn-ghost" href="' + esc(f.url) + '" target="_blank" rel="noopener"' + (isLink ? "" : ' download="' + esc(f.name) + '"') + ">Open</a></div>";
    };
    var h = "";
    if (W.canWork(r)) h += '<div class="row"><label class="btn btn-sm btn-primary">' + icon("upload") + 'Upload a file<input type="file" data-change="upload" hidden></label><label class="btn btn-sm">' + icon("camera") + 'Take a photo<input type="file" accept="image/*" capture="environment" data-change="upload" hidden></label><button class="btn btn-sm" data-act="add-link">' + icon("link") + "Add a link</button></div>" +
      '<p class="faint" style="font-size:12px">Upload a file with the same name as an existing one to add a new revision. Earlier versions stay below.</p>';
    if (!files.length) return h + '<div class="empty" style="padding:28px">No files yet. Drawings, POs, setup sheets and photos go here.</div>';
    h += '<div class="files">' + cur.map(row).join("") + "</div>";
    if (old.length) h += '<details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:13px">' + plural(old.length, "older version") + '</summary><div class="files" style="margin-top:8px">' + old.map(row).join("") + "</div></details>";
    return h;
  }
  function fmtSize(b) { if (!b) return ""; return b < 1024 ? b + " B" : b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB"; }

  /* ---------- saving an order ---------- */
  function saveOrder() {
    var dr = U.drawer, s = S(), o = ord(dr.number), ch = dirtyChanges();
    if (!ch.length) return;
    var errs = W.validate(dr.draft, s);
    // only complain about fields this person changed or can change
    if (!W.canEdit(role())) Object.keys(errs).forEach(function (k) { if (W.STAFF_FIELDS.indexOf(k) < 0) delete errs[k]; });
    if (s.features.reasons && ch.some(function (c) { return c[0] === "due"; }) && !String(dr.reason || "").trim()) errs.reason = "Add a short reason.";
    dr.errors = errs;
    if (Object.keys(errs).length) { render(); toast("Check the highlighted fields."); return; }
    dr.saving = true; render();
    St.updateOrder(dr.number, dr.base, dr.draft, { reason: dr.reason }).then(function (res) {
      dr.saving = false;
      var cur = ord(dr.number); dr.base = clone(cur); dr.draft = clone(cur); dr.reason = ""; dr.merged = false; dr.errors = {};
      toast(res.changes.length ? "Saved. " + plural(res.changes.length, "change") + " recorded in the history." : "Nothing changed.");
      render();
    }).catch(function (e) {
      dr.saving = false;
      if (e && e.conflicts) { U.modal = { type: "conflict", conflicts: e.conflicts, current: e.current, pick: {} }; render(); return; }
      toast(errMsg(e)); render();
    });
  }
  // Move to another status (from the drawer, the board, the floor view or in bulk)
  function moveStatus(number, to, reason, done) {
    var s = S(), o = ord(number); if (!o) return;
    var info = W.nextStatuses(s, o.status, role()).find(function (x) { return x.id === to; });
    if (!info || !info.ok) { toast(info && info.warn ? info.warn + "." : "That move isn't allowed."); return; }
    var target = W.catOf(s, to);
    if (target === "hold" && s.features.reasons && reason == null) { U.modal = { type: "hold", number: number, to: to, text: "" }; render(); return; }
    if (info.warn && reason == null && !U.confirmed) { U.modal = { type: "confirm-move", number: number, to: to, warn: info.warn }; render(); return; }
    U.confirmed = false;
    var nextO = clone(o); nextO.status = to;
    if (target === "hold") nextO.holdReason = reason || o.holdReason || "";
    else nextO.holdReason = "";
    St.updateOrder(number, o, nextO, { reason: target === "hold" ? "" : "" }).then(function () {
      toast(o.number + " → " + stInfo(to).name);
      if (done) done();
    }).catch(function (e) { toast(errMsg(e)); });
  }

  /* ------------------------------------------------------------------
     New order
     ------------------------------------------------------------------ */
  function newOrderModal(prefill) {
    var s = S(), d = Object.assign({ customer: "", po: "", part: "", rev: "", qty: "", title: "", received: today(), due: W.iso(W.addDays(new Date(), 14)), assignee: "", priority: "normal", status: W.firstStatus(s), holdReason: "", notes: "", custom: {}, items: [{ part: "", rev: "", qty: "" }] }, prefill || {});
    U.modal = { type: "new", draft: d, errors: {} };
  }
  function renderNewModal() {
    var m = U.modal, s = S();
    var h = '<div class="modal-head"><h2>New ' + esc(lnoun()) + "</h2><p>Gets the next number when you save: <b class=\"wo-num\">" + esc(nextNumberGuess()) + "</b>" + (St.mode !== "local" ? " (or the one after, if someone saves first)" : "") + ".</p></div>";
    h += '<div class="modal-body">' + orderForm(m.draft, "new", role());
    if (m.dupe) h += '<div class="note note-warn">' + icon("alert") + "<span>This looks like <b>" + esc(m.dupe.number) + "</b> (" + esc(m.dupe.customer) + ", " + esc(m.dupe.part) + ", created " + ago(m.dupe.createdAt) + "). Create it anyway?</span></div>";
    h += '</div><div class="modal-foot"><button class="btn" data-act="close-modal">Cancel</button><button class="btn btn-primary" data-act="create-order"' + (m.saving ? " disabled" : "") + ">" + icon("check") + (m.saving ? "Saving…" : m.dupe ? "Create anyway" : "Create " + esc(lnoun())) + "</button></div>";
    return h;
  }
  function nextNumberGuess() {
    var s = S(), p = W.resolvePrefix(s.numbering, new Date()), max = (s.numbering.start || 1) - 1;
    allOrders().forEach(function (o) { var q = W.seqOf(o.number, p); if (q != null && q > max) max = q; });
    return W.formatNumber(p, max + 1, s.numbering.digits);
  }
  function createOrder() {
    var m = U.modal, s = S(), d = clone(m.draft);
    if (!s.features.items) delete d.items; else W.summarizeItems(d);
    var errs = W.validate(d, s); m.errors = errs;
    if (Object.keys(errs).length) { render(); return; }
    if (!m.dupe && !m.dupeOk) {
      var recent = allOrders().find(function (o) { return !W.isClosed(o, s) && W.norm(o.customer) === W.norm(d.customer) && W.norm(o.part) === W.norm(d.part) && String(o.qty) === String(d.qty) && d.part && (Date.now() - (o.createdAt || 0)) < 14 * 864e5; });
      if (recent) { m.dupe = recent; render(); return; }
    }
    m.saving = true; render();
    St.createOrder(d).then(function (number) {
      U.modal = null; toast("Created " + number + ".");
      if (ord(number)) openOrder(number); else U.pendingOpen = number;
      render();
    }).catch(function (e) { m.saving = false; toast(errMsg(e)); render(); });
  }

  /* ------------------------------------------------------------------
     Customers
     ------------------------------------------------------------------ */
  function viewCustomers() {
    var s = S(), stats = {};
    allOrders().forEach(function (o) { var k = W.norm(o.customer); var x = stats[k] || (stats[k] = { open: 0, total: 0, late: 0 }); x.total++; if (!W.isClosed(o, s)) x.open++; if (W.isOverdue(o, s, today())) x.late++; });
    var list = Object.keys(St.data.customers).map(function (k) { return St.data.customers[k]; }).sort(function (a, b) { return natCmp(a.name, b.name); });
    var h = '<div class="page-head"><div class="page-title"><h1>Customers</h1><p>' + plural(list.length, "customer") + "</p></div>" + (W.canEdit(role()) ? '<button class="btn btn-primary" data-act="cust-new">' + icon("plus") + "Add customer</button>" : "") + "</div>";
    if (!list.length) return h + '<div class="card empty"><span class="ico">' + icon("building") + "</span><h3>No customers yet</h3><p>Customers are added automatically when you create or import " + esc(lnoun()) + "s.</p></div>";
    h += '<div class="card table-card"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Customer</th><th>Contact</th><th>Phone</th><th>Email</th><th>Open</th><th>Overdue</th><th>All time</th></tr></thead><tbody>' +
      list.map(function (c) { var x = stats[W.norm(c.name)] || { open: 0, total: 0, late: 0 }; return '<tr class="click" data-act="cust-open" data-id="' + c.id + '"><td class="name-cell">' + esc(c.name) + "</td><td>" + esc(c.contact) + "</td><td>" + esc(c.phone) + "</td><td>" + esc(c.email) + '</td><td class="tnum">' + x.open + '</td><td class="tnum"' + (x.late ? ' style="color:var(--bad);font-weight:700"' : "") + ">" + x.late + '</td><td class="tnum">' + x.total + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    return h;
  }
  function renderCustomerDrawer() {
    var dr = U.drawer, c = dr.draft, edit = W.canEdit(role()), s = S();
    var orders = allOrders().filter(function (o) { return W.norm(o.customer) === W.norm(dr.origName || c.name); }).sort(function (a, b) { return natCmp(b.number, a.number); });
    var inp = function (k, label, type) { return '<label class="field"><span>' + label + '</span><input class="input" data-cf="' + k + '" type="' + (type || "text") + '" value="' + esc(c[k] || "") + '"' + (edit ? "" : " disabled") + "></label>"; };
    return '<div class="drawer-head"><div style="flex:1"><h2>' + esc(c.name || "New customer") + "</h2><p>" + plural(orders.length, lnoun()) + '</p></div><button class="btn btn-icon btn-ghost" data-act="close" aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="drawer-body"><div class="sec" style="display:grid;gap:12px">' + inp("name", "Name") + '<div class="grid2">' + inp("contact", "Contact person") + inp("phone", "Phone", "tel") + "</div>" + inp("email", "Email", "email") +
      '<label class="field"><span>Notes</span><textarea class="input" rows="2" data-cf="notes"' + (edit ? "" : " disabled") + ">" + esc(c.notes || "") + "</textarea></label>" +
      (dr.origName && c.name !== dr.origName ? '<p class="faint" style="font-size:12px">Past ' + esc(lnoun()) + "s keep the name they were created with.</p>" : "") + "</div>" +
      (orders.length ? '<div class="sec"><h4>' + esc(noun()) + "s</h4>" + orders.slice(0, 40).map(miniRow).join("") + "</div>" : "") + "</div>" +
      (edit ? '<div class="drawer-foot"><button class="btn btn-primary" data-act="cust-save">' + icon("check") + "Save</button></div>" : "");
  }

  /* ------------------------------------------------------------------
     Team
     ------------------------------------------------------------------ */
  function viewTeam() {
    var s = S(), people = Object.keys(St.data.people).map(function (k) { return St.data.people[k]; }).sort(function (a, b) { return (a.role === "owner" ? -1 : 0) - (b.role === "owner" ? -1 : 0) || natCmp(a.name, b.name); });
    var joined = {}; Object.keys(St.data.members || {}).forEach(function (u) { joined[St.data.members[u].pid] = St.data.members[u].email || true; });
    var open = {}; allOrders().forEach(function (o) { if (o.assignee && !W.isClosed(o, s)) open[o.assignee] = (open[o.assignee] || 0) + 1; });
    var h = '<div class="page-head"><div class="page-title"><h1>Team</h1><p>Unlimited team members. ' + (St.mode === "local" ? "Invites work once the app is online." : "Each person gets their own invite link; they open it on their phone, no app to download.") + "</p></div></div>";
    if (!s.features.roles) h += '<div class="note" style="margin-bottom:14px">' + icon("info") + '<span>Roles are off, so everyone who joins can create and edit work orders. <a href="#" data-act="nav" data-v="settings">Turn on roles</a> to limit shop staff to status updates and notes.</span></div>';
    h += '<div class="card table-card"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Name</th>' + (s.features.roles ? "<th>Role</th>" : "") + "<th>Department</th><th>Open jobs</th>" + (St.mode !== "local" ? "<th>App access</th>" : "") + "<th></th></tr></thead><tbody>";
    people.forEach(function (p) {
      var owner = p.role === "owner";
      h += '<tr><td><span class="who">' + avatar(p.id, 28) + '<input class="input input-sm" style="width:180px" data-pf="name" data-id="' + p.id + '" value="' + esc(p.name) + '"></span></td>' +
        (s.features.roles ? "<td>" + (owner ? '<span class="pill pill-accent">Owner</span>' : sel('data-pf="role" data-id="' + p.id + '"', W.ROLES.map(function (r) { return [r[0], r[1]]; }), p.role || "staff", { sm: true })) + "</td>" : "") +
        '<td><input class="input input-sm" style="width:150px" data-pf="dept" data-id="' + p.id + '" value="' + esc(p.dept || "") + '" placeholder="e.g. CNC mill"></td><td class="tnum">' + (open[p.id] || 0) + "</td>" +
        (St.mode !== "local" ? "<td>" + (owner ? '<span class="faint">You</span>' : joined[p.id] ? '<span class="pill pill-live">' + icon("check") + "Joined</span>" : '<button class="btn btn-xs btn-soft" data-act="invite" data-id="' + p.id + '">' + icon("send") + "Invite</button>") + "</td>" : "") +
        "<td>" + (owner ? "" : '<button class="btn btn-icon btn-ghost btn-sm" data-act="person-del" data-id="' + p.id + '" aria-label="Remove ' + esc(p.name) + '">' + icon("trash") + "</button>") + "</td></tr>";
    });
    h += '</tbody></table></div><div style="padding:12px 14px;border-top:1px solid var(--line)" class="row"><input class="input" id="new-person" placeholder="Add a person: type a name, press Enter" data-enter="person-add" style="max-width:320px"><button class="btn btn-sm" data-act="person-add">' + icon("plus") + "Add</button></div></div>";
    if (s.features.roles) h += '<div class="card card-pad" style="margin-top:16px"><h3 style="font-size:14px;margin-bottom:8px">What each role can do</h3><div class="list">' + W.ROLES.map(function (r) { return '<div class="li"><span class="grow"><b>' + r[1] + '</b><span class="muted" style="font-size:12.5px">' + r[2] + "</span></span></div>"; }).join("") +
      '</div><p class="faint" style="font-size:12.5px;margin-top:10px">These limits are enforced by the database, not just hidden buttons.</p></div>';
    return h;
  }

  /* ------------------------------------------------------------------
     Import from a spreadsheet
     ------------------------------------------------------------------ */
  function mapTargets() {
    var ex = (S().fields || []).map(function (f) { return ["f:" + f.id, "Extra field: " + f.label]; });
    return [["ignore", "Don't import"], ["custom", "Add as a new extra field"]].concat(W.FIELDS.map(function (f) { return [f.key, f.label]; })).concat(ex);
  }
  function imp() { return U.imp || (U.imp = { step: "pick" }); }
  function viewImport() {
    var z = imp(), steps = [["pick", "Choose file"], ["map", "Match columns"], ["values", "Check values"], ["review", "Review"], ["done", "Report"]];
    var idx = steps.findIndex(function (s) { return s[0] === z.step; });
    var h = '<div class="page-head"><div class="page-title"><h1>Import a spreadsheet</h1><p>Bring in work orders from Excel, Google Sheets (download as .xlsx or .csv) or any CSV. Nothing is saved until the last step.</p></div>' + (z.step !== "pick" && z.step !== "done" ? '<button class="btn btn-ghost" data-act="imp-restart">' + icon("rotate") + "Start over</button>" : "") + "</div>";
    h += '<div class="imp-head"><div class="imp-steps">' + steps.map(function (s, i) { return '<span class="' + (i === idx ? "on" : i < idx ? "done" : "") + '">' + (i + 1) + ". " + s[1] + "</span>"; }).join("") + "</div></div>";
    if (z.step === "pick") return h + impPick(z);
    if (z.step === "map") return h + impMap(z);
    if (z.step === "values") return h + impValues(z);
    if (z.step === "review") return h + impReview(z);
    return h + impDone(z);
  }
  function impPick(z) {
    return '<div class="drop" id="dropzone"><span class="ico">' + icon("table") + "</span><h3>Drop your spreadsheet here</h3><p class=\"muted\">.xlsx, .xls or .csv. Your columns can be in any order with any names.</p>" +
      '<label class="btn btn-primary">' + icon("upload") + 'Choose a file<input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,text/csv" data-change="imp-file" hidden></label>' + (z.loading ? '<p class="muted">Reading…</p>' : "") + (z.error ? '<div class="note note-warn">' + icon("alert") + "<span>" + esc(z.error) + "</span></div>" : "") + "</div>" +
      '<div class="card card-pad" style="margin-top:16px;display:grid;gap:10px"><b>Or paste rows</b><span class="muted" style="font-size:13px">Select the cells in Excel or Sheets (including the header row), copy, and paste here.</span><textarea class="input" rows="5" id="imp-paste" placeholder="WO#&#9;Customer&#9;Part&#9;Qty&#9;Due…"></textarea><div><button class="btn" data-act="imp-paste">Use pasted rows</button></div></div>' +
      '<div class="row" style="margin-top:14px"><button class="btn btn-sm btn-ghost" data-act="imp-template">' + icon("download") + 'Download a blank template</button><span class="faint" style="font-size:12.5px">Not required. Your own layout works too.</span></div>';
  }
  function readSpreadsheet(file) {
    var z = imp(); z.loading = true; z.error = null; z.fileName = file.name; render();
    var isX = /\.(xlsx|xlsm|xls)$/i.test(file.name);
    if (!isX) {
      var fr = new FileReader();
      fr.onload = function () { z.loading = false; useRows(W.parseCSV(String(fr.result || ""))); };
      fr.onerror = function () { z.loading = false; z.error = "Couldn't read that file."; render(); };
      fr.readAsText(file);
      return;
    }
    if (/\.xls$/i.test(file.name)) { z.loading = false; z.error = "That's an older Excel format (.xls). In Excel, choose File > Save As > Excel Workbook (.xlsx) or CSV, then try again."; render(); return; }
    var fr2 = new FileReader();
    fr2.onload = function () {
      window.WOXlsx.read(fr2.result).then(function (sheets) {
        z.book = {}; sheets.forEach(function (sh) { z.book[sh.name] = sh.rows; });
        z.sheets = sheets.filter(function (sh) { return sh.rows.length; }).map(function (sh) { return sh.name; });
        if (!z.sheets.length) throw new Error("That workbook has no rows.");
        // pick the sheet that looks most like work orders
        var best = z.sheets[0], bs = -1;
        z.sheets.forEach(function (n) { var rows = z.book[n], hr = W.findHeaderRow(rows), m = W.guessMapping(rows[hr] || []), sc = m.filter(function (x) { return x !== "custom"; }).length * 100 + Math.min(rows.length, 99); if (sc > bs) { bs = sc; best = n; } });
        z.sheet = best; z.loading = false; useRows(z.book[best]);
      }).catch(function (e) { console.error(e); z.loading = false; z.error = (e && e.message) || "That file couldn't be read. Try saving it as .csv."; render(); });
    };
    fr2.readAsArrayBuffer(file);
  }
  function useRows(rows) {
    var z = imp();
    if (!rows || rows.length < 2) { z.error = "That file needs a header row and at least one row of data."; z.step = "pick"; render(); return; }
    z.all = rows; z.headerRow = W.findHeaderRow(rows); setupMap(); z.step = "map"; render();
  }
  function setupMap() {
    var z = imp(), hr = z.headerRow; z.headers = (z.all[hr] || []).map(function (x, i) { return String(x || "").trim() || "Column " + (i + 1); });
    var width = Math.max.apply(null, z.all.map(function (r) { return r.length; }));
    while (z.headers.length < width) z.headers.push("Column " + (z.headers.length + 1));
    z.rows = z.all.slice(hr + 1); z.mapping = W.guessMapping(z.headers);
    var fields = S().fields || [];
    z.mapping = z.mapping.map(function (m, i) {
      if (m !== "custom") return m;
      if (!z.rows.some(function (r) { return String(r[i] || "").trim(); })) return "ignore";
      var same = fields.find(function (f) { return W.norm(f.label) === W.norm(z.headers[i]); });   // matches an extra field you already have
      return same ? "f:" + same.id : m;
    });
    z.decisions = { status: {}, people: {}, customers: {}, onExisting: "skip" }; z.fixes = {};
  }
  function impMap(z) {
    var used = {}; z.mapping.forEach(function (m) { if (m !== "custom" && m !== "ignore") used[m] = (used[m] || 0) + 1; });
    var missing = ["customer", "due"].filter(function (k) { return !used[k]; });
    var h = (z.sheets && z.sheets.length > 1 ? '<div class="row" style="margin-bottom:12px"><span class="muted">Sheet</span>' + sel('data-change="imp-sheet"', z.sheets.map(function (n) { return [n, n + " (" + z.book[n].length + " rows)"]; }), z.sheet) + "</div>" : "") +
      '<div class="row" style="margin-bottom:12px"><span class="muted">' + esc(z.fileName || "Pasted rows") + " · " + plural(z.rows.length, "row") + ' · header row</span>' + sel('data-change="imp-header"', z.all.slice(0, 10).map(function (r, i) { return [i, "Row " + (i + 1) + ": " + r.slice(0, 3).join(", ").slice(0, 40)]; }), z.headerRow, { sm: true }) + "</div>";
    h += '<div class="card table-card"><div class="tbl-scroll"><table class="tbl map-tbl"><thead><tr><th>Your column</th><th>Examples</th><th>Goes into</th></tr></thead><tbody>' + z.headers.map(function (hd, i) {
      var ex = z.rows.map(function (r) { return String(r[i] == null ? "" : r[i]).trim(); }).filter(Boolean).slice(0, 3);
      var dup = z.mapping[i] !== "custom" && z.mapping[i] !== "ignore" && used[z.mapping[i]] > 1;
      return "<tr><td><b>" + esc(hd) + '</b></td><td class="samp" title="' + esc(ex.join(" | ")) + '">' + esc(ex.join(" · ") || "(empty)") + "</td><td>" + sel('data-change="imp-map" data-i="' + i + '"', mapTargets(), z.mapping[i], { sm: true }) + (dup ? ' <span class="lvl error">Used twice</span>' : "") + "</td></tr>";
    }).join("") + "</tbody></table></div></div>";
    if (missing.length) h += '<div class="note note-warn" style="margin-top:12px">' + icon("alert") + "<span>No column is matched to <b>" + missing.map(function (k) { return W.FIELD_LABEL[k]; }).join("</b> or <b>") + "</b>. Rows without them can't be imported.</span></div>";
    if (!used.number) h += '<div class="note" style="margin-top:12px">' + icon("info") + "<span>No work order # column, so every row gets a new number (" + esc(nextNumberGuess()) + " onward).</span></div>";
    if (!used.status) h += '<div class="note" style="margin-top:12px">' + icon("info") + "<span>No status column, so every row starts as <b>" + esc(stInfo(W.firstStatus(S())).name) + "</b>. If one of your columns holds the status, pick <b>Status</b> for it above.</span></div>";
    else h += '<div class="note" style="margin-top:12px">' + icon("check") + "<span>Your existing work order numbers will be kept exactly as they are. New orders continue after the highest one.</span></div>";
    var dupAny = Object.keys(used).some(function (k) { return used[k] > 1; });
    return h + '<div class="row" style="margin-top:16px"><span class="spacer" style="flex:1"></span><button class="btn btn-primary" data-act="imp-to-values"' + (dupAny ? " disabled" : "") + ">Continue" + icon("right") + "</button></div>";
  }
  function colOf(z, f) { return z.mapping.indexOf(f); }
  function impValues(z) {
    var s = S(), h = "", c;
    // statuses
    if ((c = colOf(z, "status")) >= 0) {
      var vals = W.distinctValues(z.rows, c);
      h += '<div class="card card-pad" style="margin-bottom:16px"><h3 style="font-size:15px;margin-bottom:4px">Statuses</h3><p class="muted" style="font-size:13px;margin-bottom:12px">Match each status in your sheet to one of yours. Blank means "' + esc(stInfo(W.firstStatus(s)).name) + '".</p><div class="vgroup">' + vals.map(function (v) {
        var cur = z.decisions.status[v.value] !== undefined ? z.decisions.status[v.value] : W.matchStatus(v.value, s).id;
        return '<div class="vrow' + (cur ? "" : " attn") + '"><span class="from">' + esc(v.value || "(blank)") + '</span><span class="arrow">' + icon("right") + "</span>" + sel('data-change="imp-status" data-v="' + esc(v.value) + '"', [["", "Choose a status…"]].concat(statusOpts()), cur || "", { sm: true }) + '<span class="cnt">' + plural(v.count, "row") + "</span></div>";
      }).join("") + "</div></div>";
    }
    // people
    if ((c = colOf(z, "assignee")) >= 0) {
      var pv = W.distinctValues(z.rows, c).filter(function (v) { return v.value; });
      var peopleList = Object.keys(St.data.people).map(function (k) { return St.data.people[k]; });
      h += '<div class="card card-pad" style="margin-bottom:16px"><h3 style="font-size:15px;margin-bottom:4px">Assigned to</h3><p class="muted" style="font-size:13px;margin-bottom:12px">Nothing is added to your team unless you choose to.</p><div class="vgroup">' + pv.map(function (v) {
        var d = z.decisions.people[v.value];
        if (d === undefined) { var best = peopleList.find(function (p) { return W.similarity(p.name, v.value) >= 0.85 || W.norm(p.name.split(" ")[0]) === W.norm(v.value); }); d = z.decisions.people[v.value] = best ? best.id : ""; }
        return '<div class="vrow' + (d ? "" : " attn") + '"><span class="from">' + esc(v.value) + '</span><span class="arrow">' + icon("right") + "</span>" + sel('data-change="imp-person" data-v="' + esc(v.value) + '"', [["", "Leave unassigned"], ["__new", "Add \"" + v.value + "\" to the team"]].concat(peopleList.map(function (p) { return [p.id, p.name]; })), d, { sm: true }) + '<span class="cnt">' + plural(v.count, "row") + "</span></div>";
      }).join("") + "</div></div>";
    }
    // near-duplicate customers
    if ((c = colOf(z, "customer")) >= 0) {
      var names = W.distinctValues(z.rows, c).map(function (v) { return v.value; }).filter(Boolean);
      var known = Object.keys(St.data.customers).map(function (k) { return St.data.customers[k].name; });
      var near = W.nearNames(names, known), keys = Object.keys(near);
      var newOnes = names.filter(function (n) { return !known.some(function (k) { return W.norm(k) === W.norm(n); }); });
      h += '<div class="card card-pad" style="margin-bottom:16px"><h3 style="font-size:15px;margin-bottom:4px">Customers</h3><p class="muted" style="font-size:13px;margin-bottom:12px">' + plural(names.length, "customer") + " in this file, " + newOnes.length + " new." + (keys.length ? " These names look like the same customer spelled differently. Merge them so their orders stay together:" : " No look-alike names found.") + "</p>" +
        (keys.length ? '<div class="vgroup">' + keys.map(function (n) {
          var on = z.decisions.customers[n] === near[n].to;
          return '<label class="vrow attn" style="cursor:pointer"><span class="from">' + esc(n) + '</span><span class="arrow">' + icon("right") + '</span><span><input type="checkbox" data-change="imp-merge" data-v="' + esc(n) + '" data-to="' + esc(near[n].to) + '"' + (on ? " checked" : "") + "> Merge into <b>" + esc(near[n].to) + "</b></span><span class=\"cnt\">" + Math.round(near[n].score * 100) + "% alike</span></label>";
        }).join("") + "</div>" : "") + "</div>";
    }
    // existing numbers
    if ((c = colOf(z, "number")) >= 0) {
      var exist = z.rows.filter(function (r) { var n = String(r[c] || "").trim(); return n && ord(n); }).length;
      if (exist) h += '<div class="card card-pad" style="margin-bottom:16px"><h3 style="font-size:15px;margin-bottom:4px">' + plural(exist, "row") + " already in the app</h3><p class=\"muted\" style=\"font-size:13px;margin-bottom:12px\">These work order numbers exist already. What should happen?</p><div class=\"seg\">" +
        [["skip", "Skip them"], ["update", "Update them from the sheet"]].map(function (o) { return '<button class="' + (z.decisions.onExisting === o[0] ? "on" : "") + '" data-act="imp-existing" data-v="' + o[0] + '">' + o[1] + "</button>"; }).join("") + "</div>" +
        (z.decisions.onExisting === "update" ? '<p class="faint" style="font-size:12.5px;margin-top:8px">Only filled-in cells are used; blanks keep what\'s in the app. Every change is recorded in the history.</p>' : "") + "</div>";
    }
    if (!h) h = '<div class="note">' + icon("check") + "<span>Nothing to check. Continue to review.</span></div>";
    return h + '<div class="row" style="margin-top:4px"><button class="btn btn-ghost" data-act="imp-back" data-v="map">' + icon("left") + 'Back</button><span class="spacer" style="flex:1"></span><button class="btn btn-primary" data-act="imp-to-review">Review rows' + icon("right") + "</button></div>";
  }
  function buildPlan() {
    var z = imp(), s = S(), existing = {};
    Object.keys(St.data.orders).forEach(function (k) { existing[k] = true; });
    var people = {}; Object.keys(z.decisions.people).forEach(function (n) { var v = z.decisions.people[n]; people[n] = v === "__new" ? null : v || null; });
    var rows = z.rows.map(function (r, i) { var f = z.fixes[i]; if (!f) return r; var rr = r.slice(); Object.keys(f).forEach(function (col) { rr[col] = f[col]; }); return rr; });
    z.plan = W.planImport({ rows: rows, headers: z.headers, mapping: z.mapping, settings: s, existing: existing, decisions: { status: z.decisions.status, people: people, customers: z.decisions.customers, onExisting: z.decisions.onExisting }, firstLine: z.headerRow + 2 });
    // people the owner chose to add: keep the name so they can be created and assigned
    var pc = colOf(z, "assignee");
    z.plan.rows.forEach(function (pr, i) { if (pc >= 0) { var n = String(rows[i][pc] || "").trim(); if (n && z.decisions.people[n] === "__new") { pr.personName = n; pr.issues = pr.issues.filter(function (x) { return x.field !== "assignee"; }); } } });
  }
  function impReview(z) {
    buildPlan();
    var p = z.plan, t = p.totals, show = z.showAll ? p.rows : p.rows.filter(function (r) { return r.issues.length; });
    var h = '<div class="rpt" style="margin-bottom:16px"><div class="stat"><b>' + t.create + '</b><span>new work orders</span></div><div class="stat"><b>' + t.update + '</b><span>updates to existing</span></div><div class="stat"><b' + (t.skip ? ' style="color:var(--bad)"' : "") + ">" + t.skip + '</b><span>skipped</span></div><div class="stat"><b' + (t.overdue ? ' style="color:var(--warn)"' : "") + ">" + t.overdue + "</b><span>will show as overdue</span></div></div>";
    h += '<div class="row" style="margin-bottom:10px"><b>' + (z.showAll ? "All rows" : plural(show.length, "row") + " need a look") + '</b><span class="spacer" style="flex:1"></span><div class="seg"><button class="' + (z.showAll ? "" : "on") + '" data-act="imp-show" data-v="0">Problems</button><button class="' + (z.showAll ? "on" : "") + '" data-act="imp-show" data-v="1">All rows</button></div></div>';
    if (!show.length) h += '<div class="note">' + icon("check") + "<span>Every row is ready to import.</span></div>";
    else {
      var fixable = { due: colOf(z, "due"), customer: colOf(z, "customer"), number: colOf(z, "number") };
      h += '<div class="card table-card"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Row</th><th>Work order</th><th>Customer</th><th>Due</th><th>Status</th><th>Will</th><th>Notes</th></tr></thead><tbody>' + show.slice(0, 300).map(function (r) {
        var o = r.order, idx = r.line - z.headerRow - 2;
        var fixes = r.issues.filter(function (x) { return x.level === "error" && fixable[x.field] != null && fixable[x.field] >= 0; }).map(function (x) {
          var col = fixable[x.field], curV = (z.fixes[idx] || {})[col] != null ? z.fixes[idx][col] : (z.rows[idx][col] || "");
          return '<div class="fix"><span class="faint">Fix ' + esc(W.FIELD_LABEL[x.field]) + ':</span><input class="input" data-in="imp-fix" data-row="' + idx + '" data-col="' + col + '" value="' + esc(curV) + '" placeholder="' + (x.field === "due" ? "e.g. 10/23/2026" : "") + '"><button class="btn btn-xs" data-act="imp-apply-fix">Apply</button></div>';
        }).join("");
        return '<tr><td class="tnum">' + r.line + '</td><td><span class="wo-num">' + esc(o.number || "(new number)") + "</span></td><td>" + esc(o.customer) + "</td><td>" + esc(o.due ? fmtDate(o.due) : "") + "</td><td>" + (o.status ? stPill(o.status) : "") + '</td><td><span class="act ' + r.action + '">' + { create: "Create", update: "Update", skip: "Skip" }[r.action] + '</span></td><td style="white-space:normal;min-width:260px"><div class="issues">' +
          r.issues.map(function (x) { return '<div><span class="lvl ' + x.level + '">' + { error: "Problem", warn: "Check", info: "Note" }[x.level] + "</span> " + esc(x.msg) + "</div>"; }).join("") + "</div>" + fixes + "</td></tr>";
      }).join("") + "</tbody></table></div>" + (show.length > 300 ? '<p class="faint" style="padding:10px 14px">Showing the first 300.</p>' : "") + "</div>";
    }
    if (p.customLabels.length) h += '<div class="note" style="margin-top:12px">' + icon("info") + "<span>Extra fields will be added: <b>" + p.customLabels.map(function (c) { return esc(c.label); }).join(", ") + "</b>.</span></div>";
    return h + '<div class="row" style="margin-top:16px"><button class="btn btn-ghost" data-act="imp-back" data-v="values">' + icon("left") + 'Back</button><span class="spacer" style="flex:1"></span><button class="btn btn-primary" data-act="imp-go"' + (t.create + t.update === 0 || z.busy ? " disabled" : "") + ">" + icon("check") + (z.busy ? "Importing…" : "Import " + plural(t.create + t.update, "row")) + "</button></div>";
  }
  function impDone(z) {
    var rep = z.report, p = z.plan, t = p.totals, s = S();
    var inApp = {}; allOrders().forEach(function (o) { var n = stInfo(o.status).name; inApp[n] = (inApp[n] || 0) + 1; });
    var h = '<div class="card card-pad" style="display:grid;gap:16px"><div class="row"><span class="ico" style="width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--ok-soft);color:var(--ok)">' + icon("check") + '</span><div><h2 style="font-size:18px">Import finished</h2><p class="muted">' + esc(z.fileName || "Pasted rows") + " · " + fullTime(z.finishedAt) + "</p></div></div>" +
      '<div class="rpt"><div class="stat"><b>' + t.rows + '</b><span>rows in the file</span></div><div class="stat"><b style="color:var(--ok)">' + rep.created.length + '</b><span>created</span></div><div class="stat"><b>' + rep.updated.length + '</b><span>updated</span></div><div class="stat"><b' + (rep.skipped.length ? ' style="color:var(--bad)"' : "") + ">" + rep.skipped.length + "</b><span>skipped</span></div></div>";
    h += '<div><h3 style="font-size:14px;margin-bottom:6px">Check against your spreadsheet</h3><p class="muted" style="font-size:13px;margin-bottom:8px">Counts by status from the file, next to what\'s now in the app. If a number looks off, the skipped rows below usually explain it.</p><table class="cmp"><thead><tr><th>Status</th><th class="n">Imported from file</th><th class="n">Now in the app (all)</th></tr></thead><tbody>' +
      s.statuses.map(function (x) { return "<tr><td>" + stPill(x.id) + '</td><td class="n">' + (t.byStatus[x.name] || 0) + '</td><td class="n">' + (inApp[x.name] || 0) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    if (rep.skipped.length) h += '<div><h3 style="font-size:14px;margin-bottom:6px">Skipped rows</h3><div class="list">' + rep.skipped.slice(0, 50).map(function (r) { return '<div class="li"><span class="tnum faint" style="width:56px">Row ' + r.line + '</span><span class="grow">' + esc(r.issues.map(function (x) { return x.msg; }).join(" ")) + "</span></div>"; }).join("") + "</div></div>";
    h += '<div class="row"><button class="btn btn-primary" data-act="imp-view">' + icon("list") + "See imported " + esc(lnoun()) + 's</button><button class="btn" data-act="imp-report">' + icon("download") + 'Download this report</button><button class="btn btn-ghost" data-act="imp-restart">Import another file</button></div></div>';
    return h;
  }
  function runImport() {
    var z = imp(), p = z.plan, newPeople = {};
    p.rows.forEach(function (r) { if (r.personName) newPeople[r.personName] = true; });
    z.busy = true; render();
    St.importPlan(p, { fileName: z.fileName, newPeople: newPeople, onProgress: function (done, total) { z.progress = Math.round(done / 2) + " of " + Math.round(total / 2); var b = $("button[data-act=imp-go]"); if (b) b.textContent = "Importing… " + z.progress; } }).then(function (rep) {
      z.busy = false; z.report = rep; z.finishedAt = Date.now(); z.step = "done"; render();
      toast("Imported " + plural(rep.created.length + rep.updated.length, "row") + ".");
    }).catch(function (e) { z.busy = false; console.error(e); toast(errMsg(e).indexOf("Missing or insufficient") >= 0 ? "Some of those numbers were just created by someone else. Refresh and try again." : errMsg(e)); render(); });
  }
  function importReportCSV() {
    var z = imp(), rows = [["Row", "Work order", "Customer", "Due", "Status", "Result", "Notes"]];
    var made = {}; z.report.created.forEach(function (c) { made[c.line] = c.number; }); z.report.updated.forEach(function (c) { made[c.line] = c.number; });
    z.plan.rows.forEach(function (r) { rows.push([r.line, made[r.line] || r.order.number || "", r.order.customer, r.order.due, stInfo(r.order.status).name, r.action === "skip" ? "Skipped" : r.action === "update" ? "Updated" : "Created", r.issues.map(function (x) { return x.msg; }).join(" ")]); });
    download("import-report-" + today() + ".csv", W.toCSV(rows), "text/csv");
  }
  var scripts = {};
  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (scripts[src]) return scripts[src];
    return (scripts[src] = new Promise(function (res, rej) {
      var el = document.createElement("script"); el.src = src; el.async = true;
      el.onload = function () { window[globalName] ? res(window[globalName]) : rej(new Error("missing")); };
      el.onerror = function () { delete scripts[src]; rej(new Error("load failed")); };
      document.head.appendChild(el);
    }));
  }

  /* ------------------------------------------------------------------
     Settings
     ------------------------------------------------------------------ */
  var settingsTimer = null;
  function editSettings(fn, now) {
    var s = clone(S()); fn(s);
    St.data.settings = s;   // show it straight away
    clearTimeout(settingsTimer);
    var go = function () { St.saveSettings(s).catch(function (e) { toast(errMsg(e)); }); };
    if (now) go(); else settingsTimer = setTimeout(go, 500);
  }
  window.addEventListener("pagehide", function () { if (settingsTimer) { clearTimeout(settingsTimer); settingsTimer = null; try { St.saveSettings(St.data.settings); } catch (e) { } } });
  window.addEventListener("beforeunload", function (ev) { if ((U.drawer && U.drawer.type === "order" && dirtyChanges().length) || (U.modal && U.modal.type === "new" && U.modal.draft && (U.modal.draft.customer || U.modal.draft.part))) { ev.preventDefault(); ev.returnValue = ""; } });
  function viewSettings() {
    var s = S(), acc = St.access(), on = W.OPT.filter(function (k) { return s.features[k]; }).length, mode = on === 0 ? "simple" : on === W.OPT.length ? "advanced" : "custom";
    var h = '<div class="page-head"><div class="page-title"><h1>Settings</h1><p>Changes save automatically and apply for everyone.</p></div></div>';
    h += '<div class="set-section"><h2>Shop</h2><div class="card set-list">' +
      '<div class="set-row"><div class="txt"><b>Shop name</b></div><input class="input" style="max-width:300px" data-change="set-name" value="' + esc(s.business.name) + '"></div>' +
      '<div class="set-row"><div class="txt"><b>What you call a job</b><span>Used across the app, e.g. "Work order", "Job" or "Repair order".</span></div><input class="input" style="max-width:220px" data-change="set-noun" value="' + esc(s.business.noun) + '"></div>' +
      '<div class="set-row"><div class="txt"><b>"Due soon" means within</b><span>Jobs due in this many days show up as due soon.</span></div>' + sel('data-change="set-soon" style="width:auto"', [[1, "1 day"], [2, "2 days"], [3, "3 days"], [5, "5 days"], [7, "7 days"], [14, "14 days"]], s.business.dueSoonDays || 3) + "</div></div></div>";
    h += '<div class="set-section"><h2>Mode</h2><div class="card set-list"><div class="set-row"><div class="txt"><b>' + { simple: "Simple", advanced: "Advanced", custom: "Custom" }[mode] + "</b><span>" + (mode === "simple" ? "Just the essentials." : mode === "advanced" ? "Every feature is on." : on + " of " + W.OPT.length + " features on.") + '</span></div><div class="seg"><button class="' + (mode === "simple" ? "on" : "") + '" data-act="set-mode" data-v="simple">Simple</button><button class="' + (mode === "advanced" ? "on" : "") + '" data-act="set-mode" data-v="advanced">Advanced</button></div></div></div></div>';
    h += '<div class="set-section"><h2>Features</h2><div class="card set-list">' + W.FEATURES.map(function (f) {
      return '<div class="set-row"><div class="txt"><b>' + esc(f.name) + "</b><span>" + esc(f.desc) + '</span></div><label class="switch"><input type="checkbox" data-change="set-feat" data-k="' + f.key + '"' + (s.features[f.key] ? " checked" : "") + "><span></span></label></div>";
    }).join("") + (s.features.files && St.mode !== "local" ? '<div class="set-row"><div class="txt"><span>' + icon("info") + " File uploads need Firebase Storage turned on (see the setup guide). Links work without it.</span></div></div>" : "") + "</div></div>";
    if (s.features.roles) h += '<div class="set-section"><h2>Closing jobs</h2><div class="card set-list"><div class="set-row"><div class="txt"><b>Who can move a job to Done or Canceled</b><span>And reopen it afterward.</span></div><div class="seg"><button class="' + (s.closeRole !== "staff" ? "on" : "") + '" data-act="set-close" data-v="manager">Managers</button><button class="' + (s.closeRole === "staff" ? "on" : "") + '" data-act="set-close" data-v="staff">Anyone on the team</button></div></div></div></div>';
    h += '<div class="set-section"><h2>Statuses</h2>' + statusEditor(s, "set") + "</div>";
    if (s.features.flow) {
      h += '<div class="set-section"><h2>Status steps</h2><div class="card card-pad"><p class="muted" style="font-size:13px;margin-bottom:10px">Tick where a job can go next from each status (rows). Shop staff must follow these steps; managers can override with a warning.</p><div class="tbl-scroll"><table class="flow-tbl"><thead><tr><th style="text-align:left">From ↓ / To →</th>' +
        s.statuses.map(function (x) { return '<th class="v">' + esc(x.name) + "</th>"; }).join("") + "</tr></thead><tbody>" + s.statuses.map(function (a) {
          return '<tr><th style="text-align:left">' + esc(a.name) + "</th>" + s.statuses.map(function (b) {
            if (a.id === b.id) return '<td><button class="mx" disabled></button></td>';
            var onF = (s.flow[a.id] || []).indexOf(b.id) >= 0;
            return '<td><button class="mx' + (onF ? " on" : "") + '" data-act="set-flow" data-a="' + a.id + '" data-b="' + b.id + '" aria-label="' + esc(a.name + " to " + b.name) + '">' + (onF ? icon("check") : "") + "</button></td>";
          }).join("") + "</tr>";
        }).join("") + '</tbody></table></div><div class="row" style="margin-top:10px"><button class="btn btn-sm btn-ghost" data-act="set-flow-reset">' + icon("rotate") + "Reset to a simple forward flow</button></div></div></div>";
    }
    h += '<div class="set-section"><h2>Work order numbers</h2><div class="card card-pad">' + numberingEditor(s, "set") + '<p class="faint" style="font-size:12.5px;margin-top:10px">Changing this only affects new orders. Existing numbers never change.</p></div></div>';
    if (s.features.fields) {
      h += '<div class="set-section"><h2>Extra fields</h2><div class="card set-list">' + ((s.fields || []).map(function (f, i) {
        return '<div class="fld-row"><input class="input input-sm" data-change="fld-label" data-i="' + i + '" value="' + esc(f.label) + '">' + sel('data-change="fld-type" data-i="' + i + '"', [["text", "Text"], ["number", "Number"], ["date", "Date"], ["select", "Pick from list"]], f.type, { sm: true }) +
          (f.type === "select" ? '<input class="input input-sm" data-change="fld-opts" data-i="' + i + '" value="' + esc((f.options || []).join(", ")) + '" placeholder="Options, separated by commas">' : "<span></span>") +
          '<label class="row" style="gap:6px;font-size:12.5px;color:var(--muted)"><input type="checkbox" data-change="fld-req" data-i="' + i + '"' + (f.required ? " checked" : "") + ">Required</label>" +
          '<button class="btn btn-icon btn-ghost btn-sm" data-act="fld-del" data-i="' + i + '" aria-label="Remove field">' + icon("trash") + "</button></div>";
      }).join("") || '<div class="set-row"><div class="txt"><span>No extra fields yet.</span></div></div>') + '</div><div class="row" style="margin-top:8px"><button class="btn btn-sm" data-act="fld-add">' + icon("plus") + "Add a field</button></div></div>";
    }
    h += '<div class="set-section"><h2>Look</h2><div class="card card-pad">' + brandingHTML(s) + "</div></div>";
    if (St.mode !== "local") h += planSection(acc);
    h += '<div class="set-section"><h2>Your data</h2><div class="card set-list">' +
      '<div class="set-row"><div class="txt"><b>Download everything</b><span>All ' + esc(lnoun()) + "s, customers, team and the full history, in one file. It's your data; take it any time.</span></div><button class=\"btn btn-sm\" data-act=\"backup\">" + icon("download") + "Download (.json)</button></div>" +
      '<div class="set-row"><div class="txt"><b>Spreadsheet of all ' + esc(lnoun()) + 's</b><span>Opens in Excel or Google Sheets.</span></div><button class="btn btn-sm" data-act="export-all">' + icon("download") + "Download (.csv)</button></div>" +
      '<div class="set-row"><div class="txt"><b>Import a spreadsheet</b><span>Add or update orders from Excel or CSV.</span></div><button class="btn btn-sm" data-act="nav" data-v="import">' + icon("upload") + "Import</button></div>" +
      (St.mode === "local" ? '<div class="set-row"><div class="txt"><b>Start over</b><span>Erase everything saved in this ' + (window.WO_DEMO ? "tab" : "browser") + '.</span></div><button class="btn btn-sm btn-danger" data-act="reset-local">Erase all</button></div>' : "") + "</div></div>";
    if (St.mode !== "local") h += '<div class="set-section"><h2>Account</h2><div class="card set-list"><div class="set-row"><div class="txt"><b>Signed in</b><span>' + esc((St.user && St.user.email) || "") + '</span></div><button class="btn btn-sm" data-act="sign-out">Sign out</button></div></div></div>';
    return h;
  }
  function brandingHTML(s) {
    var b = s.brand || {}, cur = (b.accent || "").toUpperCase();
    return '<div class="row" style="gap:16px;align-items:center"><div class="logo-box">' + (b.logo ? '<img src="' + b.logo + '" alt="Your logo">' : '<span class="faint" style="font-size:12px;text-align:center">Your logo</span>') + '</div><div style="display:grid;gap:8px"><div class="row"><label class="btn btn-sm">' + icon("upload") + (b.logo ? "Replace logo" : "Upload logo") + '<input type="file" accept="image/*" data-change="logo" hidden></label>' + (b.logo ? '<button class="btn btn-sm btn-ghost" data-act="logo-del">Remove</button>' : "") + '</div><span class="faint" style="font-size:12px">Shown at the top of the app, on phones and on printed travelers.</span></div></div>' +
      '<div class="field" style="margin-top:16px"><span>Theme color</span><div class="swatches">' + THEMES.map(function (t) { return '<button class="swatch' + (cur === t[1] ? " on" : "") + '" style="background:' + t[1] + '" data-act="theme" data-v="' + t[1] + '" title="' + t[0] + '" aria-label="' + t[0] + '"></button>'; }).join("") +
      '<label class="swatch swatch-custom' + (THEMES.some(function (t) { return t[1] === cur; }) ? "" : " on") + '" title="Any color"><input type="color" value="' + (b.accent || "#2F6FDE") + '" data-change="theme-custom" aria-label="Pick any color"></label></div>' + (b.logo ? '<div class="row" style="margin-top:4px"><button class="btn btn-sm btn-soft" data-act="theme-logo">' + icon("sparkle") + "Match my logo</button></div>" : "") + "</div>" +
      '<div class="field" style="margin-top:16px"><span>Appearance</span><div class="seg">' + [["light", "Light"], ["dark", "Dark"], ["system", "Match device"]].map(function (m) { return '<button class="' + ((b.mode || "light") === m[0] ? "on" : "") + '" data-act="theme-mode" data-v="' + m[0] + '">' + m[1] + "</button>"; }).join("") + "</div></div>";
  }
  function planCards() {
    var plans = (window.WO_BILLING || {}).plans || [], contact = (window.WO_BILLING || {}).contact || "";
    return '<div class="plans">' + plans.map(function (pl) {
      var url = St.checkoutUrl(pl.url);
      return '<div class="plan"><b>' + esc(pl.label) + '</b><div class="price"><span class="tnum">' + esc(pl.price) + "</span> <small>" + esc(pl.per || "") + "</small></div><p>" + esc(pl.note || "") + "</p>" +
        (url ? '<a class="btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener">Choose ' + esc(pl.label.toLowerCase()) + "</a>" : '<span class="faint" style="font-size:12.5px">Checkout opens soon. Email ' + esc(contact) + " to get started.</span>") + "</div>";
    }).join("") + "</div>";
  }
  function planSection(a) {
    var txt;
    if (a.state === "paid") txt = "<b>" + (a.plan === "monthly" ? "Monthly plan" : "Paid. Thank you!") + "</b><span>" + (a.plan === "monthly" ? "Your subscription is active." : "You own Work Order Manager. Updates to version 1 are included.") + "</span>";
    else if (a.state === "trial") txt = "<b>Free trial: " + plural(a.days, "day") + " left</b><span>Everything works, for your whole team. Choose a plan any time to keep going after the trial.</span>";
    else if (a.state === "legacy") txt = "<b>Early access</b><span>This workspace stays open.</span>";
    else txt = "<b>Trial ended</b><span>Choose a plan to keep making changes.</span>";
    var ai = St.aiAccess(), cfg = aiCfg(), aurl = St.checkoutUrl(cfg.url), arow = "";
    if (St.mode !== "local" && cfg.price) {
      var at = ai.state === "yes" ? "<b>Assistant: on</b><span>Ask about your jobs in plain words.</span>"
        : ai.state === "trial" ? "<b>Assistant: free for " + plural(ai.days, "more day") + "</b><span>After the trial it's " + esc(cfg.price) + " " + esc(cfg.per || "") + ".</span>"
        : "<b>Assistant: " + esc(cfg.price) + " " + esc(cfg.per || "") + "</b><span>" + esc(cfg.note || "") + "</span>";
      arow = '<div class="set-row"><div class="txt">' + at + "</div>" + (ai.state === "needs-addon" && St.role === "owner" ? (aurl ? '<a class="btn btn-sm btn-primary" href="' + esc(aurl) + '" target="_blank" rel="noopener">Add</a>' : '<span class="faint" style="font-size:12.5px">Checkout opens soon</span>') : "") + "</div>";
    }
    return '<div class="set-section"><h2>Plan</h2><div class="card set-list"><div class="set-row"><div class="txt">' + txt + "</div></div>" + (a.state === "paid" || a.state === "legacy" || St.role !== "owner" ? "" : '<div class="set-row" style="display:block">' + planCards() + "</div>") + arow + "</div></div>";
  }
  function renderLock() {
    var owner = St.role === "owner", contact = (window.WO_BILLING || {}).contact || "";
    return '<div class="lock-wrap"><div class="card lock"><h2>' + (owner ? "Your free trial has ended" : "This workspace is paused") + "</h2><p>" + (owner ? "Your work orders, history and files are safe. Choose a plan to keep making changes." : "The free trial ended. Everything is safe; ask the owner to choose a plan.") + "</p>" + (owner ? planCards() : "") +
      '<div class="row" style="margin-top:14px">' + (owner ? '<button class="btn btn-sm" data-act="reload">I\'ve paid, refresh</button><button class="btn btn-sm" data-act="backup">' + icon("download") + "Download my data</button>" : "") + '<span class="spacer" style="flex:1"></span><button class="btn btn-sm btn-ghost" data-act="sign-out">Sign out</button></div>' +
      (owner ? '<p class="faint" style="font-size:12px;margin:10px 0 0">Questions? ' + esc(contact) + "</p>" : "") + "</div></div>";
  }


  /* ------------------------------------------------------------------
     Assistant: a chat that can read the open work orders and propose changes.
     It runs on a Firebase function (the key never reaches the browser).
     Changes are only proposed; the owner presses Apply.
     ------------------------------------------------------------------ */
  var HELPER_EX = ["Which jobs are late?", "Make the late jobs high priority.", "New job for Acme: 50 brackets, due in 2 weeks.", "Add Sam Patel to the team in Welding."];
  function chat() { return U.chat || (U.chat = { msgs: [], busy: false, draft: "", error: "", addon: false }); }
  function aiCfg() { return (window.WO_BILLING || {}).ai || {}; }
  function helperAllowed() { return St.status === "member" && !U.preview && W.canAdmin(St.myRole()); }
  function helperReady() { return St.mode !== "local" && helperAllowed(); }
  function needsAddon() { return chat().addon || St.aiAccess().state === "needs-addon"; }

  function helperContext() {
    var s = S(), t = today(), all = allOrders(), fieldsOn = s.features.fields && (s.fields || []).length ? s.fields : null;
    var open = all.filter(function (o) { return !W.isClosed(o, s); }).sort(function (a, b) { return (a.due || "").localeCompare(b.due || "") || natCmp(a.number, b.number); });
    var closed = all.filter(function (o) { return W.isClosed(o, s); }).sort(function (a, b) { return (b.closedAt || b.updatedAt || 0) - (a.closedAt || a.updatedAt || 0); }).slice(0, 40);
    var rows = open.slice(0, 150).concat(closed).map(function (o) {
      var r = { number: o.number, customer: o.customer, po: o.po || "", part: o.part || "", qty: o.qty === "" ? null : o.qty, title: String(o.title || "").slice(0, 80), due: o.due, received: o.received || "", status: o.status, priority: o.priority || "normal", assignee: o.assignee || "", hold: o.holdReason || "", notes: String(o.notes || "").slice(0, 120) };
      if (fieldsOn && o.custom) { var ex = {}; fieldsOn.forEach(function (f) { if (o.custom[f.id]) ex[f.id] = String(o.custom[f.id]).slice(0, 60); }); if (Object.keys(ex).length) r.extra = ex; }
      return r;
    });
    return {
      today: t, dueSoonDays: s.business.dueSoonDays || 3, noun: lnoun(),
      statuses: (s.statuses || []).map(function (x) { return { id: x.id, name: x.name, kind: x.cat }; }),
      people: Object.keys(St.data.people).map(function (k) { var p = St.data.people[k]; return { id: k, name: p.name, role: p.role || "staff", dept: p.dept || "" }; }),
      customers: Object.keys(St.data.customers).map(function (k) { var c = St.data.customers[k]; return { id: k, name: c.name, contact: c.contact || "", phone: c.phone || "", email: c.email || "" }; }).filter(function (c) { return c.name; }).slice(0, 300),
      fields: fieldsOn ? fieldsOn.map(function (f) { return { id: f.id, label: f.label, type: f.type || "text", options: f.options || undefined }; }) : [],
      orders: rows, truncated: open.length > 150 || all.length - open.length > 40
    };
  }

  var EDIT_LABEL = { customer: "customer", po: "PO", part: "part", rev: "rev", qty: "qty", title: "description", notes: "instructions", received: "received date" };
  function helperDescribe(a) {
    var s = S();
    if (a.type === "create_order") {
      var f = a.fields || {};
      return { ok: true, t: "New " + lnoun() + " for " + f.customer + (f.part ? ": " + (f.qty ? f.qty + " × " : "") + f.part : f.title ? ": " + f.title : "") + ", due " + fmtDate(a.due) + (a.priority && a.priority !== "normal" ? " (" + a.priority + ")" : "") + (a.person ? ", assigned to " + (pname(a.person) || "someone") : "") };
    }
    var INFO = function (f) { return Object.keys(f || {}).map(function (k) { return k + " \u201c" + String(f[k]).slice(0, 40) + "\u201d"; }).join(", "); };
    if (a.type === "add_customer") { var rest = Object.assign({}, a.info); delete rest.name; return { ok: true, t: "Add customer " + a.info.name + (Object.keys(rest).length ? " (" + INFO(rest) + ")" : "") }; }
    if (a.type === "update_customer") { var c = St.data.customers[a.customer]; return c ? { ok: true, t: "Customer " + c.name + ": " + INFO(a.info) } : { ok: false, t: "A customer that isn't here anymore" }; }
    if (a.type === "add_person") return { ok: W.canAdmin(role()), t: "Add " + a.name + " to the team as " + a.role + (a.dept ? " (" + a.dept + ")" : "") };
    if (a.type === "update_person") { var pp = St.data.people[a.person]; return pp ? { ok: W.canAdmin(role()), t: pp.name + ": " + [a.name ? "rename to " + a.name : "", a.dept != null ? "department \u201c" + a.dept + "\u201d" : ""].filter(Boolean).join(", ") } : { ok: false, t: "Someone who isn't on the team" }; }
    var o = ord(a.order);
    if (!o) return { ok: false, t: a.order + " isn't here anymore" };
    if (a.type === "set_field") { var fd = (s.fields || []).find(function (f) { return f.id === a.field; }); return fd ? { ok: String((o.custom || {})[a.field] || "") !== a.value, skip: String((o.custom || {})[a.field] || "") === a.value, t: a.order + ": " + fd.label + " \u201c" + a.value + "\u201d" } : { ok: false, t: "An extra field that isn't set up" }; }
    if (a.type === "delete_order") return { ok: W.canAdmin(role()), del: true, t: "Delete " + a.order + " (" + o.customer + ") for good" };
    if (a.type === "update_fields") {
      var ch = Object.keys(a.fields || {}).filter(function (k) { return String(o[k] == null ? "" : o[k]) !== String(a.fields[k]); });
      if (!ch.length) return { ok: false, skip: true, t: a.order + ": no change" };
      return { ok: true, t: a.order + ": " + ch.map(function (k) { return "set " + EDIT_LABEL[k] + " to \u201c" + String(k === "received" ? fmtDate(a.fields[k]) : a.fields[k]).slice(0, 60) + "\u201d"; }).join(", ") };
    }
    if (a.type === "set_status") {
      var info = W.nextStatuses(s, o.status, role()).find(function (x) { return x.id === a.status; });
      if (!info) return { ok: false, t: a.order + " is already " + stInfo(a.status).name };
      if (!info.ok) return { ok: false, t: "Move " + a.order + " to " + info.name + " (" + (info.warn || "not allowed for you") + ")" };
      return { ok: true, t: "Move " + a.order + " to " + info.name + (info.cat === "hold" ? " (hold: " + (a.reason || "set by the assistant") + ")" : "") };
    }
    if (a.type === "set_priority") return { ok: (o.priority || "normal") !== a.priority, skip: (o.priority || "normal") === a.priority, t: "Make " + a.order + " " + ({ normal: "normal priority", high: "high priority", rush: "RUSH" }[a.priority]) };
    if (a.type === "assign") return { ok: true, t: a.person === "none" ? "Unassign " + a.order : "Assign " + a.order + " to " + (pname(a.person) || "someone") };
    if (a.type === "set_due") return { ok: o.due !== a.due, skip: o.due === a.due, t: "Change " + a.order + " due date to " + fmtDate(a.due) + (a.reason ? " (" + a.reason + ")" : "") };
    if (a.type === "add_note") return { ok: true, t: "Add a note to " + a.order + ": “" + String(a.text).slice(0, 90) + "”" };
    return { ok: false, t: a.type };
  }

  // Apply the approved changes. Changes to the same work order go in together as one history entry.
  function helperApply(actions) {
    var s = S(), by = {}, order = [], notes = [], creates = [], dels = [], side = [], problems = 0, done = 0;
    actions.forEach(function (a) {
      var d = helperDescribe(a); if (!d.ok) { if (!d.skip) problems++; return; }
      if (a.type === "add_note") { notes.push(a); return; }
      if (a.type === "create_order") { creates.push(a); return; }
      if (a.type === "add_customer" || a.type === "update_customer" || a.type === "add_person" || a.type === "update_person") { side.push(a); return; }
      if (a.type === "delete_order") { dels.push(a.order); return; }
      if (!by[a.order]) { by[a.order] = []; order.push(a.order); }
      by[a.order].push(a);
    });
    var chain = Promise.resolve();
    side.forEach(function (a) {
      chain = chain.then(function () {
        var job;
        if (a.type === "add_customer") job = St.saveCustomer(a.info);
        else if (a.type === "update_customer") { var c = St.data.customers[a.customer]; job = St.saveCustomer(Object.assign({ id: a.customer }, { name: c.name, contact: c.contact || "", phone: c.phone || "", email: c.email || "", notes: c.notes || "" }, a.info)); }
        else if (a.type === "add_person") job = St.savePerson({ name: a.name, role: a.role, dept: a.dept || "" });
        else { var p = St.data.people[a.person]; job = St.savePerson({ id: a.person, name: a.name || p.name, role: p.role || "staff", dept: a.dept != null ? a.dept : (p.dept || "") }); } // role is never changed here
        return job.then(function () { done++; }).catch(function () { problems++; });
      });
    });
    order.forEach(function (num) {
      chain = chain.then(function () {
        var o = ord(num); if (!o) { problems++; return; }
        var next = clone(o), reason = "";
        by[num].forEach(function (a) {
          if (a.type === "set_status") { next.status = a.status; next.holdReason = W.catOf(s, a.status) === "hold" ? (a.reason || o.holdReason || "Set by the assistant") : ""; }
          else if (a.type === "set_priority") next.priority = a.priority;
          else if (a.type === "assign") next.assignee = a.person === "none" ? "" : a.person;
          else if (a.type === "set_due") { next.due = a.due; reason = a.reason || "Changed with the assistant"; }
          else if (a.type === "update_fields") Object.keys(a.fields || {}).forEach(function (k) { next[k] = a.fields[k]; });
          else if (a.type === "set_field") { next.custom = Object.assign({}, next.custom || {}); next.custom[a.field] = a.value; }
        });
        if (s.features.items && by[num].some(function (a) { return a.type === "update_fields" && a.fields && (a.fields.part != null || a.fields.qty != null || a.fields.rev != null); })) {
          var it = (next.items && next.items.length ? clone(next.items) : [{ part: o.part || "", rev: o.rev || "", qty: o.qty || "" }]);
          if (it.length === 1) { it[0].part = next.part || ""; it[0].rev = next.rev || ""; it[0].qty = next.qty || ""; next.items = it; }
        }
        if (Object.keys(W.validate(next, s)).length) { problems++; return; }
        return St.updateOrder(num, o, next, { reason: reason, note: "Approved from the assistant" }).then(function () { done++; }).catch(function () { problems++; });
      });
    });
    creates.forEach(function (a) {
      chain = chain.then(function () {
        var f = a.fields || {}, d = { customer: f.customer || "", po: f.po || "", part: f.part || "", rev: f.rev || "", qty: f.qty || "", title: f.title || "", notes: f.notes || "",
          received: f.received || today(), due: a.due, assignee: a.person || "", priority: a.priority || "normal", status: a.status && W.statusById(s, a.status) ? a.status : W.firstStatus(s), holdReason: "", custom: {} };
        if (W.catOf(s, d.status) === "hold") d.holdReason = "Set by the assistant";
        if (s.features.items) d.items = [{ part: d.part, rev: d.rev, qty: d.qty }];
        if (Object.keys(W.validate(d, s)).length) { problems++; return; }
        return St.createOrder(d).then(function () { done++; }).catch(function () { problems++; });
      });
    });
    notes.forEach(function (a) { chain = chain.then(function () { return St.addNote(a.order, a.text).then(function () { done++; }).catch(function () { problems++; }); }); });
    if (dels.length) chain = chain.then(function () { return St.deleteOrders(dels).then(function (n) { done += n; if (U.drawer && dels.indexOf(U.drawer.number) >= 0) closeDrawer(); }).catch(function () { problems += dels.length; }); });
    return chain.then(function () { return { done: done, problems: problems }; });
  }

  function helperSend(text) {
    var c = chat(); text = String(text || "").trim();
    if (!text || c.busy || !helperReady() || needsAddon()) return;
    c.msgs.push({ role: "user", text: text }); c.draft = ""; c.error = ""; c.busy = true;
    render();
    var history = c.msgs.map(function (m) { return { role: m.role, text: m.text }; });
    St.askHelper(history, helperContext()).then(function (r) {
      c.msgs.push({ role: "assistant", text: r.text, actions: (r.actions || []).length ? r.actions : null, state: "open" });
    }).catch(function (e) { c.error = (e && e.message) || "The assistant couldn't answer. Try again."; if (e && e.needAddon) c.addon = true; })
      .then(function () { c.busy = false; render(); });
  }

  function aiAddonCard() {
    var ai = aiCfg(), url = St.checkoutUrl(ai.url), contact = (window.WO_BILLING || {}).contact || "";
    return '<div class="note">' + icon("sparkle") + "<span><b>The assistant is an add-on.</b> It was free during your trial. " + esc(ai.note || "Ask about your jobs in plain words and approve changes with one tap.") + "</span></div>" +
      '<div class="plan"><b>Assistant</b><div class="price"><span class="tnum">' + esc(ai.price || "") + "</span> <small>" + esc(ai.per || "") + "</small></div>" +
      (url ? '<a class="btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener">Add the assistant</a>' : '<span class="faint" style="font-size:12.5px">Checkout opens soon. Email ' + esc(contact) + " to add it.</span>") + "</div>";
  }

  function renderAssistant() {
    if (!helperAllowed()) return "";
    var c = chat(), h = '<button class="helper-fab" data-act="helper">' + icon("sparkle") + "Assistant</button>";
    if (!U.helper) return h;
    h += '<div class="card helper"><div class="row"><b style="flex:1">' + icon("sparkle") + " Assistant</b>" +
      (c.msgs.length ? '<button class="btn btn-sm btn-ghost" data-act="helper-clear">New chat</button>' : "") +
      '<button class="btn btn-icon btn-ghost btn-sm" data-act="helper" aria-label="Close">' + icon("x") + "</button></div>";
    if (St.mode === "local") {
      return h + '<div class="note">' + icon("info") + "<span>The assistant works once your workspace is online (it needs a sign-in). Here's what you'll be able to ask:</span></div>" +
        HELPER_EX.map(function (x) { return '<div class="ex">' + esc(x) + "</div>"; }).join("") + "</div>";
    }
    if (needsAddon()) return h + aiAddonCard() + "</div>";
    h += '<div class="chat" id="chat-log">';
    if (!c.msgs.length) {
      var acc = St.aiAccess();
      h += '<p class="muted" style="font-size:13px;margin:0">Ask about your jobs, or tell me what to change. I\'ll show you a change before anything happens.' + (acc.state === "trial" ? " Free during your trial." : "") + "</p>" +
        HELPER_EX.map(function (x) { return '<button class="ex ex-btn" data-act="helper-ex" data-t="' + esc(x) + '">' + esc(x) + "</button>"; }).join("");
    }
    c.msgs.forEach(function (m, i) {
      h += '<div class="bub ' + (m.role === "user" ? "me" : "ai") + '">' + esc(m.text).replace(/\n/g, "<br>") + "</div>";
      if (m.actions) {
        var d = m.actions.map(helperDescribe), okN = d.filter(function (x) { return x.ok; }).length; if (okN) d = d.filter(function (x) { return x.ok; });
        h += '<div class="prop"><b>' + (m.state === "done" ? "Applied" : m.state === "no" ? "Dismissed" : "Proposed changes") + "</b><ul>" +
          d.map(function (x) { return "<li" + (x.ok ? (x.del ? ' style="color:var(--bad)"' : "") : ' class="bad"') + ">" + esc(x.t) + "</li>"; }).join("") + "</ul>" +
          (m.state === "open" ? '<div class="row"><button class="btn btn-sm btn-primary" data-act="helper-apply" data-i="' + i + '"' + (okN ? "" : " disabled") + ">" + icon("check") + 'Apply</button><button class="btn btn-sm" data-act="helper-dismiss" data-i="' + i + '">Not now</button></div>' : "") + "</div>";
      }
    });
    if (c.busy) h += '<div class="bub ai typing"><i></i><i></i><i></i></div>';
    if (c.error) h += '<div class="note note-warn">' + icon("alert") + "<span>" + esc(c.error) + "</span></div>";
    h += '</div><div class="send-row"><input class="input" id="helper-in" placeholder="Ask or tell me what to change" value="' + esc(c.draft) + '" data-enter="helper-go" autocomplete="off" maxlength="600"' + (c.busy ? " disabled" : "") + '><button class="btn btn-icon btn-primary" data-act="helper-go" aria-label="Send"' + (c.busy ? " disabled" : "") + ">" + icon("send") + "</button></div>" +
      '<p class="faint" style="font-size:11.5px;margin:0">AI can make mistakes. Check changes before you apply them.</p></div>';
    return h;
  }

  /* ------------------------------------------------------------------
     Shop floor view (shop staff on phones and tablets)
     ------------------------------------------------------------------ */
  function renderFloor(inPreview) {
    var s = S(), F = U.floor, b = s.brand || {}, me = St.me, r = role();
    var list = allOrders().filter(function (o) { return !W.isClosed(o, s); });
    var mine = list.filter(function (o) { return o.assignee === me; });
    var sortU = function (a, b2) { var ua = W.urgency(a, s, today()), ub = W.urgency(b2, s, today()), rank = { overdue: 0, soon: 1, ok: 2, closed: 3 }; return rank[ua] - rank[ub] || natCmp(a.due, b2.due); };
    var h = '<div class="floor"><div class="floor-wrap"><div class="floor-head">' + (b.logo ? '<img class="co-logo" src="' + b.logo + '" alt="">' : brandMark) + '<div style="flex:1;min-width:0"><h1>' + esc(F.job ? F.job : s.business.name || "Work orders") + "</h1><small>" + esc(pname(me) || "Shop floor") + "</small></div>" +
      (F.job ? '<button class="btn btn-sm" data-act="floor-back">' + icon("left") + "Back</button>" : inPreview ? "" : '<button class="btn btn-sm btn-ghost" data-act="sign-out">Sign out</button>') + '</div><div class="floor-body floor-scroll">';
    if (F.job && ord(F.job)) h += floorJob(ord(F.job), r);
    else {
      F.job = null;
      if (F.tab === "search") {
        h += '<input class="input" id="floor-q" type="search" placeholder="Work order #, customer or part" value="' + esc(F.q) + '" style="height:48px;font-size:16px">';
        var res = F.q ? allOrders().filter(function (o) { return matches(o, F.q); }).slice(0, 40) : [];
        h += res.map(floorCard).join("") || '<p class="muted" style="text-align:center;padding:20px">' + (F.q ? "No matches." : "Type to search all " + esc(lnoun()) + "s, or scan the QR code on a traveler.") + "</p>";
      } else {
        var show = (F.tab === "mine" ? mine : list).slice().sort(sortU);
        h += show.map(floorCard).join("") || '<div class="empty"><span class="ico">' + icon("check") + "</span><h3>" + (F.tab === "mine" ? "Nothing assigned to you" : "No open jobs") + "</h3><p>" + (F.tab === "mine" ? "Check All jobs for anything that needs a hand." : "") + "</p></div>";
      }
    }
    h += "</div>";
    if (!F.job) h += '<div class="floor-tabs">' + [["mine", "user", "My jobs (" + mine.length + ")"], ["all", "list", "All open (" + list.length + ")"], ["search", "search", "Find"]].map(function (t) { return '<button class="' + (F.tab === t[0] ? "on" : "") + '" data-act="floor-tab" data-v="' + t[0] + '">' + icon(t[1]) + t[2] + "</button>"; }).join("") + "</div>";
    return h + "</div></div>";
  }
  function floorCard(o) {
    var u = W.urgency(o, S(), today());
    return '<button class="fcard' + (u === "overdue" ? " late" : "") + '" data-act="floor-open" data-n="' + esc(o.number) + '"><div class="top"><span class="wo-num">' + esc(o.number) + "</span>" + stPill(o.status) + prioHTML(o.priority) + '<span class="due ' + u + '">' + esc(relDue(o)) + '</span></div><span class="big">' + esc([o.part, o.qty ? "× " + o.qty : ""].filter(Boolean).join(" ") || o.title || o.customer) + '</span><span class="sub">' + esc([o.customer, o.title].filter(Boolean).join(" · ")) + "</span></button>";
  }
  function floorJob(o, r) {
    var s = S(), next = W.nextStatuses(s, o.status, r), cat = W.catOf(s, o.status);
    // forward = later in the status list; going back is offered as a smaller button
    var order = s.statuses.map(function (x) { return x.id; }), here = order.indexOf(o.status);
    var later = next.filter(function (x) { return (x.inFlow || !s.features.flow) && x.cat !== "hold" && x.cat !== "canceled" && order.indexOf(x.id) > here; });
    if (!s.features.flow) later = later.slice(0, 1).concat(later.slice(1).filter(function (x) { return x.cat === "done"; }).slice(0, 1));
    var forward = later.filter(function (x) { return x.ok; }), blocked = later.filter(function (x) { return !x.ok; });
    var back = next.filter(function (x) { return x.ok && x.inFlow && s.features.flow && x.cat !== "hold" && x.cat !== "canceled" && order.indexOf(x.id) < here; }).slice(0, 1);
    var holds = next.filter(function (x) { return x.ok && x.cat === "hold"; });
    var h = '<div class="job"><div class="hero"><div class="row"><span class="big-num">' + esc(o.number) + "</span>" + stPill(o.status) + prioHTML(o.priority) + '</div><div class="due ' + W.urgency(o, s, today()) + '" style="font-size:15px">' + esc(relDue(o)) + " · " + fmtDate(o.due, true) + "</div>" +
      '<div class="kv2"><div><span>Part</span><b>' + esc(o.part || "—") + (o.rev ? " rev " + esc(o.rev) : "") + "</b></div><div><span>Quantity</span><b>" + esc(o.qty || "—") + "</b></div><div><span>Customer</span><b>" + esc(o.customer) + "</b></div><div><span>Assigned</span><b>" + esc(pname(o.assignee) || "—") + "</b></div>" +
      (s.features.fields ? (s.fields || []).filter(function (f) { return (o.custom || {})[f.id]; }).map(function (f) { return "<div><span>" + esc(f.label) + "</span><b>" + esc(o.custom[f.id]) + "</b></div>"; }).join("") : "") + "</div>" +
      (o.title ? "<div>" + esc(o.title) + "</div>" : "") + (s.features.items && (o.items || []).length > 1 ? '<div class="list">' + o.items.map(function (it) { return '<div class="li"><b class="grow">' + esc(it.part) + (it.rev ? " rev " + esc(it.rev) : "") + "</b><span>× " + esc(it.qty) + "</span></div>"; }).join("") + "</div>" : "") +
      (o.notes ? '<div class="note">' + icon("info") + "<span>" + esc(o.notes) + "</span></div>" : "") + (cat === "hold" && o.holdReason ? '<div class="note note-warn">' + icon("pause") + "<span>On hold: " + esc(o.holdReason) + "</span></div>" : "") + "</div>";
    if (W.canWork(r)) {
      h += '<div class="bigbtns">' + forward.map(function (x, k) { return '<button class="bigbtn' + (k === 0 ? " primary" : "") + '" data-act="floor-move" data-v="' + x.id + '">' + icon(x.cat === "done" ? "check" : "play") + esc(x.name) + "</button>"; }).join("") +
        blocked.map(function (x) { return '<button class="bigbtn" disabled title="' + esc(x.warn || "") + '">' + icon("lock") + esc(x.name) + '<span style="font-size:12px;font-weight:600">(' + esc(x.warn || "not allowed") + ")</span></button>"; }).join("") +
        (cat !== "hold" && holds.length ? '<button class="bigbtn hold" data-act="floor-move" data-v="' + holds[0].id + '">' + icon("pause") + "Put on hold</button>" : "") +
        back.map(function (x) { return '<button class="btn" style="height:44px" data-act="floor-move" data-v="' + x.id + '">' + icon("left") + "Send back to " + esc(x.name) + "</button>"; }).join("") +
        (!forward.length && !holds.length && W.isClosed(o, s) ? '<p class="muted" style="text-align:center">This job is closed.</p>' : "") +
        '<div class="grid2" style="grid-template-columns:1fr 1fr"><button class="bigbtn" data-act="floor-note">' + icon("note") + 'Note</button><label class="bigbtn" style="cursor:pointer">' + icon("camera") + 'Photo<input type="file" accept="image/*" capture="environment" data-change="floor-photo" hidden></label></div></div>';
    }
    if (s.features.files && (o.files || []).some(function (f) { return f.current !== false; })) h += '<div class="card card-pad"><b style="font-size:13px">Files</b><div class="files" style="margin-top:8px">' + o.files.filter(function (f) { return f.current !== false; }).map(function (f) { return '<a class="file" href="' + esc(f.url) + '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="thumb">' + (/^image\//.test(f.type || "") ? '<img src="' + esc(f.url) + '" alt="">' : icon("file")) + '</span><span class="grow"><b>' + esc(f.name) + "</b><span>" + (f.kind === "link" ? "Link" : "v" + (f.revNo || 1)) + "</span></span></a>"; }).join("") + "</div></div>";
    return h + "</div>";
  }
  function renderPreview() {
    return '<div class="frame" style="grid-template-columns:1fr"><div class="emp-banner">' + icon("eye") + "<span>This is what shop staff see on their phones. They can update status, add notes and photos, but can't change due dates or quantities.</span><span style=\"flex:1\"></span>" +
      '<button class="btn btn-sm" data-act="preview-off">Back to the office view</button></div><div class="preview-stage"><div class="preview-phone">' + renderFloor(true) + "</div></div></div>" + renderOverlays();
  }

  /* ------------------------------------------------------------------
     Travelers (printed job sheets with a QR code)
     ------------------------------------------------------------------ */
  function printTravelers(numbers) {
    var s = S(), b = s.brand || {}, orders = numbers.map(ord).filter(Boolean);
    if (!orders.length) return;
    var root = $("#print-root");
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js", "qrcode").catch(function () { return null; }).then(function (QR) {
      root.innerHTML = orders.map(function (o) {
        var qr = "";
        if (QR) { try { var q = QR(0, "M"); q.addData(location.origin + location.pathname + "#wo/" + encodeURIComponent(o.number)); q.make(); qr = q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) { qr = ""; } }
        var ops = s.statuses.filter(function (x) { return x.cat === "active" || x.cat === "done"; });
        return '<div class="trav trav-page"><div class="trav-head"><div><div class="trav-co">' + (b.logo ? '<img src="' + b.logo + '" alt="">' : "<b>" + esc(s.business.name) + "</b>") + '</div><div style="font-size:11px;margin-top:4px">' + esc(noun()) + ' traveler</div><div class="big-num">' + esc(o.number) + '</div></div><div class="qr">' + (qr || "") + (qr ? "Scan to open" : "") + "</div></div>" +
          "<table><tr><th>Customer</th><td>" + esc(o.customer) + "</td><th>Customer PO</th><td>" + esc(o.po) + "</td></tr><tr><th>Part</th><td>" + esc(o.part) + (o.rev ? " rev " + esc(o.rev) : "") + "</td><th>Quantity</th><td>" + esc(o.qty) + "</td></tr><tr><th>Received</th><td>" + fmtDate(o.received) + "</td><th>Due</th><td><b>" + fmtDate(o.due, true) + "</b></td></tr><tr><th>Assigned</th><td>" + esc(pname(o.assignee)) + "</td><th>Priority</th><td>" + esc({ normal: "Normal", high: "High", rush: "RUSH" }[o.priority || "normal"]) + "</td></tr>" +
          (o.title ? '<tr><th>Description</th><td colspan="3">' + esc(o.title) + "</td></tr>" : "") +
          (s.features.fields ? (s.fields || []).map(function (f) { return "<tr><th>" + esc(f.label) + '</th><td colspan="3">' + esc((o.custom || {})[f.id] || "") + "</td></tr>"; }).join("") : "") + "</table>" +
          (s.features.items && (o.items || []).length > 1 ? "<h3>Parts</h3><table><tr><th>Part</th><th>Rev</th><th>Qty</th></tr>" + o.items.map(function (it) { return "<tr><td>" + esc(it.part) + "</td><td>" + esc(it.rev) + "</td><td>" + esc(it.qty) + "</td></tr>"; }).join("") + "</table>" : "") +
          (o.notes ? "<h3>Instructions</h3><div style=\"border:1px solid #000;padding:8px;white-space:pre-wrap\">" + esc(o.notes) + "</div>" : "") +
          '<h3>Sign-off</h3><table class="ops"><tr><th style="width:30%">Step</th><th>By</th><th style="width:18%">Date</th><th style="width:14%">Qty good</th><th>Notes</th></tr>' + ops.map(function (x) { return "<tr><td>" + esc(x.name) + "</td><td></td><td></td><td></td><td></td></tr>"; }).join("") + "</table>" +
          '<div style="font-size:9px;color:#555">Printed ' + esc(fullTime(Date.now())) + "</div></div>";
      }).join("");
      setTimeout(function () { window.print(); }, 60);
    });
  }

  /* ------------------------------------------------------------------
     Overlays: drawer, modals, popovers
     ------------------------------------------------------------------ */
  function renderOverlays() {
    var h = "";
    var still = animAttr(overlayKey(U.drawer), shownDrawer, drawerAt), mstill = animAttr(overlayKey(U.modal), shownModal, modalAt);
    if (U.drawer) h += '<div class="scrim' + still + '" data-act="close"></div><aside class="drawer' + (U.drawer.type === "order" ? " wide" : "") + still + '" role="dialog" aria-modal="true">' + (U.drawer.type === "order" ? renderOrderDrawer() : renderCustomerDrawer()) + "</aside>";
    if (U.modal) h += '<div class="scrim' + mstill + '" data-act="close-modal"></div><div class="modal-wrap' + mstill + '" data-act="close-self"><div class="modal' + (U.modal.type === "new" ? '" style="width:min(760px,100%)' : "") + '" role="dialog" aria-modal="true">' + renderModal() + "</div></div>";
    if (U.pop) h += '<div class="scrim" style="background:transparent" data-act="close-pop"></div><div class="pop" id="pop">' + renderPop() + "</div>";
    return h;
  }
  function renderModal() {
    var m = U.modal;
    if (m.type === "new") return renderNewModal();
    if (m.type === "hold") {
      var reasons = ["Waiting on material", "Waiting on customer", "Waiting on tooling", "Machine down", "Waiting on outside vendor", "Waiting on inspection"];
      return '<div class="modal-head"><h2>Put ' + esc(m.number) + " on hold</h2><p>Moving to <b>" + esc(stInfo(m.to).name) + "</b>. Why?</p></div><div class=\"modal-body\"><div class=\"reason-chips\">" + reasons.map(function (r) { return '<button class="chip chip-toggle' + (m.text === r ? " on" : "") + '" data-act="hold-pick" data-v="' + esc(r) + '">' + esc(r) + "</button>"; }).join("") + '</div><input class="input" id="hold-text" value="' + esc(m.text) + '" placeholder="Or type the reason" data-enter="hold-go"></div><div class="modal-foot"><button class="btn" data-act="close-modal">Cancel</button><button class="btn btn-primary" data-act="hold-go">' + icon("pause") + "Put on hold</button></div>";
    }
    if (m.type === "ask") return '<div class="modal-head"><h2>Are you sure?</h2><p>' + esc(m.text) + '</p></div><div class="modal-foot"><button class="btn" data-act="close-modal">Cancel</button><button class="btn ' + (m.danger ? "btn-danger" : "btn-primary") + '" data-act="ask-ok">' + esc(m.ok) + "</button></div>";
    if (m.type === "confirm-move") return '<div class="modal-head"><h2>Move ' + esc(m.number) + " to " + esc(stInfo(m.to).name) + "?</h2><p>" + esc(m.warn) + ". It's allowed for managers and will be noted in the history.</p></div><div class=\"modal-foot\"><button class=\"btn\" data-act=\"close-modal\">Cancel</button><button class=\"btn btn-primary\" data-act=\"confirm-move\">Move it</button></div>";
    if (m.type === "note") return '<div class="modal-head"><h2>Add a note</h2><p>' + esc(m.number) + '</p></div><div class="modal-body"><textarea class="input" id="note-modal" rows="4" placeholder="What should the team know?"></textarea></div><div class="modal-foot"><button class="btn" data-act="close-modal">Cancel</button><button class="btn btn-primary" data-act="note-go">' + icon("send") + "Add note</button></div>";
    if (m.type === "link") return '<div class="modal-head"><h2>Add a link</h2><p>For files kept in Google Drive, Dropbox or OneDrive.</p></div><div class="modal-body"><label class="field"><span>Link</span><input class="input" id="link-url" placeholder="https://"></label><label class="field"><span>Name</span><input class="input" id="link-name" placeholder="e.g. BRK-204 drawing rev B"></label></div><div class="modal-foot"><button class="btn" data-act="close-modal">Cancel</button><button class="btn btn-primary" data-act="link-go">Add link</button></div>';
    if (m.type === "invite") return '<div class="modal-head"><h2>Invite ' + esc(m.name) + "</h2><p>Send this link by text or email. It works once; " + esc(m.name) + ' opens it on their phone and signs in with Google or email.</p></div><div class="modal-body"><div class="row"><input class="input" id="invite-link" readonly value="' + esc(m.link || "Making a link…") + '" style="flex:1"><button class="btn" data-act="copy-link">' + icon("copy") + "Copy</button></div></div><div class=\"modal-foot\"><button class=\"btn btn-primary\" data-act=\"close-modal\">Done</button></div>";
    if (m.type === "conflict") {
      return '<div class="modal-head"><h2>Someone else changed the same fields</h2><p>Pick which value to keep for each one. Everything else was combined automatically.</p></div><div class="modal-body">' + m.conflicts.map(function (c, i) {
        var pick = m.pick[i] || "theirs";
        return '<div class="card card-pad" style="box-shadow:none;display:grid;gap:8px"><b>' + esc(fieldLabel(c.field)) + '</b><div class="seg"><button class="' + (pick === "theirs" ? "on" : "") + '" data-act="conf-pick" data-i="' + i + '" data-v="theirs">Theirs: ' + esc(showVal(c.field, c.theirs)) + '</button><button class="' + (pick === "mine" ? "on" : "") + '" data-act="conf-pick" data-i="' + i + '" data-v="mine">Mine: ' + esc(showVal(c.field, c.mine)) + "</button></div></div>";
      }).join("") + '</div><div class="modal-foot"><button class="btn" data-act="conf-cancel">Keep theirs, drop mine</button><button class="btn btn-primary" data-act="conf-go">Save my choices</button></div>';
    }
    if (m.type === "cust-new") return '<div class="modal-head"><h2>Add a customer</h2></div><div class="modal-body"><label class="field"><span>Name</span><input class="input" id="cust-name"></label><div class="grid2"><label class="field"><span>Contact person</span><input class="input" id="cust-contact"></label><label class="field"><span>Phone</span><input class="input" id="cust-phone" type="tel"></label></div><label class="field"><span>Email</span><input class="input" id="cust-email" type="email"></label></div><div class="modal-foot"><button class="btn" data-act="close-modal">Cancel</button><button class="btn btn-primary" data-act="cust-create">Add customer</button></div>';
    return "";
  }
  function renderPop() {
    var p = U.pop;
    if (p.type === "cols") {
      var all = Object.keys(COLS).concat((S().features.fields ? S().fields || [] : []).map(function (f) { return "c:" + f.id; }));
      return '<b style="font-size:13px;padding:0 6px">Columns</b><div class="colpick">' + all.map(function (k) { var d = colDef(k); return d ? '<label><input type="checkbox" data-change="col-toggle" data-k="' + esc(k) + '"' + (U.cols.indexOf(k) >= 0 ? " checked" : "") + (k === "number" ? " disabled" : "") + ">" + esc(d[0]) + "</label>" : ""; }).join("") + '</div><button class="btn btn-xs btn-ghost" data-act="cols-reset">Reset</button>';
    }
    if (p.type === "st-color") return '<div class="swatches" style="gap:8px">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (c) { return '<button class="swatch" style="background:var(--p' + c + '-fg)" data-act="' + p.scope + '-st-color-set" data-c="' + c + '" aria-label="Color ' + (c + 1) + '"></button>'; }).join("") + "</div>";
    return "";
  }
  function positionPop() {
    var el = $("#pop"); if (!el || !U.pop) return;
    var r = el.getBoundingClientRect(), x = U.pop.left, y = U.pop.top;
    if (x + r.width > innerWidth - 8) x = innerWidth - r.width - 8;
    if (y + r.height > innerHeight - 8) y = Math.max(8, U.pop.top - r.height - 40);
    el.style.left = Math.max(8, x) + "px"; el.style.top = y + "px";
  }
  function openPop(el, data) { var r = el.getBoundingClientRect(); U.pop = Object.assign({ left: r.left, top: r.bottom + 6 }, data); }

  /* ------------------------------------------------------------------
     Exports
     ------------------------------------------------------------------ */
  function ordersCSV(list) {
    var s = S(), fields = s.features.fields ? s.fields || [] : [];
    var rows = [["Work order #", "Status", "Customer", "Customer PO", "Part", "Rev", "Qty", "Description", "Received", "Due", "Assigned to", "Priority", "Hold reason", "Instructions"].concat(fields.map(function (f) { return f.label; })).concat(["Created", "Last updated"])];
    list.forEach(function (o) {
      rows.push([o.number, stInfo(o.status).name, o.customer, o.po, o.part, o.rev, o.qty, o.title, o.received, o.due, pname(o.assignee), o.priority, o.holdReason, o.notes].concat(fields.map(function (f) { return (o.custom || {})[f.id] || ""; })).concat([o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "", o.updatedAt ? new Date(o.updatedAt).toISOString().slice(0, 10) : ""]));
    });
    return W.toCSV(rows);
  }

  /* ------------------------------------------------------------------
     Clicks
     ------------------------------------------------------------------ */
  function draftFor(scope) { return scope === "new" ? U.modal && U.modal.draft : U.drawer && U.drawer.draft; }
  function wizSave() { /* wizard settings live in U.wiz until Finish */ }
  function stEdit(scope, fn) {
    if (scope === "wz") { fn(wiz().settings); wiz().settings.flow = W.defaultFlow(wiz().settings.statuses); return; }
    editSettings(function (s) { var before = JSON.stringify(s.statuses.map(function (x) { return x.id; })); fn(s); if (JSON.stringify(s.statuses.map(function (x) { return x.id; })) !== before) s.flow = Object.assign(W.defaultFlow(s.statuses), keepFlow(s)); });
  }
  function keepFlow(s) { var f = {}; Object.keys(s.flow || {}).forEach(function (k) { if (s.statuses.some(function (x) { return x.id === k; })) f[k] = (s.flow[k] || []).filter(function (id) { return s.statuses.some(function (x) { return x.id === id; }); }); }); return f; }
  function numEdit(scope, fn) { if (scope === "wz") fn(wiz().settings.numbering); else editSettings(function (s) { fn(s.numbering); }); }

  var ACT = {
    reload: function () { location.reload(); return false; },
    nav: function (el) { U.view = el.dataset.v; U.drawer = null; closeDrawer(); U.sel = {}; remember(); var m = $(".main"); if (m) m.scrollTop = 0; },
    close: function () { if (U.drawer && U.drawer.type === "order" && dirtyChanges().length) { ask("Discard your unsaved changes to " + U.drawer.number + "?", "Discard changes", function () { closeDrawer(); }, true); return; } closeDrawer(); },
    "ask-ok": function () { var m = U.modal; U.modal = null; if (m && m.fn) m.fn(); },
    "close-modal": function () { U.modal = null; },
    "close-self": function (el, ev) { if (ev.target !== el) return false; U.modal = null; },
    "close-pop": function () { U.pop = null; },
    "sign-out": function () { closeDrawer(); U.modal = null; U.preview = false; St.signOut(); return false; },
    preview: function () { U.preview = true; U.floor = { tab: "all", job: null, q: "" }; closeDrawer(); },
    "preview-off": function () { U.preview = false; U.floor.job = null; },

    // auth
    "au-google": function () { St.signInGoogle().then(render); return false; },
    "au-mode": function (el) { var v = el.dataset.v; U.authEmail = ($("#au-email") || {}).value || U.authEmail; U.authPw = ($("#au-pw") || {}).value || U.authPw; U.authLink = v === "link"; if (v === "up") U.authMode = "signup"; if (v === "in") U.authMode = "signin"; St.error = null; },
    "au-email-go": function () {
      var em = (($("#au-email") || {}).value || "").trim(), pw = ($("#au-pw") || {}).value || ""; U.authEmail = em;
      if (!em) { St.error = "Enter your email."; render(); return false; }
      (U.authLink ? St.sendLink(em) : U.authMode === "signup" ? St.signUpEmail(em, pw) : St.signInEmail(em, pw)).then(render);
      return false;
    },
    "au-finish": function () { var em = ($("#au-email") || {}).value || ""; if (em) St.finishLink(em.trim()).then(render); return false; },
    "au-join": function () { St.acceptInvite().then(render); return false; },

    // wizard
    "wiz-next": function () { var z = wiz(); if (z.step === 3 && !["open", "done"].every(function (c) { return z.settings.statuses.some(function (x) { return x.cat === c; }); })) { toast('Keep at least one "Not started" and one "Done" status.'); return false; } if (z.step === 4 && W.numberProblem(W.previewNumber(z.settings.numbering))) { toast("The number format can't contain / \\ # ? [ ]"); return false; } z.step = Math.min(6, z.step + 1); St.error = null; },
    "wiz-back": function () { var z = wiz(); z.step = Math.max(0, z.step - 1); },
    "wiz-sample": function () { var z = wiz(); z.busy = true; St.createOrg({ settings: z.settings, sample: true, ownerName: z.ownerName }).then(function () { U.wiz = null; U.view = "dashboard"; toast("Sample shop ready. Everything here is fictional."); render(); }).catch(function () { z.busy = false; render(); }); return false; },
    "wz-mode": function (el) { var z = wiz(); z.settings.brand = z.settings.brand || {}; z.settings.brand.mode = el.dataset.v; },
    "wz-ind": function (el) {
      var z = wiz(), s = z.settings, k = el.dataset.v, name = s.business.name, feats = s.features, brandS = s.brand, num = s.numbering;
      var ns = W.defaultSettings(k); ns.business.name = name; ns.features = feats; ns.brand = brandS; ns.numbering = num;
      if (k === "repair") ns.numbering.prefix = num.prefix === "WO-" ? "RO-" : num.prefix; else if (k === "fab" || k === "sign") ns.numbering.prefix = num.prefix === "WO-" || num.prefix === "RO-" ? "JOB-" : num.prefix; else if (num.prefix === "RO-" || num.prefix === "JOB-") ns.numbering.prefix = "WO-";
      z.settings = ns;
    },
    "wz-yn": function (el) { var z = wiz(), on = el.dataset.v === "1"; z.answers[el.dataset.k] = on; z.settings.features[el.dataset.k] = on; },
    "wz-all": function (el) { var z = wiz(); W.OPT.forEach(function (k) { z.answers[k] = el.dataset.v === "yes"; z.settings.features[k] = z.answers[k]; }); },
    "wz-add-person": function () { var el = $("#wz-person"), n = el && el.value.trim(); if (!n) return false; if (wiz().people.some(function (p) { return p.name.toLowerCase() === n.toLowerCase(); })) { toast(n + " is already on the list."); return false; } wiz().people.push({ name: n, role: ($("#wz-role") || {}).value || "staff" }); U.focus = "#wz-person"; },
    "wz-del-person": function (el) { wiz().people.splice(+el.dataset.i, 1); },
    "wz-start": function (el) { wiz().start = el.dataset.v; },
    "wiz-finish": function () {
      var z = wiz(); z.busy = true; St.error = null; render();
      St.createOrg({ settings: z.settings, people: z.people, sample: z.start === "sample", ownerName: z.ownerName }).then(function () {
        var start = z.start; U.wiz = null; U.view = start === "import" ? "import" : "dashboard"; remember();
        toast(start === "sample" ? "Sample shop ready. Everything here is fictional." : "Your shop is set up.");
        render();
      }).catch(function () { z.busy = false; render(); });
      return false;
    },

    // shared status / numbering editors
    "wz-st-add": function () { stEdit("wz", addStatus); }, "set-st-add": function () { stEdit("set", addStatus); },
    "wz-st-del": function (el) { stEdit("wz", function (s) { s.statuses.splice(+el.dataset.i, 1); }); }, "set-st-del": function (el) { var i = +el.dataset.i; ask("Remove the status \"" + S().statuses[i].name + "\"?", "Remove status", function () { stEdit("set", function (s) { s.statuses.splice(i, 1); }); }, true); },
    "wz-st-move": function (el) { stEdit("wz", function (s) { moveIn(s.statuses, +el.dataset.i, +el.dataset.d); }); }, "set-st-move": function (el) { stEdit("set", function (s) { moveIn(s.statuses, +el.dataset.i, +el.dataset.d); }); },
    "wz-st-color": function (el) { openPop(el, { type: "st-color", scope: "wz", i: +el.dataset.i }); }, "set-st-color": function (el) { openPop(el, { type: "st-color", scope: "set", i: +el.dataset.i }); },
    "wz-st-color-set": function (el) { var i = U.pop.i; stEdit("wz", function (s) { s.statuses[i].color = +el.dataset.c; }); U.pop = null; },
    "set-st-color-set": function (el) { var i = U.pop.i; stEdit("set", function (s) { s.statuses[i].color = +el.dataset.c; }); U.pop = null; },
    "wz-num-year": function (el) { numEdit("wz", function (n) { n.year = el.dataset.v; }); }, "set-num-year": function (el) { numEdit("set", function (n) { n.year = el.dataset.v; }); },

    // dashboard / list
    kpi: function (el) { var v = el.dataset.v; U.f = { cat: v === "hold" ? "hold" : v, status: "", who: "", cust: "", src: "" }; U.q = ""; U.view = "orders"; U.sort = { k: "due", dir: 1 }; remember(); },
    "kpi-status": function (el) { U.f = { cat: "all", status: el.dataset.v, who: "", cust: "", src: "" }; U.q = ""; U.view = "orders"; remember(); },
    open: function (el, ev) { if (ev && ev.target.closest("[data-stop]")) return false; if (U.dragged) { U.dragged = false; return false; } openOrder(el.dataset.n); },
    sort: function (el) { var k = el.dataset.v; U.sort = U.sort.k === k ? { k: k, dir: -U.sort.dir } : { k: k, dir: 1 }; remember(); },
    "show-more": function () { U.showN += 150; },
    "f-reset": function () { U.f = { cat: "active", status: "", who: "", cust: "", src: "" }; U.q = ""; remember(); },
    "f-clear-src": function () { U.f.src = ""; },
    cols: function (el) { openPop(el, { type: "cols" }); },
    "cols-reset": function () { U.cols = DEFAULT_COLS.slice(); remember(); },
    "sel-none": function () { U.sel = {}; },
    "sel-del": function () {
      var nums = Object.keys(U.sel).filter(function (k) { return U.sel[k] && ord(k); });
      if (!nums.length) return false;
      ask("Delete " + plural(nums.length, lnoun()) + " for good? " + (nums.length <= 5 ? nums.join(", ") + ". " : "") + "This can't be undone. Numbers aren't reused. To keep a record instead, move them to a closed or canceled status.", "Delete " + plural(nums.length, lnoun()), function () {
        St.deleteOrders(nums).then(function (n) { U.sel = {}; toast("Deleted " + plural(n, lnoun()) + "."); render(); }).catch(function (e) { toast(errMsg(e)); });
      }, true);
    },
    "order-del": function () {
      var n = U.drawer && U.drawer.number; if (!n) return false;
      ask("Delete " + n + " for good? Its details and history will be gone, and the number won't be reused. To keep a record instead, move it to a closed or canceled status.", "Delete " + n, function () {
        St.deleteOrders([n]).then(function () { closeDrawer(); toast(n + " deleted."); render(); }).catch(function (e) { toast(errMsg(e)); });
      }, true);
    },
    "sample-remove": function () {
      ask("Remove the sample shop? This deletes its " + plural(St.sampleCount(), "sample " + lnoun()) + " and the fictional customers and team members. Anything you added yourself stays. Your settings stay too.", "Remove sample data", function () {
        toast("Removing sample data…");
        St.removeSample().then(function (n) { toast("Removed " + plural(n, "sample " + lnoun()) + "."); render(); }).catch(function (e) { toast(errMsg(e)); });
      }, true);
    },
    "export-csv": function () { download(lnoun().replace(/\s+/g, "-") + "s-" + today() + ".csv", ordersCSV(filtered()), "text/csv"); return false; },
    "export-sel": function () { download(lnoun().replace(/\s+/g, "-") + "s-selected-" + today() + ".csv", ordersCSV(filtered().filter(function (o) { return U.sel[o.number]; })), "text/csv"); return false; },
    "export-all": function () { download(lnoun().replace(/\s+/g, "-") + "s-all-" + today() + ".csv", ordersCSV(allOrders().sort(function (a, b) { return natCmp(a.number, b.number); })), "text/csv"); return false; },
    "print-sel": function () { printTravelers(Object.keys(U.sel).filter(function (k) { return U.sel[k]; })); return false; },
    print: function (el) { printTravelers([el.dataset.n]); return false; },
    "new-order": function () { newOrderModal(); U.focus = 'input[data-f="customer"][data-scope="new"]'; },
    "create-order": function () { if (U.modal.dupe) U.modal.dupeOk = true, U.modal.dupe = null; createOrder(); return false; },
    "set-prio": function (el) { var d = draftFor(el.dataset.scope); if (d) d.priority = el.dataset.v; },
    "item-add": function (el) { var d = draftFor(el.dataset.scope); d.items = (d.items || []).concat([{ part: "", rev: "", qty: "" }]); },
    "item-del": function (el) { var d = draftFor(el.dataset.scope); d.items.splice(+el.dataset.i, 1); },

    // drawer
    tab: function (el) { U.drawer.tab = el.dataset.v; },
    discard: function () { var dr = U.drawer; dr.draft = clone(ord(dr.number)); dr.base = clone(ord(dr.number)); dr.errors = {}; dr.reason = ""; dr.merged = false; },
    "save-order": function () { saveOrder(); return false; },
    move: function (el) { moveStatus(U.drawer.number, el.dataset.v); return false; },
    helper: function () { U.helper = !U.helper; U.focus = U.helper ? "#helper-in" : null; },
    "helper-go": function () { var el = document.getElementById("helper-in"); helperSend(el ? el.value : chat().draft); return false; },
    "helper-ex": function (el) { helperSend(el.dataset.t); return false; },
    "helper-clear": function () { U.chat = null; },
    "helper-dismiss": function (el) { var m = chat().msgs[+el.dataset.i]; if (m) m.state = "no"; },
    "helper-apply": function (el) {
      var m = chat().msgs[+el.dataset.i]; if (!m || m.state !== "open") return false;
      var go = function () {
        m.state = "done"; render();
        helperApply(m.actions).then(function (r) { toast(r.done ? "Applied " + plural(r.done, "change") + (r.problems ? ". " + r.problems + " couldn't be applied." : ".") : "Nothing could be applied."); render(); });
      };
      var nDel = m.actions.filter(function (a) { return a.type === "delete_order" && ord(a.order); }).length;
      if (nDel) { ask("This includes deleting " + plural(nDel, lnoun()) + " for good. That can't be undone. Apply anyway?", "Apply and delete", go, true); return; }
      go(); return false;
    },
    "hold-pick": function (el) { U.modal.text = el.dataset.v; },
    "hold-go": function () { var m = U.modal, t = (($("#hold-text") || {}).value || m.text || "").trim(); if (!t) { toast("Say why it's on hold."); return false; } U.modal = null; if (m.bulk) bulkStatus(m.to, t); else moveStatus(m.number, m.to, t); },
    "confirm-move": function () { var m = U.modal; U.modal = null; U.confirmed = true; moveStatus(m.number, m.to); },
    "add-note": function () { var t = ($("#note-text") || {}).value || ""; if (!t.trim()) return false; St.addNote(U.drawer.number, t).then(function () { toast("Note added."); }).catch(function (e) { toast(errMsg(e)); }); var el = $("#note-text"); if (el) el.value = ""; return false; },
    "add-link": function () { U.modal = { type: "link", number: U.drawer ? U.drawer.number : U.floor.job }; U.focus = "#link-url"; },
    "link-go": function () {
      var url = (($("#link-url") || {}).value || "").trim(), name = (($("#link-name") || {}).value || "").trim(), m = U.modal;
      if (!/^https?:\/\//i.test(url)) { toast("Paste a link that starts with https://"); return false; }
      var o = ord(m.number); U.modal = null;
      var files = (o.files || []).concat([{ id: W.uid(), kind: "link", name: name || url.replace(/^https?:\/\//, "").slice(0, 60), url: url, by: St.user.uid, byName: pname(St.me), at: Date.now(), current: true }]);
      St.updateOrder(o.number, o, Object.assign(clone(o), { files: files }), { type: "file" }).then(function () { toast("Link added."); }).catch(function (e) { toast(errMsg(e)); });
    },
    "conf-pick": function (el) { U.modal.pick[+el.dataset.i] = el.dataset.v; },
    "conf-cancel": function () { U.modal = null; var dr = U.drawer; if (dr) { dr.base = clone(ord(dr.number)); dr.draft = clone(dr.base); dr.merged = false; } toast("Kept their version."); },
    "conf-go": function () {
      var m = U.modal, dr = U.drawer, cur = ord(dr.number), mine = clone(dr.draft);
      // start from their version, re-apply everything of mine that didn't clash, then my picks
      var merged = W.merge(dr.base, mine, cur).result;
      m.conflicts.forEach(function (c, i) {
        var v = (m.pick[i] || "theirs") === "mine" ? c.mine : c.theirs;
        if (c.field.indexOf("custom.") === 0) { merged.custom = merged.custom || {}; merged.custom[c.field.slice(7)] = v; } else merged[c.field] = v;
      });
      U.modal = null; dr.base = clone(cur); dr.draft = Object.assign(clone(cur), merged); dr.merged = false;
      saveOrder(); return false;
    },

    // customers
    "cust-new": function () { U.modal = { type: "cust-new" }; U.focus = "#cust-name"; },
    "cust-create": function () {
      var n = (($("#cust-name") || {}).value || "").trim(); if (!n) { toast("Enter a name."); return false; }
      if (Object.keys(St.data.customers).some(function (k) { return W.norm(St.data.customers[k].name) === W.norm(n); })) { toast("That customer is already on the list."); return false; }
      St.saveCustomer({ name: n, contact: $("#cust-contact").value, phone: $("#cust-phone").value, email: $("#cust-email").value }).then(function () { toast("Customer added."); }).catch(function (e) { toast(errMsg(e)); });
      U.modal = null;
    },
    "cust-open": function (el) { var c = St.data.customers[el.dataset.id]; closeDrawer(); U.drawer = { type: "customer", id: c.id, draft: clone(c), origName: c.name }; },
    "cust-save": function () { var dr = U.drawer; if (!String(dr.draft.name || "").trim()) { toast("Enter a name."); return false; } St.saveCustomer(dr.draft).then(function () { toast("Saved."); }).catch(function (e) { toast(errMsg(e)); }); closeDrawer(); },

    // team
    "person-add": function () { var el = $("#new-person"), n = el && el.value.trim(); if (!n) return false; St.savePerson({ name: n, role: "staff" }).then(function () { toast(n + " added."); }).catch(function (e) { toast(errMsg(e)); }); el.value = ""; U.focus = "#new-person"; return false; },
    "person-del": function (el) {
      var p = St.data.people[el.dataset.id], n = allOrders().filter(function (o) { return o.assignee === p.id && !W.isClosed(o, S()); }).length;
      ask("Remove " + p.name + " from the team?" + (n ? " They're assigned to " + plural(n, "open job") + ", which will show as unassigned." : "") + (St.data.members && Object.keys(St.data.members).some(function (u) { return St.data.members[u].pid === p.id; }) ? " They'll lose access to the app." : ""), "Remove " + p.name, function () {
        St.removePerson(p.id).then(function () { toast(p.name + " removed."); }).catch(function (e) { toast(errMsg(e)); });
      }, true);
    },
    invite: function (el) {
      var p = St.data.people[el.dataset.id]; U.modal = { type: "invite", name: p.name, link: null };
      St.inviteLink(p).then(function (link) { if (U.modal && U.modal.type === "invite") { U.modal.link = link; render(); } }).catch(function (e) { U.modal = null; toast(errMsg(e)); render(); });
    },
    "copy-link": function () { var el = $("#invite-link"); if (!el) return false; el.select(); (navigator.clipboard ? navigator.clipboard.writeText(el.value) : Promise.reject()).then(function () { toast("Link copied."); }).catch(function () { document.execCommand("copy"); toast("Link copied."); }); return false; },

    // import
    "imp-restart": function () { U.imp = null; },
    "imp-paste": function () { var t = ($("#imp-paste") || {}).value || ""; if (!t.trim()) { toast("Paste some rows first."); return false; } var z = imp(); z.fileName = "Pasted rows"; z.sheets = null; useRows(W.parseCSV(t)); return false; },
    "imp-template": function () { download("work-order-import-template.csv", W.toCSV([W.FIELDS.map(function (f) { return f.label; }), ["", "ABC Manufacturing", "PO-1234", "BRK-204", "B", "125", "Mounting bracket", today(), W.iso(W.addDays(new Date(), 14)), "", "Normal", "Open", "Deburr all edges"]]), "text/csv"); return false; },
    "imp-to-values": function () { var z = imp(); z.step = "values"; },
    "imp-to-review": function () { var z = imp(); z.step = "review"; z.showAll = false; },
    "imp-back": function (el) { imp().step = el.dataset.v; },
    "imp-existing": function (el) { imp().decisions.onExisting = el.dataset.v; },
    "imp-show": function (el) { imp().showAll = el.dataset.v === "1"; },
    "imp-apply-fix": function () { /* values are applied as they're typed; this re-checks the rows */ },
    "imp-go": function () { runImport(); return false; },
    "imp-view": function () { U.view = "orders"; U.f = { cat: "all", status: "", who: "", cust: "", src: "import" }; U.q = ""; U.sort = { k: "number", dir: 1 }; remember(); },
    "imp-report": function () { importReportCSV(); return false; },

    // settings
    "set-mode": function (el) { editSettings(function (s) { W.OPT.forEach(function (k) { s.features[k] = el.dataset.v === "advanced"; }); }, true); },
    "set-close": function (el) { editSettings(function (s) { s.closeRole = el.dataset.v; }, true); },
    "set-flow": function (el) { editSettings(function (s) { var l = s.flow[el.dataset.a] = s.flow[el.dataset.a] || [], i = l.indexOf(el.dataset.b); if (i >= 0) l.splice(i, 1); else l.push(el.dataset.b); }); },
    "set-flow-reset": function () { editSettings(function (s) { s.flow = W.defaultFlow(s.statuses); }, true); },
    "fld-add": function () { editSettings(function (s) { s.fields = (s.fields || []).concat([{ id: "f_" + W.uid(), label: "New field", type: "text" }]); }, true); },
    "fld-del": function (el) { var i = +el.dataset.i; ask("Remove the field \"" + S().fields[i].label + "\"? Values already entered stay in the history and backups.", "Remove field", function () { editSettings(function (s) { s.fields.splice(i, 1); }, true); }, true); },
    theme: function (el) { editSettings(function (s) { s.brand.accent = el.dataset.v; }, true); },
    "theme-mode": function (el) { editSettings(function (s) { s.brand.mode = el.dataset.v; }, true); },
    "theme-logo": function () { var img = new Image(); img.onload = function () { var c = logoColor(img); if (c) { editSettings(function (s) { s.brand.accent = c; }, true); render(); toast("Matched your logo."); } else toast("Couldn't find a strong color in the logo."); }; img.src = S().brand.logo; return false; },
    "logo-del": function () { editSettings(function (s) { s.brand.logo = null; }, true); },
    backup: function () { St.exportAll().then(function (data) { download("work-orders-backup-" + today() + ".json", JSON.stringify(data, null, 2), "application/json"); toast("Backup downloaded."); }).catch(function (e) { toast(errMsg(e)); }); return false; },
    "reset-local": function () { ask("Erase everything saved in this browser? This can't be undone.", "Erase all", function () { St.resetLocal(); }, true); },

    // shop floor
    "floor-tab": function (el) { U.floor.tab = el.dataset.v; U.floor.job = null; if (el.dataset.v === "search") U.focus = "#floor-q"; },
    "floor-open": function (el) { U.floor.job = el.dataset.n; var f = $(".floor-scroll"); if (f) f.scrollTop = 0; },
    "floor-back": function () { U.floor.job = null; },
    "floor-move": function (el) { moveStatus(U.floor.job, el.dataset.v); return false; },
    "floor-note": function () { U.modal = { type: "note", number: U.floor.job }; U.focus = "#note-modal"; },
    "note-go": function () { var t = ($("#note-modal") || {}).value || "", m = U.modal; if (!t.trim()) return false; U.modal = null; St.addNote(m.number, t).then(function () { toast("Note added."); render(); }).catch(function (e) { toast(errMsg(e)); }); }
  };
  function ask(text, okLabel, fn, danger) { U.modal = { type: "ask", text: text, ok: okLabel, fn: fn, danger: !!danger }; }
  function addStatus(s) { var n = 1; while (s.statuses.some(function (x) { return x.id === "s" + n; })) n++; var doneIdx = s.statuses.findIndex(function (x) { return x.cat === "done"; }); s.statuses.splice(doneIdx < 0 ? s.statuses.length : doneIdx, 0, { id: "s" + n, name: "New status", cat: "active", color: n % 7 }); }
  function moveIn(a, i, d) { var j = i + d; if (j < 0 || j >= a.length) return; var t = a[i]; a[i] = a[j]; a[j] = t; }

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]");
    if (!el || !(app.contains(el))) return;
    if (el.disabled) return;
    var fn = ACT[el.dataset.act]; if (!fn) return;
    if (el.tagName === "A" || el.tagName === "BUTTON") ev.preventDefault();
    if (fn(el, ev) !== false) render();
  });

  /* ------------------------------------------------------------------
     Typing and field changes
     ------------------------------------------------------------------ */
  function setDraftField(d, f, v) {
    if (f.indexOf("custom.") === 0) { d.custom = d.custom || {}; d.custom[f.slice(7)] = v; return; }
    if (f === "qty") v = v === "" ? "" : +v;
    if (f === "assignee") v = v || null;
    d[f] = v;
  }
  document.addEventListener("input", function (ev) {
    var el = ev.target;
    if (el.id === "helper-in") { chat().draft = el.value; return; }
    if (el.id === "q") { U.q = el.value; U.showN = 150; render(); return; }
    if (el.id === "floor-q") { U.floor.q = el.value; render(); return; }
    if (el.dataset.f && el.dataset.scope) { var d = draftFor(el.dataset.scope); if (d) { setDraftField(d, el.dataset.f, el.value); if (el.dataset.scope === "edit") debounceRender(); } return; }
    if (el.dataset.item != null && el.dataset.scope) { var d2 = draftFor(el.dataset.scope); if (d2) { d2.items[+el.dataset.item][el.dataset.k] = el.dataset.k === "qty" ? (el.value === "" ? "" : +el.value) : el.value; if (el.dataset.scope === "edit") debounceRender(); } return; }
    if (el.dataset.cf && U.drawer) { U.drawer.draft[el.dataset.cf] = el.value; return; }
    if (el.id === "reason" && U.drawer) { U.drawer.reason = el.value; return; }
    if (el.id === "hold-text" && U.modal) { U.modal.text = el.value; return; }
    if (el.dataset.in === "imp-fix") { var z = imp(), r = +el.dataset.row, c = +el.dataset.col; z.fixes[r] = z.fixes[r] || {}; z.fixes[r][c] = el.value; return; }
  });
  var rt = null;
  function debounceRender() { clearTimeout(rt); rt = setTimeout(render, 250); }

  document.addEventListener("change", function (ev) {
    var el = ev.target, c = el.dataset.change, v = el.type === "checkbox" ? el.checked : el.value;
    if (el.dataset.f && el.dataset.scope) {
      var d = draftFor(el.dataset.scope); if (!d) return;
      setDraftField(d, el.dataset.f, v);
      if (el.dataset.f === "status" && W.catOf(S(), v) !== "hold") d.holdReason = "";
      // text fields were already captured while typing; re-drawing here would break Tab between fields
      if (el.tagName === "SELECT" || el.dataset.scope === "edit") debounceRender();
      return;
    }
    if (el.dataset.pf) {
      var p = clone(St.data.people[el.dataset.id]); if (!p) return;
      p[el.dataset.pf] = el.value; if (el.dataset.pf === "name" && !p.name.trim()) { toast("Name can't be blank."); render(); return; }
      St.savePerson(p).catch(function (e) { toast(errMsg(e)); }); return;
    }
    if (!c) return;
    var z;
    switch (c) {
      case "f-cat": if (v.indexOf("s:") === 0) { U.f.status = v.slice(2); U.f.cat = "all"; } else { U.f.status = ""; U.f.cat = v; } U.showN = 150; remember(); break;
      case "f-who": U.f.who = v; remember(); break;
      case "f-cust": U.f.cust = v; remember(); break;
      case "sel": U.sel[el.dataset.n] = v; break;
      case "sel-all": filtered().slice(0, U.showN).forEach(function (o) { U.sel[o.number] = v; }); break;
      case "col-toggle": var k = el.dataset.k, i = U.cols.indexOf(k); if (v && i < 0) U.cols.push(k); if (!v && i >= 0) U.cols.splice(i, 1); remember(); break;
      case "bulk-status": bulkStatus(v); return;
      case "bulk-assign": bulkAssign(v); return;
      case "upload": uploadTo(U.drawer.number, el.files[0]); return;
      case "floor-photo": uploadTo(U.floor.job, el.files[0]); return;
      // wizard
      case "wz-name": wiz().settings.business.name = v.trim(); return;
      case "wz-owner": wiz().ownerName = v.trim(); return;
      case "wz-st-name": stEdit("wz", function (s) { s.statuses[+el.dataset.i].name = v.trim() || "Untitled"; }); break;
      case "wz-st-cat": stEdit("wz", function (s) { s.statuses[+el.dataset.i].cat = v; }); break;
      case "wz-num-prefix": numEdit("wz", function (n) { n.prefix = v.trim(); }); break;
      case "wz-num-digits": numEdit("wz", function (n) { n.digits = +v; }); break;
      case "wz-num-start": numEdit("wz", function (n) { n.start = Math.max(1, Math.floor(+v || 1)); }); break;
      // settings
      case "set-name": editSettings(function (s) { s.business.name = v.trim(); }); break;
      case "set-noun": editSettings(function (s) { s.business.noun = v.trim() || "Work order"; }); break;
      case "set-soon": editSettings(function (s) { s.business.dueSoonDays = +v; }); break;
      case "set-feat": editSettings(function (s) { s.features[el.dataset.k] = v; if (el.dataset.k === "flow" && v && !Object.keys(s.flow || {}).length) s.flow = W.defaultFlow(s.statuses); }, true); break;
      case "set-st-name": stEdit("set", function (s) { s.statuses[+el.dataset.i].name = v.trim() || "Untitled"; }); break;
      case "set-st-cat": stEdit("set", function (s) { s.statuses[+el.dataset.i].cat = v; }); break;
      case "set-num-prefix": if (W.numberProblem(v.trim() + "1")) { toast("The prefix can't contain / \\ # ? [ ]"); render(); return; } numEdit("set", function (n) { n.prefix = v.trim(); }); break;
      case "set-num-digits": numEdit("set", function (n) { n.digits = +v; }); break;
      case "set-num-start": numEdit("set", function (n) { n.start = Math.max(1, Math.floor(+v || 1)); }); break;
      case "fld-label": editSettings(function (s) { s.fields[+el.dataset.i].label = v.trim() || "Field"; }); break;
      case "fld-type": editSettings(function (s) { s.fields[+el.dataset.i].type = v; }); break;
      case "fld-opts": editSettings(function (s) { s.fields[+el.dataset.i].options = v.split(",").map(function (x) { return x.trim(); }).filter(Boolean); }); break;
      case "fld-req": editSettings(function (s) { s.fields[+el.dataset.i].required = v; }); break;
      case "theme-custom": editSettings(function (s) { s.brand.accent = v.toUpperCase(); }); break;
      case "logo": loadLogo(el.files[0], function (url, col) { editSettings(function (s) { s.brand.logo = url; if (col) s.brand.accent = col; }, true); render(); toast(col ? "Logo added. We matched the theme color to it." : "Logo added."); }); return;
      // import
      case "imp-file": if (el.files[0]) readSpreadsheet(el.files[0]); return;
      case "imp-sheet": z = imp(); z.sheet = v; z.all = z.book[v]; z.headerRow = W.findHeaderRow(z.all); setupMap(); break;
      case "imp-header": z = imp(); z.headerRow = +v; setupMap(); break;
      case "imp-map": imp().mapping[+el.dataset.i] = v; break;
      case "imp-status": imp().decisions.status[el.dataset.v] = v || null; break;
      case "imp-person": imp().decisions.people[el.dataset.v] = v; break;
      case "imp-merge": z = imp(); if (v) z.decisions.customers[el.dataset.v] = el.dataset.to; else delete z.decisions.customers[el.dataset.v]; break;
      default: return;
    }
    render();
  });
  function uploadTo(number, file) {
    if (!file || !number) return;
    toast("Uploading " + file.name + "…");
    St.uploadFile(number, file).then(function (meta) {
      var o = ord(number);
      return St.updateOrder(number, o, Object.assign(clone(o), { files: St.withFile(o.files, meta) }), { type: "file" }).then(function () { toast(file.name + " added" + (meta.revNo > 1 ? " as version " + meta.revNo : "") + "."); });
    }).catch(function (e) { toast(errMsg(e)); });
  }
  function bulkStatus(to) {
    if (!to) return;
    var nums = Object.keys(U.sel).filter(function (k) { return U.sel[k] && ord(k); }), s = S(), r = role(), skipped = 0, chain = Promise.resolve(), done = 0;
    var why = arguments[1];
    if (W.catOf(s, to) === "hold" && s.features.reasons && why == null) { U.modal = { type: "hold", bulk: true, to: to, text: "", number: plural(nums.length, lnoun()) }; render(); return; }
    nums.forEach(function (n) {
      chain = chain.then(function () {
        var o = ord(n), info = W.nextStatuses(s, o.status, r).find(function (x) { return x.id === to; });
        if (o.status === to || !info || !info.ok) { skipped++; return; }
        var nx = clone(o); nx.status = to; nx.holdReason = W.catOf(s, to) === "hold" ? (why || "") : "";
        return St.updateOrder(n, o, nx, {}).then(function () { done++; });
      });
    });
    chain.then(function () { U.sel = {}; toast("Moved " + plural(done, lnoun()) + " to " + stInfo(to).name + (skipped ? "; " + skipped + " skipped (already there or not allowed)." : ".")); render(); }).catch(function (e) { toast(errMsg(e)); render(); });
  }
  function bulkAssign(pid) {
    if (!pid) return;
    var nums = Object.keys(U.sel).filter(function (k) { return U.sel[k] && ord(k); }), chain = Promise.resolve(), to = pid === "__none" ? null : pid;
    nums.forEach(function (n) { chain = chain.then(function () { var o = ord(n); if ((o.assignee || null) === to) return; var nx = clone(o); nx.assignee = to; return St.updateOrder(n, o, nx, {}); }); });
    chain.then(function () { U.sel = {}; toast("Assigned " + plural(nums.length, lnoun()) + (to ? " to " + pname(to) : "") + "."); render(); }).catch(function (e) { toast(errMsg(e)); render(); });
  }

  /* ------------------------------------------------------------------
     Keyboard
     ------------------------------------------------------------------ */
  document.addEventListener("keydown", function (ev) {
    var t = ev.target, typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName);
    if (ev.key === "Escape") {
      if (U.pop) { U.pop = null; render(); return; }
      if (U.modal) { U.modal = null; render(); return; }
      if (U.drawer) { ACT.close(); render(); return; }
    }
    if (ev.key === "Enter" && t.dataset && t.dataset.enter) { ev.preventDefault(); var fn = ACT[t.dataset.enter]; if (fn && fn(t) !== false) render(); return; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "s" && U.drawer && U.drawer.type === "order") { ev.preventDefault(); saveOrder(); return; }
    if (typing || ev.ctrlKey || ev.metaKey || ev.altKey || St.status !== "member" || U.preview || St.myRole() === "staff") return;
    if (ev.key === "/") { ev.preventDefault(); if (U.view !== "orders" && U.view !== "board") { U.view = "orders"; render(); } var q = $("#q"); if (q) q.focus(); }
    if ((ev.key === "n" || ev.key === "N") && W.canEdit(St.myRole()) && !U.modal) { ev.preventDefault(); ACT["new-order"](); render(); }
  });

  /* ------------------------------------------------------------------
     Board drag and drop
     ------------------------------------------------------------------ */
  document.addEventListener("dragstart", function (ev) {
    var c = ev.target.closest && ev.target.closest("[data-drag]"); if (!c) return;
    U.drag = c.dataset.drag; c.classList.add("dragging"); ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", U.drag); } catch (e) { }
    var o = ord(U.drag), next = W.nextStatuses(S(), o.status, role());
    document.querySelectorAll(".bcol").forEach(function (col) { var id = col.dataset.col, x = next.find(function (n) { return n.id === id; }); if (id !== o.status && (!x || !x.ok)) col.classList.add("nodrop"); });
  });
  document.addEventListener("dragend", function () { U.drag = null; document.querySelectorAll(".bcol").forEach(function (c) { c.classList.remove("drop", "nodrop"); }); document.querySelectorAll(".dragging").forEach(function (c) { c.classList.remove("dragging"); }); });
  document.addEventListener("dragover", function (ev) { var col = ev.target.closest && ev.target.closest(".bcol"); if (!col || !U.drag || col.classList.contains("nodrop")) return; ev.preventDefault(); document.querySelectorAll(".bcol.drop").forEach(function (c) { if (c !== col) c.classList.remove("drop"); }); col.classList.add("drop"); });
  document.addEventListener("drop", function (ev) {
    var col = ev.target.closest && ev.target.closest(".bcol"); if (!col || !U.drag) return; ev.preventDefault();
    var n = U.drag, to = col.dataset.col; U.drag = null; U.dragged = true; setTimeout(function () { U.dragged = false; }, 50);
    if (ord(n) && ord(n).status !== to) moveStatus(n, to);
  });
  // drop a spreadsheet anywhere on the import page
  document.addEventListener("dragover", function (ev) { var dz = ev.target.closest && ev.target.closest("#dropzone"); if (dz && ev.dataTransfer && Array.prototype.indexOf.call(ev.dataTransfer.types || [], "Files") >= 0) { ev.preventDefault(); dz.classList.add("over"); } });
  document.addEventListener("dragleave", function (ev) { var dz = ev.target.closest && ev.target.closest("#dropzone"); if (dz) dz.classList.remove("over"); });
  document.addEventListener("drop", function (ev) { var dz = ev.target.closest && ev.target.closest("#dropzone"); if (dz && ev.dataTransfer && ev.dataTransfer.files.length) { ev.preventDefault(); readSpreadsheet(ev.dataTransfer.files[0]); } });

  /* ------------------------------------------------------------------
     Links to a single work order (from a traveler's QR code)
     ------------------------------------------------------------------ */
  function openFromHash() {
    var m = /^#wo\/(.+)$/.exec(location.hash); if (!m || St.status !== "member" || !St.data.loaded) return false;
    var n = decodeURIComponent(m[1]); if (!ord(n)) return false;
    if (St.myRole() === "staff") { U.floor.job = n; history.replaceState(null, "", location.pathname + location.search); }
    else if (!U.drawer || U.drawer.number !== n) openOrder(n);
    return true;
  }
  var hashDone = false;
  St.onChange(function () { if (!hashDone && openFromHash()) { hashDone = true; render(); } });
  window.addEventListener("hashchange", function () { if (openFromHash()) render(); });
  var narrowNow = window.innerWidth < 640, rz = null;
  window.addEventListener("resize", function () {
    if (U.pop) { U.pop = null; render(); }
    clearTimeout(rz); rz = setTimeout(function () { var n = window.innerWidth < 640; if (n !== narrowNow) { narrowNow = n; render(); } }, 150);
  });

  render();
  window.WOApp = { render: render, U: U };
})();
