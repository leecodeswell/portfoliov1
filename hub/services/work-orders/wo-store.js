/* =====================================================================
   Work Order Manager: data layer

   One set of functions for the screens to call, two places data can live:
     - online:  Firebase (sign-in, shared live data, security rules)
     - offline: this browser only (when config.js has no Firebase settings),
                used for trying the app and for demos

   Both use the same document layout, so the logic below runs either way:
     wo_users/{uid}                       which workspace a person belongs to
     wo_invites/{token}                   one-time invite links
     wo_orgs/{org}                        name, logo, colors, settings (whole team reads)
       /people/{pid}                      the team list (names, roles)
       /members/{uid}                     who has joined, and their role
       /customers/{id}                    customer list
       /orders/{number}                   work orders, stored under their number
       /events/{id}                       change history (add-only, never edited)
       /counters/{prefix}                 the next work order number per prefix
       /billing/plan                      paid or not (server only)

   Work order numbers: handed out inside a transaction that reads the counter
   and checks the number is free, and the order is saved under its number, so
   two people can never get the same one.

   Every change to an order writes a history entry in the same transaction,
   and the security rules refuse an order change without one.
   ===================================================================== */
(function () {
  "use strict";
  var W = window.WOCore;
  var cfg = window.WO_FIREBASE_CONFIG || window.SA_FIREBASE_CONFIG || null, fake = window.SA_FAKE_FIREBASE;
  var St = window.WOStore = {
    mode: cfg || fake ? "cloud" : "local", status: "loading", user: null, error: null, invite: null,
    org: null, role: null, me: null, linkSentTo: null,
    data: blankData()
  };
  function blankData() { return { org: null, settings: null, people: {}, members: {}, customers: {}, orders: {}, recent: [], billing: {}, loaded: false }; }

  var listeners = [];
  St.onChange = function (fn) { listeners.push(fn); };
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } }); }
  function fail(msg, e) { if (e) console.error(e); St.error = msg; emit(); }

  // invite links look like .../work-orders/#join-<token>
  var m = /#join-([a-f0-9]{16,64})/.exec(location.hash);
  if (m) { St.invite = { token: m[1] }; try { sessionStorage.setItem("wo.invite", m[1]); } catch (e) { } }
  else { try { var t0 = sessionStorage.getItem("wo.invite"); if (t0) St.invite = { token: t0 }; } catch (e) { } }

  var F, fbApp, auth, db, unsub = [], storageMod = null;
  function d(path) { return F.doc(db, path); }
  function col(path) { return F.collection(db, path); }
  function O(rest) { return "wo_orgs/" + St.org + (rest ? "/" + rest : ""); }
  function clean(v) { return JSON.parse(JSON.stringify(v == null ? null : v)); }
  function token() { var a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join(""); }
  function newId() { return F.doc(col(O("events"))).id; }
  function stop() { unsub.forEach(function (u) { try { u(); } catch (e) { } }); unsub = []; }
  function myName() { var p = St.data.people[St.me]; return (p && p.name) || (St.user && (St.user.displayName || St.user.email)) || "Someone"; }
  function ts(v) { return !v ? null : typeof v.toMillis === "function" ? v.toMillis() : v.__ts ? v.__ts : typeof v === "number" ? v : null; }

  /* ---------------------------------------------------------------
     Start up
     --------------------------------------------------------------- */
  var V = "10.12.2", base = "https://www.gstatic.com/firebasejs/" + V + "/";
  var loader = fake ? Promise.resolve(fake)
    : cfg ? Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js")]).then(function (ms) { return Object.assign.apply(Object, [{}].concat(ms)); })
    : Promise.resolve(window.WOLocalF);
  loader.then(function (mod) {
    F = mod;
    fbApp = F.initializeApp(cfg || {});
    auth = F.getAuth(fbApp); db = F.getFirestore(fbApp);
    if (St.invite) F.getDoc(d("wo_invites/" + St.invite.token)).then(function (s) { St.invite.data = s.exists() ? s.data() : null; St.invite.checked = true; emit(); }).catch(function () { St.invite.checked = true; emit(); });
    if (F.isSignInWithEmailLink && F.isSignInWithEmailLink(auth, location.href)) {
      var em = null; try { em = localStorage.getItem("wo.emailForSignIn"); } catch (e) { }
      if (em) St.finishLink(em); else { St.status = "need-email"; emit(); }
    }
    F.onAuthStateChanged(auth, function (u) {
      St.user = u; St.error = null;
      if (!u) { stop(); St.data = blankData(); St.org = null; if (St.status !== "need-email") St.status = "signed-out"; emit(); return; }
      loadProfile();
    });
  }).catch(function (e) { St.status = "error"; fail("Couldn't reach the sign-in service. Check your internet connection and refresh.", e); });

  /* ---------------------------------------------------------------
     Sign in / out
     --------------------------------------------------------------- */
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
  St.signInGoogle = function () { St.error = null; return F.signInWithPopup(auth, new F.GoogleAuthProvider()).catch(function (e) { fail(nice(e), e); }); };
  St.signInEmail = function (email, pw) { St.error = null; return F.signInWithEmailAndPassword(auth, email, pw).catch(function (e) { fail(nice(e), e); }); };
  St.signUpEmail = function (email, pw) { St.error = null; return F.createUserWithEmailAndPassword(auth, email, pw).catch(function (e) { fail(nice(e), e); }); };
  St.sendLink = function (email) {
    St.error = null;
    var url = location.origin + location.pathname + (St.invite ? "#join-" + St.invite.token : "");
    return F.sendSignInLinkToEmail(auth, email, { url: url, handleCodeInApp: true }).then(function () {
      try { localStorage.setItem("wo.emailForSignIn", email); } catch (e) { }
      St.linkSentTo = email; emit();
    }).catch(function (e) { fail(nice(e), e); });
  };
  St.finishLink = function (email) {
    return F.signInWithEmailLink(auth, email, location.href).then(function () {
      try { localStorage.removeItem("wo.emailForSignIn"); } catch (e) { }
      history.replaceState(null, "", location.pathname + location.search + (St.invite ? "#join-" + St.invite.token : ""));
      St.status = "loading"; emit();
    }).catch(function (e) { St.status = "signed-out"; fail("That sign-in link has expired or was already used. Ask for a new one.", e); });
  };
  St.signOut = function () { stop(); St.data = blankData(); St.org = null; return F.signOut(auth); };

  /* ---------------------------------------------------------------
     Who is this person, and which workspace?
     --------------------------------------------------------------- */
  function loadProfile() {
    St.status = "loading"; emit();
    F.getDoc(d("wo_users/" + St.user.uid)).then(function (s) {
      if (!s.exists()) { St.status = St.invite ? "joining" : "new-org"; emit(); return; }
      var p = s.data(); St.org = p.org; St.me = p.pid || null; St.role = p.role === "owner" ? "owner" : null;
      try { sessionStorage.removeItem("wo.invite"); } catch (e) { } St.invite = null;
      listen();
    }).catch(function (e) { St.status = "error"; fail("Couldn't load your account. Refresh to try again.", e); });
  }

  // Live data for the whole team
  function listen() {
    stop(); St.data = blankData();
    var ready = { org: false, people: false, orders: false, me: St.role === "owner" };
    function done() { if (ready.org && ready.people && ready.orders && ready.me) { St.data.loaded = true; if (St.status !== "member") St.status = "member"; } emit(); }
    var onErr = function (what) { return function (e) { if (St.status === "loading") { St.status = "error"; fail("You don't have access to this workspace anymore, or it couldn't load.", e); } else fail("Lost the live connection (" + what + "). Refresh to reconnect.", e); }; };
    unsub.push(F.onSnapshot(d(O()), function (s) {
      var x = s.exists() ? s.data() : {}; St.data.org = x;
      St.data.settings = Object.assign(W.defaultSettings((x.settings && x.settings.business && x.settings.business.industry) || "machine"), x.settings || {});
      if (x.ownerUid === St.user.uid) St.role = "owner";
      ready.org = true; done();
    }, onErr("workspace")));
    unsub.push(F.onSnapshot(col(O("people")), function (snap) { var p = {}; snap.forEach(function (s) { p[s.id] = Object.assign({ id: s.id }, s.data()); }); St.data.people = p; ready.people = true; done(); }, onErr("team")));
    unsub.push(F.onSnapshot(col(O("orders")), function (snap) {
      var o = St.data.orders;
      snap.docChanges().forEach(function (ch) { if (ch.type === "removed") delete o[ch.doc.id]; else o[ch.doc.id] = readDoc(ch.doc); });
      ready.orders = true; done();
    }, onErr("work orders")));
    unsub.push(F.onSnapshot(col(O("customers")), function (snap) { var c = {}; snap.forEach(function (s) { c[s.id] = Object.assign({ id: s.id }, s.data()); }); St.data.customers = c; emit(); }, function () { }));
    unsub.push(F.onSnapshot(F.query(col(O("events")), F.orderBy("at", "desc"), F.limit(60)), function (snap) {
      var r = []; snap.forEach(function (s) { r.push(Object.assign({ id: s.id }, readDoc(s))); }); St.data.recent = r; emit();
    }, function () { }));
    unsub.push(F.onSnapshot(d(O("billing/plan")), function (s) { St.data.billing = s.exists() ? s.data() : {}; emit(); }, function () { }));
    if (St.role !== "owner") {
      unsub.push(F.onSnapshot(d(O("members/" + St.user.uid)), function (s) {
        var x = s.exists() ? s.data() : null;
        if (!x) { St.status = "error"; fail("You've been removed from this workspace. Ask the owner for a new invite."); return; }
        St.role = x.role || "staff"; St.me = x.pid || St.me; ready.me = true;
        if (St.role === "admin" && St._listenMembers) St._listenMembers();
        done();
      }, onErr("membership")));
    }
    var membersOn = false;
    function listenMembers() {   // only owners and admins may read the whole member list
      if (membersOn) return; membersOn = true;
      unsub.push(F.onSnapshot(col(O("members")), function (snap) { var mm = {}; snap.forEach(function (s) { mm[s.id] = s.data(); }); St.data.members = mm; emit(); }, function () { }));
    }
    if (St.role === "owner") listenMembers();
    St._listenMembers = listenMembers;
  }
  function readDoc(s) { var x = s.data({ serverTimestamps: "estimate" }); ["createdAt", "updatedAt", "closedAt", "at"].forEach(function (k) { if (x[k] != null) x[k] = ts(x[k]); }); return x; }

  St.settings = function () { return St.data.settings || W.defaultSettings("machine"); };
  St.myRole = function () { return W.effectiveRole(St.role, St.settings()); };

  /* ---------------------------------------------------------------
     Plans: free trial, then paid (same model as Scheduling Agent)
     --------------------------------------------------------------- */
  var BILL = window.WO_BILLING || {};
  St.trialDays = BILL.trialDays || 14;
  St.access = function () {
    if (St.mode === "local") return { state: "local" };
    var b = St.data.billing || {}, org = St.data.org || {};
    if (b.paid === true) return { state: "paid", plan: b.plan || null };
    var created = ts(org.created);
    if (created == null) return { state: "legacy" };
    var left = created + St.trialDays * 864e5 - Date.now();
    return left > 0 ? { state: "trial", days: Math.ceil(left / 864e5) } : { state: "locked" };
  };
  St.checkoutUrl = function (url) {
    if (!url) return null;
    // Stripe Payment Links: client_reference_id tells the backend which workspace paid
    var q = "client_reference_id=" + encodeURIComponent("wo_" + (St.org || "")) + "&prefilled_email=" + encodeURIComponent((St.user && St.user.email) || "");
    return url + (url.indexOf("?") < 0 ? "?" : "&") + q;
  };
  // The assistant: free during the trial, then an add-on (or included in a free copy you give someone).
  St.aiAccess = function () {
    if (St.mode === "local") return { state: "local" };
    var b = St.data.billing || {}, org = St.data.org || {};
    if (b.ai === true || b.plan === "comp") return { state: "yes" };
    var created = ts(org.created);
    if (created == null) return { state: "yes" };
    var left = created + St.trialDays * 864e5 - Date.now();
    return left > 0 ? { state: "trial", days: Math.ceil(left / 864e5) } : { state: "needs-addon" };
  };
  var fnMod = null;
  St.askHelper = function (messages, context) {
    var load = fnMod ? Promise.resolve(fnMod) : (fake ? Promise.resolve(fake) : import(base + "firebase-functions.js")).then(function (m) { return (fnMod = m); });
    return load.then(function (m) {
      var call = m.httpsCallable(m.getFunctions(fbApp, "us-central1"), "woHelper");
      return call({ messages: messages, context: context });
    }).then(function (r) { return r.data; }).catch(function (e) {
      var c = String((e && e.code) || ""), msg = "The assistant couldn't answer. Try again.", need = false;
      if (/not-found|unimplemented/.test(c)) msg = "The assistant isn't switched on yet.";
      else if (/failed-precondition/.test(c)) { msg = "The assistant is an add-on after the free trial."; need = true; }
      else if (/resource-exhausted/.test(c)) msg = (e.message || "").replace(/^.*?:\s*/, "") || "You've reached today's limit for the assistant.";
      else if (/permission-denied|unauthenticated/.test(c)) msg = "Only owners and admins can use the assistant.";
      else if (/unavailable|internal|deadline/.test(c) && e.message && !/^(internal|unavailable)$/i.test(e.message)) msg = e.message;
      throw { message: msg, needAddon: need };
    });
  };
  function guard() { if (St.access().state === "locked") throw { message: "Your free trial has ended. Choose a plan to keep making changes." }; }

  /* ---------------------------------------------------------------
     Create a workspace
     --------------------------------------------------------------- */
  // setup = { settings, people: [{name, role, dept}], sample: bool }
  St.createOrg = function (setup) {
    var uid = St.user.uid, org = uid, now = F.serverTimestamp();
    St.org = org;
    var settings = clean(setup.settings), sample = setup.sample ? W.sampleShop(W.iso(new Date())) : null;
    if (sample) { var keep = { business: settings.business, brand: settings.brand }; settings = sample.settings; settings.business = Object.assign(settings.business, { name: keep.business.name || settings.business.name }); settings.brand = keep.brand; }
    settings.cats = W.catMap(settings);   // read by the security rules
    // 1. the workspace and the owner's account (the rules need these to exist before anything else)
    var b = F.writeBatch(db);
    b.set(d("wo_orgs/" + org), { ownerUid: uid, name: settings.business.name || "", created: now, settings: settings });
    b.set(d("wo_users/" + uid), { org: org, role: "owner", pid: "owner", email: (St.user && St.user.email) || "", created: now });
    return b.commit().then(function () {
      St.me = "owner"; St.role = "owner";
      // 2. team and customers
      var first = [["set", "wo_orgs/" + org + "/people/owner", { name: setup.ownerName || (St.user && (St.user.displayName || (St.user.email || "").split("@")[0])) || "Owner", role: "owner", dept: "", uid: uid }]];
      (sample ? sample.people : setup.people || []).forEach(function (p) { first.push(["set", "wo_orgs/" + org + "/people/" + (p.id || "p" + W.uid()), { name: p.name, role: p.role || "staff", dept: p.dept || "" }]); });
      if (sample) {
        sample.customers.forEach(function (c) { first.push(["set", "wo_orgs/" + org + "/customers/" + c.id, { name: c.name, contact: c.contact || "" }]); });
        Object.keys(sample.counters).forEach(function (k) { first.push(["set", "wo_orgs/" + org + "/counters/" + k, { n: sample.counters[k] }]); });
      }
      return commitAll(first);
    }).then(function () {
      if (!sample) return;
      // 3. sample orders, each written together with its "created" history entry (the rules require the pair)
      var pairs = [], rest = [];
      sample.orders.forEach(function (o) {
        var x = clean(o), eid = "s_" + W.docId(o.number);
        x.createdBy = uid; x.updatedBy = uid; x.updatedAt = x.createdAt; x.lastEvent = eid;
        pairs.push(["set", "wo_orgs/" + org + "/orders/" + W.docId(o.number), x]);
        var ce = sample.events.find(function (e) { return e.order === o.number && e.type === "created"; });
        pairs.push(["set", "wo_orgs/" + org + "/events/" + eid, { order: o.number, type: "created", changes: [], by: uid, byName: ce ? ce.byName : "", at: ce ? ce.at : o.createdAt, sample: true }]);
      });
      sample.events.forEach(function (e) { if (e.type === "created") return; var x = clean(e); x.by = uid; x.sample = true; delete x.id; rest.push(["set", "wo_orgs/" + org + "/events/s_" + e.id, x]); });
      return commitAll(pairs, PAIR_BATCH).then(function () { return commitAll(rest, EVENT_BATCH); })
        .catch(function (e) { console.error(e); St.error = "Some of the sample data couldn't be added. You can still use the workspace."; });
    }).then(function () { listen(); }).catch(function (e) {
      // if the workspace itself was created, open it anyway rather than leaving the person stuck
      if (St.role === "owner") { listen(); fail("Setup didn't finish completely. Check the Team page; you can add anything missing.", e); return; }
      fail("Couldn't create your workspace. Check that Firestore is set up, then try again.", e); throw e;
    });
  };
  // write many documents in batches of 400
  // The security rules may look up at most 20 documents per batch, and each order + history pair
  // needs two, so orders go in small batches (size must stay even to keep each pair together).
  var PAIR_BATCH = 6, EVENT_BATCH = 8;   // 3 pairs per batch keeps well under the limit
  function commitAll(writes, size) {
    size = size || 400;
    var chunks = []; for (var i = 0; i < writes.length; i += size) chunks.push(writes.slice(i, i + size));
    return chunks.reduce(function (p, ch) {
      return p.then(function () {
        var b = F.writeBatch(db);
        ch.forEach(function (w) { if (w[0] === "set") b.set(d(w[1]), w[2]); else if (w[0] === "update") b.update(d(w[1]), w[2]); else if (w[0] === "delete") b.delete(d(w[1])); });
        return b.commit();
      });
    }, Promise.resolve());
  }

  /* ---------------------------------------------------------------
     Join with an invite
     --------------------------------------------------------------- */
  St.acceptInvite = function () {
    var inv = St.invite && St.invite.data, uid = St.user.uid;
    if (!inv) return Promise.resolve(fail("This invite link isn't valid anymore. Ask your manager for a new one."));
    if (inv.usedBy && inv.usedBy !== uid) return Promise.resolve(fail("This invite link was already used. Ask your manager for a new one."));
    var b = F.writeBatch(db);
    b.set(d("wo_orgs/" + inv.org + "/members/" + uid), { role: inv.role || "staff", pid: inv.pid, invite: St.invite.token, email: (St.user && St.user.email) || "", at: Date.now() });
    b.set(d("wo_users/" + uid), { org: inv.org, role: "member", pid: inv.pid });
    b.update(d("wo_invites/" + St.invite.token), { usedBy: uid, usedAt: Date.now() });
    return b.commit().then(function () { loadProfile(); }).catch(function (e) { fail("Couldn't join. The link may have been used already. Ask your manager for a new one.", e); });
  };
  St.inviteLink = function (person) {
    var t = token(), org = St.data.org || {};
    return F.setDoc(d("wo_invites/" + t), { org: St.org, pid: person.id, role: person.role || "staff", name: person.name || "", orgName: org.name || "", createdAt: Date.now(), usedBy: null })
      .then(function () { return location.origin + location.pathname + "#join-" + t; });
  };

  /* ---------------------------------------------------------------
     Settings, team, customers (admins)
     --------------------------------------------------------------- */
  St.saveSettings = function (settings) {
    guard();
    var s = clean(settings);
    s.cats = W.catMap(s);  // read by the security rules
    return F.updateDoc(d(O()), { settings: s, name: (s.business && s.business.name) || "" });
  };
  St.savePerson = function (p) {
    guard();
    var id = p.id || "p" + W.uid(), x = { name: String(p.name || "").trim(), role: p.role || "staff", dept: p.dept || "" };
    if (p.uid) x.uid = p.uid;
    var b = F.writeBatch(db);
    b.set(d(O("people/" + id)), x, { merge: true });
    // keep the member's role in step, if they've joined
    Object.keys(St.data.members || {}).forEach(function (u) { if (St.data.members[u].pid === id && St.data.members[u].role !== x.role) b.update(d(O("members/" + u)), { role: x.role }); });
    return b.commit().then(function () { return id; });
  };
  St.removePerson = function (id) {
    guard();
    var b = F.writeBatch(db);
    b.delete(d(O("people/" + id)));
    Object.keys(St.data.members || {}).forEach(function (u) { if (St.data.members[u].pid === id) b.delete(d(O("members/" + u))); });
    return b.commit();
  };
  St.saveCustomer = function (c) {
    guard();
    var id = c.id || "c" + W.uid();
    return F.setDoc(d(O("customers/" + id)), { name: String(c.name || "").trim(), contact: c.contact || "", phone: c.phone || "", email: c.email || "", notes: c.notes || "" }, { merge: true }).then(function () { return id; });
  };
  function ensureCustomer(name) {
    name = String(name || "").trim(); if (!name) return null;
    var hit = Object.keys(St.data.customers).find(function (id) { return W.norm(St.data.customers[id].name) === W.norm(name); });
    return hit || null;
  }

  /* ---------------------------------------------------------------
     Work orders
     --------------------------------------------------------------- */
  var ORDER_FIELDS = ["customer", "customerId", "po", "part", "rev", "qty", "title", "received", "due", "assignee", "priority", "status", "holdReason", "notes", "items", "custom", "files"];
  function pickOrder(o) { var x = {}; ORDER_FIELDS.forEach(function (k) { if (o[k] !== undefined) x[k] = o[k]; }); return clean(x); }

  // Create: the number is assigned here, inside the transaction.
  St.createOrder = function (o) {
    guard();
    var settings = St.settings(), prefix = W.resolvePrefix(settings.numbering, new Date()), key = W.counterKey(prefix), uid = St.user.uid, name = myName();
    var x = pickOrder(o);
    if (settings.features.items) W.summarizeItems(x);
    var custId = ensureCustomer(x.customer);
    var addCustomer = !custId && x.customer ? "c" + W.uid() : null;
    x.customerId = custId || addCustomer;
    var eid = newId();
    return F.runTransaction(db, function (tx) {
      var cref = d(O("counters/" + key));
      return tx.get(cref).then(function (cs) {
        var n = cs.exists() ? (cs.data().n || 0) : (settings.numbering.start || 1) - 1, tries = 0;
        function free() {
          n++; tries++;
          var number = W.formatNumber(prefix, n, settings.numbering.digits);
          return tx.get(d(O("orders/" + W.docId(number)))).then(function (s) {
            if (s.exists()) { if (tries > 50) throw { message: "Couldn't find a free work order number. Check the numbering settings." }; return free(); }
            return number;
          });
        }
        return free().then(function (number) {
          var now = F.serverTimestamp();
          var doc = Object.assign(x, { number: number, ver: 1, createdAt: now, createdBy: uid, createdByName: name, updatedAt: now, updatedBy: uid, lastEvent: eid, source: o.source || "app" });
          if (W.isClosed(doc, settings)) { doc.closedAt = now; doc.closedBy = uid; }
          tx.set(d(O("orders/" + W.docId(number))), doc);
          tx.set(d(O("events/" + eid)), { order: number, type: "created", changes: [], by: uid, pid: St.me, byName: name, at: now, note: o.createNote || "" });
          tx.set(cref, { n: n }, { merge: true });
          if (addCustomer) tx.set(d(O("customers/" + addCustomer)), { name: x.customer, contact: "" });
          return number;
        });
      });
    });
  };

  // Update: "base" is the order as it was when editing started. If someone else saved in
  // between, their changes are kept and mine are applied on top, unless we both changed the
  // same field, which comes back as a conflict for the person to decide.
  St.updateOrder = function (number, baseOrder, edited, meta) {
    guard();
    meta = meta || {};
    var settings = St.settings(), uid = St.user.uid, name = myName(), ref = d(O("orders/" + W.docId(number))), eid = newId();
    var mine = pickOrder(edited);
    // part / qty summaries only follow the parts list when the list itself was edited
    if (settings.features.items && mine.items && !W.same(mine.items, baseOrder.items)) W.summarizeItems(mine);
    return F.runTransaction(db, function (tx) {
      return tx.get(ref).then(function (s) {
        if (!s.exists()) throw { message: "This work order doesn't exist anymore." };
        var cur = s.data(), next;
        if ((cur.ver || 0) !== (baseOrder.ver || 0) && !meta.force) {
          var mg = W.merge(pickOrder(baseOrder), Object.assign(pickOrder(baseOrder), mine), pickOrder(cur));
          if (mg.conflicts.length) throw { conflicts: mg.conflicts, current: cur, message: "Someone else changed this work order while you were editing." };
          next = mg.result;
        } else next = Object.assign(pickOrder(cur), mine);
        var changes = W.diff(pickOrder(cur), next);
        if (!changes.length) return { changes: [] };
        var now = F.serverTimestamp(), patch = { ver: (cur.ver || 0) + 1, updatedAt: now, updatedBy: uid, lastEvent: eid };
        changes.forEach(function (c) {
          if (c[0].indexOf("custom.") === 0) { patch.custom = Object.assign({}, cur.custom || {}, next.custom || {}); }
          else patch[c[0]] = next[c[0]] == null ? null : next[c[0]];
        });
        if (settings.features.items && patch.items) { patch.part = next.part; patch.qty = next.qty; patch.rev = next.rev || ""; }
        var wasClosed = W.isClosed(cur, settings), isClosed = W.isClosed(next, settings);
        if (!wasClosed && isClosed) { patch.closedAt = now; patch.closedBy = uid; }
        if (wasClosed && !isClosed) { patch.closedAt = null; patch.closedBy = null; }
        var type = changes.every(function (c) { return c[0] === "status" || c[0] === "holdReason"; }) ? "status" : changes.every(function (c) { return c[0] === "files"; }) ? "file" : "changed";
        tx.update(ref, patch);
        tx.set(d(O("events/" + eid)), { order: number, type: meta.type || type, changes: changes, reason: meta.reason || "", note: meta.note || "", by: uid, pid: St.me, byName: name, at: now });
        return { changes: changes };
      });
    });
  };

  // Delete work orders for good (owners and admins). Their history entries stay in the database
  // but nothing shows them; numbers are never handed out again.
  function commitDeletes(paths) {
    var chunks = [];
    for (var i = 0; i < paths.length; i += 100) chunks.push(paths.slice(i, i + 100));
    return chunks.reduce(function (p, ch) {
      return p.then(function () { var b = F.writeBatch(db); ch.forEach(function (k) { b.delete(d(k)); }); return b.commit(); });
    }, Promise.resolve());
  }
  St.deleteOrders = function (numbers) {
    guard();
    if (!W.canAdmin(St.myRole())) return Promise.reject({ message: "Only owners and admins can delete work orders." });
    var paths = (numbers || []).filter(function (n) { return St.data.orders[W.docId(n)]; }).map(function (n) { return O("orders/" + W.docId(n)); });
    return commitDeletes(paths).then(function () { return paths.length; });
  };
  // Remove the fictional sample shop: its work orders, and the sample customers and team members
  // that nothing real uses. Settings (statuses, numbering) are kept.
  St.sampleCount = function () { return Object.keys(St.data.orders).filter(function (k) { return St.data.orders[k].source === "sample"; }).length; };
  St.removeSample = function () {
    guard();
    if (!W.canAdmin(St.myRole())) return Promise.reject({ message: "Only owners and admins can remove the sample data." });
    var smp = W.sampleShop(W.iso(new Date())), paths = [];
    var sampleOrders = Object.keys(St.data.orders).filter(function (k) { return St.data.orders[k].source === "sample"; });
    sampleOrders.forEach(function (k) { paths.push(O("orders/" + k)); });
    var keep = Object.keys(St.data.orders).filter(function (k) { return St.data.orders[k].source !== "sample"; }).map(function (k) { return St.data.orders[k]; });
    var custNames = {}; smp.customers.forEach(function (c) { custNames[W.norm(c.name)] = 1; });
    Object.keys(St.data.customers).forEach(function (id) {
      var n = W.norm(St.data.customers[id].name);
      if (custNames[n] && !keep.some(function (o) { return W.norm(o.customer) === n; })) paths.push(O("customers/" + id));
    });
    var members = St.data.members || {}, linked = {}; Object.keys(members).forEach(function (u) { linked[members[u].pid] = 1; });
    smp.people.forEach(function (p) {
      var cur = St.data.people[p.id];
      if (cur && cur.name === p.name && !linked[p.id] && !keep.some(function (o) { return o.assignee === p.id; })) paths.push(O("people/" + p.id));
    });
    return commitDeletes(paths).then(function () { return sampleOrders.length; });
  };

  St.addNote = function (number, text) {
    guard();
    text = String(text || "").trim(); if (!text) return Promise.resolve();
    return F.setDoc(d(O("events/" + newId())), { order: number, type: "note", changes: [], note: text, by: St.user.uid, pid: St.me, byName: myName(), at: F.serverTimestamp() });
  };

  St.history = function (number, cb) {
    return F.onSnapshot(F.query(col(O("events")), F.where("order", "==", number)), function (snap) {
      var r = []; snap.forEach(function (s) { r.push(Object.assign({ id: s.id }, readDoc(s))); });
      r.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      cb(r);
    }, function (e) { console.error(e); cb([]); });
  };

  /* ---------------------------------------------------------------
     Files: uploaded to Firebase Storage online; kept in this browser
     (small files only) when offline.
     --------------------------------------------------------------- */
  St.fileLimit = function () { return St.mode === "local" ? 700 * 1024 : 20 * 1024 * 1024; };
  St.uploadFile = function (number, file) {
    guard();
    if (file.size > St.fileLimit()) return Promise.reject({ message: St.mode === "local" ? "In this browser-only copy, files must be under 700 KB. Online, up to 20 MB." : "Files must be under 20 MB." });
    var meta = { id: W.uid(), name: file.name, size: file.size, type: file.type || "", by: St.user.uid, byName: myName(), at: Date.now() };
    if (St.mode === "local" || fake) {
      return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { meta.url = fr.result; res(meta); }; fr.onerror = function () { rej({ message: "Couldn't read that file." }); }; fr.readAsDataURL(file); });
    }
    var path = O("orders/" + W.docId(number) + "/" + meta.id + "_" + file.name.replace(/[^\w.\-]+/g, "_"));
    var load = storageMod ? Promise.resolve(storageMod) : import(base + "firebase-storage.js").then(function (mm) { return (storageMod = mm); });
    return load.then(function (S) {
      var st = S.getStorage(fbApp), r = S.ref(st, path);
      return S.uploadBytes(r, file, { contentType: file.type || "application/octet-stream" }).then(function () { return S.getDownloadURL(r); });
    }).then(function (url) { meta.url = url; meta.path = path; return meta; })
      .catch(function (e) { console.error(e); throw { message: /unauthorized|permission/i.test(String(e && (e.code || e.message))) ? "Uploading isn't allowed. Check that Firebase Storage is turned on and its rules are published." : "Upload failed. Check your connection and try again." }; });
  };
  // New file with the same name as an existing one becomes the next revision.
  St.withFile = function (files, meta) {
    var list = clean(files || []), same = list.filter(function (f) { return f.name === meta.name; });
    same.forEach(function (f) { f.current = false; });
    meta.revNo = same.length + 1; meta.current = true;
    list.push(meta);
    return list;
  };

  /* ---------------------------------------------------------------
     Import from a spreadsheet
     plan: from WOCore.planImport. extra: { fileName, newPeople: {name: true}, newCustomers: [...], customLabels }
     --------------------------------------------------------------- */
  St.importPlan = function (plan, extra) {
    guard();
    var settings = St.settings(), uid = St.user.uid, name = myName(), rows = plan.rows.filter(function (r) { return r.action !== "skip"; });
    var prefix = W.resolvePrefix(settings.numbering, new Date()), key = W.counterKey(prefix);
    var personIds = {}, writes = [], pre = [], report = { created: [], updated: [], skipped: plan.rows.filter(function (r) { return r.action === "skip"; }) };
    // 1. new people and the extra columns become part of the setup
    Object.keys(extra.newPeople || {}).forEach(function (n) { var id = "p" + W.uid(); personIds[n] = id; pre.push(["set", O("people/" + id), { name: n, role: "staff", dept: "" }]); });
    var s2 = clean(settings), addFields = (plan.customLabels || []).filter(function (c) { return !(s2.fields || []).some(function (f) { return f.id === c.id; }); });
    if (addFields.length) { s2.fields = (s2.fields || []).concat(addFields.map(function (c) { return { id: c.id, label: c.label, type: "text" }; })); s2.features.fields = true; }
    // 2. customers
    var custIds = {};
    Object.keys(St.data.customers).forEach(function (id) { custIds[W.norm(St.data.customers[id].name)] = id; });
    rows.forEach(function (r) { var n = String(r.order.customer || "").trim(); if (n && !custIds[W.norm(n)]) { var id = "c" + W.uid(); custIds[W.norm(n)] = id; pre.push(["set", O("customers/" + id), { name: n, contact: "" }]); } });
    // 3. numbers: rows without one get new numbers in a block
    var need = rows.filter(function (r) { return !r.order.number; }).length;
    return (need ? F.runTransaction(db, function (tx) {
      var cref = d(O("counters/" + key));
      return tx.get(cref).then(function (cs) {
        var n0 = cs.exists() ? cs.data().n || 0 : (settings.numbering.start || 1) - 1;
        var maxImported = W.nextSeqAfter(rows.map(function (r) { return r.order.number; }).filter(Boolean), prefix, n0);
        tx.set(cref, { n: maxImported + need }, { merge: true });
        return maxImported;
      });
    }) : Promise.resolve(null)).then(function (startAt) {
      var n = startAt;
      var maxSeq = 0;
      rows.forEach(function (r) {
        var o = clean(r.order), number = o.number;
        if (!number) { n++; number = W.formatNumber(prefix, n, settings.numbering.digits); }
        if (o.assignee == null && r.personName && personIds[r.personName]) o.assignee = personIds[r.personName];
        o.customerId = custIds[W.norm(o.customer)] || null;
        var s = W.seqOf(number, prefix); if (s != null && s > maxSeq) maxSeq = s;
        var eid = newId(), now = F.serverTimestamp(), path = O("orders/" + W.docId(number));
        if (r.action === "update") {
          var cur = St.data.orders[W.docId(number)] || {}, next = Object.assign(pickOrder(cur), pickOrder(o));
          Object.keys(o).forEach(function (k) { if (o[k] === "" || o[k] == null) next[k] = cur[k]; });
          if (r.order._noStatus) { next.status = cur.status; next.holdReason = cur.holdReason || ""; }
          if (r.order._noPriority) next.priority = cur.priority || "normal";
          next.custom = Object.assign({}, cur.custom || {}, o.custom || {});
          var changes = W.diff(pickOrder(cur), next);
          if (!changes.length) return;
          var patch = { ver: (cur.ver || 0) + 1, updatedAt: now, updatedBy: uid, lastEvent: eid };
          changes.forEach(function (c) { var k = c[0].indexOf("custom.") === 0 ? "custom" : c[0]; patch[k] = next[k] == null ? null : next[k]; });
          writes.push(["update", path, patch]);
          writes.push(["set", O("events/" + eid), { order: number, type: "import", changes: changes, note: "Updated from " + (extra.fileName || "a spreadsheet") + ", row " + r.line, by: uid, pid: St.me, byName: name, at: now }]);
          report.updated.push({ line: r.line, number: number });
        } else {
          var doc = pickOrder(o);
          Object.assign(doc, { number: number, ver: 1, createdAt: now, createdBy: uid, createdByName: name, updatedAt: now, updatedBy: uid, lastEvent: eid, source: "import" });
          writes.push(["set", path, doc]); // already-closed rows keep no close date, so they don't count as "finished this week"
          writes.push(["set", O("events/" + eid), { order: number, type: "import", changes: [], note: "Imported from " + (extra.fileName || "a spreadsheet") + ", row " + r.line, by: uid, pid: St.me, byName: name, at: now }]);
          report.created.push({ line: r.line, number: number });
        }
      });
      // numbering continues above the imported numbers (never goes down)
      var post = [];
      if (maxSeq) { var curN = 0; post.push(["counter", O("counters/" + key), Math.max(maxSeq, n || 0)]); }
      if (addFields.length) { s2.cats = W.catMap(s2); pre.unshift(["update", O(), { settings: s2 }]); }
      // people, customers and new fields first; then each order with its history entry; then the counter
      return commitAllMerge(pre).then(function () { return commitAllMerge(writes, PAIR_BATCH, extra.onProgress); }).then(function () {
        if (!post.length) return;
        var cref = d(post[0][1]);
        return F.runTransaction(db, function (tx) { return tx.get(cref).then(function (cs) { var cur = cs.exists() ? cs.data().n || 0 : 0; if (post[0][2] > cur) tx.set(cref, { n: post[0][2] }, { merge: true }); }); });
      });
    }).then(function () { return report; });
  };
  function commitAllMerge(writes, size, onProgress) {
    size = size || 400;
    var chunks = []; for (var i = 0; i < writes.length; i += size) chunks.push(writes.slice(i, i + size));
    var done = 0;
    return chunks.reduce(function (p, ch) {
      return p.then(function () {
        if (onProgress) onProgress(done, writes.length); done += ch.length;
        var b = F.writeBatch(db);
        ch.forEach(function (w) { if (w[0] === "set") b.set(d(w[1]), w[2], w[3] ? { merge: true } : undefined); else if (w[0] === "update") b.update(d(w[1]), w[2]); });
        return b.commit();
      });
    }, Promise.resolve());
  }

  /* ---------------------------------------------------------------
     Your data, all of it (backup / leaving)
     --------------------------------------------------------------- */
  St.exportAll = function () {
    return F.getDocs(col(O("events"))).then(function (snap) {
      var ev = []; snap.forEach(function (s) { ev.push(Object.assign({ id: s.id }, readDoc(s))); });
      return { app: "Work Order Manager", exported: new Date().toISOString(), workspace: St.data.org && St.data.org.name, settings: St.settings(), people: St.data.people, customers: St.data.customers, orders: St.data.orders, history: ev };
    });
  };

  // Browser-only copy: wipe and start over
  St.resetLocal = function () { if (St.mode !== "local") return; if (window.WOLocalF && WOLocalF._reset) WOLocalF._reset(); location.reload(); };
})();
