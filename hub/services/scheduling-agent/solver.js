/* =====================================================================
   Scheduling Agent: scheduling engine (v2)

   How it works
   1. Every shift on every day becomes a "slot" with a number of positions.
   2. Locked people (manual picks, set schedules) are placed first and never moved.
   3. A greedy pass fills the hardest positions first.
   4. A local search (simulated annealing) keeps trying changes and keeps the
      ones that make the schedule better: move one person, swap two people,
      or repair a problem (an open spot, a missing role, someone over their max)
      with a short chain of changes made together.

   Scoring: lower is better. The score is a sum of penalties, and every
   penalty belongs to exactly one slot or exactly one person:

     score = sum over slots  (open spots, missing roles, preferences,
                              never-together, work-well-together)
           + sum over people (max/min hours, fair hours, same-day doubles,
                              short rest, overlaps)

   That split is what makes the search fast: a change to one position only
   touches one slot and at most two people, so only those parts are re-scored.

   Rules come in tiers, each 10x the one below, so a lower tier can never
   outweigh a higher one:
     impossible (1e7)  one person in two places at once
     kept rules (1e6)  over someone's max hours, never-together pairs,
                       two shifts in a day when that is turned off
     roles      (1e5)  per missing required role
     open spot  (1e4)  per empty position
     soft      (<1e4)  preferences, work-well-together, fair hours, rest,
                       reaching minimum hours (bounded so even all of them
                       together can't justify leaving a spot open)
   ===================================================================== */
