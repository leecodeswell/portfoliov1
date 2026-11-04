/* =====================================================================
   A small stand-in for Firebase that keeps documents in this browser.

   Used when config.js has no Firebase settings, so the app can be tried
   and demoed without an account: same calls, same document layout, no
   sign-in and no sharing. (Security rules only exist online.)

   WOMakeDB({ key, user }) returns an object with the Firebase calls the
   app uses: doc, collection, query, where, orderBy, limit, getDoc,
   getDocs, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction,
   onSnapshot, serverTimestamp, and a minimal auth.
   ===================================================================== */
(function () {
  "use strict";
  function WOMakeDB(opts) {
    var KEY = opts.key, subs = [], authListeners = [], mem = null;
    var box = opts.session ? window.sessionStorage : window.localStorage;   // session: erased when the tab closes (demo)
    function read() { if (mem) return mem; try { mem = JSON.parse(box.getItem(KEY) || "{}"); } catch (e) { mem = {}; } return mem; }
    function write(db) {
      mem = db;
      try { box.setItem(KEY, JSON.stringify(db)); }
      catch (e) { var err = new Error("This browser's storage is full. Remove some files or download a backup."); err.code = "storage-full"; throw err; }
      notify();
    }
    function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
    function resolve(v) {   // turn serverTimestamp() placeholders into numbers
      if (v && typeof v === "object") {
        if (v.__sts) return { __ts: Date.now() };
        if (Array.isArray(v)) return v.map(resolve);
        var o = {}; Object.keys(v).forEach(function (k) { o[k] = resolve(v[k]); }); return o;
      }
      return v;
    }
    function snapDoc(path, data) { return { id: path.split("/").pop(), ref: { path: path }, exists: function () { return data != null; }, data: function () { return clone(data); } }; }
    function inColl(path, cpath) { return path.indexOf(cpath + "/") === 0 && path.slice(cpath.length + 1).indexOf("/") < 0; }
    function val(v) { return v && typeof v === "object" && v.__ts ? v.__ts : v; }
    function runQuery(ref, db) {
      var docs = Object.keys(db).filter(function (p) { return inColl(p, ref.path); });
      (ref.wh || []).forEach(function (w) {
        docs = docs.filter(function (p) {
          var v = db[p][w.f];
          if (w.op === "==") return v === w.v;
          if (w.op === "array-contains") return Array.isArray(v) && v.indexOf(w.v) >= 0;
          if (w.op === "in") return w.v.indexOf(v) >= 0;
          return false;
        });
      });
      if (ref.ob) docs.sort(function (a, b) { var x = val(db[a][ref.ob.f]), y = val(db[b][ref.ob.f]); return (x > y ? 1 : x < y ? -1 : 0) * (ref.ob.dir === "desc" ? -1 : 1); });
      else docs.sort();
      if (ref.lim) docs = docs.slice(0, ref.lim);
      return docs;
    }
    function collSnap(ref, db, prev) {
      var docs = runQuery(ref, db), cur = {}, changes = [];
      docs.forEach(function (p) { cur[p] = JSON.stringify(db[p]); });
      docs.forEach(function (p) { if (!prev || prev[p] !== cur[p]) changes.push({ type: prev && prev[p] ? "modified" : "added", doc: snapDoc(p, db[p]) }); });
      if (prev) Object.keys(prev).forEach(function (p) { if (!(p in cur)) changes.push({ type: "removed", doc: snapDoc(p, JSON.parse(prev[p])) }); });
      return { cur: cur, snap: { size: docs.length, empty: !docs.length, forEach: function (fn) { docs.forEach(function (p) { fn(snapDoc(p, db[p])); }); }, docChanges: function () { return changes; } } };
    }
    var pending = false;
    function notify() { if (pending) return; pending = true; setTimeout(function () { pending = false; subs.slice().forEach(function (s) { s.fire(); }); }, 0); }
    if (opts.shared) window.addEventListener("storage", function (e) { if (e.key === KEY) { mem = null; notify(); } });
    function setPath(obj, path, v) { var ks = path.split("."), o = obj; for (var i = 0; i < ks.length - 1; i++) { o = o[ks[i]] = o[ks[i]] && typeof o[ks[i]] === "object" ? o[ks[i]] : {}; } o[ks[ks.length - 1]] = v; }
    function applyUpdate(doc, data) { Object.keys(data).forEach(function (k) { setPath(doc, k, resolve(clone(data[k]))); }); return doc; }
    function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
    var autoN = 0;
    function autoId() { autoN++; return Date.now().toString(36) + autoN.toString(36) + Math.random().toString(36).slice(2, 7); }

    // ---- auth: one fixed person in browser-only mode, or simple accounts for tests
    function curUser() {
      if (opts.user) return opts.user;
      var u = sessionStorage.getItem(KEY + ".user"); return u ? JSON.parse(u) : null;
    }
    function setUser(u) { if (u) sessionStorage.setItem(KEY + ".user", JSON.stringify(u)); else sessionStorage.removeItem(KEY + ".user"); authListeners.forEach(function (fn) { setTimeout(function () { fn(curUser()); }, 0); }); }
    function users() { try { return JSON.parse(localStorage.getItem(KEY + ".accounts") || "{}"); } catch (e) { return {}; } }
    function saveUsers(u) { localStorage.setItem(KEY + ".accounts", JSON.stringify(u)); }

    var api = {
      initializeApp: function () { return {}; },
      getAuth: function () { return { get currentUser() { return curUser(); } }; },
      getFirestore: function () { return {}; },
      onAuthStateChanged: function (a, fn) { authListeners.push(fn); setTimeout(function () { fn(curUser()); }, 0); return function () { }; },
      GoogleAuthProvider: function () { },
      signInWithPopup: function () { var em = window.FAKE_GOOGLE_EMAIL || "owner@example.com", us = users(); if (!us[em]) { us[em] = { uid: "g_" + em.replace(/\W/g, ""), pw: null }; saveUsers(us); } setUser({ uid: us[em].uid, email: em }); return Promise.resolve(); },
      createUserWithEmailAndPassword: function (a, em, pw) { var us = users(); if (us[em]) return Promise.reject(err("auth/email-already-in-use")); if (!pw || pw.length < 6) return Promise.reject(err("auth/weak-password")); us[em] = { uid: "u_" + em.replace(/\W/g, ""), pw: pw }; saveUsers(us); setUser({ uid: us[em].uid, email: em }); return Promise.resolve(); },
      signInWithEmailAndPassword: function (a, em, pw) { var us = users(); if (!us[em] || us[em].pw !== pw) return Promise.reject(err("auth/invalid-credential")); setUser({ uid: us[em].uid, email: em }); return Promise.resolve(); },
      sendSignInLinkToEmail: function () { return Promise.resolve(); },
      isSignInWithEmailLink: function () { return false; },
      signInWithEmailLink: function () { return Promise.resolve(); },
      signOut: function () { if (!opts.user) setUser(null); return Promise.resolve(); },

      // ---- documents
      serverTimestamp: function () { return { __sts: 1 }; },
      doc: function (db, path) {
        if (db && db.coll) { var nid = autoId(); return { path: db.path + "/" + nid, id: nid }; }   // doc(collection) -> new id
        return { path: path, id: path.split("/").pop() };
      },
      collection: function (db, path) { return { path: path, coll: true }; },
      where: function (f, op, v) { return { t: "where", f: f, op: op, v: v }; },
      orderBy: function (f, dir) { return { t: "orderBy", f: f, dir: dir || "asc" }; },
      limit: function (n) { return { t: "limit", n: n }; },
      query: function (c) {
        var q = { path: c.path, coll: true, wh: [] };
        [].slice.call(arguments, 1).forEach(function (x) { if (x.t === "where") q.wh.push(x); else if (x.t === "orderBy") q.ob = x; else if (x.t === "limit") q.lim = x.n; });
        return q;
      },
      getDoc: function (ref) { return Promise.resolve(snapDoc(ref.path, read()[ref.path])); },
      getDocs: function (ref) { return Promise.resolve(collSnap(ref, read(), null).snap); },
      setDoc: function (ref, data, o) { try { var db = read(); db[ref.path] = o && o.merge ? Object.assign(db[ref.path] || {}, resolve(clone(data))) : resolve(clone(data)); write(db); return Promise.resolve(); } catch (e) { return Promise.reject(e); } },
      updateDoc: function (ref, data) { var db = read(); if (!db[ref.path]) return Promise.reject(err("not-found")); try { applyUpdate(db[ref.path], data); write(db); } catch (e) { return Promise.reject(e); } return Promise.resolve(); },
      deleteDoc: function (ref) { var db = read(); delete db[ref.path]; write(db); return Promise.resolve(); },
      writeBatch: function () {
        var ops = [];
        return {
          set: function (ref, data, o) { ops.push(["set", ref.path, data, o]); },
          update: function (ref, data) { ops.push(["update", ref.path, data]); },
          delete: function (ref) { ops.push(["delete", ref.path]); },
          commit: function () {
            var db = clone(read());
            for (var i = 0; i < ops.length; i++) {
              var o = ops[i];
              if (o[0] === "set") db[o[1]] = o[3] && o[3].merge ? Object.assign(db[o[1]] || {}, resolve(clone(o[2]))) : resolve(clone(o[2]));
              else if (o[0] === "update") { if (!db[o[1]]) return Promise.reject(err("not-found", "No document to update: " + o[1])); applyUpdate(db[o[1]], o[2]); }
              else delete db[o[1]];
            }
            try { write(db); } catch (e) { return Promise.reject(e); }
            return Promise.resolve();
          }
        };
      },
      runTransaction: function (db0, fn) {
        // like Firestore: remember what was read; if any of it changed before commit, run again
        function fresh() { if (opts.shared) mem = null; return read(); }
        function attempt(n) {
          var ops = [], seen = {}, snapshot = clone(fresh());
          var tx = {
            get: function (ref) { seen[ref.path] = JSON.stringify(snapshot[ref.path] == null ? null : snapshot[ref.path]); return Promise.resolve(snapDoc(ref.path, snapshot[ref.path])); },
            set: function (ref, data, o) { ops.push(["set", ref.path, data, o]); return tx; },
            update: function (ref, data) { ops.push(["update", ref.path, data]); return tx; },
            delete: function (ref) { ops.push(["delete", ref.path]); return tx; }
          };
          return Promise.resolve(fn(tx)).then(function (res) {
            var db = clone(fresh());
            var stale = Object.keys(seen).some(function (p) { return JSON.stringify(db[p] == null ? null : db[p]) !== seen[p]; });
            if (stale) { if (n >= 5) throw err("aborted", "Too much contention, try again."); return attempt(n + 1); }
            ops.forEach(function (o) {
              if (o[0] === "set") db[o[1]] = o[3] && o[3].merge ? Object.assign(db[o[1]] || {}, resolve(clone(o[2]))) : resolve(clone(o[2]));
              else if (o[0] === "update") applyUpdate(db[o[1]] = db[o[1]] || {}, o[2]);
              else delete db[o[1]];
            });
            write(db);
            return res;
          });
        }
        return attempt(1);
      },
      onSnapshot: function (ref, cb, onErr) {
        var prev = null, last;
        var s = { fire: function () {
          var db = read();
          try {
            if (ref.coll) { var r = collSnap(ref, db, prev); if (prev && !r.snap.docChanges().length) return; prev = r.cur; cb(r.snap); }
            else { var v = JSON.stringify(db[ref.path] == null ? null : db[ref.path]); if (v === last) return; last = v; cb(snapDoc(ref.path, db[ref.path])); }
          } catch (e) { console.error(e); if (onErr) onErr(e); }
        } };
        subs.push(s); setTimeout(s.fire, 0);
        return function () { subs = subs.filter(function (x) { return x !== s; }); };
      },
      _dump: function () { return clone(read()); },
      _reset: function () { try { box.removeItem(KEY); } catch (e) { } mem = null; }
    };
    return api;
  }
  window.WOMakeDB = WOMakeDB;
  var demo = !!window.WO_DEMO;
  window.WOLocalF = WOMakeDB({ key: demo ? "wo.demo.v1" : "wo.local.v1", session: demo, user: { uid: "local", email: "", displayName: "You" } });
})();
