/* =====================================================================
   Ares Web Services (by Lee Thompson): shared site behavior
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

  /* ---------- Applications dropdown ---------- */
  var ddBtn = $("[data-dropdown]"), ddMenu = ddBtn ? document.getElementById(ddBtn.getAttribute("aria-controls")) : null;
  var isMobileNav = function () { return window.matchMedia("(max-width: 960px)").matches; };
  function setDropdown(open) {
    if (!ddBtn) return;
    ddBtn.setAttribute("aria-expanded", String(open));
    ddMenu.hidden = !open;
  }
  if (ddBtn) {
    ddBtn.addEventListener("click", function (e) { e.stopPropagation(); setDropdown(ddMenu.hidden); });
    var dd = ddBtn.parentElement, closeT;
    dd.addEventListener("mouseenter", function () { if (!isMobileNav()) { clearTimeout(closeT); setDropdown(true); } });
    dd.addEventListener("mouseleave", function () { if (!isMobileNav()) closeT = setTimeout(function () { setDropdown(false); }, 150); });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) setDropdown(false); });
    dd.addEventListener("focusout", function (e) { if (!isMobileNav() && !dd.contains(e.relatedTarget)) setDropdown(false); });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (ddBtn && !ddMenu.hidden) { setDropdown(false); ddBtn.focus(); }
    setMenu(false);
  });

  /* ---------- "Schedule a call" links ---------- */
  $$("[data-call]").forEach(function (a) {
    if (BOOKING_URL) { a.href = BOOKING_URL; a.target = "_blank"; a.rel = "noopener"; }
    else a.addEventListener("click", function () { setContactMode("call"); });
  });

  /* ---------- Typing effect, shared by the hero and the phone mission line ----------
     Each character's reveal time is worked out up front, then requestAnimationFrame shows
     whatever is due on every frame. Timers can't fire faster than the screen draws, so this
     keeps the typing smooth and on pace instead of bunching up when the page is busy. */
  function typeOut(chars, caret, delayFor, done) {
    return function () {
      var at = [], t = 0;
      chars.forEach(function (ch) { at.push(t); t += delayFor(ch.textContent); });
      var i = 0, t0 = null;
      function frame(now) {
        if (t0 === null) t0 = now;
        var due = now - t0, last = i;
        while (i < chars.length && at[i] <= due) chars[i++].classList.add("on");
        if (i !== last) chars[i - 1].parentNode.insertBefore(caret, chars[i - 1].nextSibling);
        if (i < chars.length) requestAnimationFrame(frame); else if (done) done();
      }
      requestAnimationFrame(frame);
    };
  }

  /* =====================================================================
     DESKTOP: the hero sentence is set like code and types itself out, with a
     block cursor left blinking at the end of it. Screen readers get the sentence
     once, whole; with reduced motion it just appears, cursor included (solid).
     ===================================================================== */
  (function typeLead() {
    var el = $(".hero .lead");
    if (!el || !window.matchMedia("(min-width: 721px)").matches) return;
    var text = el.textContent.trim();
    el.textContent = "";
    el.classList.add("is-code");
    var whole = document.createElement("span"); whole.className = "sr-only"; whole.textContent = text; el.appendChild(whole);
    var typed = document.createElement("span"); typed.setAttribute("aria-hidden", "true"); el.appendChild(typed);
    // every character gets its own span, so the line keeps its final shape while it types
    var chars = text.split("").map(function (c) {
      var s = document.createElement("span"); s.className = "ch"; s.textContent = c; typed.appendChild(s); return s;
    });
    var caret = document.createElement("span"); caret.className = "lead-caret"; typed.appendChild(caret);
    if (reduceMotion) return;

    el.classList.add("is-typing");
    typed.insertBefore(caret, chars[0]);
    // quick keys, a small beat after each word and at punctuation: about two and a half seconds in all
    var run = typeOut(chars, caret, function (c) { return 14 + Math.random() * 16 + (c === " " ? 24 : 0) + (c === "," || c === "." ? 140 : 0); },
      function () { el.classList.remove("is-typing"); });
    // wait for the code font, so the line doesn't reflow while it types
    var started = false;
    function begin() { if (!started) { started = true; setTimeout(run, 350); } }
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(begin); setTimeout(begin, 1200); } else begin();
  })();

  /* =====================================================================
     PHONES: the mission statement types itself out like code
     (phones only)
     ===================================================================== */
  (function typeMission() {
    var el = $(".mission-text");
    if (!el || !window.matchMedia("(max-width: 720px)").matches) return;
    var text = el.textContent.trim();
    el.textContent = "";
    // screen readers get the sentence once, whole; the typed copy beside it is decoration
    var whole = document.createElement("span"); whole.className = "sr-only"; whole.textContent = text; el.appendChild(whole);
    var typed = document.createElement("span"); typed.setAttribute("aria-hidden", "true"); el.appendChild(typed);
    // every character gets its own span, so the line keeps its final size while it types
    var chars = text.split("").map(function (c) {
      var s = document.createElement("span"); s.className = "ch"; s.textContent = c;
      typed.appendChild(s); return s;
    });
    var caret = document.createElement("span"); caret.className = "type-caret";
    typed.appendChild(caret);
    if (reduceMotion) return;

    el.classList.add("is-typing");
    typed.insertBefore(caret, chars[0]);
    // a human-ish rhythm: quick keys, a beat after each word and at punctuation
    var run = typeOut(chars, caret, function (c) { return 34 + Math.random() * 38 + (c === " " ? 40 : 0) + (c === "," || c === "." ? 180 : 0); },
      function () { el.classList.remove("is-typing"); });
    var started = false;
    function begin() { if (!started) { started = true; setTimeout(run, 450); } }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); begin(); }
      }, { threshold: 0.6 });
      io.observe(el);
    } else begin();
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
      if (call) lines.push("Best days and times: " + times, "Format: " + f.format.value);
      if (msg) lines.push("", msg);
      var mailto = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));

      submitBtn.classList.add("is-loading"); statusEl.textContent = ""; statusEl.className = "form-status";

      // Sent through FormSubmit (free), which delivers the message straight to CONTACT_EMAIL.
      var payload = {
        _subject: subject, _template: "table", _replyto: email,
        Type: call ? "Call request" : "Message", Name: name, Email: email, Business: biz || "-", "Interested in": interest || "-"
      };
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
      var map = { "Quote Builder": "An app under development", "Instructions Database": "An app under development", "Catering & Order Management": "An app under development", "A website": "A website", "Online visibility and marketing": "Website design and online visibility", "AI tools and integration": "AI tools and integration" };
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

/* Floating Get In Touch: shows once the hero is scrolled past, hides again over the contact form */
(function () {
  var b = document.querySelector(".float-cta"), hero = document.getElementById("top"), contact = document.getElementById("contact");
  if (!b || !hero || !contact || !("IntersectionObserver" in window)) return;
  var heroIn = true, contactIn = false;
  function set() { b.classList.toggle("is-on", !heroIn && !contactIn); }
  new IntersectionObserver(function (e) { heroIn = e[0].isIntersecting; set(); }).observe(hero);
  new IntersectionObserver(function (e) { contactIn = e[0].isIntersecting; set(); }).observe(contact);
})();
