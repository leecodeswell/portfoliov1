/* =====================================================================
   Scheduling Agent: cloud connection (Firebase sign-in + shared data)

   Turned on by putting your Firebase settings in config.js. Without them
   the app runs in "this browser only" mode exactly as before.

   Where data lives (Firestore):
     users/{uid}                      which business a person belongs to
     invites/{token}                  one-time invite links for employees
     businesses/{bid}                 name, logo, colors (team can read)
       /owner/state                   setup, people, shifts, rules (owner only)
       /weeks/{week}                  drafts and edits (owner only)
       /published/{week}              the published schedule (team can read)
       /avail/{week}_{person}         availability (owner + that person)
       /requests/{id}                 shift cover requests (owner + people asked)
       /prefs/{person}                a person's own settings (owner + that person)
       /members/{uid}                 who has joined (owner + that person)
   ===================================================================== */
(function () {
  "use strict";
  var C = window.SACloud = { enabled: false, status: "off", user: null, profile: null, error: null, saving: false, invite: null };
  var cfg = window.SA_FIREBASE_CONFIG, fake = window.SA_FAKE_FIREBASE;
  if (!cfg && !fake) return;
  C.enabled = true; C.status = "loading";

  var F, fbApp, auth, db, fnMod = null, bid = null, pid = null, unsub = [], last = {}, timer = null, binding = null, emp = null;
  var listeners = [];
  C.onChange = function (fn) { listeners.push(fn); };

  /* ---------- billing: free trial, then a paid plan ----------
     The trial start is stamped by the server when the workspace is created (users/{uid}.created).
     "Paid" lives in businesses/{bid}/billing/plan, which only the server (or you, in the
     Firebase console) can write. firestore.rules refuses owner edits once the trial has
     ended and nothing is paid, so this is enforced there, not just in this page. */
  C.billing = { paid: false, plan: null, ai: false, createdMs: null };
  var BILL = window.SA_BILLING || {};
  C.trialDays = BILL.trialDays || 14;
  function tsMs(t) { return !t ? null : typeof t.toMillis === "function" ? t.toMillis() : t.__ts ? t.__ts : typeof t === "number" ? t : null; }
  C.access = function () {
    var b = C.billing;
    if (b.paid) return { state: "paid", plan: b.plan };
    if (b.createdMs == null) return { state: "legacy" };          // workspaces made before billing existed stay open
    var left = b.createdMs + C.trialDays * 864e5 - Date.now();
    return left > 0 ? { state: "trial", days: Math.ceil(left / 864e5) } : { state: "locked" };
  };
  // The AI helper: free during the trial, then an add-on (or included in a free copy you give someone).
  C.aiAccess = function () {
    var b = C.billing;
    if (b.ai === true || b.plan === "comp") return { state: "yes" };
    if (b.createdMs == null) return { state: "yes" };
    var left = b.createdMs + C.trialDays * 864e5 - Date.now();
    return left > 0 ? { state: "trial", days: Math.ceil(left / 864e5) } : { state: "needs-addon" };
  };
  C.checkoutUrl = function (url) {
    if (!url) return null;
    // Stripe Payment Links: client_reference_id tells the backend which business paid
    var q = "client_reference_id=" + encodeURIComponent("sa_" + (bid || "")) + "&prefilled_email=" + encodeURIComponent((C.user && C.user.email) || "");
    return url + (url.indexOf("?") < 0 ? "?" : "&") + q;
  };
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); }
  function fail(msg, e) { if (e) console.error(e); C.error = msg; emit(); }

  /* ---------- helpers ---------- */
  function clean(v) { return JSON.parse(JSON.stringify(v == null ? null : v)); }
  function stable(v) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    return "{" + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort().map(function (k) { return JSON.stringify(k) + ":" + stable(v[k]); }).join(",") + "}";
  }
  function d(path) { return F.doc(db, path); }
  function col(path) { return F.collection(db, path); }
  function B(rest) { return "businesses/" + bid + (rest ? "/" + rest : ""); }
  function token() { var a = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256; }); return Array.from(a, function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join(""); }
  function stop() { unsub.forEach(function (u) { try { u(); } catch (e) { } }); unsub = []; last = {}; clearTimeout(timer); }

  // invite links look like .../scheduling-agent/#join-<token>
  var m = /#join-([a-f0-9]{16,64})/.exec(location.hash);
  if (m) { C.invite = { token: m[1] }; try { sessionStorage.setItem("sa.invite", m[1]); } catch (e) { } }
  else { try { var t = sessionStorage.getItem("sa.invite"); if (t) C.invite = { token: t }; } catch (e) { } }

  /* ---------- load Firebase ---------- */
  var V = "10.12.2", base = "https://www.gstatic.com/firebasejs/" + V + "/";
  (fake ? Promise.resolve(fake) : Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js")])
    .then(function (ms) { return Object.assign.apply(Object, [{}].concat(ms)); }))
    .then(function (mod) {
      F = mod;
      var app = fbApp = F.initializeApp(cfg || {});
      auth = F.getAuth(app); db = F.getFirestore(app);
      if (C.invite) F.getDoc(d("invites/" + C.invite.token)).then(function (s) { C.invite.data = s.exists() ? s.data() : null; C.invite.checked = true; emit(); }).catch(function () { C.invite.checked = true; emit(); });
      if (F.isSignInWithEmailLink && F.isSignInWithEmailLink(auth, location.href)) {
        var em = null; try { em = localStorage.getItem("sa.emailForSignIn"); } catch (e) { }
        if (em) finishLink(em); else { C.status = "need-email"; emit(); }
      }
      F.onAuthStateChanged(auth, function (u) {
        C.user = u; C.error = null;
        if (!u) { stop(); C.profile = null; if (C.status !== "need-email") C.status = "signed-out"; emit(); return; }
        loadProfile();
      });
    })
    .catch(function (e) { C.status = "error"; fail("Couldn't reach the sign-in service. Check your internet connection and refresh.", e); });

  /* ---------- sign in / out ---------- */
  function nice(e) {
    var c = (e && e.code) || "";
    return {
      "auth/invalid-email": "That email address doesn't look right.",
      "auth/missing-password": "Enter a password.",
      "auth/weak-password": "Use a password with at least 6 characters.",
      "auth/email-already-in-use": "There's already an account with that email. Sign in instead.",
      "auth/invalid-credential": "Wrong email or password.",
      "auth/wrong-password": "Wrong email or password.",
      "auth/user-not-found": "No account with that email yet. Create one instead.",
      "auth/popup-closed-by-user": "The Google window was closed before signing in.",
      "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
      "auth/unauthorized-domain": "This website isn't on the approved list yet. Add it under Authentication > Settings > Authorized domains in Firebase.",
      "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
      "auth/network-request-failed": "No internet connection."
    }[c] || "Something went wrong signing in" + (c ? " (" + c + ")" : "") + ".";
  }
  C.signInGoogle = function () { C.error = null; return F.signInWithPopup(auth, new F.GoogleAuthProvider()).catch(function (e) { fail(nice(e), e); }); };
  C.signInEmail = function (email, pw) { C.error = null; return F.signInWithEmailAndPassword(auth, email, pw).catch(function (e) { fail(nice(e), e); }); };
  C.signUpEmail = function (email, pw) { C.error = null; return F.createUserWithEmailAndPassword(auth, email, pw).catch(function (e) { fail(nice(e), e); }); };
  C.sendLink = function (email) {
    C.error = null;
    var url = location.origin + location.pathname + (C.invite ? "#join-" + C.invite.token : "");
    return F.sendSignInLinkToEmail(auth, email, { url: url, handleCodeInApp: true }).then(function () {
      try { localStorage.setItem("sa.emailForSignIn", email); } catch (e) { }
      C.linkSentTo = email; emit();
    }).catch(function (e) { fail(nice(e), e); });
  };
  function finishLink(email) {
    return F.signInWithEmailLink(auth, email, location.href).then(function () {
      try { localStorage.removeItem("sa.emailForSignIn"); } catch (e) { }
      history.replaceState(null, "", location.pathname + (C.invite ? "#join-" + C.invite.token : ""));
      C.status = "loading"; emit();
    }).catch(function (e) { C.status = "signed-out"; fail("That sign-in link has expired or was already used. Ask for a new one.", e); });
  }
  C.finishLink = finishLink;
  C.signOut = function () { stop(); binding = null; emp = null; return F.signOut(auth); };

  /* ---------- who is this person? ---------- */
  function loadProfile() {
    C.status = "loading"; emit();
    F.getDoc(d("users/" + C.user.uid)).then(function (s) {
      if (s.exists()) {
        C.profile = s.data(); bid = C.profile.bid; pid = C.profile.pid || null; C.billing.createdMs = tsMs(C.profile.created);
        try { sessionStorage.removeItem("sa.invite"); } catch (e) { } C.invite = null;
        if (C.profile.role === "owner") startOwner(); else startEmployee();
      } else {
        C.status = C.invite ? "joining" : "new-owner"; emit();
      }
    }).catch(function (e) { C.status = "error"; fail("Couldn't load your account. Refresh to try again.", e); });
  }

  /* ---------- owner: create the workspace ---------- */
  C.createWorkspace = function (state) {
    var uid = C.user.uid; bid = uid;
    var b = F.writeBatch(db);
    b.set(d("businesses/" + bid), publicDoc(state, uid));
    b.set(d("users/" + uid), { bid: bid, role: "owner", email: C.user.email || "", created: F.serverTimestamp() });
    return b.commit().then(function () {
      C.profile = { bid: bid, role: "owner" }; C.billing.createdMs = Date.now();
      return writeAll(state);
    }).then(function () { startOwner(); }).catch(function (e) { fail("Couldn't create your workspace. Check that Firestore is set up, then try again.", e); });
  };

  function publicDoc(S, uid) {
    return clean({ ownerUid: uid, name: S.business.name || "", brand: S.brand || {}, business: { weekStart: S.business.weekStart, clock: S.business.clock },
      features: { rescue: !!S.features.rescue }, rescue: { showList: !!S.rescue.showList } });
  }

  // turn the app's state into the documents it's stored in
  function toDocs(S) {
    var out = {}, uid = C.user.uid;
    var core = {}; Object.keys(S).forEach(function (k) { if (k !== "weeks" && k !== "ui") core[k] = S[k]; });
    core.people = S.people.map(function (p) { var q = Object.assign({}, p); delete q.rescueOptIn; delete q.joined; return q; });
    out[B("owner/state")] = clean(core);
    out[B()] = publicDoc(S, uid);
    S.people.forEach(function (p) { out[B("prefs/" + p.id)] = { rescueOptIn: p.rescueOptIn !== false }; });
    Object.keys(S.weeks || {}).forEach(function (wk) {
      var w = S.weeks[wk], own = {};
      Object.keys(w).forEach(function (k) { if (["avail", "submitted", "requests", "pub", "draft"].indexOf(k) < 0) own[k] = w[k]; });
      out[B("weeks/" + wk)] = clean(own);
      if (w.pub) out[B("published/" + wk)] = clean(Object.assign({ wk: wk }, w.pub));
      Object.keys(w.avail || {}).forEach(function (p) {
        var doc = { wk: wk, pid: p, days: w.avail[p] || {} };
        if (w.submitted && w.submitted[p]) doc.submittedAt = w.submitted[p];
        out[B("avail/" + wk + "_" + p)] = clean(doc);
      });
      (w.requests || []).forEach(function (r) { out[B("requests/" + r.id)] = clean(Object.assign({ wk: wk }, r)); });
    });
    return out;
  }
  function writeAll(S) {
    var docs = toDocs(S), paths = Object.keys(docs), chunks = [];
    for (var i = 0; i < paths.length; i += 400) chunks.push(paths.slice(i, i + 400));
    return chunks.reduce(function (p, ch) {
      return p.then(function () { var b = F.writeBatch(db); ch.forEach(function (k) { b.set(d(k), docs[k]); }); return b.commit(); });
    }, Promise.resolve()).then(function () { paths.forEach(function (k) { last[k] = stable(docs[k]); }); });
  }

  /* ---------- owner: load, listen, save ---------- */
  // binding = { get: () => S, set: (S) => void, blank: () => freshState, render: () => void }
  var waiting = [];
  C.bindOwner = function (b) { binding = b; var w = waiting; waiting = []; w.forEach(function (f) { f(); }); };
  function startOwner() {
    if (!binding) { waiting.push(startOwner); return; } // auth can answer before the app has bound itself
    C.status = "loading"; emit();
    Promise.all([F.getDoc(d(B("owner/state"))), F.getDocs(col(B("weeks"))), F.getDocs(col(B("published")))]).then(function (r) {
      var S = binding.blank(), core = r[0].exists() ? r[0].data() : null;
      if (core) Object.keys(core).forEach(function (k) { S[k] = core[k] && typeof core[k] === "object" && !Array.isArray(core[k]) && S[k] && typeof S[k] === "object" && !Array.isArray(S[k]) ? Object.assign(S[k], core[k]) : core[k]; });
      if (core) last[B("owner/state")] = stable(core);
      S.weeks = {};
      r[1].forEach(function (s) { S.weeks[s.id] = s.data(); last[B("weeks/" + s.id)] = stable(s.data()); });
      r[2].forEach(function (s) { var p = s.data(); (S.weeks[s.id] = S.weeks[s.id] || {}).pub = p; last[B("published/" + s.id)] = stable(p); delete p.wk; });
      binding.set(S);
      listenOwner();
      C.status = "owner"; emit();
    }).catch(function (e) { C.status = "error"; fail("Couldn't load your schedule. Refresh to try again.", e); });
  }
  function week(S, wk) { var w = S.weeks[wk] = S.weeks[wk] || {}; w.avail = w.avail || {}; w.submitted = w.submitted || {}; w.requests = w.requests || []; return w; }
  function listenOwner() {
    unsub.push(F.onSnapshot(d(B("billing/plan")), function (snap) {
      var x = snap.exists() ? snap.data() : {};
      C.billing.paid = x.paid === true; C.billing.plan = x.plan || null; C.billing.ai = x.ai === true;
      emit();
    }, function () { }));
    unsub.push(F.onSnapshot(col(B("avail")), function (snap) {
      var S = binding.get(), changed = false;
      snap.docChanges().forEach(function (ch) {
        var path = B("avail/" + ch.doc.id), data = ch.doc.data(), sd = stable(data);
        if (ch.type === "removed" || last[path] === sd) return;
        var w = week(S, data.wk);
        w.avail[data.pid] = data.days || {};
        if (data.submittedAt) w.submitted[data.pid] = data.submittedAt;
        last[path] = sd; changed = true;
      });
      if (changed) binding.render();
    }, function (e) { fail("Lost the live connection for availability. Refresh to reconnect.", e); }));
    unsub.push(F.onSnapshot(col(B("requests")), function (snap) {
      var S = binding.get(), changed = false, resave = false;
      snap.docChanges().forEach(function (ch) {
        var path = B("requests/" + ch.doc.id), data = ch.doc.data(), sd = stable(data);
        if (ch.type === "removed" || last[path] === sd) return;
        last[path] = sd; changed = true;
        var w = week(S, data.wk), r = clean(data); delete r.wk;
        var i = w.requests.findIndex(function (x) { return x.id === r.id; });
        if (i >= 0) w.requests[i] = r; else w.requests.push(r);
        if (binding.applyRequest && binding.applyRequest(data.wk, r)) resave = true;
      });
      if (changed) { binding.render(); if (resave) C.ownerSave(); }
    }, function (e) { fail("Lost the live connection for cover requests. Refresh to reconnect.", e); }));
    unsub.push(F.onSnapshot(col(B("prefs")), function (snap) {
      var S = binding.get(), changed = false;
      snap.docChanges().forEach(function (ch) {
        var path = B("prefs/" + ch.doc.id), data = ch.doc.data(), sd = stable(data);
        if (last[path] === sd) return; last[path] = sd;
        var p = S.people.find(function (x) { return x.id === ch.doc.id; });
        if (p) { p.rescueOptIn = data.rescueOptIn !== false; changed = true; }
      });
      if (changed) binding.render();
    }, function () { }));
    unsub.push(F.onSnapshot(col(B("members")), function (snap) {
      var S = binding.get(), joined = {};
      snap.forEach(function (s) { var x = s.data(); if (x.pid) joined[x.pid] = x.email || true; });
      S.people.forEach(function (p) { p.joined = joined[p.id] || false; });
      binding.render();
    }, function () { }));
  }
  C.ownerSave = function () {
    if (C.status !== "owner" || !binding || C.access().state === "locked") return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      var docs = toDocs(binding.get()), b = F.writeBatch(db), n = 0, wrote = {};
      Object.keys(docs).forEach(function (k) { var sd = stable(docs[k]); if (last[k] !== sd) { b.set(d(k), docs[k]); wrote[k] = sd; n++; } });
      if (!n) return;                       // nothing changed, nothing to do
      C.saving = true; emit();
      b.commit().then(function () { Object.assign(last, wrote); C.saving = false; C.error = null; emit(); })
        .catch(function (e) { C.saving = false; fail("Couldn't save your last change. Check your connection; it will retry with your next edit.", e); });
    }, 700);
  };


  /* ---------- owner: AI helper (runs on a Firebase function that holds the key) ---------- */
  C.askHelper = function (messages, context) {
    if (C.status !== "owner") return Promise.reject({ message: "Sign in as the owner to use the helper." });
    var load = fnMod ? Promise.resolve(fnMod) : (fake ? Promise.resolve(fake) : import(base + "firebase-functions.js")).then(function (m) { return (fnMod = m); });
    return load.then(function (m) {
      var call = m.httpsCallable(m.getFunctions(fbApp, "us-central1"), "helper");
      return call({ messages: messages, context: context });
    }).then(function (r) { return r.data; }).catch(function (e) {
      var c = String((e && e.code) || ""), msg = "The helper couldn't answer. Try again.", need = false;
      if (/not-found|unimplemented/.test(c)) msg = "The helper isn't switched on for this workspace yet.";
      else if (/failed-precondition/.test(c)) { msg = "The helper is an add-on after the free trial."; need = true; }
      else if (/resource-exhausted/.test(c)) msg = (e.message || "").replace(/^.*?:\s*/, "") || "You've reached today's limit for the helper.";
      else if (/permission-denied|unauthenticated/.test(c)) msg = "Only the signed-in owner can use the helper.";
      else if (/unavailable|internal|deadline/.test(c) && e.message && !/^(internal|unavailable)$/i.test(e.message)) msg = e.message;
      throw { message: msg, needAddon: need };
    });
  };

  /* ---------- owner: invites ---------- */
  C.invite_create = function (person, businessName) {
    var t = token();
    return F.setDoc(d("invites/" + t), { bid: bid, pid: person.id, name: person.name || "", businessName: businessName || "", createdAt: Date.now(), usedBy: null })
      .then(function () { return location.origin + location.pathname + "#join-" + t; });
  };

  /* ---------- employee: join with an invite ---------- */
  C.acceptInvite = function () {
    var inv = C.invite && C.invite.data, uid = C.user.uid;
    if (!inv) return Promise.resolve(fail("This invite link isn't valid anymore. Ask your manager for a new one."));
    if (inv.usedBy && inv.usedBy !== uid) return Promise.resolve(fail("This invite link was already used. Ask your manager for a new one."));
    var b = F.writeBatch(db);
    b.set(d("businesses/" + inv.bid + "/members/" + uid), { role: "employee", pid: inv.pid, invite: C.invite.token, email: C.user.email || "", at: Date.now() });
    b.set(d("users/" + uid), { bid: inv.bid, role: "employee", pid: inv.pid, at: Date.now() });
    b.update(d("invites/" + C.invite.token), { usedBy: uid, usedAt: Date.now() });
    return b.commit().then(function () { loadProfile(); }).catch(function (e) { fail("Couldn't join. The link may have been used already. Ask your manager for a new one.", e); });
  };

  /* ---------- employee: live data ---------- */
  // binding for employees: { set: (S) => void, get: () => S, blank: () => S, render }
  C.bindEmployee = function (b) { binding = b; };
  function startEmployee() {
    emp = { pub: {}, avail: {}, reqs: {}, biz: null, opt: true };
    var ready = { biz: false, pub: false };
    function maybe() { if (ready.biz && ready.pub) { build(); if (C.status !== "employee") { C.status = "employee"; emit(); } } }
    unsub.push(F.onSnapshot(d(B()), function (s) { emp.biz = s.exists() ? s.data() : {}; ready.biz = true; maybe(); }, function (e) { C.status = "error"; fail("You don't have access to this workplace anymore.", e); }));
    unsub.push(F.onSnapshot(col(B("published")), function (snap) { emp.pub = {}; snap.forEach(function (s) { emp.pub[s.id] = s.data(); }); ready.pub = true; maybe(); }, function (e) { fail("Couldn't load the schedule. Refresh to try again.", e); }));
    unsub.push(F.onSnapshot(F.query(col(B("avail")), F.where("pid", "==", pid)), function (snap) { snap.forEach(function (s) { emp.avail[s.data().wk] = s.data(); }); maybe(); }, function () { }));
    unsub.push(F.onSnapshot(F.query(col(B("requests")), F.where("sent", "array-contains", pid)), function (snap) { emp.reqs = {}; snap.forEach(function (s) { emp.reqs[s.id] = s.data(); }); maybe(); }, function () { }));
    unsub.push(F.onSnapshot(d(B("prefs/" + pid)), function (s) { emp.opt = !s.exists() || s.data().rescueOptIn !== false; maybe(); }, function () { }));
  }
  function build() {
    if (!binding) { if (waiting.indexOf(build) < 0) waiting.push(build); return; }
    var prev = binding.get(), S = binding.blank(), biz = emp.biz || {};
    S.setup = "done";
    S.business.name = biz.name || ""; Object.assign(S.business, biz.business || {});
    S.brand = Object.assign(S.brand, biz.brand || {});
    S.features.rescue = !!(biz.features || {}).rescue; S.rescue.showList = !!(biz.rescue || {}).showList;
    var names = {};
    Object.keys(emp.pub).forEach(function (wk) { Object.assign(names, emp.pub[wk].names || {}); });
    Object.keys(emp.reqs).forEach(function (id) { Object.assign(names, emp.reqs[id].names || {}); });
    names[pid] = names[pid] || (C.profile && C.profile.name) || "You";
    S.people = Object.keys(names).map(function (id) { return { id: id, name: names[id], roles: [], min: 0, max: "", type: "part", rescueOptIn: id === pid ? emp.opt : true }; });
    Object.keys(emp.pub).forEach(function (wk) { var w = week(S, wk); w.pub = emp.pub[wk]; w.status = "published"; });
    Object.keys(emp.avail).forEach(function (wk) { var a = emp.avail[wk], w = week(S, wk); w.avail[pid] = a.days || {}; if (a.submittedAt) w.submitted[pid] = a.submittedAt; });
    Object.keys(emp.reqs).forEach(function (id) { var r = clean(emp.reqs[id]), w = week(S, r.wk); delete r.wk; w.requests.push(r); });
    // keep availability the employee is still editing
    if (prev && prev.weeks) Object.keys(prev.weeks).forEach(function (wk) { var pw = prev.weeks[wk]; if (pw.draft && pw.avail && pw.avail[pid]) { var w = week(S, wk); w.avail[pid] = pw.avail[pid]; w.draft = true; } });
    S.ui = Object.assign(S.ui, prev && prev.ui ? { week: prev.ui.week, empTab: prev.ui.empTab } : {}, { viewAs: pid, employee: true });
    binding.set(S); binding.render();
  }
  C.empSubmit = function (wk, days) {
    return F.setDoc(d(B("avail/" + wk + "_" + pid)), clean({ wk: wk, pid: pid, days: days, submittedAt: Date.now() }))
      .catch(function (e) { fail("Couldn't send your availability. Check your connection and try again.", e); throw e; });
  };
  C.empOptIn = function (v) { return F.setDoc(d(B("prefs/" + pid)), { rescueOptIn: !!v }).catch(function (e) { fail("Couldn't save that setting.", e); }); };
  C.empRespond = function (rid, accept) {
    var ref = d(B("requests/" + rid));
    return F.runTransaction(db, function (tx) {
      return tx.get(ref).then(function (s) {
        if (!s.exists()) throw { code: "gone" };
        var r = s.data();
        if (r.status !== "open") throw { code: "taken" };
        var resp = Object.assign({}, r.resp || {}); resp[pid] = accept ? "accepted" : "declined";
        var upd = { resp: resp };
        if (accept) { upd.status = "filled"; upd.filledBy = pid; }
        else {
          var waiting = r.sent.filter(function (p) { return !resp[p]; });
          if (!waiting.length) {
            var n = r.batch || 1, sent = r.order.slice(0, Math.min(r.order.length, r.sent.length + n));
            if (sent.length > r.sent.length) upd.sent = sent; else upd.status = "none";
          }
        }
        tx.update(ref, upd);
        return upd;
      });
    }).catch(function (e) {
      if (e && e.code === "taken") { fail("Someone else already covered this shift."); return null; }
      fail("Couldn't send your answer. Check your connection and try again.", e); return null;
    });
  };
})();