(function (root) {
  "use strict";

  var OVERLAP = 1e7;                  // same person twice at the same time
  var NEVER = 1e6, DOUBLE = 1e6;      // never-together pair, two shifts in one day (when not allowed)
  var OVERMAX = 1e6, OVERMAX_H = 1e5; // over max hours: once per person, plus per hour over
  var ROLE = 1e5;                     // per missing required role
  var UNFILLED = 1e4;                 // per empty position
  var REST_MIN = 10 * 60;             // minutes between the end of one shift and the start of the next
  var FAIR_KNEE = 12;                 // fair-hours penalty is quadratic up to 12h off target, then linear
  var PROBLEM = UNFILLED / 2;         // a slot (or person) costing more than this has a real problem

  function rng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function num(v, d) { return v == null || isNaN(v) ? d : +v; }
  function now() { return (typeof performance !== "undefined" ? performance : Date).now(); }

  /* Fair-hours penalty for being d hours away from your fair share.
     Quadratic near the target (being 6h off costs 4x being 3h off, so it
     evens things out), linear past FAIR_KNEE so one person's big gap can't
     outweigh an open spot. Both pieces meet smoothly at the knee. */
  function fairPenalty(d) {
    var a = d < 0 ? -d : d;
    return a <= FAIR_KNEE ? d * d : 2 * FAIR_KNEE * a - FAIR_KNEE * FAIR_KNEE;
  }

  /* ---------- turn a problem into fast lookup tables ---------- */
  function build(P) {
    var people = P.people || [], slots = P.slots || [];
    var NP = people.length, idx = {};
    people.forEach(function (p, i) { idx[p.id] = i; });
    var f = P.features || {}, w = P.weights || {};
    // slider value 0-5 times a scale that sets how each rule compares to the others
    var W = {
      pref: f.preferences ? 30 * num(w.preferences, 3) : 0,  // per preferred (or avoided) shift
      pair: f.preferPairs ? 30 * num(w.pairs, 3) : 0,        // per work-well-together pair on a shift
      fair: f.fairness ? 3 * num(w.fairness, 3) : 1,         // per (hour off fair share) squared; a light touch even when "Fair hours" is off
      rest: f.rest ? 120 * num(w.rest, 3) : 0,               // per short turnaround
      minh: 60 * num(w.minHours, 3)                          // per hour under minimum
    };

    var hasRole = people.map(function (p) { var o = {}; (p.roles || []).forEach(function (r) { o[r] = true; }); return o; });
    var pref = people.map(function (p) { return p.prefs || {}; });
    var maxH = people.map(function (p) { return num(p.max, 168); }), minH = people.map(function (p) { return num(p.min, 0); });
    function matrix(list) {
      var m = []; for (var i = 0; i < NP; i++) m.push(new Uint8Array(NP));
      (list || []).forEach(function (pr) {
        var a = idx[pr[0]], b = idx[pr[1]];
        if (a == null || b == null || a === b) return;
        m[a][b] = 1; m[b][a] = 1;
      });
      return m;
    }
    var never = matrix(f.avoidPairs === false ? [] : P.never);
    var prefer = matrix(P.prefer);

    var pos = [], S = [], maxPos = 1;
    slots.forEach(function (s, si) {
      var locked = [];
      (s.locked || []).forEach(function (id) { var i = idx[id]; if (i != null && locked.indexOf(i) < 0) locked.push(i); });
      // never lose a locked person, even if it overstaffs the shift
      var count = Math.max(num(s.count, 0), locked.length);
      var elig = new Uint8Array(NP), eligList = [];
      (s.eligible || []).forEach(function (id) { var i = idx[id]; if (i != null && !elig[i]) { elig[i] = 1; eligList.push(i); } });
      var row = { key: s.key, day: s.day, start: s.start, end: s.end, hours: num(s.hours, (s.end - s.start) / 60),
        count: count, plannedCount: num(s.count, 0), needs: f.roles ? (s.needs || []) : [], shiftId: s.shiftId,
        elig: elig, eligList: eligList, pos: [], locked: locked };
      for (var k = 0; k < count; k++) {
        row.pos.push(pos.length);
        pos.push({ s: si, locked: k < locked.length, init: k < locked.length ? locked[k] : -1 });
      }
      maxPos = Math.max(maxPos, count);
      S.push(row);
    });

    // slots in time order; person lists are kept in this order
    var order = S.map(function (s, i) { return i; }).sort(function (a, b) { return (S[a].start - S[b].start) || (a - b); });
    var rankOf = new Int32Array(S.length); order.forEach(function (si, r) { rankOf[si] = r; });

    var C = { P: P, people: people, NP: NP, idx: idx, S: S, pos: pos, W: W, hasRole: hasRole, pref: pref,
      never: never, prefer: prefer, maxH: maxH, minH: minH, allowDoubles: !!P.allowDoubles, roles: !!f.roles,
      order: order, rankOf: rankOf, maxPos: maxPos };
    C.share = fairShares(C);
    return C;
  }

  /* ---------- fair share of the week's hours ----------
     Each flexible person's target is proportional to the middle of their hour
     range, scaled so the targets add up to the hours there actually are to
     hand out, and kept between what they can reach and what they must get:

       share_i = clamp(L * mid_i, floor_i, cap_i),  with L chosen so  sum share_i = D

       D       = all positions' hours, minus hours held by people on a set schedule
       mid_i   = (min_i + min(max_i, 60)) / 2
       cap_i   = min(max_i, most hours their availability allows)
       floor_i = min(min_i, cap_i)

     L is found by bisection (the sum only grows as L grows). Anyone held at
     their cap or floor frees or takes hours that the others share. */
  function fairShares(C) {
    var NP = C.NP, S = C.S, people = C.people;
    var D = 0, fixedHours = 0;
    var reach = new Float64Array(NP);
    var byDay = {}; // day -> person -> { locked hours, best eligible single shift, all eligible hours }
    S.forEach(function (s) {
      D += s.count * s.hours;
      var dd = byDay[s.day] || (byDay[s.day] = []);
      s.locked.forEach(function (i) {
        if (people[i].fixed) fixedHours += s.hours;
        var o = dd[i] || (dd[i] = { lk: 0, best: 0, all: 0 }); o.lk += s.hours;
      });
      s.eligList.forEach(function (i) {
        var o = dd[i] || (dd[i] = { lk: 0, best: 0, all: 0 });
        if (s.hours > o.best) o.best = s.hours; o.all += s.hours;
      });
    });
    Object.keys(byDay).forEach(function (d) {
      byDay[d].forEach(function (o, i) {
        if (!o) return;
        // with one shift a day, a day you're locked into is already used
        reach[i] += C.allowDoubles ? o.lk + o.all : (o.lk > 0 ? o.lk : o.best);
      });
    });
    D -= fixedHours;

    var mid = new Float64Array(NP), cap = new Float64Array(NP), flo = new Float64Array(NP), share = new Float64Array(NP);
    var flex = [];
    for (var i = 0; i < NP; i++) {
      if (people[i].fixed) { share[i] = C.minH[i]; continue; }
      cap[i] = Math.min(C.maxH[i], reach[i]);
      flo[i] = Math.min(C.minH[i], cap[i]);
      mid[i] = (C.minH[i] + Math.min(C.maxH[i], 60)) / 2;
      flex.push(i);
    }
    function total(L) { var t = 0; flex.forEach(function (i) { t += Math.max(flo[i], Math.min(cap[i], L * mid[i])); }); return t; }
    var lo = 0, hi = 1;
    while (total(hi) < D && hi < 1e6) hi *= 2;
    for (var it = 0; it < 60; it++) { var m = (lo + hi) / 2; if (total(m) < D) lo = m; else hi = m; }
    flex.forEach(function (i) { share[i] = Math.max(flo[i], Math.min(cap[i], hi * mid[i])); });
    return share;
  }

  /* ---------- penalty for one slot ----------
     M is a scratch array; issues, if given, collects readable problems. */
  function slotCost(C, si, A, M, issues) {
    var s = C.S[si], n = 0, c = 0, i, j, k;
    for (k = 0; k < s.pos.length; k++) {
      var p = A[s.pos[k]];
      if (p < 0) continue;
      for (i = 0; i < n; i++) if (M[i] === p) break;
      if (i < n) { c += OVERLAP; continue; }
      M[n++] = p;
    }
    var missing = s.plannedCount - n;
    if (missing > 0) { c += missing * UNFILLED; if (issues) issues.push({ type: "unfilled", key: s.key, missing: missing, available: s.eligList.length }); }
    if (C.roles) {
      for (k = 0; k < s.needs.length; k++) {
        var need = s.needs[k], have = 0;
        for (j = 0; j < n; j++) if (C.hasRole[M[j]][need.role]) have++;
        if (have < need.count) { c += (need.count - have) * ROLE; if (issues) issues.push({ type: "role", key: s.key, role: need.role, missing: need.count - have }); }
      }
    }
    for (i = 0; i < n; i++) {
      var m = M[i];
      if (C.W.pref) { var pv = C.pref[m][s.shiftId]; if (pv) c -= pv * C.W.pref; }
      if (issues && !s.elig[m] && !C.people[m].fixed) issues.push({ type: "unavailable", key: s.key, pid: C.people[m].id });
      for (j = i + 1; j < n; j++) {
        var q = M[j];
        if (C.never[m][q]) { c += NEVER; if (issues) issues.push({ type: "never", key: s.key, a: C.people[m].id, b: C.people[q].id }); }
        if (C.W.pair && C.prefer[m][q]) c -= C.W.pair;
      }
    }
    return c;
  }

  /* ---------- penalty for one person ----------
     L lists the slots they work, in time order. */
  function personCost(C, i, L, issues) {
    var pp = C.people[i], h = 0, c = 0, k;
    for (k = 0; k < L.length; k++) h += C.S[L[k]].hours;
    var mx = C.maxH[i], mn = C.minH[i];
    if (h > mx + 1e-9) { c += OVERMAX + (h - mx) * OVERMAX_H; if (issues) issues.push({ type: "over", pid: pp.id, hours: h, max: mx }); }
    if (h < mn - 1e-9) { c += (mn - h) * C.W.minh; if (issues) issues.push({ type: "under", pid: pp.id, hours: h, min: mn }); }
    if (C.W.fair && !pp.fixed) c += C.W.fair * fairPenalty(h - C.share[i]);
    if (L.length > 1) {
      var a = C.S[L[0]], endMax = a.end, endSlot = a;
      for (k = 1; k < L.length; k++) {
        var b = C.S[L[k]];
        if (b.start < endMax) { c += OVERLAP; if (issues) issues.push({ type: "overlap", pid: pp.id, a: endSlot.key, b: b.key }); }
        else if (endSlot.day === b.day && !C.allowDoubles) { c += DOUBLE; if (issues) issues.push({ type: "double", pid: pp.id, a: endSlot.key, b: b.key }); }
        else if (C.W.rest && b.start - endMax < REST_MIN) { c += C.W.rest; if (issues) issues.push({ type: "rest", pid: pp.id, a: endSlot.key, b: b.key }); }
        if (b.end > endMax) { endMax = b.end; endSlot = b; }
      }
    }
    return c;
  }

  // each person's slots, in time order, from an assignment
  function personLists(C, A, M) {
    var lists = []; for (var i = 0; i < C.NP; i++) lists.push([]);
    C.order.forEach(function (si) {
      var s = C.S[si], n = 0;
      s.pos.forEach(function (k) {
        var p = A[k]; if (p < 0) return;
        for (var j = 0; j < n; j++) if (M[j] === p) return;
        M[n++] = p; lists[p].push(si);
      });
    });
    return lists;
  }

  /* ---------- the whole score (and, on request, the list of issues) ---------- */
  function makeScorer(C) {
    var M = new Int32Array(C.maxPos + 1);
    return function score(A, issues) {
      var total = 0, si, i;
      for (si = 0; si < C.S.length; si++) total += slotCost(C, si, A, M, issues);
      var lists = personLists(C, A, M);
      for (i = 0; i < C.NP; i++) total += personCost(C, i, lists[i], issues);
      return total;
    };
  }

  function toAssign(C, A) {
    var out = {};
    C.S.forEach(function (s) {
      var ids = [];
      s.pos.forEach(function (k) { if (A[k] >= 0) ids.push(C.people[A[k]].id); });
      out[s.key] = ids;
    });
    return out;
  }

  function fromAssign(C, assign) {
    var A = C.pos.map(function (p) { return p.init; });
    C.S.forEach(function (s, si) {
      var ids = (assign && assign[s.key]) || [];
      var free = s.pos.filter(function (k) { return !C.pos[k].locked; });
      var already = s.locked.slice();
      ids.forEach(function (id) {
        var i = C.idx[id];
        if (i == null || already.indexOf(i) >= 0) return;
        if (!free.length) { // more people than positions: grow the slot
          var k = C.pos.length; C.pos.push({ s: si, locked: false, init: -1 }); s.pos.push(k); s.count++; A.push(-1); free.push(k);
          C.maxPos = Math.max(C.maxPos, s.count);
        }
        A[free.shift()] = i; already.push(i);
      });
    });
    return A;
  }

  /* ---------- solve ---------- */
  function solve(P, opts) {
    opts = opts || {};
    var C = build(P), score = makeScorer(C), rand = rng(opts.seed || Date.now());
    var NS = C.S.length, NP = C.NP, NK = C.pos.length;
    var A = new Int32Array(NK), posSlot = new Int32Array(NK), free = [];
    C.pos.forEach(function (p, k) { A[k] = p.init; posSlot[k] = p.s; if (!p.locked) free.push(k); });
    var M = new Int32Array(C.maxPos + 1);

    /* --- live state: each person's slots, and the cached cost of every slot and person --- */
    var plist, slotC = new Float64Array(NS), persC = new Float64Array(NP), cur = 0;
    function resync() {
      plist = personLists(C, A, M); cur = 0;
      for (var si = 0; si < NS; si++) { slotC[si] = slotCost(C, si, A, M); cur += slotC[si]; }
      for (var i = 0; i < NP; i++) { persC[i] = personCost(C, i, plist[i]); cur += persC[i]; }
    }
    resync();

    function listRemove(L, si) { var j = L.indexOf(si); if (j >= 0) L.splice(j, 1); }
    function listInsert(L, si) {
      var r = C.rankOf[si], j = L.length;
      while (j > 0 && C.rankOf[L[j - 1]] > r) j--;
      L.splice(j, 0, si);
    }
    function rawSet(k, v) {
      var old = A[k]; if (old === v) return;
      var si = posSlot[k]; A[k] = v;
      if (old >= 0) listRemove(plist[old], si);
      if (v >= 0) listInsert(plist[v], si);
    }

    /* --- a move is a small transaction: set positions, price it, keep it or undo it --- */
    var logK = [], logV = [], tS = [], tP = [], markS = new Int32Array(NS), markP = new Int32Array(NP), stamp = 0;
    var newS = new Float64Array(NS), newP = new Float64Array(NP);
    function begin() { logK.length = 0; logV.length = 0; tS.length = 0; tP.length = 0; stamp++; }
    function touchP(p) { if (p >= 0 && markP[p] !== stamp) { markP[p] = stamp; tP.push(p); } }
    function set(k, v) {
      if (A[k] === v) return;
      var si = posSlot[k];
      if (markS[si] !== stamp) { markS[si] = stamp; tS.push(si); }
      touchP(A[k]); touchP(v);
      logK.push(k); logV.push(A[k]); rawSet(k, v);
    }
    function delta() { // score change of everything set since begin()
      var d = 0, j;
      for (j = 0; j < tS.length; j++) { var si = tS[j]; newS[si] = slotCost(C, si, A, M); d += newS[si] - slotC[si]; }
      for (j = 0; j < tP.length; j++) { var p = tP[j]; newP[p] = personCost(C, p, plist[p]); d += newP[p] - persC[p]; }
      return d;
    }
    function undoTo(n) { while (logK.length > n) rawSet(logK.pop(), logV.pop()); }
    function commit(d) {
      for (var j = 0; j < tS.length; j++) slotC[tS[j]] = newS[tS[j]];
      for (j = 0; j < tP.length; j++) persC[tP[j]] = newP[tP[j]];
      cur += d;
    }
    function inSlot(si, person, except) {
      var s = C.S[si];
      for (var q = 0; q < s.pos.length; q++) if (s.pos[q] !== except && A[s.pos[q]] === person) return true;
      return false;
    }
    function isFree(k) { return !C.pos[k].locked; }
    // best person (or nobody) for position k, given everything else set so far in this move
    function bestFill(k, first) {
      var si = posSlot[k], n0 = logK.length, bestV = A[k], bestD = delta(), d;
      var tryOne = function (p) {
        if (p === bestV || (p >= 0 && inSlot(si, p, k))) return;
        set(k, p); d = delta(); if (d < bestD) { bestD = d; bestV = p; } undoTo(n0);
      };
      if (first != null && first >= 0 && C.S[si].elig[first]) tryOne(first);
      var el = C.S[si].eligList;
      for (var j = 0; j < el.length; j++) tryOne(el[j]);
      set(k, bestV);
    }

    /* --- 1. greedy: positions with the fewest options (and role needs) first --- */
    var order = free.slice().sort(function (a, b) {
      var sa = C.S[posSlot[a]], sb = C.S[posSlot[b]];
      return (sa.eligList.length - sb.eligList.length) || (sb.needs.length - sa.needs.length) || (sa.start - sb.start);
    });
    order.forEach(function (k) {
      if (A[k] >= 0) return;
      begin(); bestFill(k); var d = delta();
      if (d < 0) commit(d); else undoTo(0);
    });

    var bestA = A.slice(), best = cur, iters = 0;
    if (free.length) {
      /* --- 2. simulated annealing ---
         A change that makes the score worse by d is still taken with chance
         e^(-d/T). T starts at T0 and cools toward T0 * 0.003, so early on the
         search wanders between soft trade-offs, and at the end it only
         improves. Hard tiers (1e4 and up) are far above T, so they are
         effectively never made worse on purpose. */
      var t0 = now(), budget = opts.budgetMs == null ? 700 : opts.budgetMs, maxIter = opts.maxIter || 5e7;
      var T0 = 600, T = T0, progress = 0, lastBest = 0, epoch = 0;
      var accept = function (d) { return d <= 0 || rand() < Math.exp(-d / T); };
      var problemPeople = [];

      // repair a slot with an open spot or a missing role: bring someone in,
      // and if that pulls them off another shift the same day, refill that one
      var repairSlot = function (si) {
        var s = C.S[si], need = null;
        if (C.roles) for (var q = 0; q < s.needs.length; q++) {
          var have = 0;
          for (var x = 0; x < s.pos.length; x++) if (A[s.pos[x]] >= 0 && C.hasRole[A[s.pos[x]]][s.needs[q].role]) have++;
          if (have < s.needs[q].count) { need = s.needs[q].role; break; }
        }
        var cands = [];
        for (var j = 0; j < s.eligList.length; j++) {
          var p = s.eligList[j];
          if (inSlot(si, p, -1)) continue;
          if (need && !C.hasRole[p][need]) continue;
          cands.push(p);
        }
        if (!cands.length) return;
        var p2 = cands[(rand() * cands.length) | 0];
        // where p2 goes: an empty position, or replacing someone without the missing role
        var target = -1, displaced = -1;
        for (j = 0; j < s.pos.length; j++) if (isFree(s.pos[j]) && A[s.pos[j]] < 0) { target = s.pos[j]; break; }
        if (target < 0) {
          var opts2 = [];
          for (j = 0; j < s.pos.length; j++) { var k2 = s.pos[j], m = A[k2]; if (isFree(k2) && m >= 0 && (!need || !C.hasRole[m][need])) opts2.push(k2); }
          if (!opts2.length) return;
          target = opts2[(rand() * opts2.length) | 0]; displaced = A[target];
        }
        // positions p2 must leave: same day (if doubles are off) or overlapping
        var clash = [];
        plist[p2].forEach(function (ti) {
          var t = C.S[ti];
          if ((t.day === s.day && !C.allowDoubles) || (t.start < s.end && s.start < t.end))
            t.pos.forEach(function (kk) { if (A[kk] === p2) clash.push(kk); });
        });
        for (j = 0; j < clash.length; j++) if (!isFree(clash[j])) return;
        begin();
        set(target, p2);
        for (j = 0; j < clash.length; j++) { set(clash[j], -1); bestFill(clash[j], displaced); }
        var d = delta();
        if (accept(d)) commit(d); else undoTo(0);
      };
      // repair someone over max hours, double-booked or with a never-together clash: hand one of their shifts to the best alternative
      var repairPerson = function (p) {
        var ks = [];
        plist[p].forEach(function (ti) { C.S[ti].pos.forEach(function (kk) { if (A[kk] === p && isFree(kk)) ks.push(kk); }); });
        if (!ks.length) return;
        var k = ks[(rand() * ks.length) | 0];
        begin(); set(k, -1); bestFill(k);
        var d = delta();
        if (accept(d)) commit(d); else undoTo(0);
      };

      while (iters < maxIter) {
        if ((iters & 255) === 0) {
          progress = (now() - t0) / budget;
          if (progress >= 1) break;
          // cool within an epoch; if a whole epoch passes with no new best, start the next from the best so far
          var span = 0.5, local = (progress - epoch * span) / span;
          if (local >= 1) {
            epoch++; local = 0;
            if (iters - lastBest > 2000) { A.set(bestA); resync(); }
          }
          T = T0 * Math.pow(0.003, Math.min(1, local));
          if ((iters & 4095) === 0) { problemPeople.length = 0; for (var pi = 0; pi < NP; pi++) if (persC[pi] > OVERMAX / 2) problemPeople.push(pi); }
        }
        iters++;
        var r = rand();
        if (r < 0.06) {
          // repair: find a problem slot (open spot or missing role) starting from a random point
          var start = (rand() * NS) | 0, found = -1;
          for (var z = 0; z < NS; z++) { var sz = (start + z) % NS; if (slotC[sz] > PROBLEM) { found = sz; break; } }
          if (found >= 0) repairSlot(found);
          else if (problemPeople.length) repairPerson(problemPeople[(rand() * problemPeople.length) | 0]);
        } else if (r < 0.09 && problemPeople.length) {
          repairPerson(problemPeople[(rand() * problemPeople.length) | 0]);
        } else if (r < 0.6) {
          // move: put someone else (or, rarely, nobody) in one position
          var k1 = free[(rand() * free.length) | 0], s1 = posSlot[k1], old1 = A[k1], el = C.S[s1].eligList;
          var np = rand() < 0.05 || !el.length ? -1 : el[(rand() * el.length) | 0];
          if (np === old1 || (np >= 0 && inSlot(s1, np, k1))) continue;
          begin(); set(k1, np); var d1 = delta();
          if (accept(d1)) commit(d1); else undoTo(0);
        } else {
          // swap: two positions on different shifts trade people (one may be empty)
          var ka = free[(rand() * free.length) | 0], kb = free[(rand() * free.length) | 0];
          var sa = posSlot[ka], sb = posSlot[kb], pa = A[ka], pb = A[kb];
          if (sa === sb || pa === pb) continue;
          if (pb >= 0 && (!C.S[sa].elig[pb] || inSlot(sa, pb, ka))) continue;
          if (pa >= 0 && (!C.S[sb].elig[pa] || inSlot(sb, pa, kb))) continue;
          begin(); set(ka, pb); set(kb, pa); var d2 = delta();
          if (accept(d2)) commit(d2); else undoTo(0);
        }
        if (cur < best - 1e-9) { best = cur; bestA = A.slice(); lastBest = iters; }
        if (opts.check && (iters % opts.check) === 0) {   // tests only: the running total must match a full re-score
          var full = score(A);
          if (Math.abs(full - cur) > 1e-6 * Math.max(1, Math.abs(full))) throw new Error("score drift at " + iters + ": " + cur + " vs " + full);
        }
      }
    }
    var issues = [], finalScore = score(bestA, issues);
    return { assign: toAssign(C, bestA), score: finalScore, issues: issues, stats: { iterations: iters } };
  }

  /* ---------- warnings for any schedule, including hand edits ---------- */
  function analyze(P, assign) {
    var C = build(P), A = fromAssign(C, assign), score = makeScorer(C), issues = [];
    var total = score(A, issues), hours = {};
    C.people.forEach(function (p) { hours[p.id] = 0; });
    C.S.forEach(function (s) { s.pos.forEach(function (k) { if (A[k] >= 0) hours[C.people[A[k]].id] += s.hours; }); });
    return { score: total, issues: issues, hours: hours };
  }

  /* ---------- who could fill an open spot, best first, with reasons ---------- */
  function rank(P, assign, key) {
    var C = build(P), A = fromAssign(C, assign);
    var si = -1; C.S.forEach(function (s, i) { if (s.key === key) si = i; });
    if (si < 0) return [];
    var s = C.S[si];
    var k = -1;
    s.pos.forEach(function (q) { if (k < 0 && A[q] < 0) k = q; });
    if (k < 0) { k = C.pos.length; C.pos.push({ s: si, locked: false, init: -1 }); s.pos.push(k); s.count++; A.push(-1); C.maxPos = Math.max(C.maxPos, s.count); }
    var score = makeScorer(C);
    var base = score(A), members = s.pos.map(function (q) { return A[q]; }).filter(function (p) { return p >= 0; });

    var hours = new Float64Array(C.NP), byPerson = [];
    for (var i = 0; i < C.NP; i++) byPerson.push([]);
    C.S.forEach(function (t, ti) { t.pos.forEach(function (q) { if (A[q] >= 0) { hours[A[q]] += t.hours; byPerson[A[q]].push(ti); } }); });

    var out = [];
    C.people.forEach(function (p, i) {
      if (members.indexOf(i) >= 0) return;
      A[k] = i; var d = score(A) - base; A[k] = -1;
      var reasons = [], ok = !!s.elig[i] && !p.fixed, h = hours[i], after = h + s.hours, mx = C.maxH[i], mn = C.minH[i];
      if (p.fixed) reasons.push({ t: "On a set schedule", good: false });
      else if (!s.elig[i]) reasons.push({ t: "Not available", good: false });
      else reasons.push({ t: "Available", good: true });
      var clash = false;
      byPerson[i].forEach(function (ti) {
        var t = C.S[ti];
        if (t.start < s.end && s.start < t.end) { clash = true; reasons.push({ t: "Already working then", good: false }); }
        else if (t.day === s.day && !C.allowDoubles) { clash = true; reasons.push({ t: "Already working that day", good: false }); }
        else if (C.W.rest && ((t.end <= s.start && s.start - t.end < REST_MIN) || (s.end <= t.start && t.start - s.end < REST_MIN))) reasons.push({ t: "Short rest between shifts", good: false });
      });
      if (clash) ok = false;
      if (after > mx + 1e-9) { reasons.push({ t: "Would go over max (" + fmtH(after) + " / " + fmtH(mx) + ")", good: false, over: true }); }
      else if (h < mn) reasons.push({ t: "Needs hours (" + fmtH(h) + " of " + fmtH(mn) + " min)", good: true });
      else reasons.push({ t: fmtH(h) + " this week", good: null });
      if (C.W.pref) { var pv = C.pref[i][s.shiftId]; if (pv > 0) reasons.push({ t: "Prefers this shift", good: true }); if (pv < 0) reasons.push({ t: "Prefers to avoid this shift", good: false }); }
      members.forEach(function (m) {
        if (C.never[i][m]) { ok = false; reasons.push({ t: "Can't work with " + C.people[m].name, good: false }); }
        if (C.W.pair && C.prefer[i][m]) reasons.push({ t: "Works well with " + C.people[m].name, good: true });
      });
      out.push({ pid: p.id, ok: ok, over: after > mx + 1e-9, delta: d, hours: h, reasons: reasons });
    });
    out.sort(function (a, b) { return (b.ok - a.ok) || ((a.over ? 1 : 0) - (b.over ? 1 : 0)) || (a.delta - b.delta) || (a.hours - b.hours); });
    return out;
  }

  function fmtH(h) { return (Math.round(h * 10) / 10) + "h"; }

  root.SAEngine = { solve: solve, analyze: analyze, rank: rank, _build: build, _scorer: makeScorer,
    _fairShares: fairShares, _tiers: { OVERLAP: OVERLAP, NEVER: NEVER, DOUBLE: DOUBLE, OVERMAX: OVERMAX, OVERMAX_H: OVERMAX_H, ROLE: ROLE, UNFILLED: UNFILLED } };
})(typeof window !== "undefined" ? window : globalThis);
