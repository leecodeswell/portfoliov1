/* =====================================================================
   Ares Web Services (by Thompson Technologies): shared site behavior
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- Settings: fill these in when you're ready ---------- */
  var CONTACT_EMAIL = "thompsontechnologiesleet@gmail.com";   // where contact form messages are delivered
  var BOOKING_URL   = "";   // optional scheduling link (Calendly, Cal.com...). Empty = "Schedule a call" opens the form in call mode.

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile menu ---------- */
  var navBtn = $(".nav-toggle"), nav = $("#site-nav");
  function setMenu(open) {
    if (!navBtn) return;
    navBtn.setAttribute("aria-expanded", String(open));
    navBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
  }
  if (navBtn && nav) {
    navBtn.addEventListener("click", function () { setMenu(navBtn.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) { setMenu(false); setDropdown(false); } });
  }

  /* ---------- Services and Applications dropdowns ---------- */
  var isMobileNav = function () { return window.matchMedia("(max-width: 960px)").matches; };
  var dropdowns = $$("[data-dropdown]").map(function (btn) {
    var menu = document.getElementById(btn.getAttribute("aria-controls")), dd = btn.parentElement, closeT;
    var set = function (open) { btn.setAttribute("aria-expanded", String(open)); menu.hidden = !open; };
    btn.addEventListener("click", function (e) { e.stopPropagation(); var open = menu.hidden; setDropdown(false); set(open); });
    dd.addEventListener("mouseenter", function () { if (!isMobileNav()) { clearTimeout(closeT); setDropdown(false); set(true); } });
    dd.addEventListener("mouseleave", function () { if (!isMobileNav()) closeT = setTimeout(function () { set(false); }, 150); });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) set(false); });
    dd.addEventListener("focusout", function (e) { if (!isMobileNav() && !dd.contains(e.relatedTarget)) set(false); });
    return { btn: btn, menu: menu, set: set };
  });
  function setDropdown(open) { dropdowns.forEach(function (d) { d.set(open); }); }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    dropdowns.forEach(function (d) { if (!d.menu.hidden) { d.set(false); d.btn.focus(); } });
    setMenu(false);
  });

  /* ---------- "Schedule a call" links ---------- */
  $$("[data-call]").forEach(function (a) {
    if (BOOKING_URL) { a.href = BOOKING_URL; a.target = "_blank"; a.rel = "noopener"; }
    else a.addEventListener("click", function () { setContactMode("call"); });
  });

  /* =====================================================================
     PHONES: the mission statement types itself out like code
     (the tree is hidden at this size; desktop is untouched)
     ===================================================================== */
  (function typeMission() {
    var el = $(".mission-text");
    if (!el || !window.matchMedia("(max-width: 720px)").matches) return;
    var text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    // every character gets its own span, so the line keeps its final size while it types
    el.textContent = "";
    var chars = text.split("").map(function (c) {
      var s = document.createElement("span"); s.className = "ch"; s.setAttribute("aria-hidden", "true"); s.textContent = c;
      el.appendChild(s); return s;
    });
    var caret = document.createElement("span"); caret.className = "type-caret"; caret.setAttribute("aria-hidden", "true");
    el.appendChild(caret);
    if (reduceMotion) return;

    el.classList.add("is-typing");
    el.insertBefore(caret, chars[0]);
    var i = 0;
    function step() {
      chars[i].classList.add("on");
      el.insertBefore(caret, chars[i].nextSibling);
      var c = chars[i].textContent; i++;
      if (i >= chars.length) { el.classList.remove("is-typing"); return; }
      // a human-ish rhythm: quick keys, a beat after each word and at punctuation
      var d = 34 + Math.random() * 38;
      if (c === " ") d += 40;
      if (c === "," || c === ".") d += 180;
      setTimeout(step, d);
    }
    var started = false;
    function begin() { if (!started) { started = true; setTimeout(step, 450); } }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); begin(); }
      }, { threshold: 0.6 });
      io.observe(el);
    } else begin();
  })();

  /* =====================================================================
     HERO TREE (desktop): branches grow out from the hub to each leaf,
     twigs sprout small leaves, everything sways in a slow breeze, light
     pulses run in from your inputs and out to the results, and now and
     then a leaf lets go and drifts down. Drawn at 2x for crisp lines.
     ===================================================================== */
  (function treeAnim() {
    var flow = $(".flow");
    if (!flow) return;
    var canvas = $(".flow-canvas", flow), ctx = canvas.getContext("2d");
    var inputs = $$('[data-node="in"]', flow), outputs = $$('[data-node="out"]', flow), hub = $('[data-node="hub"]', flow);
    var labels = $$(".flow-label", flow);
    var paths = [], pulses = [], ripples = [], sparks = [], motes = [], falling = [];
    var W = 0, H = 0, HC = { x: 0, y: 0, r: 1 }, twigLen = 40;
    var growStart = -1, grown = false, visible = true, seen = false, clock = 0, liveAt = -1, nextFall = 4, spawnClock = 0.4;
    var ptr = { x: -9999, y: -9999, on: false };
    var GROW_MS = 1300, SPEED = 230;   // px per second for the light pulses

    // a soft round glow, drawn once at high resolution and reused (smooth at any size)
    var sprite = (function () {
      var c = document.createElement("canvas"); c.width = c.height = 256;
      var g = c.getContext("2d"), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      r.addColorStop(0, "rgba(255,246,222,1)"); r.addColorStop(0.07, "rgba(255,234,186,0.9)");
      r.addColorStop(0.22, "rgba(238,200,124,0.38)"); r.addColorStop(0.5, "rgba(201,162,79,0.11)"); r.addColorStop(1, "rgba(201,162,79,0)");
      g.fillStyle = r; g.fillRect(0, 0, 256, 256); return c;
    })();
    function glow(x, y, R, a) { if (a <= 0) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(sprite, x - R, y - R, R * 2, R * 2); ctx.globalAlpha = 1; }

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function easeBack(t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
    function rng(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
    function bez(p, t) {
      var u = 1 - t;
      return { x: u * u * u * p.p0.x + 3 * u * u * t * p.p1.x + 3 * u * t * t * p.p2.x + t * t * t * p.p3.x,
               y: u * u * u * p.p0.y + 3 * u * u * t * p.p1.y + 3 * u * t * t * p.p2.y + t * t * t * p.p3.y };
    }
    function bezD(p, t) {
      var u = 1 - t, a = 3 * u * u, b = 6 * u * t, c = 3 * t * t;
      var x = a * (p.p1.x - p.p0.x) + b * (p.p2.x - p.p1.x) + c * (p.p3.x - p.p2.x);
      var y = a * (p.p1.y - p.p0.y) + b * (p.p2.y - p.p1.y) + c * (p.p3.y - p.p2.y);
      var l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l };
    }
    function wind(t) { return Math.sin(t * 0.43) * 0.6 + Math.sin(t * 0.71 + 1.7) * 0.3 + Math.sin(t * 1.9 + 0.3) * 0.1; }

    /* ---------- layout ---------- */
    function build() {
      flow.querySelectorAll(".node").forEach(function (n) { n.style.setProperty("--sx", "0px"); n.style.setProperty("--sy", "0px"); n.style.setProperty("--sr", "0deg"); });
      var base = flow.getBoundingClientRect();
      W = base.width; H = base.height;
      if (!W || !H) return false;
      var scale = Math.min(3, Math.max(2, window.devicePixelRatio || 1));   // at least 2x for smooth curves, up to 3x on very sharp screens
      canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      var hr = hub.getBoundingClientRect();
      // offsetWidth ignores the pop-in scale, so the ring is placed for the orb's real size
      HC = { x: hr.left - base.left + hr.width / 2, y: hr.top - base.top + hr.height / 2, r: (hub.offsetWidth || hr.width) / 2 };
      twigLen = Math.min(66, W / 23);
      var rand = rng(11);

      function make(node, kind, order) {
        var sr = node.querySelector(".stem").getBoundingClientRect(), er = node.getBoundingClientRect();
        var tip = { x: (kind === "in" ? sr.right : sr.left) - base.left, y: sr.top + sr.height / 2 - base.top };
        var c = { x: er.left - base.left + er.width / 2, y: er.top - base.top + er.height / 2 };
        var ang = clamp((tip.y - HC.y) / (HC.r * 4), -0.5, 0.5);
        var p = { kind: kind, node: node, tip: tip, c: c, phase: rand() * 6.283, delay: 300 + order * 110, twigs: [],
          hubPt: { x: HC.x + (kind === "in" ? -1 : 1) * HC.r * Math.cos(ang), y: HC.y + HC.r * Math.sin(ang) },
          s: { dx: 0, dy: 0, rot: 0, ax: 0, ay: 0, bend: 0 }, last: 0 };
        geom(p);
        var len = 0, prev = bez(p, 0);
        for (var k = 1; k <= 24; k++) { var q = bez(p, k / 24); len += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q; }
        p.len = len;
        var n = 3 + (rand() > 0.55 ? 1 : 0), up = tip.y < HC.y - 8 ? -1 : tip.y > HC.y + 8 ? 1 : 0;
        for (var i = 0; i < n; i++) {
          var side = up ? (i % 3 === 1 ? -up : up) : (i % 2 ? 1 : -1);
          var tw = { at: 0.16 + (i + 0.2 + rand() * 0.6) * (0.66 / n), side: side, ang: 0.5 + rand() * 0.42, L: twigLen * (0.6 + rand() * 0.75), ph: rand() * 6.283, leaves: [] };
          tw.leaves.push({ u: 1, side: 0, size: 14 + rand() * 8, ph: rand() * 6.283, sc: 1, kind: (rand() * 3) | 0, tone: pickTone(rand()) });
          if (rand() > 0.25) tw.leaves.push({ u: 0.5 + rand() * 0.2, side: rand() > 0.5 ? 1 : -1, size: 10 + rand() * 6, ph: rand() * 6.283, sc: 1, kind: (rand() * 3) | 0, tone: pickTone(rand()) });
          if (rand() > 0.55) tw.leaves.push({ u: 0.28 + rand() * 0.14, side: rand() > 0.5 ? 1 : -1, size: 8 + rand() * 4, ph: rand() * 6.283, sc: 1, kind: (rand() * 3) | 0, tone: pickTone(rand()) });
          p.twigs.push(tw);
        }
        return p;
      }
      var keep = paths; paths = []; pulses = []; sparks = []; ripples = [];
      var n = Math.max(inputs.length, outputs.length), order = 0;
      for (var i = 0; i < n; i++) {
        if (inputs[i]) paths.push(make(inputs[i], "in", order++));
        if (outputs[i]) paths.push(make(outputs[i], "out", order++));
      }
      // motes: faint specks of light drifting up through the tree
      var count = Math.min(70, Math.round(W * H / 15000));
      if (motes.length !== count || !keep.length) {
        motes = [];
        for (var m = 0; m < count; m++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: 0.4 + Math.random() * 1.3, vy: -(3 + Math.random() * 9), vx: (Math.random() - 0.5) * 4, ph: Math.random() * 6.283, tw: 0.6 + Math.random() * 1.6 });
      }
      return true;
    }

    // where the branch runs right now (its leaf end moves with the leaf)
    function geom(p) {
      var s = p.s, leaf = { x: p.tip.x + s.ax, y: p.tip.y + s.ay }, h = p.hubPt;
      var a = p.kind === "in" ? leaf : h, b = p.kind === "in" ? h : leaf, mid = (a.x + b.x) / 2;
      var bl = s.bend, bh = s.bend * 0.25;
      p.p0 = a; p.p3 = b;
      p.p1 = { x: mid, y: a.y + (p.kind === "in" ? bl : bh) };
      p.p2 = { x: mid, y: b.y + (p.kind === "in" ? bh : bl) };
    }

    /* ---------- the breeze ---------- */
    function sway(p, t, dt, amp) {
      var g = wind(t - p.c.x * 0.0013), loc = Math.sin(t * 1.25 + p.phase);
      var dx = (g * 2.4 + loc * 0.8) * amp, dy = (Math.sin(t * 0.9 + p.phase) * 3 + g * 1.1) * amp, rot = (g * 0.8 + loc * 0.35) * amp;
      if (ptr.on) {   // leaves lean away from the cursor
        var ex = p.c.x - ptr.x, ey = p.c.y - ptr.y, d = Math.hypot(ex, ey);
        if (d < 200 && d > 1) { var k = Math.pow(1 - d / 200, 2); dx += ex / d * 12 * k; dy += ey / d * 9 * k; rot += (ex > 0 ? 1 : -1) * 1.4 * k; }
      }
      var s = p.s, f = Math.min(1, dt * 7);
      s.dx += (dx - s.dx) * f; s.dy += (dy - s.dy) * f; s.rot += (rot - s.rot) * f;
      s.bend = (g * 7 + loc * 2) * amp + s.dy * 0.6;
      var r = s.rot * Math.PI / 180, ox = p.tip.x - p.c.x, oy = p.tip.y - p.c.y;
      s.ax = (ox * Math.cos(r) - oy * Math.sin(r)) - ox + s.dx;
      s.ay = (ox * Math.sin(r) + oy * Math.cos(r)) - oy + s.dy;
      var st = p.node.style;
      st.setProperty("--sx", s.dx.toFixed(2) + "px"); st.setProperty("--sy", s.dy.toFixed(2) + "px"); st.setProperty("--sr", s.rot.toFixed(3) + "deg");
    }

    /* ---------- drawing ---------- */
    // a filled ribbon along sampled points, wide at w0 and narrow at w1: tapered like a real branch
    function ribbon(pts, w0, w1) {
      var n = pts.length - 1, L = [], R = [];
      for (var i = 0; i <= n; i++) {
        var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
        var tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1, w = (w0 + (w1 - w0) * (i / n)) / 2;
        L.push([pts[i].x - ty / l * w, pts[i].y + tx / l * w]); R.push([pts[i].x + ty / l * w, pts[i].y - tx / l * w]);
      }
      ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
      for (i = 1; i <= n; i++) ctx.lineTo(L[i][0], L[i][1]);
      for (i = n; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
      ctx.closePath(); ctx.fill();
    }
    // Leaves: three shapes, a few autumn-gold tones (and the odd violet one), lit on one half of the
    // midrib and shaded on the other, with side veins and a bright rim. "flip" turns the leaf over in
    // the breeze (1 = top side, 0 = edge-on, -1 = underside, which is paler).
    var SHAPES = [
      { w: 0.46, a: [0.16, 1.05], b: [0.6, 0.95] },    // ovate
      { w: 0.30, a: [0.24, 1.0], b: [0.7, 0.72] },     // lance
      { w: 0.58, a: [0.1, 0.75], b: [0.52, 1.18] }     // round
    ];
    var TONES = [
      { base: [104, 78, 32], tip: [232, 196, 116], under: [242, 222, 176] },   // gold
      { base: [96, 58, 22], tip: [222, 152, 70], under: [238, 200, 152] },     // amber
      { base: [78, 66, 36], tip: [214, 196, 138], under: [232, 224, 196] },    // champagne
      { base: [62, 42, 98], tip: [182, 146, 236], under: [218, 202, 244] }     // violet
    ];
    function pickTone(r) { return r < 0.38 ? 0 : r < 0.68 ? 1 : r < 0.93 ? 2 : 3; }
    function rgba(c, k, a) { return "rgba(" + (c[0] * k | 0) + "," + (c[1] * k | 0) + "," + (c[2] * k | 0) + "," + a + ")"; }
    function lift(c, k) { return [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k]; }
    function drawLeaf(x, y, ang, len, bright, alpha, kind, tone, flip) {
      if (len < 0.4) return;
      var S = SHAPES[kind || 0], T = TONES[tone || 0], f = flip == null ? 1 : flip;
      if (Math.abs(f) < 0.06) f = f < 0 ? -0.06 : 0.06;
      var w = len * S.w, under = f < 0, stalk = len * 0.14, L = len;
      var tipC = lift(under ? T.under : T.tip, 0.28 * bright), baseC = lift(T.base, 0.2 * bright);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      // stalk
      ctx.strokeStyle = rgba(T.tip, 0.8, 0.55); ctx.lineWidth = Math.max(0.7, len * 0.05); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(stalk, 0); ctx.stroke();
      ctx.translate(stalk, 0); ctx.scale(1, f);
      function half(sg) {
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.bezierCurveTo(L * S.a[0], sg * w * S.a[1], L * S.b[0], sg * w * S.b[1], L, 0);
        ctx.closePath();
      }
      // the lit half and the shaded half
      var g1 = ctx.createLinearGradient(0, 0, L, 0);
      g1.addColorStop(0, rgba(baseC, 1, 0.92)); g1.addColorStop(0.55, rgba(tipC, 0.92, 0.95)); g1.addColorStop(1, rgba(tipC, 1, 1));
      half(-1); ctx.fillStyle = g1; ctx.fill();
      var g2 = ctx.createLinearGradient(0, 0, L, 0);
      g2.addColorStop(0, rgba(baseC, 0.7, 0.95)); g2.addColorStop(1, rgba(tipC, 0.68, 0.95));
      half(1); ctx.fillStyle = g2; ctx.fill();
      // a soft sheen across the lit half
      var sh = ctx.createLinearGradient(0, -w * 0.9, 0, 0);
      sh.addColorStop(0, "rgba(255,244,220," + (0.16 + 0.22 * bright) + ")"); sh.addColorStop(1, "rgba(255,244,220,0)");
      half(-1); ctx.fillStyle = sh; ctx.fill();
      // veins
      var vA = 0.22 + 0.4 * bright, lw = Math.max(0.45, len * 0.028);
      ctx.strokeStyle = "rgba(255,238,196," + vA + ")"; ctx.lineWidth = lw;
      ctx.beginPath();
      for (var v = 1; v <= 4; v++) {
        var u = 0.12 + v * 0.17, reach = w * S.b[1] * 0.62 * (1 - u * 0.45);
        ctx.moveTo(L * u, 0); ctx.quadraticCurveTo(L * (u + 0.07), -reach * 0.55, L * (u + 0.15), -reach);
        ctx.moveTo(L * u, 0); ctx.quadraticCurveTo(L * (u + 0.07), reach * 0.55, L * (u + 0.15), reach);
      }
      ctx.stroke();
      // midrib
      ctx.strokeStyle = "rgba(255,240,206," + (0.42 + 0.45 * bright) + ")"; ctx.lineWidth = lw * 1.7;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.5, -w * 0.04, L * 0.94, 0); ctx.stroke();
      // bright rim on the lit edge
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(L * S.a[0], -w * S.a[1], L * S.b[0], -w * S.b[1], L, 0);
      ctx.strokeStyle = "rgba(255,236,190," + (0.32 + 0.5 * bright) + ")"; ctx.lineWidth = lw * 1.4; ctx.stroke();
      // a darker edge on the shaded side gives the leaf body
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(L * S.a[0], w * S.a[1], L * S.b[0], w * S.b[1], L, 0);
      ctx.strokeStyle = rgba(T.base, 0.6, 0.5); ctx.lineWidth = lw; ctx.stroke();
      ctx.restore();
      if (bright > 0.2) glow(x + Math.cos(ang) * len * 0.6, y + Math.sin(ang) * len * 0.6, len * 2, bright * 0.45);
    }
    // how much light is passing a point on a branch right now (0..1)
    function energy(p, t) {
      var e = 0;
      for (var i = 0; i < pulses.length; i++) { var q = pulses[i]; if (q.p !== p || q.wait > 0) continue; var d = (q.t - t) / 0.09; e = Math.max(e, Math.exp(-d * d)); }
      return e;
    }

    function drawBranch(p, g, t, amp) {
      var from = p.kind === "in" ? 1 - g : 0, to = p.kind === "in" ? 1 : g, N = 40, pts = [];
      // sample from the hub outward so the ribbon is thick at the hub
      for (var i = 0; i <= N; i++) { var tt = p.kind === "in" ? to - (to - from) * i / N : from + (to - from) * i / N; pts.push(bez(p, tt)); }
      var hubX = p.hubPt.x, leafX = p.p0.x === hubX ? p.p3.x : p.p0.x;
      // soft light under the branch
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); pts.forEach(function (q, k) { if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
      ctx.strokeStyle = "rgba(201,162,79,0.06)"; ctx.lineWidth = 7; ctx.stroke();
      var gr = ctx.createLinearGradient(hubX, 0, leafX, 0);
      gr.addColorStop(0, "rgba(222,186,108,0.92)"); gr.addColorStop(0.55, "rgba(201,162,79,0.55)"); gr.addColorStop(1, "rgba(201,162,79,0.3)");
      ctx.fillStyle = gr;
      ribbon(pts, 3.6, 1.1 + 2.5 * (1 - g));
      // twigs and their leaves
      p.twigs.forEach(function (tw) {
        var k = clamp((g - tw.at) / 0.24, 0, 1);
        if (!k) return;
        var e = ease(k), tPath = p.kind === "in" ? 1 - tw.at : tw.at, s = bez(p, tPath), d = bezD(p, tPath);
        if (p.kind === "in") { d.x = -d.x; d.y = -d.y; }   // point away from the hub
        var a = tw.side * (tw.ang + Math.sin(t * 1.6 + tw.ph) * 0.05 * amp), ca = Math.cos(a), sa = Math.sin(a);
        var dir = { x: d.x * ca - d.y * sa, y: d.x * sa + d.y * ca };
        var c = { x: s.x + dir.x * tw.L * 0.55, y: s.y + dir.y * tw.L * 0.55 };
        var en = { x: s.x + (dir.x * 0.72 + d.x * 0.42) * tw.L, y: s.y + (dir.y * 0.72 + d.y * 0.42) * tw.L };
        function q(u) { var v = 1 - u; return { x: v * v * s.x + 2 * v * u * c.x + u * u * en.x, y: v * v * s.y + 2 * v * u * c.y + u * u * en.y }; }
        var tp = []; for (var j = 0; j <= 14; j++) tp.push(q(e * j / 14));
        var lit = energy(p, tPath);
        ctx.fillStyle = "rgba(" + (201 + 40 * lit | 0) + "," + (162 + 50 * lit | 0) + "," + (79 + 70 * lit | 0) + "," + (0.42 + 0.45 * lit) + ")";
        ribbon(tp, 1.5, 0.5);
        var lg = clamp((g - tw.at - 0.18) / 0.22, 0, 1);
        if (!lg) return;
        tw.leaves.forEach(function (lf) {
          if (lf.sc <= 0) return;
          var at = q(lf.u), b = q(Math.max(0, lf.u - 0.05)), base = Math.atan2(at.y - b.y, at.x - b.x);
          var rustle = 1;
          if (ptr.on) { var dd = Math.hypot(at.x - ptr.x, at.y - ptr.y); if (dd < 150) rustle += (1 - dd / 150) * 3; }
          var ang = base + lf.side * 0.75 + Math.sin(t * 2.3 + lf.ph) * 0.16 * amp * rustle + (rustle > 1 ? Math.sin(t * 9 + lf.ph) * 0.05 * (rustle - 1) : 0);
          // turn over a little in the breeze, much more when the cursor rustles them
          var calm = 1 - 0.3 * amp * (0.5 + 0.5 * Math.sin(t * 1.5 + lf.ph * 1.7)), shake = clamp((rustle - 1) / 2.5, 0, 1);
          var flip = calm * (1 - shake) + Math.cos(t * 7 + lf.ph) * shake;
          lf.x = at.x; lf.y = at.y; lf.a = ang;
          drawLeaf(at.x, at.y, ang, lf.size * easeBack(lg) * Math.min(1, lf.sc), lit, 1, lf.kind, lf.tone, flip);
        });
      });
      if (g < 1) { var tip = pts[pts.length - 1]; glow(tip.x, tip.y, 14, 0.9); }
    }

    // The ring around the logo: a fine bezel of ticks with a slow sweep of light, faint guide circles,
    // and four tapered comets orbiting at two radii. Brightens for a moment when a pulse arrives.
    var hubFlash = 0;
    function arcPts(r, a0, a1, n) { var out = []; for (var k = 0; k <= n; k++) { var aa = a0 + (a1 - a0) * k / n; out.push({ x: HC.x + Math.cos(aa) * r, y: HC.y + Math.sin(aa) * r }); } return out; }
    function drawHub(t, a, dt) {
      if (a <= 0) return;
      hubFlash = Math.max(0, hubFlash - (dt || 0) * 1.4);
      var R0 = HC.r + 9, R1 = HC.r + 20, R2 = HC.r + 36;
      ctx.lineCap = "round";
      // guide circles
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(214,178,100," + (0.08 + 0.1 * hubFlash) * a + ")"; ctx.beginPath(); ctx.arc(HC.x, HC.y, R1, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = "rgba(214,178,100," + (0.05 + 0.08 * hubFlash) * a + ")"; ctx.beginPath(); ctx.arc(HC.x, HC.y, R2, 0, 6.283); ctx.stroke();
      // bezel ticks with a sweeping highlight
      var N = 72, sweep = t * 0.42;
      for (var i = 0; i < N; i++) {
        var an = i / N * 6.283, hl = Math.pow(0.5 + 0.5 * Math.cos(an - sweep), 8), major = i % 6 === 0;
        var len = major ? 5 : 2.6, al = (0.1 + 0.62 * hl + 0.35 * hubFlash) * a;
        ctx.strokeStyle = "rgba(" + (226 + 29 * hl | 0) + "," + (190 + 44 * hl | 0) + "," + (112 + 80 * hl | 0) + "," + al + ")";
        ctx.lineWidth = major ? 1.8 : 1.3;
        ctx.beginPath(); ctx.moveTo(HC.x + Math.cos(an) * R0, HC.y + Math.sin(an) * R0); ctx.lineTo(HC.x + Math.cos(an) * (R0 + len), HC.y + Math.sin(an) * (R0 + len)); ctx.stroke();
      }
      // comets
      ctx.globalCompositeOperation = "lighter";
      [[R1, 0.34, 1.35, 3.4, 0.95], [R1, -0.23, 0.75, 2.4, 0.6], [R2, 0.15, 1.7, 3.0, 0.7], [R2, -0.19, 0.55, 2.2, 0.5]].forEach(function (o, k) {
        var head = t * o[1] + k * 1.7, tail = head - o[2] * (o[1] > 0 ? 1 : -1);
        var pts = arcPts(o[0], tail, head, 36), A = o[4] * a * (1 + 0.4 * hubFlash);
        var g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[36].x, pts[36].y);
        g.addColorStop(0, "rgba(226,190,112,0)"); g.addColorStop(0.65, "rgba(236,204,136," + 0.4 * A + ")"); g.addColorStop(1, "rgba(255,240,205," + Math.min(1, A) + ")");
        ctx.fillStyle = g; ribbon(pts, 0.2, o[3]);
        var hp = pts[36];
        glow(hp.x, hp.y, 16, 0.8 * A);
        ctx.fillStyle = "rgba(255,250,236," + Math.min(1, A) + ")"; ctx.beginPath(); ctx.arc(hp.x, hp.y, o[3] * 0.55, 0, 6.283); ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
    }

    /* ---------- light pulses ---------- */
    function lit(node) { node.classList.add("is-lit"); setTimeout(function () { node.classList.remove("is-lit"); }, 900); }
    function hubPulse() { hubFlash = 1; ripples.push({ age: 0 }); hub.classList.add("is-pulse"); setTimeout(function () { hub.classList.remove("is-pulse"); }, 520); }
    function spawnIn(p) {
      var ins = paths.filter(function (x) { return x.kind === "in"; });
      p = p || ins[Math.floor(Math.random() * ins.length)];
      if (!p) return;
      pulses.push({ p: p, t: 0, wait: 0 }); lit(p.node);
    }
    function spawnOut(p, wait) {
      var outs = paths.filter(function (x) { return x.kind === "out"; });
      p = p || outs[Math.floor(Math.random() * outs.length)];
      if (p) pulses.push({ p: p, t: 0, wait: wait || 0 });
    }
    function burst(x, y) {
      for (var i = 0; i < 9; i++) { var a = Math.random() * 6.283, v = 18 + Math.random() * 38; sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: 0.5 + Math.random() * 0.5 }); }
    }
    function drawPulse(q) {
      // a comet: one smooth tapered streak that fades toward its tail, with a soft glow at the head
      var p = q.p, N = 22, span = 110 / p.len, head = Math.min(q.t, 1), tail = Math.max(0, q.t - span), pts = [];
      if (head > tail + 0.0005) {
        for (var k = 0; k <= N; k++) pts.push(bez(p, tail + (head - tail) * k / N));
        var a = pts[0], b = pts[N], fade = clamp((q.t - 1) / span, 0, 1);
        var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        g.addColorStop(0, "rgba(255,228,166,0)"); g.addColorStop(0.6, "rgba(255,226,160," + 0.35 * (1 - fade) + ")"); g.addColorStop(1, "rgba(255,240,205," + 0.95 * (1 - fade) + ")");
        ctx.fillStyle = g; ribbon(pts, 0.2, 2.6);
      }
      if (q.t <= 1) { var h = bez(p, q.t); glow(h.x, h.y, 20, 0.95); ctx.fillStyle = "rgba(255,250,236,0.95)"; ctx.beginPath(); ctx.arc(h.x, h.y, 1.4, 0, 6.283); ctx.fill(); }
    }

    /* ---------- falling leaves ---------- */
    function dropLeaf() {
      var pool = [];
      paths.forEach(function (p) { p.twigs.forEach(function (tw) { tw.leaves.forEach(function (lf) { if (lf.sc >= 1 && lf.x != null) pool.push(lf); }); }); });
      var lf = pool[Math.floor(Math.random() * pool.length)];
      if (!lf) return;
      falling.push({ x: lf.x, y: lf.y, a: lf.a, len: lf.size, kind: lf.kind, tone: lf.tone, vx: (Math.random() - 0.5) * 8, vy: 4, spin: (Math.random() - 0.5) * 2.2, age: 0, life: 6 + Math.random() * 3, ph: Math.random() * 6.283, tumble: 2.2 + Math.random() * 1.6 });
      lf.sc = -1.2;   // it grows back after a little while
    }

    /* ---------- frame ---------- */
    var last = 0;
    function frame(ts) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden || !W) { last = ts; return; }
      var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts; clock += dt;
      ctx.clearRect(0, 0, W, H);
      var t = clock, amp = liveAt < 0 ? 0 : ease(clamp((t - liveAt) / 1.8, 0, 1)), w = wind(t);

      // motes, behind everything
      ctx.globalCompositeOperation = "lighter";
      motes.forEach(function (m) {
        m.x += (m.vx + w * 5) * dt; m.y += m.vy * dt;
        if (m.y < -12) { m.y = H + 12; m.x = Math.random() * W; }
        if (m.x < -12) m.x = W + 12; else if (m.x > W + 12) m.x = -12;
        var fall = 1 - Math.min(1, Math.abs(m.x - W / 2) / (W * 0.62)) * 0.55;
        var a = (0.05 + 0.16 * m.r / 1.7) * (0.55 + 0.45 * Math.sin(t * m.tw + m.ph)) * fall * (grown ? 1 : 0.4);
        if (m.r > 1.05) glow(m.x, m.y, m.r * 7, a * 1.4);
        else { ctx.fillStyle = "rgba(240,214,160," + a + ")"; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill(); }
      });
      ctx.globalCompositeOperation = "source-over";

      if (!grown) {
        if (growStart < 0) { if (!seen) return; growStart = ts + 150; }
        var el = ts - growStart, done = true;
        paths.forEach(function (p) {
          geom(p);
          var g = clamp((el - p.delay) / GROW_MS, 0, 1);
          if (g > 0) drawBranch(p, ease(g), t, 0);
          if (g >= 1 && !p.node.classList.contains("is-born")) {
            p.node.classList.add("is-born"); lit(p.node);
            labels.forEach(function (l) { if (l.parentElement === p.node.parentElement) l.classList.add("is-born"); });
          }
          if (g < 1) done = false;
        });
        if (done) { bornAll(); spawnIn(); }
        return;
      }

      // breeze, branches, leaves
      paths.forEach(function (p) {
        sway(p, t, dt, amp); geom(p);
        p.twigs.forEach(function (tw) { tw.leaves.forEach(function (lf) { if (lf.sc < 1) lf.sc = Math.min(1, lf.sc + dt / 1.6); }); });
        drawBranch(p, 1, t, amp);
      });
      drawHub(t, amp, dt);

      // falling leaves
      nextFall -= dt;
      if (nextFall <= 0) { dropLeaf(); nextFall = 2.6 + Math.random() * 3.2; }
      for (var f = falling.length - 1; f >= 0; f--) {
        var L = falling[f]; L.age += dt;
        L.vy = Math.min(L.vy + 10 * dt, 19);
        L.x += (L.vx + Math.sin(L.age * 2.1 + L.ph) * 15 + w * 10) * dt; L.y += L.vy * dt;
        L.a += (L.spin + Math.cos(L.age * 2.1 + L.ph) * 0.9) * dt;
        var al = Math.min(1, L.age * 3) * (1 - clamp((L.age - (L.life - 1.6)) / 1.6, 0, 1));
        drawLeaf(L.x, L.y, L.a, L.len, 0.08, al, L.kind, L.tone, Math.cos(L.age * L.tumble + L.ph));
        if (L.age > L.life || L.y > H + 20) falling.splice(f, 1);
      }

      // light: new pulse about once a second
      spawnClock -= dt;
      if (spawnClock <= 0) { spawnIn(); spawnClock = 0.9 + Math.random() * 0.5; }
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (var i = pulses.length - 1; i >= 0; i--) {
        var q = pulses[i];
        if (q.wait > 0) { q.wait -= dt; continue; }
        q.t += SPEED / q.p.len * dt;
        drawPulse(q);
        if (q.t >= 1 && !q.done) {
          q.done = true;
          if (q.p.kind === "in") { hubPulse(); spawnOut(null, 0.18); }
          else { lit(q.p.node); var e = q.p.p3; burst(e.x, e.y); }
        }
        if (q.t > 1 + 115 / q.p.len) pulses.splice(i, 1);
      }
      for (i = ripples.length - 1; i >= 0; i--) {
        var r = ripples[i]; r.age += dt; var x = r.age / 1.2;
        if (x >= 1) { ripples.splice(i, 1); continue; }
        var rr = HC.r + 4 + ease(x) * 60, ra = Math.pow(1 - x, 2);
        ctx.strokeStyle = "rgba(226,190,112," + 0.14 * ra + ")"; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.arc(HC.x, HC.y, rr, 0, 6.283); ctx.stroke();
        ctx.strokeStyle = "rgba(246,220,160," + 0.6 * ra + ")"; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(HC.x, HC.y, rr, 0, 6.283); ctx.stroke();
      }
      for (i = sparks.length - 1; i >= 0; i--) {
        var s = sparks[i]; s.age += dt; if (s.age > s.life) { sparks.splice(i, 1); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.95; s.vy *= 0.95;
        glow(s.x, s.y, 5, (1 - s.age / s.life) * 0.7);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    function bornAll() {
      grown = true; liveAt = clock;
      flow.classList.remove("is-seed"); flow.classList.add("is-grown");
      paths.forEach(function (p) { p.node.classList.add("is-born"); });
      labels.forEach(function (l) { l.classList.add("is-born"); });
      setTimeout(function () { flow.classList.add("is-live"); }, 520);   // after the pop-in, leaves follow the breeze without easing
    }
    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      paths.forEach(function (p) { geom(p); drawBranch(p, 1, 0, 0); });
    }

    /* ---------- pointer: leaves lean away, hovering a leaf sends light ---------- */
    flow.addEventListener("pointermove", function (e) { var b = flow.getBoundingClientRect(); ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.on = e.pointerType === "mouse"; });
    flow.addEventListener("pointerleave", function () { ptr.on = false; });
    function hoverSend(p) {
      if (!grown || reduceMotion) return;
      var now = performance.now(); if (now - p.last < 700) return; p.last = now;
      if (p.kind === "in") spawnIn(p); else spawnOut(p);
    }
    inputs.concat(outputs).forEach(function (node) {
      node.addEventListener("mouseenter", function () { var p = paths.filter(function (x) { return x.node === node; })[0]; if (p) hoverSend(p); });
    });

    function start() {
      if (!build()) return false;
      if (reduceMotion) { bornAll(); drawStatic(); return true; }
      flow.classList.add("is-growing");
      requestAnimationFrame(frame);
      return true;
    }
    var rt, started = false;
    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!started) { go(); return; }
        if (build() && reduceMotion) drawStatic();
      }, 80);
    }
    if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(flow); else window.addEventListener("resize", onResize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (es[0].intersectionRatio >= 0.3) seen = true;   // start growing once a third of it is on screen
      }, { threshold: [0, 0.3] }).observe(flow);
    } else seen = true;
    var ready = false;
    function go() { if (ready && !started) started = start(); }
    function arm() { ready = true; go(); }
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(arm); setTimeout(arm, 1200); } else arm();
  })();

  /* =====================================================================
     AI CHATBOT SAMPLES: a website chatbot and an in-app helper
     ===================================================================== */
  (function chat() {
    var log = $("[data-chat-log]"), list = $("[data-chat-suggest]"), reset = $("[data-chat-reset]"), meta = $("[data-chat-meta]");
    if (!log || !list) return;
    var SETS = {
      site: {
        hello: "Hi! Ask me anything about Harbor Café.",
        meta: "Sample answers for an invented café.",
        qa: [
          { q: "What are your hours on Sunday?", a: "On Sundays we’re open 9 am to 3 pm. The kitchen closes at 2:30 pm.", src: "Hours and location" },
          { q: "Do you have gluten-free options?", a: "Yes. Gluten-free dishes are marked GF on the menu, and many others can be adapted. Please mention any allergies when you order.", src: "Menu and allergen policy" },
          { q: "Can I book a table for 12?", a: "Groups of 8 or more need a reservation at least 48 hours ahead. I’ve passed your request to the manager, who will confirm with you.", src: "Reservations policy" },
          { q: "Do you cater weddings?", a: "I don’t have information about wedding catering, so I won’t guess. I’ve passed your question to the owner.", handoff: true }
        ]
      },
      app: {
        hello: "Hi! I can answer questions about this week’s schedule and suggest changes. Nothing changes until you approve it.",
        meta: "Sample of the helper inside Scheduling Agent, with an invented team.",
        qa: [
          { q: "Ben can’t work Friday. Who can cover?", a: "Gus and Eli are free Friday evening and under their max hours. Gus prefers closing shifts, so he’s the best fit.",
            change: [["Friday close", "Ben → Gus"], ["Gus’s hours", "24 → 29 of 30"]] },
          { q: "Who’s closest to their max hours?", a: "Dev is at 34 of 36 hours and Ava at 30 of 36. Everyone else has at least 6 hours of room this week.", src: "This week’s schedule" },
          { q: "Give Cara next Saturday off.", a: "Here’s the change. Her Saturday mid shift goes to Fay, who prefers weekends.",
            change: [["Cara, Saturday", "Marked off"], ["Saturday mid", "Cara → Fay"]] },
          { q: "Can you make Hana a manager?", a: "That’s a change to her roles, which only you can make in Team. I can explain how if you’d like.", handoff: true, handoffText: "Outside what the helper is allowed to change." }
        ]
      }
    };
    var tab = "site", busy = false, btns = [], timer = null;
    var docIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v4h4"/></svg>';
    var handIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6"/></svg>';
    function add(cls, text) { var m = document.createElement("div"); m.className = "msg " + cls; m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
    function proposal(rows) {
      var box = document.createElement("div"); box.className = "proposal";
      rows.forEach(function (r) { var row = document.createElement("div"); row.className = "proposal-row"; var a = document.createElement("span"); a.textContent = r[0]; var b = document.createElement("b"); b.textContent = r[1]; row.appendChild(a); row.appendChild(b); box.appendChild(row); });
      var bt = document.createElement("div"); bt.className = "proposal-btns";
      bt.innerHTML = '<span class="go">Apply</span><span>Dismiss</span>';
      box.appendChild(bt);
      timer = setTimeout(function () { bt.innerHTML = '<span class="done">Applied by owner</span>'; log.scrollTop = log.scrollHeight; }, reduceMotion ? 0 : 1600);
      return box;
    }
    function ask(item, btn) {
      if (busy) return; busy = true; btn.disabled = true; reset.hidden = false;
      add("msg-user", item.q);
      var reply = add("msg-bot", ""); reply.innerHTML = '<span class="typing" aria-label="Assistant is typing"><i></i><i></i><i></i></span>';
      timer = setTimeout(function () {
        reply.textContent = item.a;
        if (item.change) reply.appendChild(proposal(item.change));
        else {
          var src = document.createElement("div"); src.className = "msg-src" + (item.handoff ? " is-handoff" : "");
          src.innerHTML = item.handoff ? handIcon : docIcon;
          var sp = document.createElement("span"); sp.textContent = item.handoff ? (item.handoffText || "Not in the approved information. Handed to a person.") : "Source: " + item.src;
          src.appendChild(sp); reply.appendChild(src);
        }
        log.scrollTop = log.scrollHeight; busy = false;
      }, reduceMotion ? 0 : 900);
    }
    function load(t) {
      tab = t; clearTimeout(timer); busy = false;
      $$("[data-chat-tab]").forEach(function (b) { var on = b.dataset.chatTab === t; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
      log.textContent = ""; list.textContent = ""; reset.hidden = true;
      if (meta) meta.textContent = SETS[t].meta;
      add("msg-bot", SETS[t].hello);
      btns = SETS[t].qa.map(function (item) {
        var b = document.createElement("button"); b.type = "button"; b.className = "suggest"; b.textContent = item.q;
        b.addEventListener("click", function () { ask(item, b); }); list.appendChild(b); return b;
      });
    }
    $$("[data-chat-tab]").forEach(function (b) { b.addEventListener("click", function () { if (b.dataset.chatTab !== tab) load(b.dataset.chatTab); }); });
    reset.addEventListener("click", function () { load(tab); });
    load("site");
    // play the first question once the sample scrolls into view, so it isn't sitting empty
    if (!reduceMotion && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); setTimeout(function () { if (tab === "site" && btns[0] && !btns[0].disabled && !busy) ask(SETS.site.qa[0], btns[0]); }, 700); }
      }, { threshold: 0.6 });
      io.observe(log);
    }
  })();

  /* =====================================================================
     "UNDER DEVELOPMENT" DRAWER: opens when something links to it
     ===================================================================== */
  (function devDrawer() {
    var d = document.getElementById("in-development");
    if (!d) return;
    function check() { if (location.hash === "#in-development") d.open = true; }
    window.addEventListener("hashchange", check); check();
    $$("[data-open-dev]").forEach(function (a) { a.addEventListener("click", function () { d.open = true; }); });
  })();

  /* =====================================================================
     SCROLL REVEAL
     ===================================================================== */
  (function reveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    var els = $$(".section-head, .card:not(.dev-card), .step, .points li, .callout, .app-card, .split > div, .cta-band, .mission-grid, .price-strip, .dev-drawer, .shot, .plan, .faq-item");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  })();

  /* =====================================================================
     CONTACT FORM (delivers to CONTACT_EMAIL through FormSubmit; falls back to email)
     ===================================================================== */
  var form = $("#contact-form");
  var modeRadios = form ? $$("input[name='mode']", form) : [];
  function currentMode() { var r = modeRadios.filter(function (x) { return x.checked; })[0]; return r ? r.value : "question"; }
  function setContactMode(m) { if (!form) return; modeRadios.forEach(function (r) { r.checked = r.value === m; }); applyMode(); }
  function applyMode() {
    var call = currentMode() === "call";
    $("[data-call-fields]", form).hidden = !call;
    $("[data-message-label]", form).textContent = call ? "Anything to know before we talk? (optional)" : "What would you like to improve?";
    $("[data-submit-label]", form).textContent = call ? "Request a call" : "Send message";
    $("#message", form).required = !call;
  }
  if (form) {
    modeRadios.forEach(function (r) { r.addEventListener("change", applyMode); });
    applyMode();
    var statusEl = $("[data-form-status]", form), submitBtn = $("[data-submit]", form);
    var fail = function (field, text) {
      $$("[aria-invalid]", form).forEach(function (f) { f.removeAttribute("aria-invalid"); });
      if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
      statusEl.textContent = text; statusEl.className = "form-status is-error";
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var call = currentMode() === "call", f = form.elements;
      var name = f.name.value.trim(), email = f.email.value.trim(), biz = f.business.value.trim(), msg = f.message.value.trim(), times = f.times.value.trim();
      if (!name) return fail(f.name, "Please enter your name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(f.email, "Please enter a valid email address.");
      if (call && !times) return fail(f.times, "Please add a few days and times that work.");
      if (!call && !msg) return fail(f.message, "Please add a few sentences about what you'd like to improve.");
      $$("[aria-invalid]", form).forEach(function (x) { x.removeAttribute("aria-invalid"); });
      if (form.elements._honey && form.elements._honey.value) return; // spam bot filled the hidden field

      var subject = (call ? "Call request" : "Project inquiry") + " from " + name + (biz ? " (" + biz + ")" : "");
      var lines = ["Name: " + name, "Email: " + email];
      if (biz) lines.push("Business: " + biz);
      var interest = f.interest ? f.interest.value : "";
      if (interest) lines.push("Interested in: " + interest);
      var site = f.website ? f.website.value.trim() : "", heard = f.heard ? f.heard.value : "";
      if (site) lines.push("Website: " + site);
      if (heard) lines.push("Heard about us: " + heard);
      if (call) lines.push("Best days and times: " + times, "Format: " + f.format.value);
      if (msg) lines.push("", msg);
      var mailto = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));

      submitBtn.classList.add("is-loading"); statusEl.textContent = ""; statusEl.className = "form-status";

      // Sent through FormSubmit (free), which delivers the message straight to CONTACT_EMAIL.
      var payload = {
        _subject: subject, _template: "table", _replyto: email,
        Type: call ? "Call request" : "Message", Name: name, Email: email, Business: biz || "-", "Interested in": interest || "-"
      };
      if (site) payload.Website = site;
      if (heard) payload["Heard about us"] = heard;
      if (call) { payload["Best days and times"] = times; payload.Format = f.format.value; }
      payload.Message = msg || "-";

      fetch("https://formsubmit.co/ajax/" + CONTACT_EMAIL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok || String(d.success) !== "true") throw new Error(d.message || "Send failed"); }); })
        .then(function () {
          form.reset(); applyMode();
          statusEl.textContent = call ? "Thanks! Your call request was sent. I'll reply by email to set a time." : "Thanks! Your message was sent. I'll reply by email soon.";
          statusEl.className = "form-status is-success";
        })
        .catch(function () {
          // If the form service can't be reached, hand off to the visitor's own email app instead
          statusEl.innerHTML = "";
          statusEl.appendChild(document.createTextNode("That didn't go through. Please "));
          var a = document.createElement("a"); a.href = mailto; a.textContent = "email me directly"; statusEl.appendChild(a);
          statusEl.appendChild(document.createTextNode(" at " + CONTACT_EMAIL + "."));
          statusEl.className = "form-status is-error";
        })
        .then(function () { submitBtn.classList.remove("is-loading"); });
    });
  }

  /* ---------- "Ask about it" links: pre-fill the contact form ---------- */
  $$("[data-ask]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (!form) return;
      var topic = el.getAttribute("data-ask"), sel = form.elements.interest, msg = form.elements.message;
      setContactMode("question");
      var map = { "Quote Builder": "An app under development", "Instructions Database": "An app under development", "Catering & Order Management": "An app under development", "A website or custom app": "A custom web app", "A single feature or small tool": "A small tool" };
      if (sel) { var want = map[topic] || (/Tailoring/.test(topic) ? "Not sure yet" : topic); Array.prototype.forEach.call(sel.options, function (o) { if (o.text === want) sel.value = o.value; }); }
      if (msg && !msg.value.trim()) msg.value = /^(Quote|Instructions|Catering)/.test(topic) ? "I'd like to hear more about " + topic + "." : /Tailoring/.test(topic) ? "I'd like a version of one of your apps tailored to my business." : "";
      setTimeout(function () { var n = form.elements.name; if (n) n.focus({ preventScroll: true }); }, 600);
    });
  });

  /* ---------- Show the contact email wherever it's listed ---------- */
  $$("[data-email]").forEach(function (a) { a.href = "mailto:" + CONTACT_EMAIL; a.textContent = CONTACT_EMAIL; });

  /* ---------- Footer year ---------- */
  var yr = $("[data-year]"); if (yr) yr.textContent = new Date().getFullYear();
})();
