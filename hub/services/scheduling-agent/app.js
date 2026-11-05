/* =====================================================================
   Scheduling Agent v1 (Ares Web Services)
   Everything runs in the browser and saves to this browser's storage.
   Sign-in, real employee phones, notifications and the AI helper arrive
   when the backend is connected.
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Constants
     ------------------------------------------------------------------ */
  var DEMO = !!window.SA_DEMO;          // opened as ?demo: a sample team, kept in this tab only
  var STORE_KEY = DEMO ? "schedulingAgent.demo" : "schedulingAgent.v1";
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAY3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DAY1 = ["S", "M", "T", "W", "T", "F", "S"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var PALETTE = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return { bg: "var(--p" + i + "-bg)", fg: "var(--p" + i + "-fg)", bd: "var(--p" + i + "-bd)" }; });
  var FEATURES = [
    { key: "roles", name: "Roles and requirements", desc: "Tag people with roles like Manager or Barista, and require a role on certain shifts.",
      q: "Do some shifts need a certain role?", qd: "For example, a manager or keyholder to open or close." },
    { key: "avoidPairs", name: "Never schedule together", desc: "Keep certain people off the same shift.",
      q: "Are there people you'd rather never put on the same shift?", qd: "We'll keep them apart automatically." },
    { key: "preferPairs", name: "Work well together", desc: "Pair people who work well together when it fits.",
      q: "Do some people work better together than others?", qd: "We'll try to schedule them together." },
    { key: "preferences", name: "Shift preferences", desc: "People can prefer or avoid certain shifts, like mornings or closes.",
      q: "Do employees have shifts they prefer or would rather avoid?", qd: "Like someone who loves opening but hates closing." },
    { key: "fairness", name: "Fair hours", desc: "Spread hours evenly across part-timers, based on each person's range.",
      q: "Do you want hours spread fairly?", qd: "So no one gets stuck with too few or too many." },
    { key: "rest", name: "Rest between shifts", desc: "Avoid a closing shift followed by an opening shift the next morning.",
      q: "Do you want to avoid close-then-open turnarounds?", qd: "Keeps at least 10 hours between shifts when possible." },
    { key: "rescue", name: "Shift cover", desc: "When someone calls out, rank who can cover and send requests in priority order.",
      q: "Do call-outs leave you scrambling for cover?", qd: "Get a ranked list and ask people in order." },
    { key: "weights", name: "Priority sliders", desc: "Choose how much each preference counts when they conflict.",
      q: "Want to fine-tune what matters most?", qd: "Adds sliders for preferences, pairings, fairness and rest." },
    { key: "ai", name: "AI scheduling helper", desc: "Ask questions and make changes in plain words.", q: null }
  ];
  var OPT = FEATURES.map(function (f) { return f.key; });

  /* ------------------------------------------------------------------
     Icons (simple stroke icons)
     ------------------------------------------------------------------ */
  var ICONS = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.8 2.5 3 5.2"/>',
    layers: '<path d="M12 3 2.5 8 12 13l9.5-5z"/><path d="m2.5 12.5 9.5 5 9.5-5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    sparkle: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    wand: '<path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="M4 20 14 10"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18h2"/>',
    file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>'
  };
  function icon(n, cls) { return '<svg class="i ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || "") + "</svg>"; }

  /* ------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------ */
  function $(s, r) { return (r || document).querySelector(s); }
  // Logos are pictures the owner uploaded (data:image/...) or web images. Anything else is dropped.
  function safeImg(u) { u = String(u == null ? "" : u); return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+\/=\s]+$/i.test(u) || /^https:\/\//i.test(u) ? u : ""; }
  function hexOr(c, d) { return /^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : d; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // Accessibility safety net: any form field drawn without a label gets one from what's around it
  // (the setting's title, its table column, or its placeholder), so screen readers can name it.
  function nameFields(root) {
    root.querySelectorAll("input:not([type=hidden]),select,textarea").forEach(function (el) {
      var lab = el.closest("label") || (el.id && root.querySelector('label[for="' + el.id + '"]'));
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || (lab && lab.textContent.trim())) return;
      var t = "", row = el.closest(".set-row"), cell = el.closest("td,th"), n = +(el.dataset.i || 0) + 1;
      var named = { "set-st-name": "Status " + n + " name", "set-st-cat": "Status " + n + " type", "fld-label": "Extra field " + n + " name", "fld-type": "Extra field " + n + " type", "fld-opts": "Extra field " + n + " choices" }[el.dataset.change || ""];
      if (named) t = named;
      else if (/^pa-/.test(el.id || "")) t = "First person";
      else if (/^pb-/.test(el.id || "")) t = "Second person";
      if (!t && row) { var b = row.querySelector(".txt b, .txt"); t = b ? b.textContent : ""; }
      if (!t && cell && cell.parentElement) {
        var table = cell.closest("table"), i = Array.prototype.indexOf.call(cell.parentElement.children, cell), th = table && table.querySelector("thead tr");
        if (th && th.children[i]) t = th.children[i].textContent;
      }
      t = (t || el.placeholder || el.title || "").replace(/\s+/g, " ").trim();
      if (t) el.setAttribute("aria-label", t.slice(0, 80));
    });
    root.querySelectorAll("button:disabled:empty").forEach(function (b) { b.setAttribute("aria-hidden", "true"); b.tabIndex = -1; });
    // clickable rows, cards and headers: reachable with Tab, and Enter/Space work like a click
    root.querySelectorAll("[data-act]").forEach(function (el) {
      if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY|OPTION)$/.test(el.tagName) || el.hasAttribute("tabindex")) return;
      if (/^close-(self|pop)$/.test(el.dataset.act) || el.dataset.act === "close" && !el.textContent.trim()) return;   // backdrops: Escape closes them
      el.tabIndex = 0;
      if (!/^(TR|TH|TD)$/.test(el.tagName)) el.setAttribute("role", "button");
    });
  }
  document.addEventListener("keydown", function (e) {
    var el = e.target;
    if ((e.key === "Enter" || e.key === " ") && el && el.dataset && el.dataset.act && !/^(BUTTON|A|INPUT|SELECT|TEXTAREA|LABEL|SUMMARY)$/.test(el.tagName)) { e.preventDefault(); el.click(); }
  });
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseISO(s) { var a = s.split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function toMin(t) { if (!t) return 0; var a = String(t).split(":"); return (+a[0]) * 60 + (+a[1] || 0); }
  function fromMin(m) { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function durH(a, b) { var s = toMin(a), e = toMin(b); if (e <= s) e += 1440; return (e - s) / 60; }
  function fmtH(h) { return (Math.round(h * 10) / 10) + "h"; }
  function fmtT(t) {
    var m = toMin(t) % 1440, h = Math.floor(m / 60), mi = m % 60;
    if (S.business.clock === 24) return pad(h) + ":" + pad(mi);
    return (h % 12 || 12) + (mi ? ":" + pad(mi) : "") + (h < 12 ? "am" : "pm");
  }
  function fmtR(a, b) { return fmtT(a) + " – " + fmtT(b); }
  function dateLabel(dk, long) { var d = parseISO(dk); return (long ? DAYS : DAY3)[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate(); }
  function hashColor(id) { var h = 0; String(id).split("").forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return PALETTE[h % 7]; }
  function initials(n) { var p = String(n || "?").trim().split(/\s+/); return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); }
  function avatar(p, size) {
    var c = hashColor(p.id), s = size || 28;
    return '<span class="avatar" style="width:' + s + "px;height:" + s + "px;background:" + c.bg + ";color:" + c.fg + '">' + esc(initials(p.name)) + "</span>";
  }
  // a palette index (0-8), or "#RRGGBB" for a custom color picked on the color wheel
  var palCache = {};
  function pal(i) {
    if (typeof i === "string" && /^#[0-9a-f]{6}$/i.test(i)) {
      var dark = resolvedMode() === "dark", ck = (dark ? "d" : "l") + i;
      if (palCache[ck]) return palCache[ck];
      var bg = dark ? mix(i, "#191A21", 0.74) : mix(i, "#FFFFFF", 0.84), bd = dark ? mix(i, "#191A21", 0.55) : mix(i, "#FFFFFF", 0.62), fg = i;
      for (var n = 0; n < 8 && contrast(fg, bg) < 4.5; n++) fg = mix(fg, dark ? "#FFFFFF" : "#000000", 0.18);
      return (palCache[ck] = { bg: bg, fg: fg, bd: bd });
    }
    return PALETTE[(+i || 0) % PALETTE.length];
  }
  // colors offered for shifts: four colors, then two neutrals, then the color wheel
  var SHIFT_COLORS = [[0, "Purple"], [3, "Blue"], [1, "Green"], [2, "Orange"]], SHIFT_NEUTRALS = [[7, "Gray"], [8, "Sand"]];
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function people(n) { return n + (n === 1 ? " person" : " people"); }

  // a friendly time picker: half-hour steps, shown as 6am / 1:30pm
  function timeSel(change, value, extra) {
    var opts = [], v = value || "09:00";
    for (var m = 0; m < 1440; m += 30) opts.push(fromMin(m));
    if (opts.indexOf(v) < 0) { opts.push(v); opts.sort(); }
    return '<select class="input input-sm tsel" data-change="' + change + '"' + (extra || "") + ">" +
      opts.map(function (o) { return '<option value="' + o + '"' + (o === v ? " selected" : "") + ">" + fmtT(o) + "</option>"; }).join("") + "</select>";
  }

  /* ---------- theme: one color in, a full palette out ---------- */
  function hexRgb(h) { h = String(h || "").replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); var n = parseInt(h, 16); return isNaN(n) ? [106, 88, 214] : [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgbHex(c) { return "#" + c.map(function (x) { x = Math.max(0, Math.min(255, Math.round(x))); return (x < 16 ? "0" : "") + x.toString(16); }).join("").toUpperCase(); }
  function mix(a, b, t) { var A = hexRgb(a), B = hexRgb(b); return rgbHex([0, 1, 2].map(function (i) { return A[i] * (1 - t) + B[i] * t; })); }
  function lum(h) { var c = hexRgb(h).map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  var THEMES = [["Lavender", "#6A58D6"], ["Ocean", "#2F6FDE"], ["Teal", "#0E8A86"], ["Forest", "#2E8550"], ["Espresso", "#8A5A3B"], ["Sunset", "#E0702B"], ["Berry", "#C2386B"], ["Slate", "#4A5568"]];
  var mql = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function resolvedMode() { var m = (S.brand || {}).mode || "light"; return m === "system" ? (mql && mql.matches ? "dark" : "light") : m; }
  function applyTheme() {
    var root = document.documentElement, dark = resolvedMode() === "dark", a = (S.brand && S.brand.accent) || "#6A58D6", t = {};
    root.setAttribute("data-theme", dark ? "dark" : "light");
    if (!dark) {
      // keep the accent dark enough to read as text on white
      var acc = a; for (var i = 0; i < 6 && contrast(acc, "#FFFFFF") < 3.2; i++) acc = mix(acc, "#000000", 0.12);
      t = { accent: acc, "accent-ink": mix(acc, "#000000", 0.22), "accent-soft": mix(a, "#FFFFFF", 0.88), "accent-soft-2": mix(a, "#FFFFFF", 0.8),
        "accent-line": mix(a, "#FFFFFF", 0.72), "accent-wash": mix(a, "#FFFFFF", 0.965), glow1: mix(a, "#FFFFFF", 0.86), glow2: mix(a, "#F6F7FB", 0.93) };
    } else {
      var accD = a; for (var j = 0; j < 6 && contrast(accD, "#191A21") < 4; j++) accD = mix(accD, "#FFFFFF", 0.15);
      t = { accent: accD, "accent-ink": mix(accD, "#FFFFFF", 0.3), "accent-soft": mix(accD, "#191A21", 0.8), "accent-soft-2": mix(accD, "#191A21", 0.7),
        "accent-line": mix(accD, "#191A21", 0.6), "accent-wash": mix(accD, "#111217", 0.9), glow1: mix(accD, "#111217", 0.84), glow2: mix(accD, "#111217", 0.92) };
    }
    t["on-accent"] = contrast(t.accent, "#FFFFFF") >= 3 ? "#FFFFFF" : "#16171D";
    Object.keys(t).forEach(function (k) { root.style.setProperty("--" + k, t[k]); });
  }
  if (mql && mql.addEventListener) mql.addEventListener("change", function () { if ((S.brand || {}).mode === "system") render(); });

  // pick the most colorful hue from a logo
  function logoColor(img) {
    var c = document.createElement("canvas"), n = 48; c.width = c.height = n;
    var x = c.getContext("2d"); x.drawImage(img, 0, 0, n, n);
    var d = x.getImageData(0, 0, n, n).data, buckets = {};
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
      if (sat < 0.28 || l < 0.12 || l > 0.9) continue;
      var h = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4, k = Math.floor(h * 4);
      var B = buckets[k] || (buckets[k] = { w: 0, r: 0, g: 0, b: 0 }), w = sat;
      B.w += w; B.r += d[i] * w; B.g += d[i + 1] * w; B.b += d[i + 2] * w;
    }
    var best = null; Object.keys(buckets).forEach(function (k) { if (!best || buckets[k].w > best.w) best = buckets[k]; });
    return best && best.w > 3 ? rgbHex([best.r / best.w, best.g / best.w, best.b / best.w]) : null;
  }
  function loadLogo(file, done) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("Choose an image file, like a PNG, JPG or SVG."); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 240, sc = Math.min(1, max / Math.max(img.width || max, img.height || max));
        var c = document.createElement("canvas"); c.width = Math.max(1, Math.round((img.width || max) * sc)); c.height = Math.max(1, Math.round((img.height || max) * sc));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        S.brand.logo = c.toDataURL("image/png");
        var col = logoColor(img);
        done(col);
      };
      img.onerror = function () { toast("That image couldn't be read. Try a PNG or JPG."); };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function companyHTML() {
    var b = S.brand || {};
    if (!b.logo && !S.business.name) return "";
    return '<span class="co">' + (b.logo ? '<img src="' + esc(safeImg(b.logo)) + '" alt="' + esc(S.business.name || "Company logo") + '">' : "") + (S.business.name ? "<span>" + esc(S.business.name) + "</span>" : "") + "</span>";
  }
  function brandingHTML(compact) {
    var b = S.brand, cur = (b.accent || "").toUpperCase();
    var h = '<div class="row" style="gap:16px;align-items:center"><div class="logo-box">' + (b.logo ? '<img src="' + esc(safeImg(b.logo)) + '" alt="Your logo">' : '<span class="faint" style="font-size:12px;text-align:center">Your logo</span>') + '</div>' +
      '<div style="display:grid;gap:8px"><div class="row"><label class="btn btn-sm">' + icon("upload") + (b.logo ? "Replace logo" : "Upload logo") + '<input type="file" accept="image/*" data-change="logo" hidden></label>' +
      (b.logo ? '<button class="btn btn-sm btn-ghost" data-act="logo-del">Remove</button>' : "") + '</div><span class="faint" style="font-size:12px">Shown at the top of the app and on your team\'s phones.</span></div></div>';
    h += '<div class="field" style="margin-top:16px"><span>Theme color</span><div class="swatches">' + THEMES.map(function (t) {
      return '<button class="swatch' + (cur === t[1] ? " on" : "") + '" style="background:' + t[1] + '" data-act="theme" data-v="' + t[1] + '" title="' + t[0] + '" aria-label="' + t[0] + '"></button>';
    }).join("") + '<label class="swatch swatch-custom' + (THEMES.some(function (t) { return t[1] === cur; }) ? "" : " on") + '" title="Any color"><input type="color" value="' + esc(hexOr(b.accent, "#6A58D6")) + '" data-change="theme-custom" aria-label="Pick any color"></label></div>' +
      '<div class="row" style="margin-top:4px">' + (b.logo ? '<button class="btn btn-sm btn-soft" data-act="theme-logo">' + icon("sparkle") + "Match my logo</button>" : "") + '<button class="btn btn-sm btn-ghost" data-act="theme-random">' + icon("rotate") + "Surprise me</button></div></div>";
    if (!compact) h += '<div class="field" style="margin-top:16px"><span>Appearance</span><div class="seg">' + [["light", "Light"], ["dark", "Dark"], ["system", "Match device"]].map(function (m) { return '<button class="' + ((b.mode || "light") === m[0] ? "on" : "") + '" data-act="theme-mode" data-v="' + m[0] + '">' + m[1] + "</button>"; }).join("") + "</div></div>";
    return h;
  }

  /* ------------------------------------------------------------------
     State and saving
     ------------------------------------------------------------------ */
  function blank() {
    var f = {}; OPT.forEach(function (k) { f[k] = false; });
    return {
      version: 1, setup: "new",
      business: { name: "", weekStart: 0, clock: 12, allowDoubles: false, missingAvail: "available" },
      features: f,
      weights: { preferences: 3, pairs: 3, fairness: 3, rest: 3, minHours: 3 },
      rescue: { order: "one", showList: false, window: 60, underMaxOnly: true },
      brand: { accent: "#6A58D6", mode: "light", logo: null },
      roles: [], shifts: [], people: [], pairs: [], weeks: {},
      ui: { view: "schedule", week: null, viewAs: null, empTab: "shifts" }
    };
  }
  // the sample café used by the demo (?demo)
  function demoState() {
    var s = blank(), f = s.features;
    OPT.forEach(function (k) { f[k] = true; });
    s.setup = "done"; s.business.name = "Harbor Café";
    s.roles = [{ id: "rmgr", name: "Manager", color: 0 }, { id: "rbar", name: "Barista", color: 1 }];
    var all = [true, true, true, true, true, true, true];
    s.shifts = [
      { id: "sopen", name: "Open", start: "06:00", end: "12:00", days: all.slice(), count: 2, perDay: {}, needs: [{ role: "rmgr", count: 1 }], color: 0 },
      { id: "smid", name: "Mid", start: "11:00", end: "17:00", days: all.slice(), count: 1, perDay: {}, needs: [], color: 1 },
      { id: "sclose", name: "Close", start: "16:00", end: "21:00", days: all.slice(), count: 2, perDay: {}, needs: [{ role: "rmgr", count: 1 }], color: 2 }
    ];
    var off = { s: "off" }, eve = { s: "win", from: "15:00", to: "21:00" };
    function P(id, name, roles, min, max, extra) { var p = { id: id, name: name, roles: roles, min: min, max: max, type: "part", fixed: {}, pattern: null, prefs: {}, rescueOptIn: true }; return Object.assign(p, extra || {}); }
    s.people = [
      P("pava", "Ava Martinez", ["rmgr", "rbar"], 24, 36, { prefs: { sopen: "prefer" } }),
      P("pben", "Ben Carter", ["rbar"], 12, 28, { prefs: { sopen: "avoid" } }),
      P("pcara", "Cara Nguyen", ["rbar"], 8, 20, { pattern: { 1: off, 2: off } }),
      P("pdev", "Dev Patel", ["rmgr", "rbar"], 24, 36),
      P("peli", "Eli Brooks", [], 10, 24, { pattern: { 0: off } }),
      P("pfay", "Fay Johnson", [], 6, 16, { pattern: { 1: off, 2: off, 3: off, 4: off, 5: off } }),
      P("pgus", "Gus Romero", ["rbar"], 16, 30, { prefs: { sclose: "prefer" } }),
      P("phana", "Hana Kim", [], 8, 20, { pattern: { 1: eve, 2: eve, 3: eve, 4: eve, 5: eve } }),
      P("pisa", "Isaac Reed", ["rmgr"], 16, 30)
    ];
    s.pairs = [{ id: "pr1", a: "pben", b: "peli", type: "never" }, { id: "pr2", a: "pcara", b: "phana", type: "prefer" }];
    return s;
  }
  var CLOUD = !!(window.SACloud && SACloud.enabled);
  var browserData = load();            // whatever is saved in this browser (used directly, or offered for import)
  var S = CLOUD ? blank() : browserData;
  var T = { drawer: null, modal: null, pop: null, helper: false, wiz: 0, skipPick: false };

  function load() {
    try {
      var raw = (DEMO ? sessionStorage : localStorage).getItem(STORE_KEY);
      if (DEMO && !raw) return demoState();
      if (raw) { var s = JSON.parse(raw); if (s && s.version === 1) return merge(blank(), s); }
    } catch (e) { /* storage unavailable: start fresh */ }
    return blank();
  }
  function merge(base, s) {
    Object.keys(s).forEach(function (k) {
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) && s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) base[k] = Object.assign(base[k], s[k]);
      else base[k] = s[k];
    });
    return base;
  }
  var saveFailed = false;
  function save() {
    if (CLOUD) { if (SACloud.status === "owner") SACloud.ownerSave(); return; }
    try { (DEMO ? sessionStorage : localStorage).setItem(STORE_KEY, JSON.stringify(S)); saveFailed = false; }
    catch (e) { if (!saveFailed) toast("Couldn't save in this browser. Use Settings > Download backup to keep your work."); saveFailed = true; }
  }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("on"); }, 3200);
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || "text/plain" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ------------------------------------------------------------------
     Lookups
     ------------------------------------------------------------------ */
  function person(id) { return S.people.find(function (p) { return p.id === id; }); }
  function role(id) { return S.roles.find(function (r) { return r.id === id; }); }
  function tpl(id) { return S.shifts.find(function (s) { return s.id === id; }); }
  function modeOf() { var on = OPT.filter(function (k) { return S.features[k]; }).length; return on === 0 ? "simple" : on === OPT.length ? "advanced" : "custom"; }
  function setMode(m) { OPT.forEach(function (k) { S.features[k] = m === "advanced"; }); }
  function modeName(m) { return { simple: "Simple", advanced: "Advanced", custom: "Custom" }[m || modeOf()]; }
  function pairsOn() { return S.features.avoidPairs || S.features.preferPairs; }
  function optIn(p) { return p.rescueOptIn !== false; }

  /* ------------------------------------------------------------------
     Weeks
     ------------------------------------------------------------------ */
  function weekStartOf(d) { var diff = (d.getDay() - S.business.weekStart + 7) % 7; return addDays(d, -diff); }
  function weekKey() {
    if (!S.ui.week) S.ui.week = iso(addDays(weekStartOf(new Date()), 7)); // default: plan next week
    var d = parseISO(S.ui.week);
    if (d.getDay() !== S.business.weekStart) S.ui.week = iso(weekStartOf(d));
    return S.ui.week;
  }
  function weekDates(key) { var s = parseISO(key), out = []; for (var i = 0; i < 7; i++) out.push(addDays(s, i)); return out; }
  function weekLabel(key) {
    var a = parseISO(key), b = addDays(a, 6);
    return MONTHS[a.getMonth()] + " " + a.getDate() + " – " + (a.getMonth() !== b.getMonth() ? MONTHS[b.getMonth()] + " " : "") + b.getDate() + ", " + b.getFullYear();
  }
  function wk(key) {
    var w = S.weeks[key];
    if (!w) w = S.weeks[key] = {};
    var d = { avail: {}, submitted: {}, extra: [], over: {}, assign: {}, locks: {}, blocked: {}, fixedSkip: {}, status: "draft", dirty: false, generated: false, pub: null, callouts: [], requests: [] };
    Object.keys(d).forEach(function (k) { if (w[k] === undefined) w[k] = d[k]; });
    return w;
  }
  function shiftCount(sh, dow) { return sh.perDay && sh.perDay[dow] != null && sh.perDay[dow] !== "" ? +sh.perDay[dow] : +sh.count || 0; }

  // every shift happening this week, with this-week-only changes applied
  function instances(key) {
    var w = wk(key), out = [];
    weekDates(key).forEach(function (d, i) {
      var dk = iso(d), dow = d.getDay();
      S.shifts.forEach(function (sh) {
        if (!sh.days[dow]) return;
        var k = dk + "|" + sh.id, o = w.over[k] || {};
        if (o.removed) return;
        out.push({ key: k, date: dk, i: i, dow: dow, shiftId: sh.id, name: sh.name || "Shift", start: o.start || sh.start, end: o.end || sh.end,
          count: o.count != null ? o.count : shiftCount(sh, dow), needs: sh.needs || [], color: sh.color || 0, extra: false,
          changed: o.start != null || o.end != null || o.count != null });
      });
      w.extra.forEach(function (x) {
        if (x.date !== dk) return;
        out.push({ key: dk + "|" + x.id, date: dk, i: i, dow: dow, shiftId: x.id, name: x.name || "Extra shift", start: x.start, end: x.end,
          count: +x.count || 1, needs: x.needs || [], color: 7, extra: true, changed: false });
      });
    });
    out.sort(function (a, b) { return a.i - b.i || toMin(a.start) - toMin(b.start); });
    return out;
  }
  function instByKey(key, k) { return instances(key).find(function (x) { return x.key === k; }); }

  // full-timers on a set schedule are placed automatically
  function ensureFixed(key) {
    var w = wk(key), list = instances(key), changed = false;
    list.forEach(function (it) {
      var a = w.assign[it.key] || (w.assign[it.key] = []), L = w.locks[it.key] || (w.locks[it.key] = {});
      Object.keys(L).forEach(function (pid) {
        var p = person(pid);
        if (L[pid] === "fixed" && (!p || p.type !== "fixed" || !((p.fixed || {})[it.dow] || []).includes(it.shiftId))) {
          delete L[pid]; var j = a.indexOf(pid); if (j >= 0) a.splice(j, 1); changed = true;
        }
      });
      // people on a set schedule only keep their set shifts (plus anything the owner locked by hand)
      for (var q = a.length - 1; q >= 0; q--) { var fp = person(a[q]); if (fp && fp.type === "fixed" && !L[a[q]]) { a.splice(q, 1); changed = true; } }
      S.people.forEach(function (p) {
        if (p.type !== "fixed" || it.extra) return;
        if (!((p.fixed || {})[it.dow] || []).includes(it.shiftId)) return;
        if (w.fixedSkip[it.key + "|" + p.id]) return;
        if (a.indexOf(p.id) < 0) { a.push(p.id); changed = true; }
        if (L[p.id] !== "fixed") { L[p.id] = "fixed"; changed = true; }
      });
    });
    return changed;
  }

  /* ------------------------------------------------------------------
     Availability
     ------------------------------------------------------------------ */
  // value: {s:"any"} | {s:"off"} | {s:"win", from, to}
  function availOf(p, key, dk) {
    var w = wk(key), v = (w.avail[p.id] || {})[dk];
    if (v) return { v: v, src: w.submitted[p.id] ? "employee" : "week" };
    var dow = parseISO(dk).getDay();
    if (p.pattern && p.pattern[dow]) return { v: p.pattern[dow], src: "pattern" };
    return { v: null, src: "none" };
  }
  function fits(v, start, end) {
    if (!v) return S.business.missingAvail !== "unavailable";
    if (v.s === "off") return false;
    if (v.s === "win") {
      var f = toMin(v.from), t = toMin(v.to), s = toMin(start), e = toMin(end);
      if (e <= s) e += 1440; if (t <= f) t += 1440;
      return s >= f && e <= t;
    }
    return true;
  }
  function canWork(p, it, key) {
    if (wk(key).blocked[it.key + "|" + p.id]) return false;
    return fits(availOf(p, key, it.date).v, it.start, it.end);
  }
  function availText(v) {
    if (!v) return "Not set";
    if (v.s === "any") return "Any time";
    if (v.s === "off") return "Off";
    return fmtT(v.from) + "–" + fmtT(v.to);
  }

  /* ------------------------------------------------------------------
     Engine glue
     ------------------------------------------------------------------ */
  function buildProblem(key) {
    var w = wk(key), list = instances(key);
    var slots = list.map(function (it) {
      var s = toMin(it.start), e = toMin(it.end); if (e <= s) e += 1440;
      var a = w.assign[it.key] || [], L = w.locks[it.key] || {};
      var locked = a.filter(function (pid) { return L[pid] && person(pid); });
      return { key: it.key, day: it.i, start: it.i * 1440 + s, end: it.i * 1440 + e, hours: (e - s) / 60,
        count: it.count, needs: (it.needs || []).filter(function (n) { return role(n.role) && n.count > 0; }),
        shiftId: it.extra ? "extra" : it.shiftId,
        eligible: S.people.filter(function (p) { return p.type !== "fixed" && canWork(p, it, key); }).map(function (p) { return p.id; }),
        locked: locked };
    });
    var people = S.people.map(function (p) {
      var prefs = {};
      if (S.features.preferences) Object.keys(p.prefs || {}).forEach(function (sid) { prefs[sid] = p.prefs[sid] === "prefer" ? 1 : p.prefs[sid] === "avoid" ? -1 : 0; });
      return { id: p.id, name: p.name, roles: p.roles || [], min: +p.min || 0, max: p.max === "" || p.max == null ? 168 : +p.max, prefs: prefs, fixed: p.type === "fixed" };
    });
    var pairs = function (t) { return S.pairs.filter(function (x) { return x.type === t && person(x.a) && person(x.b); }).map(function (x) { return [x.a, x.b]; }); };
    var defaults = { preferences: 3, pairs: 3, fairness: 3, rest: 3, minHours: 3 };
    return {
      slots: slots, people: people,
      never: S.features.avoidPairs ? pairs("never") : [], prefer: S.features.preferPairs ? pairs("prefer") : [],
      features: { roles: S.features.roles, preferences: S.features.preferences, preferPairs: S.features.preferPairs, fairness: S.features.fairness, rest: S.features.rest },
      weights: S.features.weights ? S.weights : defaults, allowDoubles: S.business.allowDoubles
    };
  }
  function analysis(key) { return SAEngine.analyze(buildProblem(key), wk(key).assign); }
  function rankFor(key, k) { return SAEngine.rank(buildProblem(key), wk(key).assign, k); }

  function markEdited(w) { if (w.status === "published") w.dirty = true; }

  function issueText(is, key) {
    var it = is.key ? instByKey(key, is.key) : null, where = it ? it.name + " · " + dateLabel(it.date) : "";
    var P = function (id) { var p = person(id); return p ? p.name : "Someone"; };
    switch (is.type) {
      case "unfilled": return { t: where + ": " + plural(is.missing, "open spot") + (is.available ? " (people who are free are at their max hours, already working, or not allowed)" : " (no one available)"), bad: !is.available, key: is.key };
      case "role": var r = role(is.role); return { t: where + ": needs " + (is.missing > 1 ? is.missing + " × " : "a ") + (r ? r.name : "role"), bad: true, key: is.key };
      case "over": return { t: P(is.pid) + " is over max (" + fmtH(is.hours) + " / " + fmtH(is.max) + ")", bad: true, pid: is.pid };
      case "under": return { t: P(is.pid) + " is under min (" + fmtH(is.hours) + " / " + fmtH(is.min) + ")", bad: false, pid: is.pid };
      case "never": return { t: where + ": " + P(is.a) + " and " + P(is.b) + " shouldn't work together", bad: true, key: is.key };
      case "overlap": return { t: P(is.pid) + " is double-booked", bad: true, pid: is.pid };
      case "double": return { t: P(is.pid) + " has two shifts in one day", bad: false, pid: is.pid };
      case "rest": return { t: P(is.pid) + " has a short turnaround between shifts", bad: true, pid: is.pid };
      case "unavailable": return { t: where + ": " + P(is.pid) + " isn't available", bad: true, key: is.key };
    }
    return { t: is.type, bad: false };
  }

  /* ------------------------------------------------------------------
     Render
     ------------------------------------------------------------------ */
  var app = $("#app");
  // Panels slide in once. The screen is redrawn on every change, so remember when each panel
  // first appeared: a redraw during the slide resumes it, and after that it stays still.
  var shownDrawer = null, shownModal = null, drawerAt = 0, modalAt = 0;
  function nowMs() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function animAttr(key, shown, at) {
    if (!key || key !== shown) return "";
    var t = nowMs() - at;
    return t > 260 ? " still" : '" style="--ad:-' + Math.round(t) + 'ms';
  }
  function overlayKey(o) { return o ? [o.type, o.s, o.p, o.k].join("|") : null; }
  function render() {
    var main = $(".main"), y = main ? main.scrollTop : 0;
    var db = $(".drawer-body"), dy = db ? db.scrollTop : 0, mb = $(".modal"), my = mb ? mb.scrollTop : 0;
    var html;
    applyTheme();
    if (CLOUD && SACloud.status !== "owner" && SACloud.status !== "employee") html = renderAuth();
    else if (CLOUD && SACloud.status === "employee") html = renderEmployee();
    else if (S.setup !== "done") html = renderOnboarding();
    else if (S.ui.viewAs && person(S.ui.viewAs)) html = renderEmployee();
    else { S.ui.viewAs = null; html = renderFrame(); }
    html += renderOverlays();
    if (access().state === "locked") html += renderLock();
    app.innerHTML = html; nameFields(app);
    var m2 = $(".main"); if (m2) m2.scrollTop = y;
    var dk = overlayKey(T.drawer), mk = overlayKey(T.modal);
    if (dk && dk === shownDrawer) { var db2 = $(".drawer-body"); if (db2) db2.scrollTop = dy; }
    if (mk && mk === shownModal) { var mb2 = $(".modal"); if (mb2) mb2.scrollTop = my; }
    if (dk !== shownDrawer) drawerAt = nowMs();
    if (mk !== shownModal) modalAt = nowMs();
    shownDrawer = dk; shownModal = mk;
    var lg = document.getElementById("chat-log"); if (lg) lg.scrollTop = lg.scrollHeight;
    if (T.helper && T.helperFocus) { var hi = document.getElementById("helper-in"); if (hi && !hi.disabled) { hi.focus(); hi.setSelectionRange(hi.value.length, hi.value.length); } }
    positionPop();
    save();
  }

  function renderOverlays() {
    var h = "";
    var still = animAttr(overlayKey(T.drawer), shownDrawer, drawerAt);
    if (T.drawer) h += '<div class="scrim' + still + '" data-act="close"></div><aside class="drawer' + still + '" role="dialog" aria-modal="true">' + renderDrawer() + "</aside>";
    var mstill = animAttr(overlayKey(T.modal), shownModal, modalAt);
    if (T.modal) h += '<div class="scrim' + mstill + '" data-act="close"></div><div class="modal-wrap' + mstill + '" data-act="close-self"><div class="modal" role="dialog" aria-modal="true">' + renderModal() + "</div></div>";
    if (T.pop) h += '<div class="scrim" style="background:transparent" data-act="close-pop"></div><div class="pop" id="pop">' + renderPop() + "</div>";
    return h;
  }

  /* ------------------------------------------------------------------
     Plans: free trial, then pay once or monthly (see config.js and firestore.rules)
     ------------------------------------------------------------------ */
  function access() { return CLOUD && SACloud.status === "owner" && SACloud.access ? SACloud.access() : { state: "local" }; }
  function planCards() {
    var cfg = window.SA_BILLING || {}, plans = cfg.plans || [];
    if (!plans.length) return "";
    return '<div class="plans">' + plans.map(function (pl) {
      var url = SACloud.checkoutUrl(pl.url);
      return '<div class="plan"><b>' + esc(pl.label) + '</b><div class="price"><span class="tnum">' + esc(pl.price) + "</span> <small>" + esc(pl.per || "") + "</small></div><p>" + esc(pl.note || "") + "</p>" +
        (url ? '<a class="btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener">Choose ' + esc(pl.label.toLowerCase()) + "</a>"
          : '<span class="faint" style="font-size:12.5px">Checkout opens soon. Email ' + esc(cfg.contact || "us") + " to get started.</span>") + "</div>";
    }).join("") + "</div>";
  }
  function planSection() {
    var a = access(), cfg = window.SA_BILLING || {}, txt;
    if (a.state === "paid") txt = "<b>" + (a.plan === "monthly" ? "Monthly plan" : "Paid. Thank you!") + "</b><span>" + (a.plan === "monthly" ? "Your subscription is active." : "You own Scheduling Agent. Updates to version 1 are included.") + "</span>";
    else if (a.state === "trial") txt = "<b>Free trial: " + plural(a.days, "day") + " left</b><span>Everything works. Choose a plan any time to keep editing after the trial.</span>";
    else if (a.state === "legacy") txt = "<b>Early access</b><span>This workspace was created before plans existed, so it stays open.</span>";
    else txt = "<b>Trial ended</b><span>Choose a plan to keep editing.</span>";
    var ai = CLOUD ? SACloud.aiAccess() : { state: "local" }, acfg = cfg.ai || {}, aurl = CLOUD ? SACloud.checkoutUrl(acfg.url) : null, arow = "";
    if (CLOUD && acfg.price) {
      var at = ai.state === "yes" ? "<b>Helper: on</b><span>Ask about your week in plain words.</span>"
        : ai.state === "trial" ? "<b>Helper: free for " + plural(ai.days, "more day") + "</b><span>After the trial it's " + esc(acfg.price) + " " + esc(acfg.per || "") + ".</span>"
        : "<b>Helper: " + esc(acfg.price) + " " + esc(acfg.per || "") + "</b><span>" + esc(acfg.note || "") + "</span>";
      arow = '<div class="set-row"><div class="txt">' + at + "</div>" + (ai.state === "needs-addon" ? (aurl ? '<a class="btn btn-sm btn-primary" href="' + esc(aurl) + '" target="_blank" rel="noopener">Add</a>' : '<span class="faint" style="font-size:12.5px">Checkout opens soon</span>') : "") + "</div>";
    }
    return '<div class="set-section"><h2>Plan</h2><div class="card set-list"><div class="set-row"><div class="txt">' + txt + "</div></div>" +
      (a.state === "paid" || a.state === "legacy" ? "" : '<div class="set-row" style="display:block">' + planCards() + "</div>") + arow + "</div></div>";
  }
  function renderLock() {
    var cfg = window.SA_BILLING || {};
    return '<div class="lock-wrap"><div class="card lock"><h2>Your free trial has ended</h2>' +
      "<p>Your schedule, team and shifts are safe. Choose a plan to keep editing. Your team can still see published schedules.</p>" + planCards() +
      '<div class="row" style="margin-top:14px"><button class="btn btn-sm" data-act="reload">I\'ve paid, refresh</button><button class="btn btn-sm" data-act="backup">' + icon("download") + 'Download my data</button><span class="spacer"></span><button class="btn btn-sm btn-ghost" data-act="sign-out">Sign out</button></div>' +
      '<p class="faint" style="font-size:12px;margin:10px 0 0">Questions? ' + esc(cfg.contact || "") + "</p></div></div>";
  }

  function renderFrame() {
    var view = S.ui.view;
    var nav = [
      ["schedule", "Schedule", "calendar"], ["availability", "Availability", "clock"], ["team", "Team", "users"], ["shifts", "Shifts", "layers"]
    ];
    if (pairsOn()) nav.push(["pairings", "Pairings", "link"]);
    if (S.features.rescue) nav.push(["cover", "Shift cover", "lifebuoy"]);
    var openReq = 0;
    if (S.features.rescue) Object.keys(S.weeks).forEach(function (k) { (S.weeks[k].requests || []).forEach(function (r) { if (r.status === "open") openReq++; }); });
    if (!nav.some(function (n) { return n[0] === view; }) && view !== "settings") view = S.ui.view = "schedule";

    var h = '<div class="frame">';
    h += '<header class="topbar' + (companyHTML() ? " has-co" : "") + '">' +
      '<a class="brand" href="#" data-act="nav" data-v="schedule"><span class="mark"><svg viewBox="0 0 28 28" aria-hidden="true"><use href="#o-mark"/></svg></span><span><b>Scheduling Agent</b><small>by Ares</small></span></a>' +
      companyHTML() +
      '<span class="top-spacer"></span>' +
      (access().state === "trial" ? '<button class="pill ' + (access().days <= 3 ? "pill-warn" : "pill-draft") + '" style="border:0" data-act="nav" data-v="settings" title="See plans">Trial: ' + access().days + (access().days === 1 ? " day" : " days") + " left</button>" : "") +
      '<button class="pill pill-accent" style="border:0" data-act="nav" data-v="settings" title="Change in Settings">' + modeName() + "</button>" +
      '<label class="viewas"><span>View as</span><select class="input input-sm" data-change="viewas" aria-label="View as">' +
      '<option value="">Owner (you)</option>' +
      S.people.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + "</option>"; }).join("") +
      "</select></label></header>";
    h += '<nav class="sidenav" aria-label="Sections">';
    nav.forEach(function (n) {
      h += '<button class="navi' + (view === n[0] ? " on" : "") + '" data-act="nav" data-v="' + n[0] + '">' + icon(n[2]) + n[1] +
        (n[0] === "cover" && openReq ? '<span class="badge">' + openReq + "</span>" : "") + "</button>";
    });
    h += '<div class="nav-sep"></div><button class="navi' + (view === "settings" ? " on" : "") + '" data-act="nav" data-v="settings">' + icon("settings") + "Settings</button>";
    h += '<div class="nav-foot">' + (CLOUD ? (SACloud.error ? '<span style="color:var(--bad)">' + esc(SACloud.error) + "</span>" : SACloud.saving ? "Saving…" : "All changes saved to your account.") : (DEMO ? "Demo with sample data. Erased when you close this tab." : "Saved in this browser only. Connect an account in Settings.")) + "</div></nav>";
    h += '<main class="main" id="main">' + ({ schedule: viewSchedule, availability: viewAvailability, team: viewTeam, shifts: viewShifts, pairings: viewPairings, cover: viewCover, settings: viewSettings }[view])() + "</main>";
    h += "</div>";
    if (S.features.ai) h += renderHelper();
    return h;
  }

  function weekNav() {
    var key = weekKey();
    return '<div class="weeknav"><button class="btn btn-icon btn-ghost" data-act="week" data-d="-7" aria-label="Previous week">' + icon("left") + "</button>" +
      '<span class="label">' + weekLabel(key) + "</span>" +
      '<button class="btn btn-icon btn-ghost" data-act="week" data-d="7" aria-label="Next week">' + icon("right") + "</button>" +
      '<button class="btn btn-sm btn-ghost" data-act="week" data-d="0">Next week</button></div>';
  }
  function emptyState(ic, title, text, btn) {
    return '<div class="card"><div class="empty"><div class="ico">' + icon(ic) + "</div><h3>" + title + "</h3><p>" + text + "</p>" + (btn || "") + "</div></div>";
  }

  /* ------------------------------------------------------------------
     Schedule
     ------------------------------------------------------------------ */
  function viewSchedule() {
    var key = weekKey(), w = wk(key);
    if (ensureFixed(key)) save();
    var list = instances(key), A = analysis(key);
    var head = '<div class="page-head"><div class="page-title"><h1>Schedule</h1></div>' + weekNav() + statusPill(w) + "</div>";
    if (!S.shifts.length && !w.extra.length) return head + emptyState("layers", "Add your shifts first", "Tell us when your shifts happen and how many people each one needs. You only do this once.", '<button class="btn btn-primary" data-act="nav" data-v="shifts">' + icon("plus") + "Add shifts</button>");
    if (!S.people.length) return head + emptyState("users", "Add your team", "Add the people you schedule, with their weekly hours.", '<button class="btn btn-primary" data-act="nav" data-v="team">' + icon("plus") + "Add people</button>");

    var total = 0, filled = 0;
    list.forEach(function (it) { total += it.count; filled += Math.min(it.count, (w.assign[it.key] || []).filter(person).length); });
    var probs = A.issues.filter(function (is) { return w.generated || is.type !== "under"; }).map(function (is) { return issueText(is, key); });
    var badCount = probs.filter(function (p) { return p.bad; }).length;

    var h = head;
    h += '<div class="toolbar">' +
      '<button class="btn btn-primary" data-act="generate">' + icon("wand") + (w.generated ? "Regenerate" : "Generate schedule") + "</button>" +
      (w.generated ? '<button class="btn" data-act="clear-week">' + icon("rotate") + "Clear unlocked</button>" : "") +
      '<span class="spacer"></span>' +
      (w.status === "published" && !w.dirty ? '<button class="btn" data-act="export">' + icon("download") + "Export</button>" : "") +
      (w.status === "published" && !w.dirty ? '<button class="btn" data-act="print">' + icon("printer") + "Print</button>" : "") +
      (w.status !== "published" || w.dirty ? '<button class="btn btn-soft" data-act="review" ' + (filled ? "" : "disabled") + ">" + icon("check") + (w.dirty ? "Review and publish changes" : "Review and publish") + "</button>" : "") +
      "</div>";
    h += '<div class="summary"><span class="pill ' + (filled === total ? "pill-live" : "pill-draft") + '">' + filled + " of " + total + " spots filled</span>" +
      (probs.length ? '<span class="pill ' + (badCount ? "pill-warn" : "pill-draft") + '">' + plural(probs.length, "note") + "</span>" : "") +
      (!w.generated ? "<span>Press Generate to fill the week. You can edit anything afterwards.</span>" : "<span>Click a shift to change who's on it.</span>") + "</div>";

    var byDay = [[], [], [], [], [], [], []];
    list.forEach(function (it) { byDay[it.i].push(it); });
    var issuesByKey = {};
    A.issues.forEach(function (is) { if (is.key) (issuesByKey[is.key] = issuesByKey[is.key] || []).push(is); });
    var pidWarn = {};
    A.issues.forEach(function (is) { if (is.pid && (is.type === "over" || is.type === "overlap")) pidWarn[is.pid] = 1; });
    var today = iso(new Date());

    h += '<div class="sched-wrap"><div><div class="print-title">' + esc(S.business.name || "Schedule") + " · " + weekLabel(key) + "</div><div class=\"week-grid\">";
    weekDates(key).forEach(function (d, i) {
      var dk = iso(d);
      h += '<section class="day' + (dk === today ? " today" : "") + '"><div class="day-head"><b>' + DAY3[d.getDay()] + "</b><span>" + MONTHS[d.getMonth()] + " " + d.getDate() + "</span></div>";
      byDay[i].forEach(function (it) { h += shiftCard(it, key, issuesByKey[it.key] || [], pidWarn); });
      h += '<button class="add-shift no-print" data-act="extra-new" data-date="' + dk + '">+ Add shift</button></section>';
    });
    h += "</div></div>";

    // side: hours and notes
    h += '<div class="side-col"><div class="card card-pad"><h3>' + icon("clock") + "Hours this week</h3>";
    S.people.forEach(function (p) {
      var hrs = A.hours[p.id] || 0, mn = +p.min || 0, mx = p.max === "" || p.max == null ? 0 : +p.max, scale = Math.max(mx, hrs, mn, 1) * 1.1;
      var cls = mx && hrs > mx ? "over" : hrs < mn ? "under" : "";
      h += '<div class="hours-row"><b>' + esc(p.name) + (p.type === "fixed" ? ' <span class="faint">· set</span>' : "") + '</b><span class="tnum ' + (cls ? "" : "muted") + '">' + fmtH(hrs) + (mx || mn ? ' <span class="faint">/ ' + mn + "–" + (mx || "∞") + "</span>" : "") + "</span>" +
        '<div class="bar">' + (mx ? '<span class="range" style="left:' + (mn / scale * 100) + "%;width:" + ((mx - mn) / scale * 100) + '%"></span>' : "") +
        '<span class="fill ' + cls + '" style="width:' + Math.min(100, hrs / scale * 100) + '%"></span></div></div>';
    });
    h += "</div>";
    h += '<div class="card card-pad"><h3>' + icon("alert") + "Notes</h3>";
    if (!probs.length) h += '<p class="muted" style="font-size:13px">' + (w.generated ? "Everything checks out." : "Nothing yet.") + "</p>";
    probs = probs.map(function (p, i) { return [p, i]; }).sort(function (x, y) { return (y[0].bad ? 1 : 0) - (x[0].bad ? 1 : 0) || x[1] - y[1]; }).map(function (x) { return x[0]; }); // warnings first
    var lim = T.notesAll ? probs.length : 12;
    probs.slice(0, lim).forEach(function (p) {
      h += '<div class="issue' + (p.bad ? " bad" : "") + '">' + icon(p.bad ? "alert" : "info") + (p.key ? '<button data-act="open-shift" data-k="' + p.key + '">' + esc(p.t) + "</button>" : "<span>" + esc(p.t) + "</span>") + "</div>";
    });
    if (probs.length > 12) h += '<button class="btn btn-xs btn-ghost" style="margin-top:6px" data-act="notes-more">' + (T.notesAll ? "Show fewer" : "Show all " + probs.length) + "</button>";
    h += "</div></div></div>";
    return h;
  }

  function statusPill(w) {
    if (w.status === "published") return w.dirty ? '<span class="pill pill-warn">Published · changes not shared</span>' : '<span class="pill pill-live">' + icon("check") + "Published</span>";
    return '<span class="pill pill-draft">Draft</span>';
  }

  function shiftCard(it, key, issues, pidWarn) {
    var w = wk(key), c = pal(it.color), a = (w.assign[it.key] || []).filter(person), L = w.locks[it.key] || {};
    var unav = {}; issues.forEach(function (is) { if (is.type === "unavailable" || is.type === "never") { unav[is.pid || is.a] = 1; if (is.b) unav[is.b] = 1; } });
    var roleMiss = {}; issues.forEach(function (is) { if (is.type === "role") roleMiss[is.role] = is.missing; });
    var h = '<button class="shift" style="background:' + c.bg + ";border-color:" + c.bd + '" data-act="open-shift" data-k="' + it.key + '">';
    h += '<div class="shift-top"><span class="shift-name" style="color:' + c.fg + '">' + esc(it.name) + (it.changed ? ' <span class="changed-dot" title="Changed for this week"></span>' : "") + '</span><span class="shift-time tnum">' + fmtR(it.start, it.end) + "</span></div>";
    if (S.features.roles && it.needs.length) {
      h += '<div class="shift-meta">' + it.needs.filter(function (n) { return role(n.role); }).map(function (n) {
        return '<span class="need' + (roleMiss[n.role] ? " miss" : "") + '">' + (n.count > 1 ? n.count + "× " : "") + esc(role(n.role).name) + "</span>";
      }).join("") + "</div>";
    }
    h += '<div class="people-list">';
    a.forEach(function (pid) {
      var p = person(pid), bad = unav[pid];
      h += '<span class="person' + (bad ? " bad" : "") + '">' + (L[pid] ? icon("lock") : "") + '<span class="nm">' + esc(p.name) + "</span>" + (bad || pidWarn[pid] ? '<span class="warn">' + icon("alert") + "</span>" : "") + "</span>";
    });
    for (var k = a.length; k < it.count; k++) h += '<span class="open-slot">' + icon("plus") + "Open</span>";
    h += "</div></button>";
    return h;
  }

  /* ---------- shift drawer ---------- */
  function drawerShift(d) {
    var key = weekKey(), w = wk(key), it = instByKey(key, d.k);
    if (!it) { T.drawer = null; return ""; }
    var a = (w.assign[it.key] || []).filter(person), L = w.locks[it.key] || {};
    // this shift's own notes, plus people on it who are double-booked, over their max or short on rest
    var A = analysis(key), mine = A.issues.filter(function (is) {
      return is.key === it.key || is.a === it.key || is.b === it.key || ((is.type === "over" || is.type === "overlap") && is.pid && a.indexOf(is.pid) >= 0);
    });
    var h = '<div class="drawer-head"><div style="flex:1"><h2>' + esc(it.name) + (it.extra ? ' <span class="chip">One-off</span>' : "") + "</h2><p>" + dateLabel(it.date, true) + " · " + fmtR(it.start, it.end) + " · " + fmtH(durH(it.start, it.end)) + "</p></div>" +
      '<button class="btn btn-icon btn-ghost" data-act="close" aria-label="Close">' + icon("x") + "</button></div>";
    h += '<div class="drawer-body">';
    mine.forEach(function (is) {
      if (is.type === "unfilled") return;
      var tt = issueText(is, key).t.replace(it.name + " · " + dateLabel(it.date) + ": ", "");
      h += '<div class="note note-warn">' + icon("alert") + "<span>" + esc(tt.charAt(0).toUpperCase() + tt.slice(1)) + "</span></div>";
    });

    h += '<div class="sec"><h4>Working · ' + a.length + " of " + it.count + "</h4><div class=\"list\">";
    if (!a.length) h += '<p class="muted">No one yet.</p>';
    a.forEach(function (pid) {
      var p = person(pid), fixed = L[pid] === "fixed", locked = !!L[pid];
      h += '<div class="li">' + avatar(p) + '<div class="grow"><b>' + esc(p.name) + "</b>" + '<div class="reasons">' + roleChips(p) +
        (fixed ? '<span class="rs">Set schedule</span>' : locked ? '<span class="rs">Locked</span>' : "") +
        (!canWork(p, it, key) && !fixed ? '<span class="rs bad">Not available</span>' : "") + "</div></div>" +
        (!fixed ? '<button class="btn btn-icon btn-ghost btn-sm" data-act="lock" data-p="' + pid + '" title="' + (locked ? "Unlock: Regenerate may move them" : "Lock: Regenerate keeps them here") + '">' + icon(locked ? "lock" : "unlock") + "</button>" : "") +
        '<button class="btn btn-xs" data-act="callout" data-p="' + pid + '" title="They can\'t make it">Called out</button>' +
        '<button class="btn btn-icon btn-ghost btn-sm" data-act="unassign" data-p="' + pid + '" aria-label="Remove">' + icon("x") + "</button></div>";
    });
    h += "</div></div>";

    var open = it.count - a.length, ranked = rankFor(key, it.key);
    var calledOut = w.callouts.filter(function (c) { return c.key === it.key; }).map(function (c) { return c.pid; });
    ranked = ranked.filter(function (r) { return calledOut.indexOf(r.pid) < 0; });
    var calloutNames = w.callouts.filter(function (c) { return c.key === it.key; }).map(function (c) { var p = person(c.pid); return p ? p.name : ""; }).filter(Boolean);
    if (open > 0 || d.all) {
      var req = (w.requests || []).find(function (r) { return r.key === it.key && r.status === "open"; });
      var title = calloutNames.length && S.features.rescue ? "Find cover" : "Add someone";
      h += '<div class="sec"><h4>' + title + (calloutNames.length ? ' <span class="chip">' + esc(calloutNames.join(", ")) + " called out</span>" : "") + "</h4>";
      if (S.features.rescue && open > 0) {
        if (req) h += '<div class="note">' + icon("send") + "<span>Cover request open. Asked: " + esc(req.sent.map(function (id) { var p = person(id); return p ? p.name + (req.resp[id] === "declined" ? " (declined)" : "") : ""; }).join(", ")) + '. <a href="#" data-act="nav" data-v="cover">Manage</a></span></div>';
        else h += '<div class="row" style="margin-bottom:10px"><button class="btn btn-primary btn-sm" data-act="request" data-k="' + it.key + '">' + icon("send") + "Send cover requests</button><span class=\"faint\" style=\"font-size:12px\">" + rescueOrderText() + "</span></div>";
      }
      var shown = d.all ? ranked : ranked.slice(0, 6), rankN = 0;
      h += '<div class="list">';
      shown.forEach(function (r) {
        var p = person(r.pid), askable = S.features.rescue && canAsk(r);
        h += '<div class="li">' + (askable ? '<span class="rank-num">' + (++rankN) + "</span>" : avatar(p)) + '<div class="grow"><b>' + esc(p.name) + '</b><div class="reasons">' +
          r.reasons.slice(0, 4).map(function (x) { return '<span class="rs' + (x.good === true ? " good" : x.good === false ? " bad" : "") + '">' + esc(x.t) + "</span>"; }).join("") +
          (S.features.rescue && !optIn(p) ? '<span class="rs">No cover requests</span>' : "") + "</div></div>" +
          '<button class="btn btn-xs' + (r.ok && !r.over ? " btn-soft" : "") + '" data-act="assign" data-p="' + r.pid + '">' + (r.ok && !r.over ? "Add" : "Add anyway") + "</button></div>";
      });
      h += "</div>";
      if (ranked.length > 6) h += '<button class="btn btn-ghost btn-sm" style="margin-top:6px" data-act="drawer-all">' + (d.all ? "Show fewer" : "Show everyone (" + ranked.length + ")") + "</button>";
      h += "</div>";
    } else {
      h += '<div class="sec"><button class="btn btn-sm" data-act="drawer-all">' + icon("plus") + "Add someone extra</button></div>";
    }

    if (!d.edit && !it.changed && !it.extra) { h += '<div class="sec"><button class="btn btn-sm btn-ghost" data-act="drawer-edit">' + icon("clock") + "Change times or staffing for this day only</button></div>"; h += "</div>"; return h; }
    h += '<div class="sec"><h4>' + (it.extra ? "This shift" : "This day only") + '</h4><div class="row">' +
      timeSel("inst-start", it.start, ' aria-label="Starts"') + '<span class="faint">to</span>' + timeSel("inst-end", it.end, ' aria-label="Ends"') + "</div>" +
      '<div class="row" style="margin-top:12px"><span class="muted">People needed</span>' + stepper("inst-count", it.count) + "</div>" +
      '<div class="row" style="margin-top:14px">' +
      (it.changed ? '<button class="btn btn-sm" data-act="inst-reset">' + icon("rotate") + "Reset to usual</button>" : "") +
      '<button class="btn btn-sm btn-danger" data-act="inst-remove">' + icon("trash") + (it.extra ? "Delete this shift" : "Remove from this week") + "</button></div></div>";
    h += "</div>";
    return h;
  }
  function roleChips(p) {
    if (!S.features.roles) return "";
    return (p.roles || []).map(role).filter(Boolean).map(function (r) { var c = pal(r.color); return '<span class="rs" style="background:' + c.bg + ";color:" + c.fg + '">' + esc(r.name) + "</span>"; }).join("");
  }
  function stepper(name, v, min) {
    return '<span class="row" style="gap:4px"><button class="btn btn-icon btn-sm" data-act="step" data-n="' + name + '" data-d="-1" aria-label="Fewer">−</button>' +
      '<input class="input input-sm num tnum" type="number" min="' + (min || 0) + '" value="' + v + '" data-change="' + name + '" aria-label="Count">' +
      '<button class="btn btn-icon btn-sm" data-act="step" data-n="' + name + '" data-d="1" aria-label="More">+</button></span>';
  }
  function rescueOrderText() {
    return { one: "Asks the best match first, then the next if they decline.", top3: "Asks the top 3 at once; first to accept gets it.", all: "Asks everyone who fits at once; first to accept gets it." }[S.rescue.order];
  }

  function generate() {
    var key = weekKey(), w = wk(key);
    ensureFixed(key);
    var list = instances(key);
    if (!list.length) return toast("There are no shifts this week yet.");
    var res = SAEngine.solve(buildProblem(key), { budgetMs: 700 });
    w.assign = res.assign; w.generated = true; markEdited(w);
    var total = 0, filled = 0;
    list.forEach(function (it) { total += it.count; filled += Math.min(it.count, (w.assign[it.key] || []).length); });
    render();
    toast(filled === total ? "Done. Every spot is filled." : "Filled " + filled + " of " + total + " spots. Check the notes for the rest.");
  }

  /* ---------- publish / export ---------- */
  function modalReview() {
    var key = weekKey(), w = wk(key), list = instances(key), A = analysis(key);
    var total = 0, filled = 0, ppl = {}, hrs = 0;
    list.forEach(function (it) { var a = (w.assign[it.key] || []).filter(person); total += it.count; filled += Math.min(it.count, a.length); a.forEach(function (p) { ppl[p] = 1; hrs += durH(it.start, it.end); }); });
    var probs = A.issues.map(function (is) { return issueText(is, key); });
    probs = probs.filter(function (p) { return p.bad; }).concat(probs.filter(function (p) { return !p.bad; })); // warnings first
    var h = '<div class="modal-head"><h2>' + (w.dirty ? "Publish changes?" : "Publish this week?") + "</h2><p>" + weekLabel(key) + "</p></div>";
    h += '<div class="modal-body"><div class="stats"><div class="stat"><b class="tnum">' + filled + "/" + total + '</b><span>spots filled</span></div><div class="stat"><b class="tnum">' + Object.keys(ppl).length + '</b><span>people working</span></div><div class="stat"><b class="tnum">' + fmtH(hrs) + "</b><span>total hours</span></div></div>";
    if (probs.length) {
      h += '<div class="note note-warn">' + icon("alert") + "<div><b>" + plural(probs.length, "thing") + " to know</b><br>" + probs.slice(0, 8).map(function (p) { return esc(p.t); }).join("<br>") + (probs.length > 8 ? "<br>…and " + (probs.length - 8) + " more (see Notes)" : "") + "</div></div>";
    } else h += '<div class="note">' + icon("check") + "<span>No problems found. Everyone is within their hours and rules.</span></div>";
    h += '<div class="note">' + icon("info") + "<span>After publishing you can download a calendar file, print, or export a spreadsheet. Once sign-in is connected, your team will see it on their phones. For now, preview that with <b>View as</b>.</span></div></div>";
    h += '<div class="modal-foot"><button class="btn" data-act="close">Keep editing</button><button class="btn btn-primary" data-act="publish">' + icon("check") + "Publish</button></div>";
    return h;
  }
  function publish() {
    var w = wk(weekKey());
    w.status = "published"; w.dirty = false; w.pub = pubSnapshot(weekKey());
    T.modal = { type: "export", fmt: "ics", who: "" };
    render(); toast("Published. Download or print it below.");
  }
  function modalExport() {
    var m = T.modal, key = weekKey();
    var h = '<div class="modal-head"><h2>Export this week</h2><p>' + weekLabel(key) + "</p></div><div class=\"modal-body\">";
    h += '<div class="choice-grid" style="grid-template-columns:repeat(3,1fr)">' +
      [["ics", "calendar", "Calendar file", "Opens in Google, Apple or Outlook calendar"], ["csv", "file", "Spreadsheet", "A .csv file for Excel or Sheets"], ["print", "printer", "Print", "A printable week view"]].map(function (o) {
        return '<button class="choice' + (m.fmt === o[0] ? " on" : "") + '" data-act="exp-fmt" data-v="' + o[0] + '"><span class="ico">' + icon(o[1]) + "</span><b>" + o[2] + "</b><span>" + o[3] + "</span></button>";
      }).join("") + "</div>";
    if (m.fmt !== "print") h += '<label class="field"><span>Whose shifts</span><select class="input" data-change="exp-who"><option value="">Everyone</option>' + S.people.map(function (p) { return '<option value="' + p.id + '"' + (m.who === p.id ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></label>";
    if (m.fmt === "ics") h += '<p class="faint" style="font-size:12.5px">Live calendar links that update automatically arrive with the full app.</p>';
    h += '</div><div class="modal-foot"><button class="btn" data-act="close">Done</button><button class="btn btn-primary" data-act="exp-go">' + icon(m.fmt === "print" ? "printer" : "download") + (m.fmt === "print" ? "Print" : "Download") + "</button></div>";
    return h;
  }
  // what the team sees: a frozen copy of the week, so drafts never leak out
  function pubSnapshot(key) {
    var w = wk(key), shifts = [], names = {};
    S.people.forEach(function (p) { names[p.id] = p.name; });
    instances(key).forEach(function (it) {
      shifts.push({ key: it.key, date: it.date, dow: it.dow, i: it.i, name: it.name, start: it.start, end: it.end, color: it.color, people: (w.assign[it.key] || []).filter(person) });
    });
    return { at: Date.now(), shifts: shifts, names: names };
  }
  function pubEdit(w, k, fn) { if (w.pub && w.pub.shifts) w.pub.shifts.forEach(function (x) { if (x.key === k) fn(x.people); }); }
  function shiftsFor(key, pid, usePub) {
    var w = wk(key), out = [];
    if (usePub && w.pub && w.pub.shifts) {
      w.pub.shifts.forEach(function (it) { (it.people || []).forEach(function (id) { if (!pid || id === pid) out.push({ it: it, pid: id }); }); });
      return out.filter(function (x) { return person(x.pid); });
    }
    var src = usePub && w.pub && w.pub.assign ? w.pub.assign : w.assign;
    instances(key).forEach(function (it) {
      (src[it.key] || []).forEach(function (id) { if ((!pid || id === pid) && person(id)) out.push({ it: it, pid: id }); });
    });
    return out;
  }
  function icsText(key, pid) {
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ares Web Services//Scheduling Agent//EN", "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:" + icsEsc((S.business.name || "Work") + " shifts")];
    try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz) L.push("X-WR-TIMEZONE:" + tz); } catch (e) { }
    shiftsFor(key, pid, true).forEach(function (x) {
      var d = parseISO(x.it.date), s = toMin(x.it.start), e = toMin(x.it.end), end = e <= s ? addDays(d, 1) : d;
      var p = person(x.pid);
      L.push("BEGIN:VEVENT", "UID:" + x.it.key.replace("|", "-") + "-" + x.pid + "@ares-web.com", "DTSTAMP:" + stamp,
        "DTSTART:" + iso(d).replace(/-/g, "") + "T" + fromMin(s).replace(":", "") + "00",
        "DTEND:" + iso(end).replace(/-/g, "") + "T" + fromMin(e).replace(":", "") + "00",
        "SUMMARY:" + icsEsc(pid ? x.it.name + " shift" + (S.business.name ? " · " + S.business.name : "") : p.name + ": " + x.it.name),
        "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.join("\r\n") + "\r\n";
  }
  function icsEsc(s) { return String(s).replace(/[\;,]/g, function (c) { return "\\" + c; }); }
  function csvText(key, pid) {
    var rows = [["Date", "Day", "Shift", "Start", "End", "Hours", "Employee", "Roles"]];
    shiftsFor(key, pid, true).forEach(function (x) {
      var p = person(x.pid);
      rows.push([x.it.date, DAYS[x.it.dow], x.it.name, x.it.start, x.it.end, durH(x.it.start, x.it.end), p.name,
        (p.roles || []).map(role).filter(Boolean).map(function (r) { return r.name; }).join("; ")]);
    });
    return "\ufeff" + rows.map(function (r) { return r.map(function (c) { c = String(c); if (/^[=+\-@]/.test(c) && isNaN(+c)) c = "'" + c; return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(","); }).join("\n") + "\n";
  }
  function exportGo() {
    var m = T.modal, key = weekKey(), who = m.who ? person(m.who) : null, base = "schedule-" + key + (who ? "-" + who.name.toLowerCase().replace(/\W+/g, "-") : "");
    if (m.fmt === "print") { T.modal = null; S.ui.view = "schedule"; render(); setTimeout(function () { window.print(); }, 50); return; }
    if (m.fmt === "ics") download(base + ".ics", icsText(key, m.who), "text/calendar");
    else download(base + ".csv", csvText(key, m.who), "text/csv");
    toast("Downloaded.");
  }

  /* ------------------------------------------------------------------
     Availability
     ------------------------------------------------------------------ */
  function viewAvailability() {
    var key = weekKey(), w = wk(key), dates = weekDates(key);
    var h = '<div class="page-head"><div class="page-title"><h1>Availability</h1><p>When each person can work this week. Click a box to change it.</p></div>' + weekNav() + "</div>";
    if (!S.people.length) return h + emptyState("users", "Add your team first", "Availability is collected per person.", '<button class="btn btn-primary" data-act="nav" data-v="team">' + icon("plus") + "Add people</button>");
    h += '<div class="toolbar">' +
      '<button class="btn" data-act="copy-last">' + icon("copy") + "Copy last week</button>" +
      '<button class="btn" data-act="import" data-kind="avail">' + icon("upload") + "Import spreadsheet</button>" +
      '<button class="btn" data-act="ask-team">' + icon("send") + "Ask your team</button>" +
      '<button class="btn btn-ghost" data-act="fill-any">' + icon("check") + "Fill blanks with Any time</button>" +
      '<span class="spacer"></span><div class="legend"><span><i class="av-any"></i>Any time</span><span><i class="av-win"></i>Certain hours</span><span><i class="av-off"></i>Off</span><span><i class="av-none"></i>Not set</span><span><i style="background:var(--accent);border:0;border-radius:50%;width:8px;height:8px"></i>From their usual week</span></div></div>';
    h += '<div class="card table-card"><div class="tbl-scroll"><table class="tbl av-grid"><thead><tr><th>Person</th>' +
      dates.map(function (d) { return "<th>" + DAY3[d.getDay()] + ' <span class="faint">' + d.getDate() + "</span></th>"; }).join("") + "</tr></thead><tbody>";
    S.people.forEach(function (p) {
      var sub = w.submitted[p.id], src = sub ? '<span class="pill pill-live" style="height:20px;font-size:11px">Sent by ' + esc(p.name.split(" ")[0]) + "</span>" : "";
      h += '<tr><td class="name-cell"><div class="who">' + avatar(p) + "<div>" + esc(p.name) + "<div>" + (p.type === "fixed" ? '<span class="faint" style="font-size:12px;font-weight:500">Set schedule</span>' : src) + "</div></div></div></td>";
      dates.forEach(function (d) {
        var dk = iso(d), r = availOf(p, key, dk), v = r.v;
        var cls = !v ? "av-none" : v.s === "any" ? "av-any" : v.s === "off" ? "av-off" : "av-win";
        h += '<td class="cellwrap"><button class="av-cell ' + cls + (r.src === "pattern" ? " from-pattern" : "") + '" data-act="av-pop" data-p="' + p.id + '" data-d="' + dk + '">' +
          (r.src === "pattern" ? '<span class="src" title="From their usual week"></span>' : "") + esc(v ? availText(v) : S.business.missingAvail === "unavailable" ? "Not set" : "Not set") + "</button></td>";
      });
      h += "</tr>";
    });
    h += "</tbody></table></div></div>";
    var missing = S.people.filter(function (p) { return p.type !== "fixed" && dates.every(function (d) { return availOf(p, key, iso(d)).src === "none"; }); });
    if (missing.length) h += '<div class="note" style="margin-top:14px">' + icon("info") + "<span>" + esc(missing.map(function (p) { return p.name; }).join(", ")) + (missing.length === 1 ? " hasn't" : " haven't") + " given availability for this week. " +
      (S.business.missingAvail === "unavailable" ? "They won't be scheduled until you add it." : "They're treated as available any time. You can change that in Settings.") + "</span></div>";
    return h;
  }
  function renderPop() {
    if (T.pop.dow != null) return renderPatternPop();
    var p = person(T.pop.p), key = weekKey(), dk = T.pop.d, r = availOf(p, key, dk), v = r.v || {}, dow = parseISO(dk).getDay();
    var win = T.pop.win || (v.s === "win" ? { from: v.from, to: v.to } : { from: "09:00", to: "15:00" });
    var h = '<div style="padding:2px 6px 4px"><b>' + esc(p.name) + '</b><div class="faint" style="font-size:12px">' + dateLabel(dk, true) + "</div></div>";
    h += '<button class="pop-opt' + (v.s === "any" ? " on" : "") + '" data-act="av-set" data-s="any"><i class="av-any"></i>Any time</button>';
    h += '<button class="pop-opt' + (v.s === "off" ? " on" : "") + '" data-act="av-set" data-s="off"><i class="av-off"></i>Off</button>';
    h += '<div class="pop-opt' + (v.s === "win" ? " on" : "") + '" style="cursor:default"><i class="av-win"></i>Only between</div>' +
      '<div class="times">' + timeSel("pop-from", win.from, ' aria-label="From"') + '<span class="faint">–</span>' + timeSel("pop-to", win.to, ' aria-label="To"') + '<button class="btn btn-xs btn-soft" data-act="av-set" data-s="win">Set</button></div>';
    h += '<label class="chk"><input type="checkbox" data-change="pop-usual"' + (T.pop.usual ? " checked" : "") + "> Make this their usual " + DAYS[dow] + "</label>";
    if (r.src === "week" || r.src === "employee") h += '<button class="pop-opt" data-act="av-set" data-s="clear">' + icon("rotate") + (p.pattern && p.pattern[dow] ? "Use their usual " + DAYS[dow] : "Clear") + "</button>";
    return h;
  }
  function renderPatternPop() {
    var p = person(T.pop.p), dow = +T.pop.dow, v = (p.pattern || {})[dow] || {};
    var win = T.pop.win || (v.s === "win" ? { from: v.from, to: v.to } : { from: "09:00", to: "15:00" });
    return '<div style="padding:2px 6px 4px"><b>Usual ' + DAYS[dow] + '</b><div class="faint" style="font-size:12px">' + esc(p.name) + "</div></div>" +
      '<button class="pop-opt' + (v.s === "any" ? " on" : "") + '" data-act="av-set" data-s="any"><i class="av-any"></i>Any time</button>' +
      '<button class="pop-opt' + (v.s === "off" ? " on" : "") + '" data-act="av-set" data-s="off"><i class="av-off"></i>Off</button>' +
      '<div class="pop-opt' + (v.s === "win" ? " on" : "") + '" style="cursor:default"><i class="av-win"></i>Only between</div>' +
      '<div class="times">' + timeSel("pop-from", win.from, ' aria-label="From"') + '<span class="faint">–</span>' + timeSel("pop-to", win.to, ' aria-label="To"') + '<button class="btn btn-xs btn-soft" data-act="av-set" data-s="win">Set</button></div>' +
      '<button class="pop-opt' + (!v.s ? " on" : "") + '" data-act="av-set" data-s="clear"><i class="av-none"></i>No usual, decide each week</button>';
  }
  function positionPop() {
    var el = $("#pop"); if (!el || !T.pop) return;
    var x = T.pop.x, y = T.pop.y, r = el.getBoundingClientRect();
    if (x + r.width > innerWidth - 8) x = innerWidth - r.width - 8;
    if (y + r.height > innerHeight - 8) y = Math.max(8, T.pop.top - r.height - 6);
    el.style.left = Math.max(8, x) + "px"; el.style.top = y + "px";
  }
  function setAvail(pid, dk, v, usual) {
    var key = weekKey(), w = wk(key), p = person(pid), dow = parseISO(dk).getDay();
    w.avail[pid] = w.avail[pid] || {};
    if (v) w.avail[pid][dk] = v; else delete w.avail[pid][dk];
    if (usual && v) { p.pattern = p.pattern || {}; p.pattern[dow] = v; }
  }

  /* ------------------------------------------------------------------
     Team
     ------------------------------------------------------------------ */
  function viewTeam() {
    var h = '<div class="page-head"><div class="page-title"><h1>Team</h1><p>Everyone you schedule, with their hours' + (S.features.roles ? " and roles" : "") + ".</p></div>" +
      '<button class="btn" data-act="import" data-kind="team">' + icon("upload") + "Import spreadsheet</button>" +
      '<button class="btn btn-primary" data-act="person-new">' + icon("plus") + "Add person</button></div>";
    if (!S.people.length) return h + emptyState("users", "No one here yet", "Add people one at a time, or import a spreadsheet with names and hours.", '<button class="btn btn-primary" data-act="person-new">' + icon("plus") + "Add person</button>");
    h += '<div class="card table-card"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Name</th>' + (S.features.roles ? "<th>Roles</th>" : "") +
      "<th>Hours per week</th><th>Schedule</th><th>Usual availability</th>" + (S.features.preferences ? "<th>Preferences</th>" : "") + (S.features.rescue ? "<th>Cover requests</th>" : "") + (CLOUD ? "<th>Team app</th>" : "") + "</tr></thead><tbody>";
    S.people.forEach(function (p) {
      var pat = p.pattern ? Object.keys(p.pattern).length : 0;
      var prefs = Object.keys(p.prefs || {}).filter(function (k) { return p.prefs[k] && tpl(k); });
      h += '<tr class="click" data-act="person-open" data-p="' + p.id + '"><td><div class="who">' + avatar(p) + '<span class="name-cell">' + esc(p.name) + "</span></div></td>" +
        (S.features.roles ? '<td><div class="reasons">' + (roleChips(p) || '<span class="faint">None</span>') + "</div></td>" : "") +
        '<td class="tnum">' + (p.min || 0) + "–" + (p.max === "" || p.max == null ? "any" : p.max) + "h</td>" +
        "<td>" + (p.type === "fixed" ? '<span class="chip">Set schedule</span>' : '<span class="muted">Part-time</span>') + "</td>" +
        '<td class="muted">' + (pat ? plural(pat, "day") + " set" : "Week by week") + "</td>" +
        (S.features.preferences ? '<td class="muted">' + (prefs.length ? prefs.map(function (k) { return (p.prefs[k] === "prefer" ? "♥ " : "✕ ") + esc(tpl(k).name); }).join(", ") : "None") + "</td>" : "") +
        (S.features.rescue ? "<td>" + (optIn(p) ? '<span class="muted">On</span>' : '<span class="faint">Off</span>') + "</td>" : "") +
        (CLOUD ? "<td>" + (p.joined ? '<span class="rs good">Joined</span>' : '<button class="btn btn-xs btn-soft" data-act="invite" data-p="' + p.id + '">Invite</button>') + "</td>" : "") + "</tr>";
    });
    h += "</tbody></table></div></div>";
    return h;
  }
  function newPerson(name) {
    var p = { id: uid(), name: name || "", roles: [], min: 0, max: 30, type: "part", fixed: {}, pattern: null, prefs: {}, rescueOptIn: true };
    S.people.push(p); return p;
  }
  function drawerPerson(d) {
    var p = person(d.p); if (!p) { T.drawer = null; return ""; }
    var h = '<div class="drawer-head">' + avatar(p, 40) + '<div style="flex:1"><h2>' + esc(p.name || "New person") + "</h2><p>" + (p.type === "fixed" ? "Set schedule" : "Part-time") + "</p></div>" +
      '<button class="btn btn-icon btn-ghost" data-act="close" aria-label="Close">' + icon("x") + "</button></div><div class=\"drawer-body\">";
    h += '<div class="sec"><label class="field"><span>Name</span><input class="input" value="' + esc(p.name) + '" data-change="p-name" placeholder="Full name" autofocus></label></div>';
    h += '<div class="sec"><h4>Hours per week</h4><div class="row"><label class="hrs">Min <input class="input input-sm num" type="number" min="0" value="' + (p.min || 0) + '" data-change="p-min"></label>' +
      '<label class="hrs">Max <input class="input input-sm num" type="number" min="0" value="' + (p.max == null ? "" : p.max) + '" data-change="p-max" placeholder="any"></label></div>' +
      '<p class="faint" style="font-size:12px;margin-top:6px">The max is never exceeded. The min is a goal; you\'ll see a note if it can\'t be met.</p></div>';
    if (S.features.roles) {
      h += '<div class="sec"><h4>Roles</h4><div class="chips">' + (S.roles.length ? S.roles.map(function (r) {
        var on = (p.roles || []).indexOf(r.id) >= 0;
        return '<button class="chip chip-toggle' + (on ? " on" : "") + '" data-act="p-role" data-r="' + r.id + '">' + (on ? icon("check") : "") + esc(r.name) + "</button>";
      }).join("") : '<span class="faint">No roles yet. Add them on the Shifts page.</span>') + "</div></div>";
    }
    h += '<div class="sec"><h4>Schedule type</h4><div class="seg"><button class="' + (p.type !== "fixed" ? "on" : "") + '" data-act="p-type" data-v="part">Part-time</button><button class="' + (p.type === "fixed" ? "on" : "") + '" data-act="p-type" data-v="fixed">Set schedule</button></div>' +
      '<p class="faint" style="font-size:12px;margin-top:6px">' + (p.type === "fixed" ? "Placed on the same shifts every week, automatically. Good for full-timers." : "Scheduled week by week around their availability.") + "</p>";
    var order = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return (S.business.weekStart + i) % 7; });
    if (p.type === "fixed") {
      if (!S.shifts.length) h += '<p class="faint" style="margin-top:10px">Add shifts first, then pick theirs here.</p>';
      else {
        h += '<p class="muted" style="font-size:12.5px;margin:12px 0 4px">Tap the shifts they always work.</p><div class="tbl-scroll"><table class="matrix"><thead><tr><th></th>' + order.map(function (d) { return "<th>" + DAY1[d] + "</th>"; }).join("") + "</tr></thead><tbody>";
        S.shifts.forEach(function (sh) {
          h += '<tr><th class="rowh">' + esc(sh.name) + "</th>" + order.map(function (d) {
            var on = ((p.fixed || {})[d] || []).indexOf(sh.id) >= 0;
            return '<td><button class="mx' + (on ? " on" : "") + '" data-act="p-fixed" data-dow="' + d + '" data-s="' + sh.id + '"' + (sh.days[d] ? "" : " disabled") + ' aria-pressed="' + on + '" aria-label="' + esc(sh.name) + " on " + DAYS[d] + '">' + icon("check") + "</button></td>";
          }).join("") + "</tr>";
        });
        h += "</tbody></table></div>";
      }
    }
    h += "</div>";
    if (p.type !== "fixed") {
      h += '<div class="sec"><h4>Usual week <span class="chip">Optional</span></h4><p class="faint" style="font-size:12px;margin:-4px 0 10px">Fills in their availability every week. You can still change any single week.</p><div class="mini-week">' +
        order.map(function (d) { return '<span class="lbl">' + DAY3[d] + "</span>"; }).join("") +
        order.map(function (d) {
          var v = (p.pattern || {})[d], cls = !v ? "av-none" : v.s === "any" ? "av-any" : v.s === "off" ? "av-off" : "av-win";
          return '<button class="av-cell ' + cls + '" data-act="av-pop" data-p="' + p.id + '" data-dow="' + d + '">' + (!v ? "—" : v.s === "any" ? "Any" : v.s === "off" ? "Off" : fmtT(v.from) + "<br>" + fmtT(v.to)) + "</button>";
        }).join("") + "</div></div>";
    }
    if (S.features.preferences && S.shifts.length) {
      h += '<div class="sec"><h4>Shift preferences</h4><div class="list">';
      S.shifts.forEach(function (s) {
        var v = (p.prefs || {})[s.id] || "";
        h += '<div class="row"><span style="flex:1;font-weight:600">' + esc(s.name) + ' <span class="faint" style="font-weight:500">' + fmtR(s.start, s.end) + '</span></span><div class="seg">' +
          [["prefer", "Prefers"], ["", "Neutral"], ["avoid", "Avoids"]].map(function (o) { return '<button class="' + (v === o[0] ? "on" : "") + '" data-act="p-pref" data-s="' + s.id + '" data-v="' + o[0] + '">' + o[1] + "</button>"; }).join("") + "</div></div>";
      });
      h += "</div></div>";
    }
    if (S.features.rescue) h += '<div class="sec"><div class="row"><div style="flex:1"><b>Shift cover requests</b><div class="faint" style="font-size:12px">They can also change this themselves.</div></div><label class="switch"><input type="checkbox" data-change="p-optin"' + (optIn(p) ? " checked" : "") + "><span></span></label></div></div>";
    if (CLOUD) h += '<div class="sec"><div class="row"><div style="flex:1"><b>Team app</b><div class="faint" style="font-size:12px">' + (p.joined ? "Joined" + (typeof p.joined === "string" ? " as " + esc(p.joined) : "") + "." : "Send them a link to see their shifts and send availability.") + "</div></div>" +
      (p.joined ? '<span class="rs good">Joined</span>' : '<button class="btn btn-sm btn-soft" data-act="invite">' + icon("send") + "Invite</button>") + "</div></div>";
    h += '</div><div class="drawer-foot"><button class="btn btn-danger" data-act="person-del">' + icon("trash") + 'Remove</button><span style="flex:1"></span><button class="btn btn-primary" data-act="close">Done</button></div>';
    return h;
  }

  /* ------------------------------------------------------------------
     Shifts and roles
     ------------------------------------------------------------------ */
  function viewShifts() {
    var h = '<div class="page-head"><div class="page-title"><h1>Shifts</h1><p>Your usual shifts. Change any single day from the Schedule.</p></div>' +
      (!S.shifts.length ? '<button class="btn" data-act="presets">' + icon("sparkle") + "Add common cafe shifts</button>" : "") +
      '<button class="btn btn-primary" data-act="tpl-new">' + icon("plus") + "Add shift</button></div>";
    if (!S.shifts.length) h += emptyState("layers", "No shifts yet", "Add shifts like Open, Mid and Close with their times and how many people each needs.", "");
    else {
      h += '<div class="tpl-grid">';
      S.shifts.forEach(function (s) {
        var c = pal(s.color);
        h += '<button class="card tpl" style="border-left-color:' + c.fg + '" data-act="tpl-open" data-s="' + s.id + '"><h3>' + esc(s.name || "Shift") + "</h3>" +
          '<div class="muted tnum">' + fmtR(s.start, s.end) + " · " + fmtH(durH(s.start, s.end)) + "</div>" +
          '<div class="daydots">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { var dow = (S.business.weekStart + i) % 7; return '<span class="' + (s.days[dow] ? "on" : "") + '">' + DAY1[dow] + "</span>"; }).join("") + "</div>" +
          '<div class="reasons"><span class="rs">' + people(+s.count || 0) + (s.perDay && Object.keys(s.perDay).some(function (k) { return s.perDay[k] !== "" && s.perDay[k] != null; }) ? " (varies)" : "") + "</span>" +
          (S.features.roles ? (s.needs || []).filter(function (n) { return role(n.role); }).map(function (n) { var r = role(n.role), rc = pal(r.color); return '<span class="rs" style="background:' + rc.bg + ";color:" + rc.fg + '">' + (n.count > 1 ? n.count + "× " : "") + esc(r.name) + "</span>"; }).join("") : "") + "</div></button>";
      });
      h += "</div>";
    }
    if (S.features.roles) {
      h += '<div class="page-head" style="margin-top:28px"><div class="page-title"><h1 style="font-size:18px">Roles</h1><p>Tag people with roles, then require them on shifts.</p></div></div><div class="card card-pad">' + rolesEditor() + "</div>";
    }
    return h;
  }
  function rolesEditor() {
    var h = '<div class="chips" style="margin-bottom:12px">';
    S.roles.forEach(function (r) { var c = pal(r.color); h += '<span class="chip" style="background:' + c.bg + ";color:" + c.fg + '">' + esc(r.name) + '<button class="btn-ghost" style="border:0;background:none;display:flex" data-act="role-del" data-r="' + r.id + '" aria-label="Remove ' + esc(r.name) + '">' + icon("x", "x") + "</button></span>"; });
    if (!S.roles.length) h += '<span class="faint">No roles yet.</span>';
    h += '</div><div class="row"><input class="input" style="max-width:240px" placeholder="New role, e.g. Barista" data-enter="role-add" id="role-input"><button class="btn btn-sm" data-act="role-add">' + icon("plus") + "Add</button>" +
      '<span class="faint" style="font-size:12px">Ideas:</span>' + ["Manager", "Shift lead", "Barista", "Cashier", "Kitchen", "Keyholder"].filter(function (n) { return !S.roles.some(function (r) { return r.name.toLowerCase() === n.toLowerCase(); }); }).map(function (n) { return '<button class="chip chip-toggle" data-act="role-add" data-name="' + n + '">+ ' + n + "</button>"; }).join("") + "</div>";
    return h;
  }
  function addRole(name) {
    name = String(name || "").trim(); if (!name) return null;
    var ex = S.roles.find(function (r) { return r.name.toLowerCase() === name.toLowerCase(); });
    if (ex) return ex;
    var r = { id: uid(), name: name, color: S.roles.length % 7 }; S.roles.push(r); return r;
  }
  function newShift(name, start, end, count) {
    var s = { id: uid(), name: name || "Shift", start: start || "09:00", end: end || "15:00", days: [true, true, true, true, true, true, true], count: count || 2, perDay: {}, needs: [], color: SHIFT_COLORS[S.shifts.length % SHIFT_COLORS.length][0] };
    S.shifts.push(s); return s;
  }
  function drawerTpl(d) {
    var s = tpl(d.s); if (!s) { T.drawer = null; return ""; }
    var h = '<div class="drawer-head"><div style="flex:1"><h2>' + esc(s.name || "Shift") + "</h2><p>" + fmtR(s.start, s.end) + "</p></div>" +
      '<button class="btn btn-icon btn-ghost" data-act="close" aria-label="Close">' + icon("x") + "</button></div><div class=\"drawer-body\">";
    h += '<div class="sec"><label class="field"><span>Name</span><input class="input" value="' + esc(s.name) + '" data-change="t-name" placeholder="e.g. Open"></label></div>';
    h += '<div class="sec"><h4>Time</h4><div class="row">' + timeSel("t-start", s.start, ' aria-label="Starts"') + '<span class="faint">to</span>' + timeSel("t-end", s.end, ' aria-label="Ends"') + '<span class="faint">' + fmtH(durH(s.start, s.end)) + '</span></div>' + (durH(s.start, s.end) > 16 ? '<p class="faint" style="font-size:12px;margin-top:6px;color:var(--bad)">That is a very long shift. If the end time is meant to be the next morning, that is fine; otherwise check it.</p>' : "") + '</div>';
    h += '<div class="sec"><h4>Days</h4><div class="daypick">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { var dow = (S.business.weekStart + i) % 7; return '<button class="' + (s.days[dow] ? "on" : "") + '" data-act="t-day" data-dow="' + dow + '" aria-pressed="' + !!s.days[dow] + '" title="' + DAYS[dow] + '">' + DAY1[dow] + "</button>"; }).join("") + "</div></div>";
    h += '<div class="sec"><h4>People needed</h4><div class="row">' + stepper("t-count", +s.count || 0) + '<button class="btn btn-ghost btn-sm" data-act="t-perday">' + (d.perDay ? "Hide" : "Different on some days?") + "</button></div>";
    if (d.perDay) {
      h += '<div class="row" style="margin-top:10px">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { var dow = (S.business.weekStart + i) % 7; if (!s.days[dow]) return ""; var v = s.perDay && s.perDay[dow] != null ? s.perDay[dow] : ""; return '<label class="field" style="width:56px"><span>' + DAY3[dow] + '</span><input class="input input-sm num" type="number" min="0" placeholder="' + s.count + '" value="' + v + '" data-change="t-perday" data-dow="' + dow + '"></label>'; }).join("") + "</div>";
    }
    h += "</div>";
    if (S.features.roles) {
      h += '<div class="sec"><h4>Required roles</h4><div class="list">';
      (s.needs || []).forEach(function (n, i) {
        h += '<div class="row"><span class="muted">At least</span>' + '<input class="input input-sm num" type="number" min="1" value="' + n.count + '" data-change="t-need-count" data-i="' + i + '">' +
          '<select class="input input-sm" style="width:auto" data-change="t-need-role" data-i="' + i + '">' + S.roles.map(function (r) { return '<option value="' + r.id + '"' + (r.id === n.role ? " selected" : "") + ">" + esc(r.name) + "</option>"; }).join("") + "</select>" +
          '<button class="btn btn-icon btn-ghost btn-sm" data-act="t-need-del" data-i="' + i + '" aria-label="Remove">' + icon("x") + "</button></div>";
      });
      h += "</div>" + (S.roles.length ? '<button class="btn btn-sm" style="margin-top:8px" data-act="t-need-add">' + icon("plus") + "Require a role</button>" : '<p class="faint">Add roles on the Shifts page first.</p>') + "</div>";
    }
    var custom = typeof s.color === "string", sw = function (o) {
      var c = pal(o[0]), on = !custom && (+s.color || 0) === o[0];
      return '<button class="swatch shift-sw' + (on ? " on" : "") + '" data-act="t-color" data-c="' + o[0] + '" aria-label="' + o[1] + '" aria-pressed="' + on + '" title="' + o[1] + '" style="background:' + c.bg + ";border-color:" + c.fg + '"></button>';
    };
    h += '<div class="sec"><h4>Color</h4><div class="swatches shift-colors">' + SHIFT_COLORS.map(sw).join("") + '<span class="sw-sep" aria-hidden="true"></span>' + SHIFT_NEUTRALS.map(sw).join("") +
      '<span class="sw-sep" aria-hidden="true"></span><label class="swatch swatch-custom' + (custom ? " on" : "") + '" title="Pick any color"><input type="color" value="' + esc(custom ? hexOr(s.color, "#6A58D6") : "#6A58D6") + '" data-change="t-color-custom" aria-label="Pick any color"></label>' +
      (custom ? '<span class="sw-custom-chip" style="background:' + pal(s.color).bg + ";color:" + pal(s.color).fg + ";border-color:" + pal(s.color).bd + '">Custom</span>' : "") + "</div></div>";
    h += '</div><div class="drawer-foot"><button class="btn btn-danger" data-act="tpl-del">' + icon("trash") + 'Delete shift</button><span style="flex:1"></span><button class="btn btn-primary" data-act="close">Done</button></div>';
    return h;
  }

  /* ------------------------------------------------------------------
     Pairings
     ------------------------------------------------------------------ */
  function viewPairings() {
    var h = '<div class="page-head"><div class="page-title"><h1>Pairings</h1><p>Who works well together, and who shouldn\'t share a shift.</p></div></div>';
    if (S.people.length < 2) return h + emptyState("link", "Add at least two people", "Pairings connect two people on your team.", '<button class="btn btn-primary" data-act="nav" data-v="team">Go to Team</button>');
    var sections = [];
    if (S.features.avoidPairs) sections.push(["never", "Never schedule together", "Always kept on separate shifts."]);
    if (S.features.preferPairs) sections.push(["prefer", "Work well together", "Scheduled together when it fits."]);
    h += '<div class="grid2" style="align-items:start">';
    sections.forEach(function (sec) {
      var list = S.pairs.filter(function (x) { return x.type === sec[0] && person(x.a) && person(x.b); });
      h += '<div class="card card-pad"><h3 style="font-size:15px">' + sec[1] + '</h3><p class="muted" style="font-size:13px;margin-bottom:14px">' + sec[2] + '</p><div class="list">';
      if (!list.length) h += '<p class="faint">None yet.</p>';
      list.forEach(function (x) {
        h += '<div class="li">' + avatar(person(x.a)) + avatar(person(x.b)) + '<div class="grow"><b>' + esc(person(x.a).name) + (sec[0] === "never" ? " ✕ " : " + ") + esc(person(x.b).name) + "</b></div>" +
          '<button class="btn btn-icon btn-ghost btn-sm" data-act="pair-del" data-id="' + x.id + '" aria-label="Remove">' + icon("x") + "</button></div>";
      });
      var opts = S.people.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + "</option>"; }).join("");
      h += '</div><div class="row" style="margin-top:12px"><select class="input input-sm" style="flex:1" id="pa-' + sec[0] + '">' + opts + '</select><select class="input input-sm" style="flex:1" id="pb-' + sec[0] + '">' + opts.replace('value="' + S.people[1].id + '"', 'value="' + S.people[1].id + '" selected') + '</select><button class="btn btn-sm" data-act="pair-add" data-t="' + sec[0] + '">' + icon("plus") + "Add</button></div></div>";
    });
    h += "</div>";
    return h;
  }

  /* ------------------------------------------------------------------
     Shift cover (call-out rescue)
     ------------------------------------------------------------------ */
  function allRequests() {
    var out = [];
    Object.keys(S.weeks).forEach(function (wkey) { (S.weeks[wkey].requests || []).forEach(function (r) { out.push({ r: r, wkey: wkey }); }); });
    out.sort(function (a, b) { return (a.r.status === "open" ? 0 : 1) - (b.r.status === "open" ? 0 : 1) || b.r.created - a.r.created; });
    return out;
  }
  function viewCover() {
    var h = '<div class="page-head"><div class="page-title"><h1>Shift cover</h1><p>When someone calls out, mark it on the shift. We rank who can cover and ask them in order.</p></div>' +
      '<button class="btn" data-act="nav" data-v="settings">' + icon("settings") + "Cover settings</button></div>";
    var list = allRequests();
    h += '<div class="note" style="margin-bottom:16px">' + icon("info") + "<span>" + esc(rescueOrderText()) + " " + (S.rescue.showList ? "Employees can see the order they were asked in." : "Employees don't see the order.") +
      (CLOUD ? " People see requests in the Requests tab of their app." : " Until sign-in is connected, requests appear in <b>View as</b> for each person instead of on their phones.") + "</span></div>";
    if (!list.length) return h + emptyState("lifebuoy", "No cover requests yet", "Open a shift on the Schedule, press <b>Called out</b> next to someone, then <b>Send cover requests</b>.", '<button class="btn btn-primary" data-act="nav" data-v="schedule">Go to Schedule</button>');
    h += '<div class="list">';
    list.forEach(function (x) {
      var r = x.r, it = reqInfo(x), cp = person(r.calloutPid);
      if (!it) return;
      var st = { open: '<span class="pill pill-warn">Waiting</span>', filled: '<span class="pill pill-live">Covered by ' + esc((person(r.filledBy) || {}).name || "") + "</span>", none: '<span class="pill pill-draft">No one available</span>', cancelled: '<span class="pill pill-draft">Cancelled</span>' }[r.status];
      h += '<div class="card card-pad"><div class="row" style="margin-bottom:10px"><div style="flex:1"><b style="font-size:15px">' + esc(it.name) + " · " + dateLabel(it.date, true) + '</b><div class="muted" style="font-size:13px">' + fmtR(it.start, it.end) + (cp ? " · " + esc(cp.name) + " called out" : "") + "</div></div>" + st + "</div>";
      h += '<div class="list">';
      r.order.forEach(function (pid, n) {
        var p = person(pid); if (!p) return;
        var sent = r.sent.indexOf(pid) >= 0, resp = r.resp[pid];
        var s = r.filledBy === pid ? '<span class="rs good">Accepted</span>' : resp === "declined" ? '<span class="rs bad">Declined</span>' : sent ? (r.status === "open" ? '<span class="rs">Asked, waiting</span>' : '<span class="rs">Asked</span>') : '<span class="rs">Not asked yet</span>';
        h += '<div class="li"><span class="rank-num">' + (n + 1) + "</span>" + avatar(p) + '<div class="grow"><b>' + esc(p.name) + "</b></div>" + s +
          (r.status === "open" && sent && !resp ? '<button class="btn btn-xs" data-act="as-emp" data-p="' + pid + '" title="Answer as them">' + icon("eye") + "View as</button>" : "") + "</div>";
      });
      h += "</div>";
      if (r.status === "open") h += '<div class="row" style="margin-top:12px">' + (r.sent.length < r.order.length ? '<button class="btn btn-sm" data-act="req-next" data-id="' + r.id + '" data-w="' + x.wkey + '">' + icon("send") + "Ask the next person</button>" : "") +
        '<button class="btn btn-sm btn-ghost" data-act="req-cancel" data-id="' + r.id + '" data-w="' + x.wkey + '">Cancel request</button></div>';
      h += "</div>";
    });
    h += "</div>";
    return h;
  }
  function instByKeyIn(wkey, k) { var keep = S.ui.week; S.ui.week = wkey; var it = instByKey(wkey, k); S.ui.week = keep; return it; }
  function reqInfo(x) { return instByKeyIn(x.wkey, x.r.key) || x.r.info; }
  // owner side: an employee accepted from their phone, so put them on the shift
  function applyRequest(wkey, r) {
    if (r.status !== "filled" || !r.filledBy || r.applied) return false;
    var w = wk(wkey), a = w.assign[r.key] || (w.assign[r.key] = []);
    if (a.indexOf(r.filledBy) < 0) a.push(r.filledBy);
    (w.locks[r.key] = w.locks[r.key] || {})[r.filledBy] = true;
    pubEdit(w, r.key, function (pp) { if (pp.indexOf(r.filledBy) < 0) pp.push(r.filledBy); var j = r.calloutPid ? pp.indexOf(r.calloutPid) : -1; if (j >= 0) pp.splice(j, 1); });
    r.applied = true;
    return true;
  }
  function findReq(id) {
    var found = null;
    Object.keys(S.weeks).forEach(function (wkey) { (S.weeks[wkey].requests || []).forEach(function (r) { if (r.id === id) found = { r: r, wkey: wkey }; }); });
    return found;
  }
  function canAsk(x) { return x.ok && optIn(person(x.pid)) && (!S.rescue.underMaxOnly || !x.over); }
  function batchSize() { return S.rescue.order === "all" ? 999 : S.rescue.order === "top3" ? 3 : 1; }
  function sendNext(r, n) {
    var unsent = r.order.filter(function (p) { return r.sent.indexOf(p) < 0; });
    unsent.slice(0, n).forEach(function (p) { r.sent.push(p); });
    return unsent.length > 0;
  }
  function startRequest(k) {
    var key = weekKey(), w = wk(key);
    var co = w.callouts.filter(function (c) { return c.key === k; }).pop();
    var all = rankFor(key, k), ranked = all.filter(canAsk);
    if (!ranked.length) {
      var overOnly = S.rescue.underMaxOnly && all.some(function (x) { return x.ok && optIn(person(x.pid)) && x.over; });
      return toast(overOnly ? "Everyone available would go over their max hours. Add someone directly, or allow it in Settings." : "No one available can cover this shift. You can still add someone directly.");
    }
    var it = instByKey(key, k), names = {};
    ranked.forEach(function (x) { names[x.pid] = person(x.pid).name; });
    if (co && person(co.pid)) names[co.pid] = person(co.pid).name;
    var r = { id: uid(), key: k, calloutPid: co ? co.pid : null, order: ranked.map(function (x) { return x.pid; }), sent: [], resp: {}, status: "open", created: Date.now(), filledBy: null,
      batch: batchSize(), names: names, info: { date: it.date, dow: it.dow, name: it.name, start: it.start, end: it.end, color: it.color } };
    sendNext(r, batchSize());
    w.requests.push(r);
    toast("Asked " + r.sent.map(function (id) { return person(id).name; }).join(", ") + ".");
  }
  function respond(id, pid, accept) {
    var x = findReq(id); if (!x) return;
    var r = x.r, w = wk(x.wkey);
    if (r.status !== "open") return toast("This shift has already been covered.");
    if (accept) {
      var a = w.assign[r.key] || (w.assign[r.key] = []);
      if (a.indexOf(pid) < 0) a.push(pid);
      (w.locks[r.key] = w.locks[r.key] || {})[pid] = true;
      pubEdit(w, r.key, function (pp) { if (pp.indexOf(pid) < 0) pp.push(pid); var j = r.calloutPid ? pp.indexOf(r.calloutPid) : -1; if (j >= 0) pp.splice(j, 1); });
      r.status = "filled"; r.filledBy = pid; r.resp[pid] = "accepted"; r.applied = true;
      toast("Thanks! The shift is yours.");
    } else {
      r.resp[pid] = "declined";
      var waiting = r.sent.filter(function (p) { return !r.resp[p]; });
      if (!waiting.length && !sendNext(r, batchSize())) r.status = "none";
      toast("Declined. We'll ask the next person.");
    }
  }

  /* ------------------------------------------------------------------
     Settings
     ------------------------------------------------------------------ */
  function viewSettings() {
    var m = modeOf();
    var h = '<div class="page-head"><div class="page-title"><h1>Settings</h1><p>Turn features on as you need them.</p></div></div>';
    h += '<div class="set-section"><h2>Mode</h2><div class="card"><div class="set-row"><div class="txt"><b>' + modeName(m) + "</b><span>" +
      { simple: "Just the basics: names, hours, availability and shifts.", advanced: "Every feature is on.", custom: "Your own mix of features." }[m] + '</span></div><div class="seg">' +
      ["simple", "advanced"].map(function (x) { return '<button class="' + (m === x ? "on" : "") + '" data-act="mode" data-v="' + x + '">' + modeName(x) + "</button>"; }).join("") +
      (m === "custom" ? '<button class="on">Custom</button>' : "") + "</div></div></div></div>";
    h += '<div class="set-section"><h2>Features</h2><div class="card set-list">';
    FEATURES.forEach(function (f) {
      h += '<div class="set-row"><div class="txt"><b>' + f.name + (f.soon ? '<span class="soon">Full app</span>' : "") + "</b><span>" + f.desc + "</span></div>" +
        '<label class="switch"><input type="checkbox" data-change="feat" data-k="' + f.key + '"' + (S.features[f.key] ? " checked" : "") + ' aria-label="' + f.name + '"><span></span></label></div>';
    });
    h += "</div></div>";
    if (S.features.weights) {
      var sl = [["preferences", "Shift preferences", S.features.preferences], ["pairs", "Working well together", S.features.preferPairs], ["fairness", "Fair hours", S.features.fairness], ["rest", "Rest between shifts", S.features.rest], ["minHours", "Reaching minimum hours", true]];
      h += '<div class="set-section"><h2>Priorities</h2><div class="card">' + sl.map(function (x) {
        return '<div class="slider-row"' + (x[2] ? "" : ' style="opacity:.45"') + '><b style="font-size:13.5px">' + x[1] + '</b><input type="range" min="0" max="5" step="1" value="' + S.weights[x[0]] + '" data-change="weight" data-k="' + x[0] + '"' + (x[2] ? "" : " disabled") + ' aria-label="' + x[1] + '"><span class="tnum" style="font-weight:700">' + S.weights[x[0]] + "</span></div>";
      }).join("") + '<p class="faint" style="font-size:12px;padding:0 20px 14px">Rules like availability, max hours, required roles and never-together are always kept. These only decide trade-offs.</p></div></div>';
    }
    if (S.features.rescue) {
      h += '<div class="set-section"><h2>Shift cover</h2><div class="card set-list">' +
        '<div class="set-row"><div class="txt"><b>Who gets asked</b><span>' + esc(rescueOrderText()) + '</span></div><select class="input" style="width:auto" data-change="rescue-order">' +
        [["one", "Best match first, one at a time"], ["top3", "Top 3 at once"], ["all", "Everyone who fits at once"]].map(function (o) { return '<option value="' + o[0] + '"' + (S.rescue.order === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>" +
        '<div class="set-row"><div class="txt"><b>Employees can see the priority list</b><span>Shows who was asked and in what order.</span></div><label class="switch"><input type="checkbox" data-change="rescue-show"' + (S.rescue.showList ? " checked" : "") + "><span></span></label></div>" +
        '<div class="set-row"><div class="txt"><b>Only ask people under their max hours</b><span>Skips anyone the shift would push over.</span></div><label class="switch"><input type="checkbox" data-change="rescue-max"' + (S.rescue.underMaxOnly ? " checked" : "") + "><span></span></label></div>" +
        '<div class="set-row"><div class="txt"><b>Time to answer before asking the next person</b><span>Used once notifications are connected.</span></div><select class="input" style="width:auto" data-change="rescue-window">' +
        [[15, "15 minutes"], [30, "30 minutes"], [60, "1 hour"], [120, "2 hours"], [240, "4 hours"]].map(function (o) { return '<option value="' + o[0] + '"' + (+S.rescue.window === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div></div></div>";
    }
    h += '<div class="set-section"><h2>Look and branding</h2><div class="card card-pad">' + brandingHTML(false) + "</div></div>";
    h += '<div class="set-section"><h2>Business</h2><div class="card set-list">' +
      '<div class="set-row"><div class="txt"><b>Business name</b></div><input class="input" style="max-width:260px" value="' + esc(S.business.name) + '" data-change="biz-name" placeholder="e.g. Harbor Café"></div>' +
      '<div class="set-row"><div class="txt"><b>Week starts on</b></div><div class="seg"><button class="' + (S.business.weekStart === 0 ? "on" : "") + '" data-act="biz-ws" data-v="0">Sunday</button><button class="' + (S.business.weekStart === 1 ? "on" : "") + '" data-act="biz-ws" data-v="1">Monday</button></div></div>' +
      '<div class="set-row"><div class="txt"><b>Time format</b></div><div class="seg"><button class="' + (S.business.clock === 12 ? "on" : "") + '" data-act="biz-clock" data-v="12">1:00pm</button><button class="' + (S.business.clock === 24 ? "on" : "") + '" data-act="biz-clock" data-v="24">13:00</button></div></div>' +
      '<div class="set-row"><div class="txt"><b>Allow two shifts in one day</b><span>Off means at most one shift per person per day.</span></div><label class="switch"><input type="checkbox" data-change="biz-doubles"' + (S.business.allowDoubles ? " checked" : "") + "><span></span></label></div>" +
      '<div class="set-row"><div class="txt"><b>If someone hasn\'t given availability</b><span>For days with nothing entered and no usual week.</span></div><select class="input" style="width:auto" data-change="biz-missing"><option value="available"' + (S.business.missingAvail !== "unavailable" ? " selected" : "") + '>Treat as available</option><option value="unavailable"' + (S.business.missingAvail === "unavailable" ? " selected" : "") + ">Don't schedule them</option></select></div></div></div>";
    if (CLOUD) h += planSection();
    h += '<div class="set-section"><h2>Account</h2><div class="card set-list">' + (CLOUD
      ? '<div class="set-row"><div class="txt"><b>Signed in</b><span>' + esc((SACloud.user && SACloud.user.email) || "") + ". Your schedule is saved to your account and works on any device.</span></div><button class=\"btn btn-sm\" data-act=\"sign-out\">Sign out</button></div>"
      : '<div class="set-row"><div class="txt"><b>Not connected</b><span>This copy saves only in this browser. Once your Firebase settings are added to config.js, you\'ll sign in here and can invite your team.</span></div></div>') + "</div></div>";
    h += '<div class="set-section"><h2>Your data</h2><div class="card set-list">' +
      '<div class="set-row"><div class="txt"><b>Download a backup</b><span>' + (CLOUD ? "Your schedule is saved to your account. Download a copy any time; it's your data." : "Everything lives in this browser for now. Keep a backup file somewhere safe.") + '</span></div><button class="btn btn-sm" data-act="backup">' + icon("download") + "Download</button></div>" +
      '<div class="set-row"><div class="txt"><b>Restore from a backup</b><span>Replaces what\'s here with the file\'s contents.</span></div><label class="btn btn-sm">' + icon("upload") + 'Choose file<input type="file" accept=".json,application/json" data-change="restore" hidden></label></div>' +
      '<div class="set-row"><div class="txt"><b>Run setup again</b><span>Walk through the setup questions. Your team and shifts stay.</span></div><button class="btn btn-sm" data-act="rerun">Run setup</button></div>' +
      (CLOUD ? '<div class="set-row"><div class="txt"><b>Delete this workspace</b><span>Erases your business, team, schedules and account within 30 days. Download a backup first.</span></div><a class="btn btn-sm btn-danger" href="mailto:' + esc((window.SA_BILLING || {}).contact || "") + "?subject=" + encodeURIComponent("Delete my Scheduling Agent workspace") + "&body=" + encodeURIComponent("Please delete my Scheduling Agent workspace and account.\n\nAccount email: " + ((SACloud.user && SACloud.user.email) || "") + "\nWorkspace ID: " + ((SACloud.profile && SACloud.profile.bid) || "") + "\n") + '">Request deletion</a></div>' : "") +
      (CLOUD ? "" : '<div class="set-row"><div class="txt"><b>Start over</b><span>Erase everything in this browser.</span></div><button class="btn btn-sm btn-danger" data-act="reset">Erase all</button></div>') + "</div></div>";
    return h;
  }

  /* ------------------------------------------------------------------
     Employee preview ("View as")
     ------------------------------------------------------------------ */
  function renderEmployee() {
    var p = person(S.ui.viewAs), key = weekKey(), w = wk(key), tab = S.ui.empTab || "shifts";
    var reqs = allRequests().filter(function (x) { return x.r.sent.indexOf(p.id) >= 0; });
    var pending = reqs.filter(function (x) { return x.r.status === "open" && !x.r.resp[p.id]; });
    var real = !!S.ui.employee, h;
    if (real) {
      h = '<div class="frame emp-real" style="grid-template-columns:1fr"><header class="topbar"><span class="brand"><span class="mark"><svg viewBox="0 0 28 28" aria-hidden="true"><use href="#o-mark"/></svg></span><span><b>Scheduling Agent</b><small>by Ares</small></span></span><span class="top-spacer"></span>' +
        '<button class="btn btn-sm btn-ghost" data-act="sign-out">Sign out</button></header><main class="main" style="padding:0">' +
        (SACloud.error ? '<div class="note note-warn" style="margin:12px">' + icon("alert") + "<span>" + esc(SACloud.error) + "</span></div>" : "") + '<div class="emp-stage"><div class="phone">';
    } else {
      h = '<div class="frame" style="grid-template-columns:1fr"><header class="topbar"><a class="brand" href="#" data-act="exit-emp"><span class="mark"><svg viewBox="0 0 28 28" aria-hidden="true"><use href="#o-mark"/></svg></span><span><b>Scheduling Agent</b><small>by Ares</small></span></a><span class="top-spacer"></span>' +
        '<label class="viewas"><span>View as</span><select class="input input-sm" data-change="viewas"><option value="">Owner (you)</option>' + S.people.map(function (x) { return '<option value="' + x.id + '"' + (x.id === p.id ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join("") + "</select></label></header>" +
        '<main class="main" style="padding:0"><div class="emp-banner">' + icon("eye") + "<span>Preview: what " + esc(p.name) + " sees on their phone" + (CLOUD ? "" : " once sign-in is connected") + '.</span><span style="flex:1"></span><button class="btn btn-sm" data-act="exit-emp">Back to owner view</button></div><div class="emp-stage"><div class="phone">';
    }
    h += '<div class="phone-head">' + (S.brand.logo ? '<img class="co-logo" src="' + esc(safeImg(S.brand.logo)) + '" alt="">' : "") + "<small>" + esc(S.business.name || "Your workplace") + "</small><h2>Hi, " + esc(p.name.split(" ")[0]) + "</h2></div><div class=\"phone-body\">";
    if (tab === "shifts") {
      h += '<div class="row" style="justify-content:space-between"><button class="btn btn-icon btn-ghost btn-sm" data-act="week" data-d="-7" aria-label="Previous week">' + icon("left") + '</button><b>' + weekLabel(key) + '</b><button class="btn btn-icon btn-ghost btn-sm" data-act="week" data-d="7" aria-label="Next week">' + icon("right") + "</button></div>";
      if (w.status !== "published") h += '<div class="note">' + icon("clock") + "<span>This week's schedule isn't out yet. You'll get a notification when it's published.</span></div>";
      else {
        var mine = shiftsFor(key, p.id, true), hrs = 0;
        mine.forEach(function (x) { hrs += durH(x.it.start, x.it.end); });
        h += '<div class="muted" style="font-size:13px">' + plural(mine.length, "shift") + " · " + fmtH(hrs) + "</div>";
        if (!mine.length) h += '<div class="note">' + icon("info") + "<span>You're not on the schedule this week.</span></div>";
        mine.forEach(function (x) {
          var d = parseISO(x.it.date), c = pal(x.it.color);
          h += '<div class="my-shift" style="background:' + c.bg + ";border-color:" + c.bd + '"><div class="d" style="color:' + c.fg + '"><span>' + DAY3[d.getDay()] + "</span><b>" + d.getDate() + '</b></div><div style="flex:1"><b>' + esc(x.it.name) + '</b><div class="muted tnum" style="font-size:13px">' + fmtR(x.it.start, x.it.end) + "</div></div></div>";
        });
        reqs.forEach(function (x) {
          if (x.wkey !== key || x.r.filledBy !== p.id) return;
          if (mine.some(function (m) { return m.it.key === x.r.key; })) return;
          var it = reqInfo(x), d = parseISO(it.date), c = pal(it.color);
          h += '<div class="my-shift" style="background:' + c.bg + ";border-color:" + c.bd + '"><div class="d" style="color:' + c.fg + '"><span>' + DAY3[d.getDay()] + "</span><b>" + d.getDate() + '</b></div><div style="flex:1"><b>' + esc(it.name) + ' <span class="rs good">Covering</span></b><div class="muted tnum" style="font-size:13px">' + fmtR(it.start, it.end) + "</div></div></div>";
        });
        if (mine.length) h += '<button class="btn" data-act="emp-ics">' + icon("calendar") + "Add to my calendar</button>";
      }
    } else if (tab === "avail") {
      h += '<div class="row" style="justify-content:space-between"><button class="btn btn-icon btn-ghost btn-sm" data-act="week" data-d="-7" aria-label="Previous week">' + icon("left") + '</button><b>' + weekLabel(key) + '</b><button class="btn btn-icon btn-ghost btn-sm" data-act="week" data-d="7" aria-label="Next week">' + icon("right") + "</button></div>";
      if (p.type === "fixed") h += '<div class="note">' + icon("info") + "<span>You're on a set schedule, so there's nothing to fill in.</span></div>";
      else {
        h += '<p class="muted" style="font-size:13px">When can you work this week? Tap a day to change it.</p>' +
          '<div class="quick"><button class="btn btn-xs" data-act="emp-quick" data-v="any">Free all week</button>' +
          (p.pattern && Object.keys(p.pattern).length ? '<button class="btn btn-xs" data-act="emp-quick" data-v="usual">My usual week</button>' : "") +
          '<button class="btn btn-xs" data-act="emp-quick" data-v="last">Same as last week</button></div>';
        weekDates(key).forEach(function (d) {
          var dk = iso(d), v = availOf(p, key, dk).v, st = v ? v.s : "any";
          var label = st === "any" ? "Any time" : st === "off" ? "Can't work" : fmtT(v.from) + " – " + fmtT(v.to);
          h += '<div class="li" style="display:grid;gap:8px"><div class="row"><b style="flex:1">' + DAY3[d.getDay()] + ' <span class="faint" style="font-weight:500">' + MONTHS[d.getMonth()] + " " + d.getDate() + "</span></b>" +
            '<button class="av-cell ' + (st === "any" ? "av-any" : st === "off" ? "av-off" : "av-win") + '" style="width:auto;min-width:118px;padding:0 12px" data-act="emp-cycle" data-d="' + dk + '" title="Tap to change">' + esc(label) + "</button></div>" +
            (st === "win" ? '<div class="row" style="justify-content:flex-end">' + timeSel("emp-from", v.from, ' data-d="' + dk + '"') + '<span class="faint">to</span>' + timeSel("emp-to", v.to, ' data-d="' + dk + '"') + "</div>" : "") + "</div>";
        });
        h += '<button class="btn btn-primary" data-act="emp-submit">' + icon("send") + (w.submitted[p.id] ? "Update availability" : "Send to manager") + "</button>";
        if (w.submitted[p.id]) h += '<p class="faint" style="font-size:12px;text-align:center">Sent. Your manager can see it.</p>';
      }
    } else if (tab === "req") {
      if (!optIn(p)) h += '<div class="note">' + icon("bell") + "<span>You've turned off cover requests. Turn them on in Settings to get asked when someone calls out.</span></div>";
      if (!reqs.length) h += '<div class="note">' + icon("info") + "<span>No cover requests right now.</span></div>";
      reqs.forEach(function (x) {
        var r = x.r, it = reqInfo(x); if (!it) return;
        var cp = person(r.calloutPid), mineResp = r.resp[p.id];
        h += '<div class="req-card"><div><b>Can you cover ' + esc(it.name) + "?</b><div class=\"muted\" style=\"font-size:13px\">" + dateLabel(it.date, true) + " · " + fmtR(it.start, it.end) + (cp ? " · " + esc(cp.name.split(" ")[0]) + " can't make it" : "") + "</div></div>";
        if (S.rescue.showList) h += '<div class="faint" style="font-size:12px">Asked in this order: ' + r.order.slice(0, Math.max(r.sent.length, 1)).map(function (id, n) { var q = person(id); return (n + 1) + ". " + (id === p.id ? "You" : esc(q ? q.name.split(" ")[0] : "")); }).join(", ") + "</div>";
        if (r.status === "open" && !mineResp) h += '<div class="row"><button class="btn btn-primary btn-sm" style="flex:1" data-act="emp-accept" data-id="' + r.id + '">' + icon("check") + 'I can cover</button><button class="btn btn-sm" style="flex:1" data-act="emp-decline" data-id="' + r.id + '">I can\'t</button></div>';
        else h += '<span class="rs ' + (r.filledBy === p.id ? "good" : "") + '">' + (r.filledBy === p.id ? "You're covering this" : mineResp === "declined" ? "You declined" : "Already covered") + "</span>";
        h += "</div>";
      });
    } else {
      h += '<div class="li"><div class="grow"><b>Shift cover requests</b><div class="faint" style="font-size:12px">Get asked when someone calls out.</div></div><label class="switch"><input type="checkbox" data-change="emp-optin"' + (optIn(p) ? " checked" : "") + "><span></span></label></div>" +
        '<div class="li" style="opacity:.6"><div class="grow"><b>Notify me by</b><div class="faint" style="font-size:12px">Text or email, once sign-in is connected.</div></div></div>' +
        (real ? '<div class="li"><div class="grow"><b>Signed in</b><div class="faint" style="font-size:12px">' + esc((SACloud.user && SACloud.user.email) || "") + '</div></div><button class="btn btn-sm" data-act="sign-out">Sign out</button></div>'
          : '<div class="li"><div class="grow"><b>Hours</b><div class="faint" style="font-size:12px">' + (p.min || 0) + "–" + (p.max === "" || p.max == null ? "any" : p.max) + " per week, set by your manager</div></div></div>");
    }
    h += "</div>";
    var tabs = [["shifts", "My shifts", "calendar"], ["avail", "Availability", "clock"]];
    if (S.features.rescue) tabs.push(["req", "Requests", "lifebuoy"]);
    tabs.push(["set", "Settings", "settings"]);
    h += '<nav class="phone-tabs" style="grid-template-columns:repeat(' + tabs.length + ',1fr)">' + tabs.map(function (t) {
      return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="emp-tab" data-v="' + t[0] + '">' + icon(t[2]) + t[1] + (t[0] === "req" && pending.length ? '<span class="dot"></span>' : "") + "</button>";
    }).join("") + "</nav></div></div></main></div>";
    return h;
  }

  /* ------------------------------------------------------------------
     AI helper: a chat that can read this week and propose changes.
     It runs on a Firebase function (the key never reaches the browser).
     Changes are only proposed; the owner presses Apply.
     ------------------------------------------------------------------ */
  var HELPER_EX = ["Who is working Saturday?", "Give {name} Friday off and fix the schedule.", "Add a 5pm–9pm shift on Fridays for 2 people.", "Who is closest to their max hours?"];
  function chat() { return T.chat || (T.chat = { msgs: [], busy: false, draft: "", error: "" }); }
  function helperReady() { return CLOUD && SACloud.status === "owner"; }
  function needsAddon() { return CLOUD && (chat().addon || SACloud.aiAccess().state === "needs-addon"); }
  function aiAddonCard() {
    var cfg = window.SA_BILLING || {}, ai = cfg.ai || {}, url = SACloud.checkoutUrl(ai.url);
    return '<div class="note">' + icon("sparkle") + "<span><b>The helper is an add-on.</b> It was free during your trial. " + esc(ai.note || "") + "</span></div>" +
      '<div class="plan"><b>Helper</b><div class="price"><span class="tnum">' + esc(ai.price || "") + "</span> <small>" + esc(ai.per || "") + "</small></div>" +
      (url ? '<a class="btn btn-primary" href="' + esc(url) + '" target="_blank" rel="noopener">Add the helper</a>' : '<span class="faint" style="font-size:12.5px">Checkout opens soon. Email ' + esc(cfg.contact || "us") + " to add it.</span>") + "</div>";
  }

  function helperContext() {
    var key = weekKey(), w = wk(key), dates = weekDates(key).map(iso), list = instances(key);
    var A = analysis(key);
    var show = function (v) { return !v ? "unset" : v.s === "off" ? "off" : v.s === "win" ? v.from + "-" + v.to : "any"; };
    var RN = function (ids) { return (ids || []).map(function (r) { return (role(r) || {}).name; }).filter(Boolean); };
    return {
      business: S.business.name || "", week: key, weekStartsOn: DAYS[S.business.weekStart], dates: dates,
      dayNames: dates.map(function (d) { return DAYS[parseISO(d).getDay()]; }),
      roles: S.roles.map(function (r) { return { id: r.id, name: r.name }; }),
      people: S.people.map(function (p) {
        var av = {}, usual = {}, prefs = {};
        dates.forEach(function (d) { av[d] = show(availOf(p, key, d).v); });
        Object.keys(p.pattern || {}).forEach(function (dw) { usual[DAYS[dw]] = show(p.pattern[dw]); });
        Object.keys(p.prefs || {}).forEach(function (sid) { if (tpl(sid)) prefs[tpl(sid).name || sid] = p.prefs[sid]; });
        return { id: p.id, name: p.name, type: p.type === "fixed" ? "set schedule" : "part-time", roles: RN(p.roles),
          minHours: +p.min || 0, maxHours: p.max === "" || p.max == null ? null : +p.max, availability: av, usualAvailability: usual, shiftPreferences: prefs };
      }),
      templates: S.shifts.map(function (s) {
        return { id: s.id, name: s.name, start: s.start, end: s.end, days: DAYS.filter(function (d, i) { return s.days[i]; }), count: +s.count || 0,
          needs: (s.needs || []).map(function (n) { return { role: (role(n.role) || {}).name, count: n.count }; }).filter(function (n) { return n.role; }) };
      }),
      shifts: list.map(function (it) {
        var L = w.locks[it.key] || {};
        return { key: it.key, template: it.extra ? null : it.shiftId, oneOff: !!it.extra, date: it.date, day: DAYS[it.dow], name: it.name, start: it.start, end: it.end, needed: it.count,
          assigned: (w.assign[it.key] || []).filter(person), locked: Object.keys(L).filter(function (pid) { return L[pid] && person(pid); }) };
      }),
      pairs: S.pairs.filter(function (x) { return person(x.a) && person(x.b); }).map(function (x) { return { a: x.a, b: x.b, kind: x.type }; }),
      features: Object.assign({}, S.features, { allowDoubles: !!S.business.allowDoubles }),
      problems: A.issues.slice(0, 30).map(function (is) { return issueText(is, key).t; }),
      published: w.status === "published", generated: !!w.generated
    };
  }

  function ppl(n) { return n + (n === 1 ? " person" : " people"); }
  function availFrom(v) {
    if (v === "any") return { s: "any" };
    if (v === "off") return { s: "off" };
    if (v === "clear" || !v) return null;
    var m = /^(\d\d:\d\d)-(\d\d:\d\d)$/.exec(v); return m ? { s: "win", from: m[1], to: m[2] } : null;
  }
  function availWords(v) { return v === "any" ? "any time" : v === "off" ? "off" : v === "clear" ? "not set" : (function () { var m = v.split("-"); return fmtT(m[0]) + "–" + fmtT(m[1]); })(); }
  function roleIdsFor(names, create) {
    return (names || []).map(function (n) {
      var r = S.roles.find(function (x) { return x.name.toLowerCase() === String(n).toLowerCase().trim(); });
      if (!r && create) r = addRole(n);
      return r && r.id;
    }).filter(Boolean);
  }
  var FEATURE_WORDS = { roles: "Roles", preferences: "Shift preferences", avoidPairs: "Never-together pairs", preferPairs: "Work-well-together pairs", fairness: "Fair hours", rest: "Rest between shifts", rescue: "Shift cover", weights: "Priority sliders", allowDoubles: "Two shifts in one day" };

  function helperDescribe(a) {
    var P = function (id) { return (person(id) || {}).name || "someone"; };
    var key = weekKey(), inWeek = function (d) { return weekDates(key).some(function (x) { return iso(x) === d; }); };
    var T_ = function (id) { var s = tpl(id); return s ? (s.name || "Shift") : null; };
    var IT = function (k) { var it = instByKey(key, k); return it ? it.name + ", " + dateLabel(it.date) + " " + fmtT(it.start) + "–" + fmtT(it.end) : null; };
    switch (a.type) {
      case "regenerate": return { t: "Re-run the automatic scheduler (shifts you've locked stay)", ok: true };
      case "publish": return { t: "Publish " + weekLabel(key) + " to your team", ok: true, big: true };
      case "add_role": return { t: "Add the role \u201c" + a.name + "\u201d", ok: true };
      case "set_feature": return FEATURE_WORDS[a.feature] ? { t: (a.on ? "Turn on " : "Turn off ") + FEATURE_WORDS[a.feature], ok: true } : { t: "Unknown feature", ok: false };
      case "add_person": return { t: "Add " + a.name + " to the team" + (a.roles && a.roles.length ? " (" + a.roles.join(", ") + ")" : "") + (a.max != null ? ", up to " + fmtH(a.max) : ""), ok: true };
      case "add_shift": return { t: "New regular shift \u201c" + a.name + "\u201d " + fmtT(a.start) + "–" + fmtT(a.end) + ", " + (a.days.length === 7 ? "every day" : a.days.map(function (d) { return DAYS[d].slice(0, 3); }).join(" ")) + ", " + ppl(a.count), ok: true };
      case "add_extra_shift": return inWeek(a.date) ? { t: "One-off \u201c" + a.name + "\u201d on " + dateLabel(a.date) + " " + fmtT(a.start) + "–" + fmtT(a.end) + " (" + ppl(a.count) + ")", ok: true } : { t: "Extra shift outside this week", ok: false };
      case "update_shift": {
        var nm = T_(a.template); if (!nm) return { t: "A shift that no longer exists", ok: false };
        var bits = []; if (a.name) bits.push("rename to \u201c" + a.name + "\u201d"); if (a.start || a.end) bits.push((a.start ? fmtT(a.start) : fmtT(tpl(a.template).start)) + "–" + (a.end ? fmtT(a.end) : fmtT(tpl(a.template).end)));
        if (a.count != null) bits.push(ppl(a.count)); if (a.days) bits.push(a.days.length === 7 ? "every day" : a.days.map(function (d) { return DAYS[d].slice(0, 3); }).join(" ")); if (a.needs) bits.push("needs " + (a.needs.map(function (n) { return n.count + " " + n.role; }).join(", ") || "no roles"));
        return { t: "Regular shift \u201c" + nm + "\u201d: " + bits.join(", "), ok: true };
      }
      case "delete_shift": return T_(a.template) ? { t: "Delete the regular shift \u201c" + T_(a.template) + "\u201d from every week", ok: true, big: true } : { t: "A shift that no longer exists", ok: false };
      case "change_day": {
        var lbl = IT(a.shift); if (!lbl) return { t: "A shift not in this week", ok: false };
        if (a.cancel) return { t: "Cancel " + lbl, ok: true };
        var b2 = []; if (a.start || a.end) b2.push("time " + (a.start ? fmtT(a.start) : "same") + "–" + (a.end ? fmtT(a.end) : "same")); if (a.count != null) b2.push(ppl(a.count));
        return { t: lbl + ": " + b2.join(", "), ok: true };
      }
    }
    var p = person(a.person);
    if (!p) return { t: "Someone who isn't on your team", ok: false };
    switch (a.type) {
      case "time_off": var ds = (a.dates || []).filter(inWeek); return { t: P(a.person) + " off " + ds.map(function (d) { return dateLabel(d); }).join(", "), ok: ds.length > 0 };
      case "set_availability": return inWeek(a.date) ? { t: P(a.person) + " on " + dateLabel(a.date) + ": " + availWords(a.value), ok: true } : { t: "A date outside this week", ok: false };
      case "set_usual_availability": return { t: P(a.person) + ", usual " + DAYS[a.day] + "s: " + availWords(a.value), ok: true };
      case "update_person": {
        var b3 = []; if (a.name) b3.push("rename to " + a.name); if (a.roles) b3.push("roles: " + (a.roles.join(", ") || "none")); if (a.min != null || a.max != null) b3.push("hours " + (a.min != null ? fmtH(a.min) : fmtH(+p.min || 0)) + "–" + (a.max != null ? fmtH(a.max) : (p.max === "" ? "no max" : fmtH(+p.max))));
        return { t: P(a.person) + ": " + b3.join(", "), ok: true };
      }
      case "remove_person": return { t: "Remove " + P(a.person) + " from the team and every schedule", ok: true, big: true };
      case "set_pair": return person(a.other) ? { t: a.kind === "none" ? "Remove the pairing of " + P(a.person) + " and " + P(a.other) : P(a.person) + " and " + P(a.other) + (a.kind === "never" ? " never work together" : " work well together"), ok: true } : { t: "Someone who isn't on your team", ok: false };
      case "set_preference": return T_(a.template) ? { t: P(a.person) + (a.value === "none" ? " has no preference for " : a.value === "prefer" ? " prefers " : " would rather avoid ") + T_(a.template), ok: true } : { t: "A shift that no longer exists", ok: false };
    }
    var lbl2 = IT(a.shift);
    if (!lbl2) return { t: P(a.person) + " (shift not found)", ok: false };
    if (a.type === "assign") return { t: "Put " + P(a.person) + " on " + lbl2, ok: true };
    if (a.type === "unassign") return { t: "Take " + P(a.person) + " off " + lbl2, ok: true };
    if (a.type === "lock") return { t: "Lock " + P(a.person) + " onto " + lbl2, ok: true };
    if (a.type === "unlock") return { t: "Unlock " + P(a.person) + " on " + lbl2, ok: true };
    return { t: a.type, ok: false };
  }

  function removeFromShift(w, it, pid) {
    var L = w.locks[it.key] || {};
    if (L[pid] === "fixed") w.fixedSkip[it.key + "|" + pid] = true;
    w.assign[it.key] = (w.assign[it.key] || []).filter(function (x) { return x !== pid; }); delete L[pid];
  }
  function helperApply(actions) {
    var key = weekKey(), w = wk(key), n = 0, regen = false, pub = false, setupChanged = false;
    actions.forEach(function (a) {
      if (!helperDescribe(a).ok) return;
      var p = a.person ? person(a.person) : null, it, s;
      switch (a.type) {
        case "regenerate": regen = true; return;
        case "publish": pub = true; return;
        case "add_role": addRole(a.name); n++; setupChanged = true; return;
        case "set_feature": if (a.feature === "allowDoubles") S.business.allowDoubles = a.on; else S.features[a.feature] = a.on; n++; return;
        case "add_person": {
          var np = newPerson(a.name); np.roles = roleIdsFor(a.roles, true);
          if (a.min != null) np.min = a.min; if (a.max != null) np.max = a.max;
          n++; setupChanged = true; return;
        }
        case "add_shift": {
          s = newShift(a.name, a.start, a.end, a.count);
          s.days = [0, 1, 2, 3, 4, 5, 6].map(function (d) { return a.days.indexOf(d) >= 0; });
          s.needs = (a.needs || []).map(function (x) { var r = roleIdsFor([x.role], true)[0]; return r ? { role: r, count: x.count } : null; }).filter(Boolean);
          n++; setupChanged = true; return;
        }
        case "update_shift": {
          s = tpl(a.template); if (!s) return;
          if (a.name) s.name = a.name; if (a.start) s.start = a.start; if (a.end) s.end = a.end;
          if (a.count != null) { s.count = a.count; s.perDay = {}; }
          if (a.days) s.days = [0, 1, 2, 3, 4, 5, 6].map(function (d) { return a.days.indexOf(d) >= 0; });
          if (a.needs) s.needs = a.needs.map(function (x) { var r = roleIdsFor([x.role], true)[0]; return r ? { role: r, count: x.count } : null; }).filter(Boolean);
          n++; setupChanged = true; return;
        }
        case "delete_shift": S.shifts = S.shifts.filter(function (x) { return x.id !== a.template; }); S.people.forEach(function (pp) { if (pp.prefs) delete pp.prefs[a.template]; }); n++; setupChanged = true; return;
        case "add_extra_shift": w.extra.push({ id: "x" + uid(), date: a.date, name: a.name, start: a.start, end: a.end, count: a.count, needs: [] }); n++; return;
        case "change_day": {
          it = instByKey(key, a.shift); if (!it) return;
          var ex = it.extra ? w.extra.find(function (x) { return x.id === it.shiftId; }) : null;
          if (a.cancel) {
            if (ex) w.extra = w.extra.filter(function (x) { return x !== ex; }); else (w.over[it.key] = w.over[it.key] || {}).removed = true;
            delete w.assign[it.key]; delete w.locks[it.key];
          } else {
            var o = ex || (w.over[it.key] = w.over[it.key] || {});
            if (a.start) o.start = a.start; if (a.end) o.end = a.end; if (a.count != null) o.count = a.count;
          }
          n++; return;
        }
      }
      if (!p) return;
      switch (a.type) {
        case "time_off":
          (a.dates || []).forEach(function (d) {
            setAvail(p.id, d, { s: "off" });
            instances(key).forEach(function (x) {
              if (x.date !== d) return;
              removeFromShift(w, x, p.id);
              pubEdit(w, x.key, function (pp) { var j = pp.indexOf(p.id); if (j >= 0) pp.splice(j, 1); });
            });
            n++;
          });
          return;
        case "set_availability": setAvail(p.id, a.date, availFrom(a.value)); n++; return;
        case "set_usual_availability": {
          var v = availFrom(a.value); p.pattern = p.pattern || {};
          if (v) p.pattern[a.day] = v; else delete p.pattern[a.day];
          n++; return;
        }
        case "update_person":
          if (a.name) p.name = a.name; if (a.roles) p.roles = roleIdsFor(a.roles, true);
          if (a.min != null) p.min = a.min; if (a.max != null) p.max = a.max;
          n++; setupChanged = true; return;
        case "remove_person": {
          var pid = p.id;
          S.people = S.people.filter(function (x) { return x.id !== pid; });
          S.pairs = S.pairs.filter(function (x) { return x.a !== pid && x.b !== pid; });
          Object.keys(S.weeks).forEach(function (k) { var ww = S.weeks[k]; Object.keys(ww.assign || {}).forEach(function (sk) { ww.assign[sk] = ww.assign[sk].filter(function (x) { return x !== pid; }); }); });
          n++; setupChanged = true; return;
        }
        case "set_pair":
          S.pairs = S.pairs.filter(function (x) { return !((x.a === a.person && x.b === a.other) || (x.a === a.other && x.b === a.person)); });
          if (a.kind !== "none") {
            S.pairs.push({ id: uid(), a: a.person, b: a.other, type: a.kind });
            if (a.kind === "never") S.features.avoidPairs = true; else S.features.preferPairs = true;
          }
          n++; return;
        case "set_preference":
          p.prefs = p.prefs || {};
          if (a.value === "none") delete p.prefs[a.template]; else { p.prefs[a.template] = a.value; S.features.preferences = true; }
          n++; return;
      }
      it = instByKey(key, a.shift); if (!it) return;
      if (a.type === "assign" || a.type === "lock") {
        var arr = w.assign[it.key] || (w.assign[it.key] = []);
        if (arr.indexOf(p.id) < 0) arr.push(p.id);
        (w.locks[it.key] = w.locks[it.key] || {})[p.id] = true; delete w.blocked[it.key + "|" + p.id]; n++;
      } else if (a.type === "unassign") { removeFromShift(w, it, p.id); n++; }
      else if (a.type === "unlock") { var L = w.locks[it.key] || {}; if (L[p.id] && L[p.id] !== "fixed") delete L[p.id]; n++; }
    });
    if (setupChanged) markAllEdited(); else markEdited(w);
    if (regen) { generate(); n++; }
    if (pub) { w.status = "published"; w.dirty = false; w.pub = pubSnapshot(key); n++; }
    return n;
  }

  function helperSend(text) {
    var c = chat(); text = String(text || "").trim();
    if (!text || c.busy || !helperReady() || needsAddon()) return;
    c.msgs.push({ role: "user", text: text }); c.draft = ""; c.error = ""; c.busy = true;
    render();
    var history = c.msgs.map(function (m) { return { role: m.role, text: m.text }; });
    SACloud.askHelper(history, helperContext()).then(function (r) {
      c.msgs.push({ role: "assistant", text: r.text, actions: (r.actions || []).length ? r.actions : null, state: "open" });
    }).catch(function (e) { c.error = (e && e.message) || "The helper couldn't answer. Try again."; if (e && e.needAddon) c.addon = true; })
      .then(function () { c.busy = false; render(); });
  }

  function renderHelper() {
    var c = chat(), h = '<button class="helper-fab" data-act="helper">' + icon("sparkle") + "Helper</button>";
    if (!T.helper) return h;
    h += '<div class="card helper"><div class="row"><b style="flex:1">' + icon("sparkle") + ' AI scheduling helper</b>' +
      (c.msgs.length ? '<button class="btn btn-sm btn-ghost" data-act="helper-clear">New chat</button>' : "") +
      '<button class="btn btn-icon btn-ghost btn-sm" data-act="helper" aria-label="Close">' + icon("x") + "</button></div>";
    if (!helperReady()) {
      return h + '<div class="note">' + icon("info") + "<span>" + (CLOUD ? "Sign in as the owner to use the helper." : "The helper works once your workspace is online (it needs a sign-in). Here's what you'll be able to ask:") + "</span></div>" +
        (CLOUD ? "" : HELPER_EX.map(function (x) { return '<div class="ex">' + esc(x.replace("{name}", (S.people[0] || {}).name || "Ben")) + "</div>"; }).join("")) + "</div>";
    }
    if (needsAddon()) return h + aiAddonCard() + "</div>";
    h += '<div class="chat" id="chat-log">';
    if (!c.msgs.length) {
      h += '<p class="muted" style="font-size:13px;margin:0">Ask about this week, or tell me what to change. I\'ll show you a change before anything happens.</p>' +
        HELPER_EX.map(function (x) { var t = x.replace("{name}", (S.people[0] || {}).name || "Ben"); return '<button class="ex ex-btn" data-act="helper-ex" data-t="' + esc(t) + '">' + esc(t) + "</button>"; }).join("");
    }
    c.msgs.forEach(function (m, i) {
      h += '<div class="bub ' + (m.role === "user" ? "me" : "ai") + '">' + esc(m.text).replace(/\n/g, "<br>") + "</div>";
      if (m.actions) {
        var d = m.actions.map(helperDescribe), okN = d.filter(function (x) { return x.ok; }).length; if (okN) d = d.filter(function (x) { return x.ok; });
        h += '<div class="prop"><b>' + (m.state === "done" ? "Applied" : m.state === "no" ? "Dismissed" : "Proposed changes") + "</b><ul>" +
          d.map(function (x) { return "<li" + (x.ok ? (x.big ? ' style="color:var(--bad)"' : "") : ' class="bad"') + ">" + esc(x.t) + "</li>"; }).join("") + "</ul>" +
          (m.state === "open" ? '<div class="row"><button class="btn btn-sm btn-primary" data-act="helper-apply" data-i="' + i + '"' + (okN ? "" : " disabled") + ">" + icon("check") + 'Apply</button><button class="btn btn-sm" data-act="helper-dismiss" data-i="' + i + '">Not now</button></div>' : "") + "</div>";
      }
    });
    if (c.busy) h += '<div class="bub ai typing"><i></i><i></i><i></i></div>';
    if (c.error) h += '<div class="note note-warn">' + icon("alert") + "<span>" + esc(c.error) + "</span></div>";
    h += '</div><div class="send-row"><input class="input" id="helper-in" placeholder="Ask or tell me what to change" value="' + esc(c.draft) + '" data-enter="helper-go" autocomplete="off" maxlength="600"' + (c.busy ? " disabled" : "") + '><button class="btn btn-icon btn-primary" data-act="helper-go" aria-label="Send"' + (c.busy ? " disabled" : "") + ">" + icon("send") + "</button></div>" +
      '<p class="faint" style="font-size:11.5px;margin:0">This is an AI and can make mistakes. Check changes before you apply them. Questions are answered by Anthropic\'s Claude (<a href="../privacy.html" target="_blank" rel="noopener">privacy</a>).</p></div>';
    return h;
  }

  /* ------------------------------------------------------------------
     Accounts: sign in, create a workspace, join with an invite
     ------------------------------------------------------------------ */
  function renderAuth() {
    var C = SACloud, inv = C.invite && C.invite.data, h = '<div class="onboard"><div class="ob-card" style="width:min(460px,100%)"><div class="ob-head">' + brandHTML;
    var err = C.error ? '<div class="note note-warn">' + icon("alert") + "<span>" + esc(C.error) + "</span></div>" : "";
    if (C.status === "loading" || (C.invite && !C.invite.checked && C.status === "signed-out")) {
      return h + '<h1 style="font-size:20px">Connecting…</h1><p>Loading your schedule.</p></div><div class="ob-body" style="padding-bottom:28px">' + err + "</div></div></div>";
    }
    if (C.status === "error") return h + "<h1>Can't connect right now</h1></div><div class=\"ob-body\">" + err + '</div><div class="ob-foot"><button class="btn btn-primary" data-act="reload">Try again</button></div></div></div>';
    if (C.status === "need-email") {
      return h + "<h1>Confirm your email</h1><p>Enter the email address the sign-in link was sent to.</p></div><div class=\"ob-body\">" + err +
        '<label class="field"><span>Email</span><input class="input" id="au-email" type="email" autocomplete="email"></label></div><div class="ob-foot"><span class="spacer"></span><button class="btn btn-primary" data-act="au-finish">Sign in</button></div></div></div>';
    }
    if (C.status === "new-owner") {
      var has = browserData && browserData.setup === "done" && (browserData.people.length || browserData.shifts.length);
      if (T.importLocal == null) T.importLocal = !!has;
      return h + "<h1>Create your workspace</h1><p>This is where your team, shifts and schedules will live. You can invite your team once it's set up.</p></div><div class=\"ob-body\">" + err +
        (has ? '<label class="q" style="cursor:pointer"><input type="checkbox" data-change="au-import"' + (T.importLocal ? " checked" : "") + '><span class="txt"><b>Bring in what\'s saved in this browser</b><span>' + esc(browserData.business.name || "Your setup") + " · " + people(browserData.people.length) + " · " + plural(browserData.shifts.length, "shift") + "</span></span></label>" : "") +
        '<div class="note">' + icon("sparkle") + "<span>Free for " + ((window.SA_BILLING || {}).trialDays || 7) + " days. No card needed.</span></div>" +
        '<div class="note">' + icon("user") + "<span>Signed in as " + esc((C.user && C.user.email) || "") + '. <a href="#" data-act="sign-out">Not you?</a></span></div></div>' +
        '<div class="ob-foot"><span class="spacer"></span><button class="btn btn-primary" data-act="au-create">Create my workspace</button></div></div></div>';
    }
    if (C.status === "joining") {
      return h + "<h1>" + (inv ? "Join " + esc(inv.businessName || "your team") : "Invite not found") + "</h1><p>" + (inv ? "You're joining as <b>" + esc(inv.name || "a team member") + "</b>. You'll see your shifts, send your availability and get cover requests here." : "This invite link isn't valid anymore. Ask your manager for a new one.") + "</p></div>" +
        '<div class="ob-body">' + err + '<div class="note">' + icon("user") + "<span>Signed in as " + esc((C.user && C.user.email) || "") + '. <a href="#" data-act="sign-out">Not you?</a></span></div></div>' +
        '<div class="ob-foot"><span class="spacer"></span>' + (inv ? '<button class="btn btn-primary" data-act="au-join">' + icon("check") + "Join</button>" : "") + "</div></div></div>";
    }
    // signed out (people arriving from an invite are usually new, so start them on "create account")
    if (T.authMode == null) T.authMode = C.invite ? "signup" : "signin";
    var up = T.authMode === "signup";
    h += "<h1>" + (inv ? "You're invited" : up ? "Create your account" : "Sign in") + "</h1><p>" +
      (inv ? esc(inv.businessName || "Your workplace") + " uses Scheduling Agent for schedules. Sign in or create an account to join as <b>" + esc(inv.name || "a team member") + "</b>."
        : up ? "For business owners setting up their schedule." : "Welcome back.") + "</p></div><div class=\"ob-body\">" + err;
    if (C.linkSentTo) return h + '<div class="note">' + icon("send") + "<span>Check <b>" + esc(C.linkSentTo) + "</b> for a sign-in link. Open it on this device.</span></div></div></div></div>";
    h += '<button class="btn" style="height:44px" data-act="au-google"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>Continue with Google</button>' +
      '<div class="row" style="gap:10px;color:var(--faint);font-size:12px"><span style="flex:1;height:1px;background:var(--line)"></span>or with email<span style="flex:1;height:1px;background:var(--line)"></span></div>' +
      '<label class="field"><span>Email</span><input class="input" id="au-email" type="email" autocomplete="email" value="' + esc(T.authEmail || "") + '"></label>' +
      (T.authLink ? "" : '<label class="field"><span>Password</span><input class="input" id="au-pw" type="password" autocomplete="' + (up ? "new-password" : "current-password") + '" value="' + esc(T.authPw || "") + '" data-enter="au-email-go"></label>') +
      (up ? '<p class="faint" style="font-size:12px;margin:0">By creating an account you agree to the <a href="../terms.html" target="_blank" rel="noopener">Terms</a> and <a href="../privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>' : "") + "</div>";
    h += '<div class="ob-foot">' + (T.authLink ? '<button class="btn btn-ghost btn-sm" data-act="au-mode" data-v="pw">Use a password instead</button>'
      : '<button class="btn btn-ghost btn-sm" data-act="au-mode" data-v="' + (up ? "in" : "up") + '">' + (up ? "I have an account" : "Create an account") + '</button><button class="btn btn-ghost btn-sm" data-act="au-mode" data-v="link">Email me a link</button>') +
      '<span class="spacer"></span><button class="btn btn-primary" data-act="au-email-go">' + (T.authLink ? "Send link" : up ? "Create account" : "Sign in") + "</button></div></div></div>";
    return h;
  }

  /* ------------------------------------------------------------------
     Welcome and setup
     ------------------------------------------------------------------ */
  function wizSteps() {
    var s = ["biz", "needs"];
    if (S.features.roles) s.push("roles");
    s.push("shifts", "team");
    if (pairsOn()) s.push("pairs");
    s.push("done");
    return s;
  }
  var brandHTML = '<span class="brand"><span class="mark"><svg viewBox="0 0 28 28" aria-hidden="true"><use href="#o-mark"/></svg></span><span><b>Scheduling Agent</b><small>by Ares</small></span></span>';

  function renderOnboarding() {
    var h = '<div class="onboard"><div class="ob-card">';
    if (S.setup === "new") {
      h += '<div class="ob-head">' + brandHTML + "<h1>Let's build your schedule</h1><p>A few questions about how your business runs, then your shifts and your team. About five minutes. You can change everything later.</p></div><div class=\"ob-body\">";
      if (!T.skipPick) {
        h += '<div class="choice-grid"><button class="choice" data-act="ob-start"><span class="ico">' + icon("sparkle") + "</span><b>Set up my business</b><span>Recommended. We'll ask what makes scheduling hard for you and turn on just the features that help.</span></button>" +
          '<button class="choice" data-act="ob-skip"><span class="ico">' + icon("right") + "</span><b>Skip setup</b><span>Jump straight in and fill things in as you go.</span></button></div>";
      } else {
        h += '<p style="font-weight:600">How much do you want to see?</p><div class="choice-grid">' +
          '<button class="choice' + (T.skipMode !== "advanced" ? " on" : "") + '" data-act="ob-mode" data-v="simple"><b>Simple</b><span>Names, hours, availability and shifts. Nothing extra.</span></button>' +
          '<button class="choice' + (T.skipMode === "advanced" ? " on" : "") + '" data-act="ob-mode" data-v="advanced"><b>Advanced</b><span>Everything on: roles, pairings, preferences, fair hours, shift cover and more.</span></button></div>' +
          '<p class="faint" style="font-size:12.5px">You can switch, or turn single features on and off, in Settings.</p>';
      }
      h += '<div class="note">' + icon("info") + "<span>Sign-in arrives when the app is connected to its server. Until then, everything is saved in this browser, and you can download a backup any time.</span></div></div>";
      h += '<div class="ob-foot">' + (T.skipPick ? '<button class="btn" data-act="ob-back">Back</button><span class="spacer"></span><button class="btn btn-primary" data-act="ob-skip-go">Start</button>' : "") + "</div>";
      return h + "</div></div>";
    }
    // wizard
    var steps = wizSteps(), i = Math.min(S.ui.wiz || 0, steps.length - 1), step = steps[i];
    h += '<div class="ob-head" style="padding-bottom:0">' + brandHTML + '</div><div class="steps" style="margin-top:6px">' + steps.map(function (s, n) { return '<span class="' + (n <= i ? "on" : "") + '"></span>'; }).join("") + "</div>";
    var labels = { biz: "Your business", needs: "What makes scheduling hard", roles: "Roles", shifts: "Your shifts", team: "Your team", pairs: "Pairings", done: "All set" };
    h += '<div class="step-label">Step ' + (i + 1) + " of " + steps.length + " · " + labels[step] + "</div>";
    h += { biz: wizBiz, needs: wizNeeds, roles: wizRoles, shifts: wizShifts, team: wizTeam, pairs: wizPairs, done: wizDone }[step]();
    h += '<div class="ob-foot">' + (i > 0 ? '<button class="btn" data-act="wiz-back">Back</button>' : "") + '<span class="spacer"></span>' +
      (step !== "done" ? '<button class="btn btn-ghost" data-act="wiz-skip">' + (step === "biz" || step === "needs" ? "Skip setup" : "Skip this step") + "</button>" +
        '<button class="btn btn-primary" data-act="wiz-next">Continue</button>' : '<button class="btn btn-primary" data-act="wiz-finish">' + icon("calendar") + "Go to my schedule</button>") + "</div>";
    return h + "</div></div>";
  }
  function wizBiz() {
    return '<div class="ob-head" style="padding-top:8px"><h1>Tell us about your business</h1></div><div class="ob-body">' +
      '<label class="field"><span>Business name</span><input class="input" value="' + esc(S.business.name) + '" data-change="biz-name" placeholder="e.g. Harbor Café"></label>' +
      '<div class="grid2"><div class="field"><span>Your week starts on</span><div class="seg"><button class="' + (S.business.weekStart === 0 ? "on" : "") + '" data-act="biz-ws" data-v="0">Sunday</button><button class="' + (S.business.weekStart === 1 ? "on" : "") + '" data-act="biz-ws" data-v="1">Monday</button></div></div>' +
      '<div class="field"><span>Show times like</span><div class="seg"><button class="' + (S.business.clock === 12 ? "on" : "") + '" data-act="biz-clock" data-v="12">1:00pm</button><button class="' + (S.business.clock === 24 ? "on" : "") + '" data-act="biz-clock" data-v="24">13:00</button></div></div></div>' +
      '<div style="border-top:1px solid var(--line);padding-top:16px"><p style="font-weight:600;margin-bottom:12px">Make it yours <span class="chip">Optional</span></p>' + brandingHTML(true) + "</div></div>";
  }
  function wizNeeds() {
    var h = '<div class="ob-head" style="padding-top:8px"><h1>What makes scheduling hard?</h1><p>Answer yes to turn on the features that help. Everything else stays out of your way.</p></div><div class="ob-body">';
    FEATURES.forEach(function (f) {
      if (!f.q) return;
      var on = !!S.features[f.key];
      h += '<div class="q"><div class="txt"><b>' + f.q + "</b><span>" + f.qd + '</span></div><div class="yn"><button class="yes' + (on ? " on" : "") + '" data-act="feat-set" data-k="' + f.key + '" data-v="1">Yes</button><button class="no' + (!on ? " on" : "") + '" data-act="feat-set" data-k="' + f.key + '" data-v="0">No</button></div></div>';
    });
    h += '<div class="row"><span class="mode-tag">Your setup: <b>' + modeName() + '</b></span><span style="flex:1"></span><button class="btn btn-sm btn-ghost" data-act="mode" data-v="simple">All no (Simple)</button><button class="btn btn-sm btn-ghost" data-act="mode" data-v="advanced">All yes (Advanced)</button></div></div>';
    return h;
  }
  function wizRoles() {
    return '<div class="ob-head" style="padding-top:8px"><h1>What roles do you have?</h1><p>Add the roles that matter for scheduling. You\'ll tag people with them next.</p></div><div class="ob-body">' + rolesEditor() + "</div>";
  }
  function wizShifts() {
    var h = '<div class="ob-head" style="padding-top:8px"><h1>When are your shifts?</h1><p>Add your usual shifts. You can always add a one-off shift or change a single day later.</p></div><div class="ob-body">';
    if (!S.shifts.length) h += '<div class="row"><button class="btn btn-soft" data-act="presets">' + icon("sparkle") + "Start with common cafe shifts</button><span class=\"faint\">Open, Mid and Close. Edit the times after.</span></div>";
    S.shifts.forEach(function (s) {
      h += '<div class="edit-row shift-row"><input class="input input-sm" value="' + esc(s.name) + '" data-change="t-name" data-s="' + s.id + '" placeholder="Shift name" aria-label="Shift name">' +
        timeSel("t-start", s.start, ' data-s="' + s.id + '" aria-label="Start"') +
        timeSel("t-end", s.end, ' data-s="' + s.id + '" aria-label="End"') +
        '<label class="hrs"><input class="input input-sm num" type="number" min="0" value="' + s.count + '" data-change="t-count" data-s="' + s.id + '" aria-label="People needed"> ppl</label>' +
        '<button class="btn btn-icon btn-ghost btn-sm" data-act="tpl-del" data-s="' + s.id + '" aria-label="Delete">' + icon("x") + "</button>" +
        '<div class="sub"><div class="daypick">' + [0, 1, 2, 3, 4, 5, 6].map(function (i) { var dow = (S.business.weekStart + i) % 7; return '<button style="width:30px;height:30px" class="' + (s.days[dow] ? "on" : "") + '" data-act="t-day" data-s="' + s.id + '" data-dow="' + dow + '" title="' + DAYS[dow] + '">' + DAY1[dow] + "</button>"; }).join("") + "</div>" +
        (S.features.roles && S.roles.length ? '<span class="faint" style="font-size:12px;margin-left:6px">Needs:</span>' + S.roles.map(function (r) { var on = (s.needs || []).some(function (n) { return n.role === r.id; }); return '<button class="chip chip-toggle' + (on ? " on" : "") + '" data-act="t-need-toggle" data-s="' + s.id + '" data-r="' + r.id + '">' + (on ? icon("check") : "") + esc(r.name) + "</button>"; }).join("") : "") + "</div></div>";
    });
    h += '<div><button class="btn btn-sm" data-act="tpl-add-inline">' + icon("plus") + "Add a shift</button></div></div>";
    return h;
  }
  function wizTeam() {
    var h = '<div class="ob-head" style="padding-top:8px"><h1>Who\'s on your team?</h1><p>Name and weekly hours for each person' + (S.features.roles ? ", plus their roles" : "") + '. Mark full-timers with a set schedule as "Set"; you can pick their shifts on the Team page.</p></div><div class="ob-body">';
    h += '<div class="row"><button class="btn btn-sm" data-act="import" data-kind="team">' + icon("upload") + "Import a spreadsheet</button><span class=\"faint\" style=\"font-size:12.5px\">Or type them in below.</span></div>";
    S.people.forEach(function (p) {
      h += '<div class="edit-row team-row"><input class="input input-sm" value="' + esc(p.name) + '" data-change="p-name" data-p="' + p.id + '" placeholder="Name" aria-label="Name">' +
        '<div class="chips">' + (S.features.roles ? S.roles.map(function (r) { var on = (p.roles || []).indexOf(r.id) >= 0; return '<button class="chip chip-toggle' + (on ? " on" : "") + '" data-act="p-role" data-p="' + p.id + '" data-r="' + r.id + '">' + esc(r.name) + "</button>"; }).join("") : "") + "</div>" +
        '<span class="hrs"><input class="input input-sm num" type="number" min="0" value="' + (p.min || 0) + '" data-change="p-min" data-p="' + p.id + '" aria-label="Min hours">–<input class="input input-sm num" type="number" min="0" value="' + (p.max == null ? "" : p.max) + '" data-change="p-max" data-p="' + p.id + '" aria-label="Max hours">h</span>' +
        '<div class="seg"><button class="' + (p.type !== "fixed" ? "on" : "") + '" data-act="p-type" data-p="' + p.id + '" data-v="part">Part</button><button class="' + (p.type === "fixed" ? "on" : "") + '" data-act="p-type" data-p="' + p.id + '" data-v="fixed">Set</button></div>' +
        '<button class="btn btn-icon btn-ghost btn-sm" data-act="person-del" data-p="' + p.id + '" aria-label="Remove">' + icon("x") + "</button></div>";
    });
    h += '<div class="row"><input class="input" style="max-width:280px" id="quick-name" placeholder="Type a name and press Enter" data-enter="person-quick"><button class="btn btn-sm" data-act="person-quick">' + icon("plus") + "Add</button></div></div>";
    return h;
  }
  function wizPairs() {
    var body = viewPairings().replace(/^<div class="page-head">[\s\S]*?<\/div><\/div>/, "");
    return '<div class="ob-head" style="padding-top:8px"><h1>Any pairings?</h1><p>Optional. You can add these any time on the Pairings page.</p></div><div class="ob-body">' + body + "</div>";
  }
  function wizDone() {
    var key = weekKey();
    return '<div class="ob-head" style="padding-top:8px"><h1>You\'re set up</h1><p>' + esc(S.business.name || "Your business") + " · " + plural(S.shifts.length, "shift") + " · " + people(S.people.length) + " · " + modeName() + " mode</p></div>" +
      '<div class="ob-body"><div class="note">' + icon("calendar") + "<span><b>Next:</b> add availability for the week of " + weekLabel(key) + ", then press <b>Generate schedule</b>. You can ask your team for it, import a spreadsheet, or fill it in yourself.</span></div>" +
      '<button class="btn btn-soft" data-act="wiz-finish" data-v="availability" style="justify-self:start">' + icon("clock") + "Add availability first</button></div>";
  }

  /* ------------------------------------------------------------------
     Drawers and modals
     ------------------------------------------------------------------ */
  function renderDrawer() {
    var d = T.drawer;
    return ({ shift: drawerShift, person: drawerPerson, tpl: drawerTpl }[d.type] || function () { return ""; })(d);
  }
  function renderModal() {
    var m = T.modal;
    if (m.type === "review") return modalReview();
    if (m.type === "export") return modalExport();
    if (m.type === "import") return modalImport();
    if (m.type === "confirm") return '<div class="modal-head"><h2>' + esc(m.title) + "</h2><p>" + esc(m.body) + '</p></div><div class="modal-foot"><button class="btn" data-act="close">Cancel</button><button class="btn btn-primary' + (m.danger ? " btn-danger" : "") + '" data-act="confirm-ok"' + (m.danger ? ' style="background:var(--bad);border-color:var(--bad);color:#fff"' : "") + ">" + esc(m.ok || "OK") + "</button></div>";
    if (m.type === "extra") {
      return '<div class="modal-head"><h2>Add a one-off shift</h2><p>' + dateLabel(m.date, true) + ' only. For a shift that repeats, add it on the Shifts page.</p></div><div class="modal-body">' +
        '<label class="field"><span>Name</span><input class="input" id="x-name" value="Extra shift"></label><div class="field"><span>Time</span><div class="row">' + timeSel("x", "11:00", ' id="x-start"') + '<span class="faint">to</span>' + timeSel("x", "15:00", ' id="x-end"') + '</div></div>' +
        '<label class="field"><span>People needed</span><input class="input num" type="number" min="1" id="x-count" value="1"></label></div>' +
        '<div class="modal-foot"><button class="btn" data-act="close">Cancel</button><button class="btn btn-primary" data-act="extra-save">Add shift</button></div>';
    }
    if (m.type === "invite") {
      var ip = person(m.p), first = ip ? ip.name.split(" ")[0] : "them";
      var msg = "Hi " + first + "! " + (S.business.name || "We") + " use" + (S.business.name ? "s" : "") + " Scheduling Agent for schedules. Tap this link to join and send your availability: " + m.link;
      return '<div class="modal-head"><h2>Invite ' + esc(ip ? ip.name : "") + '</h2><p>Send them this link. They tap it, sign in with Google or their email, and they\'re in. Each link works once.</p></div>' +
        '<div class="modal-body"><div class="row"><input class="input" id="invite-link" readonly value="' + esc(m.link) + '" style="flex:1"><button class="btn" data-act="copy-link">' + icon("copy") + "Copy</button></div>" +
        '<div class="row"><a class="btn btn-sm" href="sms:?&body=' + encodeURIComponent(msg) + '">' + icon("chat") + 'Text it</a><a class="btn btn-sm" href="mailto:?subject=' + encodeURIComponent("Join " + (S.business.name || "our schedule") + " on Scheduling Agent") + "&body=" + encodeURIComponent(msg) + '">' + icon("send") + "Email it</a></div>" +
        '<p class="faint" style="font-size:12.5px">Text and email buttons open your phone or computer\'s apps. If they don\'t, copy the link and send it however you like.</p></div>' +
        '<div class="modal-foot"><button class="btn btn-primary" data-act="close">Done</button></div>';
    }
    if (m.type === "ask") {
      if (CLOUD) return '<div class="modal-head"><h2>Ask your team for availability</h2><p>Everyone who has joined can send theirs from their phone, under Availability. It shows up here automatically, marked "Sent by".</p></div><div class="modal-body">' +
        '<div class="list">' + S.people.filter(function (p) { return p.type !== "fixed"; }).map(function (p) { return '<div class="li">' + avatar(p) + '<div class="grow"><b>' + esc(p.name) + "</b></div>" + (p.joined ? '<span class="rs good">Joined</span>' : '<button class="btn btn-xs btn-soft" data-act="invite" data-p="' + p.id + '">Invite</button>') + "</div>"; }).join("") + "</div></div>" +
        '<div class="modal-foot"><button class="btn btn-primary" data-act="close">Done</button></div>';
      return '<div class="modal-head"><h2>Ask your team for availability</h2><p>How this works once sign-in is connected:</p></div><div class="modal-body">' +
        '<div class="list"><div class="li"><span class="rank-num">1</span><div class="grow">You press <b>Send requests</b>. Everyone gets a text or email with a link. No app download or password.</div></div>' +
        '<div class="li"><span class="rank-num">2</span><div class="grow">They tap their available days and times, and press Send.</div></div>' +
        '<div class="li"><span class="rank-num">3</span><div class="grow">Their answers fill this page automatically, marked "Sent by" them.</div></div></div>' +
        '<div class="note">' + icon("eye") + "<span>Try it now: pick someone in <b>View as</b> at the top, open <b>Availability</b>, and send theirs.</span></div></div>" +
        '<div class="modal-foot"><button class="btn" data-act="close">Close</button>' + (S.people.length ? '<button class="btn btn-primary" data-act="as-emp" data-p="' + S.people[0].id + '" data-tab="avail">' + icon("eye") + "Try it as " + esc(S.people[0].name.split(" ")[0]) + "</button>" : "") + "</div>";
    }
    return "";
  }
  // a person added by mistake (drawer closed with no name) shouldn't linger and get scheduled
  function dropBlankPerson() {
    if (T.drawer && T.drawer.type === "person") {
      var p = person(T.drawer.p);
      if (p && !String(p.name || "").trim()) S.people = S.people.filter(function (x) { return x !== p; });
    }
  }
  function markAllEdited() { Object.keys(S.weeks).forEach(function (k) { markEdited(S.weeks[k]); }); }
  function askConfirm(title, body, ok, fn, danger) { T.modal = { type: "confirm", title: title, body: body, ok: ok, danger: danger }; T.confirmFn = fn; render(); }

  /* ---------- spreadsheet import ---------- */
  function modalImport() {
    var m = T.modal, team = m.kind === "team";
    var h = '<div class="modal-head"><h2>' + (team ? "Import your team" : "Import availability") + "</h2><p>" +
      (team ? "Paste from Excel or Google Sheets, or choose a .csv file. Columns: Name, Role, Min hours, Max hours (any order, with a header row)."
        : "Paste from Excel or Google Sheets, or choose a .csv file. One row per person: Name, then a column per day (Sun, Mon, …). Values like <b>any</b>, <b>off</b>, or <b>9-3</b>.") + "</p></div>";
    h += '<div class="modal-body"><textarea class="input mono" rows="7" data-change="imp-text" placeholder="' + (team ? "Name, Role, Min, Max&#10;Ava Lopez, Manager, 20, 32&#10;Ben Ortiz, Barista, 10, 20" : "Name, Sun, Mon, Tue, Wed, Thu, Fri, Sat&#10;Ava Lopez, off, any, 9-3, any, off, any, 12-8") + '">' + esc(m.text || "") + "</textarea>" +
      '<div class="row"><label class="btn btn-sm">' + icon("file") + 'Choose a file<input type="file" accept=".csv,.tsv,.txt,text/csv" data-change="imp-file" hidden></label><button class="btn btn-sm btn-ghost" data-act="imp-preview">Preview</button></div>';
    if (m.rows) {
      if (!m.rows.length) h += '<div class="note note-warn">' + icon("alert") + "<span>Couldn't read any rows. Check that there's a Name column.</span></div>";
      else {
        h += '<div class="card table-card"><div class="tbl-scroll" style="max-height:220px"><table class="tbl"><thead><tr>' + m.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          m.rows.slice(0, 50).map(function (r) { return "<tr>" + r.view.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div></div>";
        if (m.note) h += '<p class="faint" style="font-size:12.5px">' + esc(m.note) + "</p>";
      }
    }
    h += '</div><div class="modal-foot"><button class="btn" data-act="close">Cancel</button><button class="btn btn-primary" data-act="imp-go"' + (m.rows && m.rows.length ? "" : " disabled") + ">Import " + (m.rows && m.rows.length ? plural(m.rows.length, "row") : "") + "</button></div>";
    return h;
  }
  function parseCSV(text) {
    var rows = [], row = [], f = "", q = false, sep = /\t/.test(text.split("\n")[0]) ? "\t" : ",";
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(f); f = ""; }
      else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else if (c !== "\r") f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows.map(function (r) { return r.map(function (s) { return s.trim(); }); }).filter(function (r) { return r.some(Boolean); });
  }
  function hm(h, m, ap, isEnd, ref, after) {
    h = +h; m = +(m || 0);
    if (ap) { ap = ap[0]; if (ap === "p" && h < 12) h += 12; if (ap === "a" && h === 12) h = 0; }
    else if (!isEnd && after && h >= 1 && h <= 8) h += 12;     // "after 7" means 7pm
    else if (!isEnd && !after && h >= 1 && h <= 5) h += 12;    // "2-6" means 2pm to 6pm; "6-10" means 6am to 10am
    else if (isEnd && ref != null && h * 60 + m <= ref && h < 12) h += 12; // "9-3" means 9am to 3pm
    return pad(h % 24) + ":" + pad(m);
  }
  function parseAvailValue(v) {
    var s = String(v || "").toLowerCase().trim(), m;
    if (!s) return null;
    if (/^(any|anytime|any time|all day|open|yes|y|available|ok|✓|✔)$/.test(s)) return { s: "any" };
    if (/^(off|no|n|x|-|–|unavailable|na|n\/a|busy|can't|cant|none)$/.test(s)) return { s: "off" };
    var T_ = "(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a|p)?";
    if ((m = s.match(new RegExp("^(?:after|from)\\s*" + T_)))) return { s: "win", from: hm(m[1], m[2], m[3], false, null, true), to: "06:00" }; // runs past midnight so a late close fits
    if ((m = s.match(new RegExp("^(?:before|until|till|til)\\s*" + T_)))) return { s: "win", from: "00:00", to: hm(m[1], m[2], m[3] || (+m[1] < 12 && +m[1] <= 9 ? "p" : ""), true, 0) };
    if ((m = s.match(new RegExp("^" + T_ + "\\s*(?:-|–|to)\\s*" + T_ + "$")))) {
      var from = hm(m[1], m[2], m[3], false), to = hm(m[4], m[5], m[6] || (m[3] && m[3][0] === "p" ? "p" : ""), true, toMin(from));
      return { s: "win", from: from, to: to };
    }
    return null;
  }
  function previewImport() {
    var m = T.modal, rows = parseCSV(m.text || "");
    m.rows = []; m.note = "";
    if (!rows.length) { m.cols = []; return; }
    var head = rows[0].map(function (c) { return c.toLowerCase(); });
    if (m.kind === "team") {
      var has = head.some(function (c) { return /name|role|min|max|hour/.test(c); });
      var ci = function (re, d) { var i = head.findIndex(function (c) { return re.test(c); }); return i >= 0 ? i : (has ? -1 : d); };
      var cName = ci(/name|employee|person/, 0), cRole = ci(/role|position|title|job/, 1), cMin = ci(/min/, 2), cMax = ci(/max/, 3), cHrs = head.findIndex(function (c) { return /hour|range/.test(c) && !/min|max/.test(c); }), cType = head.findIndex(function (c) { return /type|status|full|part/.test(c); });
      (has ? rows.slice(1) : rows).forEach(function (r) {
        var name = r[cName]; if (!name) return;
        var mn = cMin >= 0 ? r[cMin] : "", mx = cMax >= 0 ? r[cMax] : "";
        if (cHrs >= 0 && r[cHrs]) { var hr = r[cHrs].match(/(\d+)\s*(?:-|–|to)\s*(\d+)/); if (hr) { mn = hr[1]; mx = hr[2]; } else mx = r[cHrs].replace(/\D/g, ""); }
        var roles = cRole >= 0 && r[cRole] ? r[cRole].split(/[;\/|]+/).map(function (x) { return x.trim(); }).filter(Boolean) : [];
        var fixed = cType >= 0 && /full|set|fixed/i.test(r[cType] || "");
        m.rows.push({ name: name, roles: roles, min: +mn || 0, max: mx === "" ? 30 : +mx || 0, fixed: fixed, view: [name, roles.join(", ") || "—", (+mn || 0) + "–" + (mx === "" ? 30 : mx) + "h", fixed ? "Set" : "Part-time"] });
      });
      m.cols = ["Name", "Roles", "Hours", "Type"];
      if (m.rows.some(function (r) { return r.roles.length; }) && !S.features.roles) m.note = "Roles will be added, and the Roles feature will be turned on.";
    } else {
      var key = weekKey(), dates = weekDates(key), map = [];
      head.forEach(function (c, i) {
        if (i === 0) return;
        var di = -1;
        dates.forEach(function (d, n) { var nm = DAYS[d.getDay()].toLowerCase(); if (c.indexOf(nm.slice(0, 3)) === 0 || c.indexOf(iso(d)) >= 0 || c === (d.getMonth() + 1) + "/" + d.getDate()) di = n; });
        if (di >= 0) map[i] = di;
      });
      var hasHead = map.some(function (x) { return x != null; });
      if (!hasHead) for (var i = 1; i <= 7; i++) map[i] = i - 1;
      (hasHead ? rows.slice(1) : rows).forEach(function (r) {
        var name = r[0]; if (!name) return;
        var p = S.people.find(function (x) { return x.name.toLowerCase() === name.toLowerCase(); }) || S.people.find(function (x) { return x.name.toLowerCase().split(" ")[0] === name.toLowerCase().split(" ")[0]; });
        var vals = {}, view = [name + (p ? "" : " (new)")];
        dates.forEach(function (d, n) { view.push(""); });
        r.forEach(function (cell, i) { if (map[i] == null) return; var v = parseAvailValue(cell); if (v) vals[iso(dates[map[i]])] = v; view[map[i] + 1] = v ? availText(v) : cell ? "?" : ""; });
        m.rows.push({ name: name, pid: p ? p.id : null, vals: vals, view: view });
      });
      m.cols = ["Name"].concat(dates.map(function (d) { return DAY3[d.getDay()] + " " + d.getDate(); }));
      if (m.rows.some(function (r) { return !r.pid; })) m.note = "Names marked (new) will be added to your team.";
    }
  }
  function doImport() {
    var m = T.modal, n = 0;
    if (m.kind === "team") {
      m.rows.forEach(function (r) {
        var p = S.people.find(function (x) { return x.name.toLowerCase() === r.name.toLowerCase(); }) || newPerson(r.name);
        p.min = r.min; p.max = r.max; if (r.fixed) p.type = "fixed";
        if (r.roles.length) { S.features.roles = true; r.roles.forEach(function (rn) { var ro = addRole(rn); if ((p.roles || []).indexOf(ro.id) < 0) (p.roles = p.roles || []).push(ro.id); }); }
        n++;
      });
    } else {
      var key = weekKey(), w = wk(key);
      m.rows.forEach(function (r) {
        var p = r.pid ? person(r.pid) : newPerson(r.name);
        w.avail[p.id] = Object.assign(w.avail[p.id] || {}, r.vals); n++;
      });
    }
    T.modal = null; render(); toast("Imported " + plural(n, "row") + ".");
  }

  /* ------------------------------------------------------------------
     Click actions
     ------------------------------------------------------------------ */
  function curShift() { return T.drawer && T.drawer.type === "shift" ? T.drawer.k : null; }
  function overFor(k) { var w = wk(weekKey()); return (w.over[k] = w.over[k] || {}); }
  function extraFor(k) { var w = wk(weekKey()), id = k.split("|")[1]; return w.extra.find(function (x) { return x.id === id; }); }

  var ACT = {
    close: function () { if (T.modal && T.modal.type === "confirm") { T.modal = null; T.confirmFn = null; return; } dropBlankPerson(); T.drawer = null; T.modal = null; T.pop = null; },
    reload: function () { location.reload(); return false; },
    "au-google": function () { SACloud.signInGoogle().then(render); return false; },
    "au-mode": function (el) { var v = el.dataset.v; T.authEmail = ($("#au-email") || {}).value || T.authEmail; T.authPw = ($("#au-pw") || {}).value || T.authPw; T.authLink = v === "link"; if (v === "up") T.authMode = "signup"; if (v === "in") T.authMode = "signin"; SACloud.error = null; },
    "au-email-go": function () {
      var em = ($("#au-email") || {}).value || "", pw = ($("#au-pw") || {}).value || ""; T.authEmail = em;
      if (!em.trim()) { SACloud.error = "Enter your email address."; render(); return false; }
      var go = T.authLink ? SACloud.sendLink(em.trim()) : T.authMode === "signup" ? SACloud.signUpEmail(em.trim(), pw) : SACloud.signInEmail(em.trim(), pw);
      go.then(render); return false;
    },
    "au-finish": function () { var em = ($("#au-email") || {}).value || ""; if (em) SACloud.finishLink(em.trim()).then(render); return false; },
    "au-create": function () {
      var start = T.importLocal && browserData && browserData.setup === "done" ? browserData : blank();
      start.ui = blank().ui;
      SACloud.createWorkspace(clone(start)).then(render); return false;
    },
    "au-join": function () { SACloud.acceptInvite().then(render); return false; },
    invite: function (el) {
      var p = person(el.dataset.p || (T.drawer && T.drawer.p));
      if (!p || !p.name) { toast("Add their name first."); return false; }
      SACloud.invite_create(p, S.business.name).then(function (link) { T.modal = { type: "invite", link: link, p: p.id }; render(); })
        .catch(function () { toast("Couldn't create the invite. Check your connection and try again."); });
      return false;
    },
    "copy-link": function () {
      var inp = $("#invite-link");
      var done = function () { toast("Link copied."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(inp.value).then(done, function () { inp.select(); toast("Press Ctrl+C to copy."); });
      else { inp.select(); try { document.execCommand("copy"); done(); } catch (e) { toast("Press Ctrl+C to copy."); } }
      return false;
    },
    "close-pop": function () { T.pop = null; },
    "drawer-edit": function () { T.drawer.edit = true; },
    theme: function (el) { S.brand.accent = el.dataset.v; },
    "theme-mode": function (el) { S.brand.mode = el.dataset.v; },
    "theme-random": function () {
      var h = Math.random() * 360, sat = 0.55 + Math.random() * 0.2, l = 0.42 + Math.random() * 0.1;
      var f = function (n) { var k = (n + h / 30) % 12, a = sat * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
      S.brand.accent = rgbHex([f(0) * 255, f(8) * 255, f(4) * 255]);
    },
    "theme-logo": function () {
      var img = new Image();
      img.onload = function () { var c = logoColor(img); if (c) { S.brand.accent = c; render(); toast("Theme matched to your logo."); } else toast("Your logo is mostly black, white or gray. Pick a color instead."); };
      img.src = S.brand.logo; return false;
    },
    "logo-del": function () { S.brand.logo = null; },
    "close-self": function (el, ev) { if (ev.target === el) { T.modal = null; } else return false; },
    nav: function (el, ev) { ev.preventDefault(); S.ui.view = el.dataset.v; T.drawer = null; T.modal = null; },
    week: function (el) { var d = +el.dataset.d; S.ui.week = d ? iso(addDays(parseISO(weekKey()), d)) : iso(addDays(weekStartOf(new Date()), 7)); T.drawer = null; },
    helper: function () { T.helper = !T.helper; T.helperFocus = T.helper; },
    "helper-go": function () { var el = document.getElementById("helper-in"); helperSend(el ? el.value : chat().draft); return false; },
    "helper-ex": function (el) { helperSend(el.dataset.t); return false; },
    "helper-clear": function () { T.chat = null; },
    "helper-dismiss": function (el) { var m = chat().msgs[+el.dataset.i]; if (m) m.state = "no"; },
    "helper-apply": function (el) {
      var m = chat().msgs[+el.dataset.i]; if (!m || m.state !== "open") return false;
      var go = function () { var n = helperApply(m.actions); m.state = "done"; toast(n ? "Done. " + plural(n, "change") + " applied." : "Nothing to apply."); };
      var big = m.actions.map(helperDescribe).filter(function (d) { return d.ok && d.big; });
      if (big.length) { askConfirm("Apply these changes?", big.map(function (d) { return d.t; }).join(". ") + ". These affect your whole team.", "Apply", go, big.some(function (d) { return /^(Remove|Delete)/.test(d.t); })); return false; }
      go(); },

    // onboarding
    "ob-start": function () { S.setup = "wizard"; S.ui.wiz = 0; },
    "ob-skip": function () { T.skipPick = true; T.skipMode = T.skipMode || "simple"; },
    "ob-back": function () { T.skipPick = false; },
    "ob-mode": function (el) { T.skipMode = el.dataset.v; },
    "ob-skip-go": function () { setMode(T.skipMode || "simple"); S.setup = "done"; S.ui.view = "schedule"; },
    "wiz-next": function () { S.ui.wiz = (S.ui.wiz || 0) + 1; window.scrollTo(0, 0); },
    "wiz-back": function () { S.ui.wiz = Math.max(0, (S.ui.wiz || 0) - 1); },
    "wiz-skip": function () {
      var step = wizSteps()[S.ui.wiz || 0];
      if (step === "biz" || step === "needs") { S.setup = "done"; S.ui.view = "schedule"; toast("Setup skipped. Add shifts and people whenever you're ready."); }
      else S.ui.wiz = (S.ui.wiz || 0) + 1;
    },
    "wiz-finish": function (el) { S.setup = "done"; S.ui.view = el.dataset.v || "schedule"; },
    "feat-set": function (el) { S.features[el.dataset.k] = el.dataset.v === "1"; },
    mode: function (el) { setMode(el.dataset.v); },

    // schedule
    generate: function () { generate(); return false; },
    "clear-week": function () {
      askConfirm("Clear this week?", "Removes everyone except locked people and set schedules. You can generate again after.", "Clear", function () {
        var w = wk(weekKey());
        Object.keys(w.assign).forEach(function (k) { var L = w.locks[k] || {}; w.assign[k] = w.assign[k].filter(function (p) { return L[p]; }); });
        w.generated = false; markEdited(w);
      });
      return false;
    },
    review: function () { T.modal = { type: "review" }; },
    publish: function () { publish(); return false; },
    export: function () { T.modal = { type: "export", fmt: "ics", who: "" }; },
    print: function () { window.print(); return false; },
    "exp-fmt": function (el) { T.modal.fmt = el.dataset.v; },
    "exp-go": function () { exportGo(); return false; },
    "open-shift": function (el) { T.drawer = { type: "shift", k: el.dataset.k }; },
    "drawer-all": function () { T.drawer.all = !T.drawer.all; },
    assign: function (el) {
      var w = wk(weekKey()), k = curShift(), pid = el.dataset.p, a = w.assign[k] || (w.assign[k] = []);
      if (a.indexOf(pid) < 0) a.push(pid);
      (w.locks[k] = w.locks[k] || {})[pid] = true;
      delete w.blocked[k + "|" + pid];
      var it = instByKey(weekKey(), k); if (it && a.length >= it.count) T.drawer.all = false;
      markEdited(w);
    },
    unassign: function (el) {
      var w = wk(weekKey()), k = curShift(), pid = el.dataset.p, a = w.assign[k] || [], L = w.locks[k] || {};
      if (L[pid] === "fixed") w.fixedSkip[k + "|" + pid] = true;
      w.assign[k] = a.filter(function (x) { return x !== pid; }); delete L[pid]; markEdited(w);
    },
    lock: function (el) { var w = wk(weekKey()), k = curShift(), L = w.locks[k] = w.locks[k] || {}; if (L[el.dataset.p]) delete L[el.dataset.p]; else L[el.dataset.p] = true; },
    callout: function (el) {
      var w = wk(weekKey()), k = curShift(), pid = el.dataset.p, L = w.locks[k] || {};
      if (L[pid] === "fixed") w.fixedSkip[k + "|" + pid] = true;
      w.assign[k] = (w.assign[k] || []).filter(function (x) { return x !== pid; }); delete L[pid];
      w.blocked[k + "|" + pid] = true;
      w.callouts.push({ id: uid(), key: k, pid: pid, at: Date.now() });
      pubEdit(w, k, function (pp) { var j = pp.indexOf(pid); if (j >= 0) pp.splice(j, 1); });
      if (w.pub && w.pub.assign && w.pub.assign[k]) w.pub.assign[k] = w.pub.assign[k].filter(function (x) { return x !== pid; });
      if (!(w.pub && w.pub.shifts)) markEdited(w);   // a call-out updates what the team sees directly
      toast(person(pid).name + " marked as called out." + (S.features.rescue ? " Here's who can cover." : ""));
    },
    request: function (el) { startRequest(el.dataset.k); },
    step: function (el) {
      var inp = el.parentNode.querySelector("input"); inp.value = Math.max(0, (+inp.value || 0) + (+el.dataset.d));
      onChange(inp); return false;
    },
    "inst-reset": function () { var w = wk(weekKey()); delete w.over[curShift()]; },
    "inst-remove": function () {
      var k = curShift(), w = wk(weekKey()), x = extraFor(k);
      askConfirm(x ? "Delete this shift?" : "Remove from this week?", x ? "This one-off shift and its assignments will be removed." : "Only this day changes. Your usual shift stays as it is.", x ? "Delete" : "Remove", function () {
        if (x) w.extra = w.extra.filter(function (e) { return e !== x; }); else overFor(k).removed = true;
        delete w.assign[k]; markEdited(w); T.drawer = null;
      }, true);
      return false;
    },
    "extra-new": function (el) { T.modal = { type: "extra", date: el.dataset.date }; },
    "extra-save": function () {
      var w = wk(weekKey()), x = { id: "x" + uid(), date: T.modal.date, name: $("#x-name").value.trim() || "Extra shift", start: $("#x-start").value || "11:00", end: $("#x-end").value || "15:00", count: Math.max(1, +$("#x-count").value || 1), needs: [] };
      w.extra.push(x); markEdited(w); T.modal = null; T.drawer = { type: "shift", k: x.date + "|" + x.id };
    },

    // availability
    "av-pop": function (el) {
      var r = el.getBoundingClientRect();
      T.pop = { p: el.dataset.p, d: el.dataset.d, dow: el.dataset.dow != null ? +el.dataset.dow : null, x: r.left, y: r.bottom + 6, top: r.top, usual: false };
    },
    "av-set": function (el) {
      var s = el.dataset.s, v = s === "any" ? { s: "any" } : s === "off" ? { s: "off" } : s === "win" ? { s: "win", from: (T.pop.win || {}).from || "09:00", to: (T.pop.win || {}).to || "15:00" } : null;
      if (T.pop.dow != null) { var pp = person(T.pop.p); pp.pattern = pp.pattern || {}; if (v) pp.pattern[T.pop.dow] = v; else delete pp.pattern[T.pop.dow]; }
      else setAvail(T.pop.p, T.pop.d, v, T.pop.usual);
      T.pop = null;
    },
    "copy-last": function () {
      var key = weekKey(), prev = iso(addDays(parseISO(key), -7)), pw = S.weeks[prev], w = wk(key), n = 0;
      if (!pw || !Object.keys(pw.avail || {}).length) { toast("Last week has no availability to copy."); return false; }
      Object.keys(pw.avail).forEach(function (pid) {
        Object.keys(pw.avail[pid]).forEach(function (dk) { var nd = iso(addDays(parseISO(dk), 7)); w.avail[pid] = w.avail[pid] || {}; if (!w.avail[pid][nd]) { w.avail[pid][nd] = clone(pw.avail[pid][dk]); n++; } });
      });
      toast("Copied " + plural(n, "day") + " from last week.");
    },
    "fill-any": function () {
      var key = weekKey(), w = wk(key), n = 0;
      S.people.forEach(function (p) {
        if (p.type === "fixed") return;
        weekDates(key).forEach(function (d) { var dk = iso(d); if (availOf(p, key, dk).src === "none") { (w.avail[p.id] = w.avail[p.id] || {})[dk] = { s: "any" }; n++; } });
      });
      toast(n ? "Filled " + plural(n, "blank day") + " with Any time." : "There are no blanks to fill.");
    },
    "ask-team": function () { T.modal = { type: "ask" }; },
    import: function (el) { T.modal = { type: "import", kind: el.dataset.kind, text: "" }; },
    "imp-preview": function () { previewImport(); },
    "imp-go": function () { doImport(); return false; },

    // team
    "notes-more": function () { T.notesAll = !T.notesAll; },
    "person-new": function () { var p = newPerson(""); T.drawer = { type: "person", p: p.id }; },
    "person-open": function (el) { T.drawer = { type: "person", p: el.dataset.p }; },
    "person-quick": function () {
      var inp = $("#quick-name"), name = inp && inp.value.trim();
      if (!name) { if (inp) inp.focus(); return false; }
      var twin = S.people.some(function (x) { return String(x.name || "").toLowerCase() === name.toLowerCase(); });
      newPerson(name); render(); var n = $("#quick-name"); if (n) n.focus();
      if (twin) toast("There are now two people named " + name + ". Add a last initial so they're easy to tell apart.");
      return false;
    },
    "person-del": function (el) {
      var pid = el.dataset.p || (T.drawer && T.drawer.p), p = person(pid);
      var go = function () {
        S.people = S.people.filter(function (x) { return x.id !== pid; });
        S.pairs = S.pairs.filter(function (x) { return x.a !== pid && x.b !== pid; });
        Object.keys(S.weeks).forEach(function (k) { var w = S.weeks[k]; Object.keys(w.assign || {}).forEach(function (s) { w.assign[s] = w.assign[s].filter(function (x) { return x !== pid; }); }); });
        if (T.drawer && T.drawer.p === pid) T.drawer = null;
        markAllEdited();
      };
      if (!p || !p.name) { go(); return; }
      askConfirm("Remove " + p.name + "?", "They'll be taken off every schedule in this browser.", "Remove", go, true);
      return false;
    },
    "p-role": function (el) { var p = person(el.dataset.p || T.drawer.p), r = el.dataset.r; p.roles = p.roles || []; var i = p.roles.indexOf(r); if (i >= 0) p.roles.splice(i, 1); else p.roles.push(r); },
    "p-type": function (el) { person(el.dataset.p || T.drawer.p).type = el.dataset.v; },
    "p-fixed": function (el) { var p = person(T.drawer.p), d = el.dataset.dow, s = el.dataset.s; p.fixed = p.fixed || {}; var L = p.fixed[d] = p.fixed[d] || []; var i = L.indexOf(s); if (i >= 0) L.splice(i, 1); else L.push(s); },
    "p-pat": function (el) {
      var p = person(T.drawer.p), d = el.dataset.dow, s = el.dataset.s; p.pattern = p.pattern || {};
      if (s === "none") delete p.pattern[d]; else p.pattern[d] = s === "win" ? { s: "win", from: "09:00", to: "15:00" } : { s: s };
    },
    "p-pref": function (el) { var p = person(T.drawer.p); p.prefs = p.prefs || {}; if (el.dataset.v) p.prefs[el.dataset.s] = el.dataset.v; else delete p.prefs[el.dataset.s]; },

    // shifts and roles
    presets: function () { newShift("Open", "06:00", "12:00", 2); newShift("Mid", "10:00", "16:00", 1); newShift("Close", "14:00", "20:00", 2); toast("Added Open, Mid and Close. Edit the times to match yours."); },
    "tpl-new": function () { var s = newShift("New shift"); T.drawer = { type: "tpl", s: s.id }; },
    "tpl-add-inline": function () { newShift(""); },
    "tpl-open": function (el) { T.drawer = { type: "tpl", s: el.dataset.s }; },
    "tpl-del": function (el) {
      var id = el.dataset.s || T.drawer.s, s = tpl(id);
      var go = function () { S.shifts = S.shifts.filter(function (x) { return x.id !== id; }); if (T.drawer && T.drawer.s === id) T.drawer = null; markAllEdited(); };
      if (!s || !s.name) { go(); return; }
      askConfirm("Delete " + s.name + "?", "It will disappear from every week, along with who was on it.", "Delete", go, true);
      return false;
    },
    "t-day": function (el) { var s = tpl(el.dataset.s || T.drawer.s); s.days[el.dataset.dow] = !s.days[el.dataset.dow]; },
    "t-perday": function () { T.drawer.perDay = !T.drawer.perDay; },
    "t-color": function (el) { tpl(T.drawer.s).color = +el.dataset.c; },
    "t-need-add": function () { var s = tpl(T.drawer.s); (s.needs = s.needs || []).push({ role: S.roles[0].id, count: 1 }); },
    "t-need-del": function (el) { tpl(T.drawer.s).needs.splice(+el.dataset.i, 1); },
    "t-need-toggle": function (el) {
      var s = tpl(el.dataset.s), r = el.dataset.r; s.needs = s.needs || [];
      var i = s.needs.findIndex(function (n) { return n.role === r; });
      if (i >= 0) s.needs.splice(i, 1); else s.needs.push({ role: r, count: 1 });
    },
    "role-add": function (el) {
      var name = el.dataset.name || ($("#role-input") || {}).value; if (!addRole(name)) return false;
      render(); var i = $("#role-input"); if (i && !el.dataset.name) i.focus(); return false;
    },
    "role-del": function (el) {
      var id = el.dataset.r;
      S.roles = S.roles.filter(function (r) { return r.id !== id; });
      S.people.forEach(function (p) { p.roles = (p.roles || []).filter(function (r) { return r !== id; }); });
      S.shifts.forEach(function (s) { s.needs = (s.needs || []).filter(function (n) { return n.role !== id; }); });
    },

    // pairings
    "pair-add": function (el) {
      var t = el.dataset.t, a = $("#pa-" + t).value, b = $("#pb-" + t).value;
      if (a === b) { toast("Pick two different people."); return false; }
      if (S.pairs.some(function (x) { return x.type === t && ((x.a === a && x.b === b) || (x.a === b && x.b === a)); })) { toast("That pair is already there."); return false; }
      var clash = S.pairs.find(function (x) { return x.type !== t && ((x.a === a && x.b === b) || (x.a === b && x.b === a)); });
      if (clash) S.pairs = S.pairs.filter(function (x) { return x !== clash; });
      S.pairs.push({ id: uid(), a: a, b: b, type: t });
    },
    "pair-del": function (el) { S.pairs = S.pairs.filter(function (x) { return x.id !== el.dataset.id; }); },

    // cover
    "req-next": function (el) { var x = findReq(el.dataset.id); if (x && !sendNext(x.r, batchSize())) toast("Everyone on the list has been asked."); },
    "req-cancel": function (el) { var x = findReq(el.dataset.id); if (x) x.r.status = "cancelled"; },

    // settings
    "biz-ws": function (el) {
      var v = +el.dataset.v; if (v === S.business.weekStart) return;
      var apply = function () { S.business.weekStart = v; S.ui.week = null; };
      var has = Object.keys(S.weeks).some(function (k) { var w = S.weeks[k]; return w.generated || w.status === "published" || Object.keys(w.avail || {}).length; });
      if (!has || S.setup !== "done") { apply(); return; }
      askConfirm("Change the first day of the week?", "Schedules you've already made are saved by their start day, so they'll be hidden while this is changed. Switch back and they return. Change it before you start scheduling, if you can.", "Change anyway", apply, false);
      return false;
    },
    "biz-clock": function (el) { S.business.clock = +el.dataset.v; },
    backup: function () { download("scheduling-agent-backup-" + iso(new Date()) + ".json", JSON.stringify(S, null, 2), "application/json"); toast("Backup downloaded."); return false; },
    rerun: function () { S.setup = "wizard"; S.ui.wiz = 0; },
    reset: function () { askConfirm("Erase everything?", "This deletes your team, shifts and schedules from this browser. Download a backup first if you might want them.", "Erase all", function () { S = blank(); T.skipPick = false; }, true); return false; },
    "confirm-ok": function () { var fn = T.confirmFn; T.modal = null; T.confirmFn = null; if (fn) fn(); },

    // employee preview
    "as-emp": function (el) { S.ui.viewAs = el.dataset.p; S.ui.empTab = el.dataset.tab || (S.features.rescue ? "req" : "shifts"); T.modal = null; T.drawer = null; window.scrollTo(0, 0); },
    "exit-emp": function (el, ev) { if (ev) ev.preventDefault(); S.ui.viewAs = null; },
    "emp-tab": function (el) { S.ui.empTab = el.dataset.v; },
    "emp-av": function (el) {
      var p = person(S.ui.viewAs), w = wk(weekKey()), s = el.dataset.s, cur = (w.avail[p.id] || {})[el.dataset.d] || availOf(p, weekKey(), el.dataset.d).v;
      w.avail[p.id] = w.avail[p.id] || {};
      w.avail[p.id][el.dataset.d] = s === "win" ? { s: "win", from: cur && cur.s === "win" ? cur.from : "09:00", to: cur && cur.s === "win" ? cur.to : "15:00" } : { s: s };
    },
    "emp-cycle": function (el) {
      var p = person(S.ui.viewAs), key = weekKey(), w = wk(key), dk = el.dataset.d, cur = availOf(p, key, dk).v, st = cur ? cur.s : "any";
      var next = st === "any" ? { s: "off" } : st === "off" ? { s: "win", from: "09:00", to: "15:00" } : { s: "any" };
      (w.avail[p.id] = w.avail[p.id] || {})[dk] = next; w.draft = true;
    },
    "emp-quick": function (el) {
      var p = person(S.ui.viewAs), key = weekKey(), w = wk(key), v = el.dataset.v, prev = S.weeks[iso(addDays(parseISO(key), -7))];
      w.avail[p.id] = w.avail[p.id] || {}; w.draft = true;
      if (v === "last" && !(prev && prev.avail && prev.avail[p.id] && Object.keys(prev.avail[p.id]).length)) { toast("Nothing saved for last week."); return false; }
      weekDates(key).forEach(function (d) {
        var dk = iso(d);
        if (v === "any") w.avail[p.id][dk] = { s: "any" };
        else if (v === "usual") { var u = (p.pattern || {})[d.getDay()]; if (u) w.avail[p.id][dk] = clone(u); }
        else { var pv = prev.avail[p.id][iso(addDays(d, -7))]; if (pv) w.avail[p.id][dk] = clone(pv); }
      });
    },
    "emp-submit": function () {
      var p = person(S.ui.viewAs), key = weekKey(), w = wk(key);
      w.avail[p.id] = w.avail[p.id] || {};
      weekDates(key).forEach(function (d) { var dk = iso(d); if (!w.avail[p.id][dk]) { var v = availOf(p, key, dk).v; w.avail[p.id][dk] = v ? clone(v) : { s: "any" }; } });
      if (S.ui.employee) {
        SACloud.empSubmit(key, clone(w.avail[p.id])).then(function () { w.draft = false; toast("Sent to your manager."); render(); });
        return false;
      }
      w.submitted[p.id] = Date.now(); toast("Sent to your manager.");
    },
    "emp-accept": function (el) {
      if (S.ui.employee) { SACloud.empRespond(el.dataset.id, true).then(function (r) { if (r) toast("Thanks! The shift is yours."); render(); }); return false; }
      respond(el.dataset.id, S.ui.viewAs, true);
    },
    "emp-decline": function (el) {
      if (S.ui.employee) { SACloud.empRespond(el.dataset.id, false).then(function (r) { if (r) toast("Got it. We'll ask the next person."); render(); }); return false; }
      respond(el.dataset.id, S.ui.viewAs, false);
    },
    "sign-out": function () { SACloud.signOut(); S = blank(); return false; },
    "emp-ics": function () { var p = person(S.ui.viewAs); download("my-shifts-" + weekKey() + ".ics", icsText(weekKey(), p.id), "text/calendar"); toast("Calendar file downloaded."); return false; }
  };

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]");
    if (!el || !app.contains(el) && !el.closest(".modal-wrap")) return;
    var fn = ACT[el.dataset.act]; if (!fn) return;
    if (el.tagName === "A") ev.preventDefault();
    if (fn(el, ev) !== false) render();
  });

  /* ------------------------------------------------------------------
     Field changes
     ------------------------------------------------------------------ */
  function onChange(el) {
    var c = el.dataset.change, v = el.type === "checkbox" ? el.checked : el.value, key = weekKey(), w = wk(key);
    var P = function () { return person(el.dataset.p || (T.drawer && T.drawer.p)); };
    var Tp = function () { return tpl(el.dataset.s || (T.drawer && T.drawer.s)); };
    var numOr = function (x, d) { return x === "" || isNaN(+x) ? d : Math.max(0, +x); };
    switch (c) {
      case "viewas": S.ui.viewAs = v || null; T.drawer = null; T.modal = null; if (v) S.ui.empTab = "shifts"; break;
      case "biz-name": S.business.name = v.trim(); break;
      case "theme-custom": S.brand.accent = v.toUpperCase(); break;
      case "logo": loadLogo(el.files[0], function (col) { if (col) { S.brand.accent = col; toast("Logo added. We matched the theme color to it."); } else toast("Logo added."); render(); }); return;
      case "biz-doubles": S.business.allowDoubles = v; break;
      case "biz-missing": S.business.missingAvail = v; break;
      case "feat": S.features[el.dataset.k] = v; break;
      case "weight": S.weights[el.dataset.k] = +v; break;
      case "rescue-order": S.rescue.order = v; break;
      case "rescue-show": S.rescue.showList = v; break;
      case "rescue-max": S.rescue.underMaxOnly = v; break;
      case "rescue-window": S.rescue.window = +v; break;
      case "p-name": P().name = v.trim(); break;
      case "p-min": P().min = numOr(v, 0); break;
      case "p-max": P().max = v === "" ? "" : numOr(v, ""); break;
      case "p-optin": P().rescueOptIn = v; break;
      case "p-pat-from": P().pattern[el.dataset.dow].from = v; break;
      case "p-pat-to": P().pattern[el.dataset.dow].to = v; break;
      case "t-name": Tp().name = v.trim(); break;
      case "t-start": if (v) Tp().start = v; break;
      case "t-end": if (v) Tp().end = v; break;
      case "t-count": Tp().count = numOr(v, 0); break;
      case "t-perday": var s = Tp(); s.perDay = s.perDay || {}; if (v === "") delete s.perDay[el.dataset.dow]; else s.perDay[el.dataset.dow] = numOr(v, 0); break;
      case "t-need-count": Tp().needs[+el.dataset.i].count = Math.max(1, +v || 1); break;
      case "t-need-role": Tp().needs[+el.dataset.i].role = v; break;
      case "t-color-custom": if (/^#[0-9a-f]{6}$/i.test(v)) Tp().color = v.toUpperCase(); break;
      case "inst-start": var x = extraFor(curShift()); if (v) { if (x) x.start = v; else overFor(curShift()).start = v; markEdited(w); } break;
      case "inst-end": var x2 = extraFor(curShift()); if (v) { if (x2) x2.end = v; else overFor(curShift()).end = v; markEdited(w); } break;
      case "inst-count": var x3 = extraFor(curShift()); if (x3) x3.count = numOr(v, 1); else overFor(curShift()).count = numOr(v, 0); markEdited(w); break;
      case "pop-from": T.pop.win = T.pop.win || { from: "09:00", to: "15:00" }; T.pop.win.from = v; return;
      case "pop-to": T.pop.win = T.pop.win || { from: "09:00", to: "15:00" }; T.pop.win.to = v; return;
      case "pop-usual": T.pop.usual = v; return;
      case "au-import": T.importLocal = v; return;
      case "exp-who": T.modal.who = v; return;
      case "imp-text": T.modal.text = v; previewImport(); break;
      case "imp-file": readFile(el.files[0], function (t) { T.modal.text = t; previewImport(); render(); }); return;
      case "restore": readFile(el.files[0], function (t) {
        try { var s2 = JSON.parse(t); if (!s2 || s2.version !== 1) throw 0; S = merge(blank(), s2); render(); toast("Backup restored."); }
        catch (e) { toast("That file isn't a Scheduling Agent backup."); }
      }); return;
      case "emp-from": case "emp-to":
        var p = person(S.ui.viewAs), cur = (w.avail[p.id] || {})[el.dataset.d];
        if (cur && cur.s === "win") { cur[c === "emp-from" ? "from" : "to"] = v; w.draft = true; } break;
      case "emp-optin": person(S.ui.viewAs).rescueOptIn = v; if (S.ui.employee) SACloud.empOptIn(v); break;
      default: return;
    }
    render();
  }
  function readFile(f, cb) { if (!f) return; var r = new FileReader(); r.onload = function () { cb(String(r.result || "")); }; r.readAsText(f); }
  document.addEventListener("change", function (ev) { var el = ev.target.closest("[data-change]"); if (el) onChange(el); });
  document.addEventListener("input", function (ev) {
    var el = ev.target;
    if (el.id === "helper-in") { chat().draft = el.value; return; }
    if (el.type === "range" && el.dataset.change === "weight") { var o = el.parentNode.querySelector(".tnum"); if (o) o.textContent = el.value; }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && T.pop) { T.pop = null; render(); return; }
    if (ev.key === "Escape" && T.modal && T.modal.type === "confirm") { T.modal = null; T.confirmFn = null; render(); return; }
    if (ev.key === "Escape" && (T.drawer || T.modal)) { dropBlankPerson(); T.drawer = null; T.modal = null; render(); }
    if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.enter) {
      ev.preventDefault();
      var fn = ACT[ev.target.dataset.enter];
      if (ev.target.dataset.enter === "person-quick") { fn(ev.target); return; }
      if (fn && fn(ev.target) !== false) render();
    }
  });
  document.addEventListener("focusin", function (ev) { if (T.helperFocus && ev.target.id !== "helper-in") T.helperFocus = false; });
  window.addEventListener("resize", function () { if (T.pop) { T.pop = null; render(); } });

  if (CLOUD) {
    SACloud.bindOwner({
      get: function () { return S; },
      set: function (x) {
        S = merge(blank(), x);
        if (S.ui.employee && !T.empWeekSet) {
          // employees start on this week, or the next published week
          T.empWeekSet = true;
          var now = iso(weekStartOf(new Date())), pubs = Object.keys(S.weeks).filter(function (k) { return S.weeks[k].pub && k >= now; }).sort();
          S.ui.week = S.weeks[now] && S.weeks[now].pub ? now : pubs[0] || iso(addDays(weekStartOf(new Date()), 7));
        }
      },
      blank: blank, render: render, applyRequest: applyRequest
    });
    SACloud.onChange(render);
  }
  render();
})();
