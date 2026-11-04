/* =====================================================================
   Work Order Manager: core rules (no screen code, no database code)

   Everything here is plain logic so it can be tested on its own:
     - work order numbers (format, per-year counters)
     - statuses and the allowed moves between them
     - who may change which field
     - validation and change history (what changed, from what, to what)
     - reading spreadsheets: CSV parsing, column guessing, value cleanup,
       and the import plan with its reconciliation report
     - the fictional sample shop used for demos
   ===================================================================== */
(function (root) {
  "use strict";

  /* ---------------------------------------------------------------
     Statuses. Each custom status belongs to one base type, so the
     dashboard and the rules keep working whatever the shop calls them.
     --------------------------------------------------------------- */
  var CATS = {
    open: { name: "Not started", tone: "open" },
    active: { name: "Working", tone: "active" },
    hold: { name: "On hold", tone: "hold" },
    done: { name: "Done", tone: "done" },
    canceled: { name: "Canceled", tone: "canceled" }
  };
  var CAT_ORDER = ["open", "active", "hold", "done", "canceled"];

  var PRESETS = {
    machine: {
      label: "Machine shop", noun: "Work order",
      statuses: [["Open", "open"], ["Waiting on material", "hold"], ["In production", "active"], ["Inspection", "active"], ["Ready to ship", "active"], ["Shipped", "done"], ["Canceled", "canceled"]]
    },
    fab: {
      label: "Fabrication / welding", noun: "Job",
      statuses: [["Quoted", "open"], ["Approved", "open"], ["Waiting on material", "hold"], ["Cutting", "active"], ["Welding", "active"], ["Finishing", "active"], ["Ready for pickup", "active"], ["Complete", "done"], ["Canceled", "canceled"]]
    },
    repair: {
      label: "Repair / service shop", noun: "Repair order",
      statuses: [["Checked in", "open"], ["Diagnosing", "active"], ["Waiting on parts", "hold"], ["Waiting on customer", "hold"], ["Repairing", "active"], ["Ready for pickup", "active"], ["Picked up", "done"], ["Canceled", "canceled"]]
    },
    sign: {
      label: "Print / sign shop", noun: "Job",
      statuses: [["New", "open"], ["Proof sent", "hold"], ["Approved", "open"], ["Printing", "active"], ["Installing", "active"], ["Complete", "done"], ["Canceled", "canceled"]]
    },
    other: {
      label: "Something else", noun: "Work order",
      statuses: [["Open", "open"], ["In progress", "active"], ["On hold", "hold"], ["Done", "done"], ["Canceled", "canceled"]]
    }
  };

  // Words people type in spreadsheets, mapped to a base type (used when importing)
  var CAT_WORDS = {
    open: ["open", "new", "not started", "pending", "queued", "todo", "to do", "received", "checked in", "quoted", "approved", "released"],
    active: ["in progress", "in prog", "inprog", "wip", "started", "working", "in production", "production", "running", "machining", "inspection", "qc", "ready", "ready to ship", "finishing", "repairing", "diagnosing", "printing"],
    hold: ["hold", "on hold", "waiting", "waiting on material", "waiting material", "wait mat", "waiting on parts", "parts", "blocked", "paused", "stuck", "proof"],
    done: ["done", "complete", "completed", "closed", "shipped", "delivered", "finished", "picked up", "invoiced"],
    canceled: ["canceled", "cancelled", "cancel", "void", "voided", "dead", "lost", "x"]
  };

  var FEATURES = [
    { key: "items", name: "Several parts per order", desc: "Each work order can list more than one part number with its own quantity.",
      q: "Do some orders have more than one part?", qd: "Adds a parts list to each order." },
    { key: "files", name: "Drawings, POs and photos", desc: "Attach files to an order. New versions of a drawing keep the old ones as history.",
      q: "Do you keep drawings, POs or photos with jobs?", qd: "Attach them to the order, with revisions." },
    { key: "flow", name: "Status steps", desc: "Choose which status can follow which, so steps aren't skipped. Managers can still override.",
      q: "Do jobs skip steps or get closed too early?", qd: "Set the order steps happen in." },
    { key: "reasons", name: "Ask why", desc: "Ask for a reason when a due date moves or a job goes on hold, and keep it in the history.",
      q: "Do due dates move and nobody remembers why?", qd: "A short reason is saved with each change." },
    { key: "fields", name: "Extra fields", desc: "Add your own fields, like heat lot, material or machine.",
      q: "Do you track things beyond the usual columns?", qd: "Like material, heat lot, machine or PO line." },
    { key: "board", name: "Board view", desc: "A whiteboard-style view with a column per status. Drag jobs between columns.",
      q: "Would a whiteboard-style view help?", qd: "A column for each status." },
    { key: "travelers", name: "Printed travelers", desc: "Print a job sheet with a QR code. Scan it with a phone to open the job.",
      q: "Do paper job sheets travel with the parts?", qd: "Print travelers with a QR code." },
    { key: "roles", name: "Roles and permissions", desc: "Managers, shop staff and view-only accounts. Shop staff can update status and notes but can't change due dates or quantities.",
      q: "Should some people only be able to update status?", qd: "Managers, shop staff and view-only roles." }
  ];
  var OPT = FEATURES.map(function (f) { return f.key; });

  var PRIORITIES = [["normal", "Normal"], ["high", "High"], ["rush", "Rush"]];

  // Core fields every order has, in the order a spreadsheet usually lists them.
  var FIELDS = [
    { key: "number", label: "Work order #", type: "text" },
    { key: "customer", label: "Customer", type: "text", required: true },
    { key: "po", label: "Customer PO", type: "text" },
    { key: "part", label: "Part number", type: "text" },
    { key: "rev", label: "Rev", type: "text" },
    { key: "qty", label: "Quantity", type: "number" },
    { key: "title", label: "Description", type: "text" },
    { key: "received", label: "Received", type: "date" },
    { key: "due", label: "Due", type: "date", required: true },
    { key: "assignee", label: "Assigned to", type: "person" },
    { key: "priority", label: "Priority", type: "priority" },
    { key: "status", label: "Status", type: "status" },
    { key: "notes", label: "Instructions / notes", type: "longtext" }
  ];
  var FIELD_LABEL = {}; FIELDS.forEach(function (f) { FIELD_LABEL[f.key] = f.label; });
  FIELD_LABEL.holdReason = "Hold reason"; FIELD_LABEL.items = "Parts"; FIELD_LABEL.files = "Files";

  /* ---------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------- */
  function pad(n, d) { n = String(n); while (n.length < d) n = "0" + n; return n; }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2); }
  function parseISO(s) { var a = String(s).split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 864e5); }
  function norm(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function same(a, b) { return JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b); }

  /* ---------------------------------------------------------------
     Default settings
     --------------------------------------------------------------- */
  function makeStatuses(preset) {
    var colors = { open: 3, active: 0, hold: 2, done: 1, canceled: 7 };
    return (PRESETS[preset] || PRESETS.machine).statuses.map(function (s, i) {
      return { id: "s" + (i + 1), name: s[0], cat: s[1], color: colors[s[1]] };
    });
  }
  // A simple default flow: forward one step, back one step, plus hold and cancel from anywhere.
  function defaultFlow(statuses) {
    var flow = {}, work = statuses.filter(function (s) { return s.cat !== "hold" && s.cat !== "canceled"; });
    var holds = statuses.filter(function (s) { return s.cat === "hold"; }).map(function (s) { return s.id; });
    var cancel = statuses.filter(function (s) { return s.cat === "canceled"; }).map(function (s) { return s.id; });
    statuses.forEach(function (s) {
      var next = [];
      if (s.cat === "hold") {
        next = work.filter(function (w) { return w.cat !== "done"; }).map(function (w) { return w.id; });
      } else if (s.cat === "canceled") {
        next = work.length ? [work[0].id] : [];
      } else {
        var i = work.findIndex(function (w) { return w.id === s.id; });
        if (work[i + 1]) next.push(work[i + 1].id);
        if (i > 0) next.push(work[i - 1].id);
        if (s.cat !== "done") next = next.concat(holds, cancel);
      }
      flow[s.id] = next.filter(function (x, k, a) { return x !== s.id && a.indexOf(x) === k; });
    });
    return flow;
  }
  function defaultSettings(preset) {
    var st = makeStatuses(preset || "machine"), f = {};
    OPT.forEach(function (k) { f[k] = false; });
    return {
      version: 1,
      business: { name: "", industry: preset || "machine", noun: (PRESETS[preset] || PRESETS.machine).noun, dueSoonDays: 3 },
      numbering: { prefix: "WO-", year: "YYYY", digits: 4, start: 1 },
      statuses: st,
      flow: defaultFlow(st),
      features: f,
      fields: [],
      closeRole: "manager",            // who may move a job to Done / Canceled when roles are on
      brand: { accent: "#2F6FDE", mode: "light", logo: null }
    };
  }
  function statusById(settings, id) { return (settings.statuses || []).find(function (s) { return s.id === id; }) || null; }
  function catOf(settings, id) { var s = statusById(settings, id); return s ? s.cat : "open"; }
  function firstStatus(settings) { var s = (settings.statuses || []).find(function (x) { return x.cat === "open"; }) || settings.statuses[0]; return s ? s.id : null; }
  // a compact map the security rules can read: { statusId: baseType }
  function catMap(settings) { var m = {}; (settings.statuses || []).forEach(function (s) { m[s.id] = s.cat; }); return m; }

  /* ---------------------------------------------------------------
     Work order numbers
     The counter is kept per resolved prefix ("WO-2026-"), so numbering
     starts over each year without anyone having to remember to reset it.
     (Same idea as ERPNext's naming series.) Numbers are handed out
     inside a database transaction and the order is stored under its
     number, so two people saving at once can never get the same one.
     --------------------------------------------------------------- */
  function resolvePrefix(numbering, date) {
    var n = numbering || {}, d = date || new Date(), y = n.year === "YYYY" ? String(d.getFullYear()) : n.year === "YY" ? String(d.getFullYear()).slice(2) : "";
    return String(n.prefix || "") + (y ? y + "-" : "");
  }
  function formatNumber(prefix, seq, digits) { return prefix + pad(seq, digits || 4); }
  function counterKey(prefix) { return "c_" + (String(prefix).replace(/[^A-Za-z0-9]/g, "_") || "plain"); }
  function previewNumber(numbering, date) { var p = resolvePrefix(numbering, date); return formatNumber(p, numbering.start || 1, numbering.digits); }
  // the sequence part of a number, if it uses this prefix (used to continue after imported numbers)
  function seqOf(number, prefix) {
    number = String(number || "");
    if (prefix && number.indexOf(prefix) !== 0) return null;
    var rest = number.slice(prefix.length);
    return /^\d+$/.test(rest) ? parseInt(rest, 10) : null;
  }
  // characters a database document name can't hold, and blanks
  function numberProblem(number) {
    var s = String(number == null ? "" : number).trim();
    if (!s) return "missing";
    if (s.length > 40) return "too long";
    if (/[\/\\#?\[\]]/.test(s) || s === "." || s === "..") return "can't contain / \\ # ? [ ]";
    return null;
  }
  function docId(number) { return String(number).trim(); }

  /* ---------------------------------------------------------------
     Roles: who may do what
       owner   everything, including settings, team and plan
       admin   everything except the plan
       manager create and edit orders, close and reopen, import
       staff   update status, add notes and files (no due dates or quantities)
       viewer  look only
     With "Roles and permissions" turned off, every team member works as a manager.
     --------------------------------------------------------------- */
  var ROLES = [
    ["admin", "Admin", "Everything, including settings, the team and importing."],
    ["manager", "Manager", "Create, edit and close work orders."],
    ["staff", "Shop staff", "Update status, add notes and photos. Can't change due dates, quantities or customers."],
    ["viewer", "View only", "Can look, can't change anything."]
  ];
  var STAFF_FIELDS = ["status", "holdReason", "files"];
  function effectiveRole(role, settings) {
    if (role === "owner" || role === "admin") return role;
    if (!settings.features.roles) return "manager";
    return role || "staff";
  }
  function canEdit(role) { return role === "owner" || role === "admin" || role === "manager"; }
  function canWork(role) { return canEdit(role) || role === "staff"; }
  function canAdmin(role) { return role === "owner" || role === "admin"; }
  function canEditField(role, field) { return canEdit(role) || (role === "staff" && STAFF_FIELDS.indexOf(field) >= 0); }
  function canClose(role, settings) { return canEdit(role) || (role === "staff" && settings.closeRole === "staff"); }

  // Which statuses can this person move an order to from where it is now?
  // Returns [{ id, name, cat, ok, warn }]. "warn" means allowed but outside the usual steps.
  function nextStatuses(settings, fromId, role) {
    var flow = settings.flow || {}, list = settings.statuses || [], out = [];
    list.forEach(function (s) {
      if (s.id === fromId) return;
      var inFlow = !settings.features.flow || (flow[fromId] || []).indexOf(s.id) >= 0;
      var closing = s.cat === "done" || s.cat === "canceled";
      var reopening = (catOf(settings, fromId) === "done" || catOf(settings, fromId) === "canceled");
      var ok = true, warn = null;
      if (!canWork(role)) ok = false;
      else if ((closing || reopening) && !canClose(role, settings)) { ok = false; warn = closing ? "Only managers can close jobs" : "Only managers can reopen jobs"; }
      else if (!inFlow) { if (canEdit(role)) warn = "Skips the usual steps"; else { ok = false; warn = "Not the next step"; } }
      out.push({ id: s.id, name: s.name, cat: s.cat, ok: ok, warn: warn, inFlow: inFlow });
    });
    return out;
  }

  /* ---------------------------------------------------------------
     Dates and urgency
     --------------------------------------------------------------- */
  function isClosed(order, settings) { var c = catOf(settings, order.status); return c === "done" || c === "canceled"; }
  function isOverdue(order, settings, today) { return !!order.due && !isClosed(order, settings) && order.due < (today || iso(new Date())); }
  function isDueSoon(order, settings, today) {
    if (!order.due || isClosed(order, settings)) return false;
    var t = today || iso(new Date()), d = daysBetween(t, order.due);
    return d >= 0 && d <= (settings.business.dueSoonDays || 3);
  }
  function urgency(order, settings, today) {
    if (isClosed(order, settings)) return "closed";
    if (isOverdue(order, settings, today)) return "overdue";
    if (isDueSoon(order, settings, today)) return "soon";
    return "ok";
  }

  /* ---------------------------------------------------------------
     Validation
     --------------------------------------------------------------- */
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !isNaN(parseISO(s).getTime()) && iso(parseISO(s)) === s; }
  function validate(o, settings) {
    var e = {};
    if (!String(o.customer || "").trim()) e.customer = "Enter a customer.";
    if (!o.due) e.due = "Enter a due date.";
    else if (!validDate(o.due)) e.due = "Use a real date.";
    if (o.received && !validDate(o.received)) e.received = "Use a real date.";
    if (settings.features.items) {
      var items = (o.items || []).filter(function (it) { return String(it.part || "").trim() || it.qty; });
      if (!items.length) e.items = "Add at least one part.";
      items.forEach(function (it) { if (!(+it.qty > 0)) e.items = "Each part needs a quantity above 0."; });
    } else {
      if (o.qty !== "" && o.qty != null && !(+o.qty > 0)) e.qty = "Quantity must be a number above 0.";
    }
    if (!statusById(settings, o.status)) e.status = "Choose a status.";
    if (catOf(settings, o.status) === "hold" && settings.features.reasons && !String(o.holdReason || "").trim()) e.holdReason = "Say why it's on hold.";
    (settings.features.fields ? settings.fields || [] : []).forEach(function (f) {
      var v = (o.custom || {})[f.id];
      if (f.required && (v == null || String(v).trim() === "")) e["custom." + f.id] = "Required.";
      else if (v != null && v !== "" && f.type === "number" && isNaN(+v)) e["custom." + f.id] = "Enter a number.";
      else if (v != null && v !== "" && f.type === "date" && !validDate(v)) e["custom." + f.id] = "Use a real date.";
    });
    return e;
  }
  // Summaries kept on the order so lists and search stay fast when there are several parts.
  function summarizeItems(o) {
    var items = (o.items || []).filter(function (it) { return String(it.part || "").trim() || it.qty; });
    if (!items.length) return o;
    o.part = items[0].part + (items.length > 1 ? " +" + (items.length - 1) + " more" : "");
    o.rev = items.length === 1 ? items[0].rev || "" : "";
    o.qty = items.reduce(function (s, it) { return s + (+it.qty || 0); }, 0);
    return o;
  }

  /* ---------------------------------------------------------------
     Change history: what changed, from what, to what
     --------------------------------------------------------------- */
  var TRACKED = ["customer", "po", "part", "rev", "qty", "title", "received", "due", "assignee", "priority", "status", "holdReason", "notes", "items", "custom", "files"];
  function diff(a, b) {
    var out = [];
    TRACKED.forEach(function (k) {
      if (k === "custom") {
        var ca = (a && a.custom) || {}, cb = (b && b.custom) || {};
        Object.keys(Object.assign({}, ca, cb)).forEach(function (id) { if (!same(ca[id], cb[id])) out.push(["custom." + id, ca[id] == null ? null : ca[id], cb[id] == null ? null : cb[id]]); });
        return;
      }
      var va = a ? a[k] : undefined, vb = b ? b[k] : undefined;
      if ((va == null || va === "") && (vb == null || vb === "")) return;
      if (!same(va, vb)) out.push([k, va == null ? null : va, vb == null ? null : vb]);
    });
    return out;
  }
  // Three-way merge for two people editing the same order: apply my changes on top of
  // theirs unless we both changed the same field to different values.
  function merge(base, mine, theirs) {
    var mineCh = diff(base, mine), theirCh = {}, conflicts = [], result = clone(theirs);
    diff(base, theirs).forEach(function (c) { theirCh[c[0]] = c[2]; });
    mineCh.forEach(function (c) {
      var k = c[0];
      if (k in theirCh && !same(theirCh[k], c[2])) { conflicts.push({ field: k, mine: c[2], theirs: theirCh[k] }); return; }
      if (k.indexOf("custom.") === 0) { result.custom = result.custom || {}; result.custom[k.slice(7)] = c[2]; }
      else result[k] = c[2];
    });
    return { result: result, conflicts: conflicts, changes: mineCh };
  }

  /* ---------------------------------------------------------------
     CSV: read and write (handles quotes, commas in cells, line breaks)
     --------------------------------------------------------------- */
  function detectDelimiter(text) {
    var line = String(text).split(/\r?\n/).find(function (l) { return l.trim(); }) || "";
    var counts = { ",": 0, ";": 0, "\t": 0 }, q = false;
    for (var i = 0; i < line.length; i++) { var c = line[i]; if (c === '"') q = !q; else if (!q && c in counts) counts[c]++; }
    return counts["\t"] > counts[","] && counts["\t"] >= counts[";"] ? "\t" : counts[";"] > counts[","] ? ";" : ",";
  }
  function parseCSV(text, delim) {
    text = String(text || "").replace(/^﻿/, "");
    var d = delim || detectDelimiter(text), rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"' && cell === "") q = true;
      else if (c === d) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ""; }); });
  }
  function csvCell(v) { v = v == null ? "" : String(v); if (/^[=+\-@\t]/.test(v) && isNaN(+v)) v = "'" + v; return /[",\n\r]/.test(v) || /^\s|\s$/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCSV(rows) { return rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n"); }

  // The header row is the first row that looks like labels (mostly text, mostly filled).
  function findHeaderRow(rows) {
    for (var i = 0; i < Math.min(rows.length, 10); i++) {
      var r = rows[i], filled = r.filter(function (x) { return String(x).trim(); }), texty = filled.filter(function (x) { return isNaN(+x) && !looksLikeDate(x); });
      if (filled.length >= 2 && texty.length >= Math.max(2, filled.length * 0.6)) return i;
    }
    return 0;
  }

  /* ---------------------------------------------------------------
     Guessing which spreadsheet column is which field
     --------------------------------------------------------------- */
  var SYN = {
    number: ["wo", "wo #", "wo#", "wo no", "work order", "work order #", "work order number", "job", "job #", "job no", "job number", "order #", "order no", "order number", "ticket", "ro", "ro #", "repair order", "traveler"],
    customer: ["customer", "cust", "client", "company", "customer name", "account", "sold to", "bill to"],
    po: ["po", "po #", "po number", "purchase order", "cust po", "customer po", "p o"],
    part: ["part", "part #", "part number", "part no", "p n", "pn", "item", "item #", "item number", "drawing", "dwg", "sku", "product"],
    rev: ["rev", "revision", "rev level", "dwg rev"],
    qty: ["qty", "quantity", "qty ordered", "order qty", "pcs", "pieces", "count", "amount"],
    title: ["description", "desc", "job description", "work description", "title", "summary", "part description", "work"],
    received: ["received", "date received", "rec d", "recd", "date in", "in date", "order date", "date ordered", "entered", "created", "start date", "date"],
    due: ["due", "due date", "date due", "ship date", "promise", "promise date", "promised", "need by", "required", "deadline", "delivery", "delivery date", "ship by"],
    assignee: ["assigned", "assigned to", "assignee", "operator", "machinist", "tech", "technician", "who", "owner", "employee", "dept", "department", "machine", "cell", "work center"],
    priority: ["priority", "pri", "urgency", "rush", "hot"],
    status: ["status", "stat", "stage", "state", "step", "progress", "phase"],
    notes: ["notes", "note", "comments", "comment", "remarks", "instructions", "special instructions", "memo"]
  };
  function guessField(header) {
    var h = norm(header).replace(/\s+/g, " ");
    if (!h) return null;
    var best = null, bestScore = 0;
    Object.keys(SYN).forEach(function (k) {
      SYN[k].forEach(function (w) {
        var nw = norm(w), score = h === nw ? 3 : (h.indexOf(nw) === 0 || (" " + h + " ").indexOf(" " + nw + " ") >= 0) && nw.length >= 2 ? 2 + nw.length / 100 : 0;
        if (score > bestScore) { bestScore = score; best = k; }
      });
    });
    return best;
  }
  function guessMapping(headers) {
    var used = {}, map = headers.map(function (h) { var g = guessField(h); return g; });
    // a field can only come from one column: keep the closest match, the rest become extra fields
    map = map.map(function (g, i) {
      if (!g) return null;
      if (used[g] != null) return null;
      used[g] = i; return g;
    });
    return map.map(function (g) { return g || "custom"; });
  }

  /* ---------------------------------------------------------------
     Cleaning values from a spreadsheet
     --------------------------------------------------------------- */
  var MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  function looksLikeDate(v) { return parseDate(v, 2026).value != null; }
  // Returns { value: "YYYY-MM-DD" | null, guessedYear: bool }
  function parseDate(v, defaultYear) {
    if (v == null) return { value: null };
    if (v instanceof Date && !isNaN(v)) return { value: iso(v) };
    var s = String(v).trim(), m, y, mo, d;
    if (!s) return { value: null };
    // Excel serial number (days since 1899-12-30)
    if (/^\d{5}(\.\d+)?$/.test(s)) { var n = parseFloat(s); if (n > 20000 && n < 80000) { var base = new Date(1899, 11, 30); return { value: iso(addDays(base, Math.floor(n))) }; } }
    if ((m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/.exec(s))) { mo = +m[1]; d = +m[2]; y = +m[3]; if (y < 100) y += 2000; if (mo > 12 && d <= 12) { var t = mo; mo = d; d = t; } }
    else if ((m = /^(\d{1,2})[-\/.](\d{1,2})$/.exec(s))) { mo = +m[1]; d = +m[2]; y = defaultYear; return finish(true); }
    else if ((m = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?$/i.exec(s))) { mo = MON.indexOf(m[1].toLowerCase()) + 1; d = +m[2]; y = m[3] ? +m[3] : defaultYear; return finish(!m[3]); }
    else if ((m = /^(\d{1,2})[-\s]([a-z]{3})[a-z]*[-\s,]*(\d{2,4})?$/i.exec(s))) { d = +m[1]; mo = MON.indexOf(m[2].toLowerCase()) + 1; y = m[3] ? +m[3] : defaultYear; if (y < 100) y += 2000; return finish(!m[3]); }
    else return { value: null };
    return finish(false);
    function finish(guessed) {
      if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y > 1900 && y < 2200)) return { value: null };
      var dt = new Date(y, mo - 1, d);
      if (dt.getMonth() !== mo - 1) return { value: null };
      return { value: iso(dt), guessedYear: !!guessed };
    }
  }
  function parseQty(v) {
    if (v == null || String(v).trim() === "") return { value: null };
    var s = String(v).replace(/,/g, "").replace(/\s*(pcs|pc|ea|each|units?)\.?$/i, "").trim();
    if (!/^-?\d+(\.\d+)?$/.test(s)) return { value: null, bad: true };
    var n = parseFloat(s);
    if (!(n > 0)) return { value: null, bad: true };
    return { value: n };
  }
  function parsePriority(v) {
    var s = norm(v);
    if (!s) return "normal";
    if (/\b(not|no|non)\b/.test(s)) return "normal";
    if (/\b(rush|hot|asap|urgent|emergency|emerg|1|top)\b/.test(s)) return "rush";
    if (/\b(high|hi|2|important)\b/.test(s)) return "high";
    return "normal";
  }

  // Similarity between two names, 0..1 (used to catch "ABC Mfg" vs "ABC Manufacturing")
  var ABBR = { mfg: "manufacturing", mfr: "manufacturing", co: "company", corp: "corporation", inc: "", llc: "", ltd: "", the: "", intl: "international", eng: "engineering", svc: "service", svcs: "services", ind: "industries", prec: "precision", mach: "machine", fab: "fabrication" };
  function nameKey(s) { return norm(s).split(" ").map(function (w) { return ABBR[w] != null ? ABBR[w] : w; }).filter(Boolean).join(" "); }
  function lev(a, b) {
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    var prev = [], cur = [], i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) { cur = [i]; for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[b.length];
  }
  function similarity(a, b) {
    var x = nameKey(a), y = nameKey(b);
    if (!x || !y) return 0;
    if (x === y) return 1;
    if (x.indexOf(y) === 0 || y.indexOf(x) === 0) return 0.9;
    return 1 - lev(x, y) / Math.max(x.length, y.length);
  }
  // For each new name, the closest existing (or other new) name if it's suspiciously close
  function nearNames(names, known) {
    var out = {}, pool = known.slice();
    names.forEach(function (n) {
      var best = null, bs = 0;
      pool.forEach(function (k) { if (k === n) return; var s = similarity(n, k); if (s > bs) { bs = s; best = k; } });
      if (best && bs >= 0.82) out[n] = { to: best, score: bs };
      pool.push(n);
    });
    return out;
  }

  // Match a spreadsheet status word to one of the shop's statuses.
  function matchStatus(value, settings) {
    var v = norm(value);
    if (!v) return String(value == null ? "" : value).trim() ? { id: null, how: "unknown" } : { id: firstStatus(settings), how: "blank" };
    var list = settings.statuses || [];
    var exact = list.find(function (s) { return norm(s.name) === v; });
    if (exact) return { id: exact.id, how: "exact" };
    var starts = list.find(function (s) { var n = norm(s.name); return n.indexOf(v) === 0 || v.indexOf(n) === 0; });
    if (starts && v.length >= 3) return { id: starts.id, how: "close" };
    var close = null, cs = 0;
    list.forEach(function (s) { var sc = 1 - lev(norm(s.name), v) / Math.max(norm(s.name).length, v.length); if (sc > cs) { cs = sc; close = s; } });
    if (close && cs >= 0.72) return { id: close.id, how: "close" };
    // fall back to the base type the word suggests, then that type's first status
    var cat = null;
    CAT_ORDER.forEach(function (c) { if (!cat && CAT_WORDS[c].some(function (w) { return v === w || (" " + v + " ").indexOf(" " + w + " ") >= 0; })) cat = c; });
    if (cat) { var first = list.find(function (s) { return s.cat === cat; }); if (first) return { id: first.id, how: "type" }; }
    return { id: null, how: "unknown" };
  }

  /* ---------------------------------------------------------------
     Import plan
       input:  rows (array of arrays), header row index, mapping per column,
               decisions about values, the shop's settings and existing orders
       output: one entry per row with the cleaned order, its problems and what
               will happen to it, plus totals for the reconciliation report
     --------------------------------------------------------------- */
  function distinctValues(rows, col) {
    var seen = {}, out = [];
    rows.forEach(function (r) { var v = String(r[col] == null ? "" : r[col]).trim(); if (!(v in seen)) { seen[v] = 0; out.push(v); } seen[v]++; });
    return out.map(function (v) { return { value: v, count: seen[v] }; });
  }
  function planImport(opts) {
    var rows = opts.rows, headers = opts.headers, map = opts.mapping, settings = opts.settings, existing = opts.existing || {};
    var dec = opts.decisions || {}, statusMap = dec.status || {}, personMap = dec.people || {}, customerMap = dec.customers || {};
    var onExisting = dec.onExisting || "skip", year = opts.year || new Date().getFullYear(), today = opts.today || iso(new Date());
    var col = {}; map.forEach(function (f, i) { if (f && f !== "custom" && f !== "ignore") col[f] = i; });
    var customCols = [], fieldCols = []; map.forEach(function (f, i) { if (f === "custom") customCols.push(i); else if (f && f.indexOf("f:") === 0) fieldCols.push([i, f.slice(2)]); });
    var seenNumbers = {}, out = [], totals = { rows: rows.length, create: 0, update: 0, skip: 0, warnings: 0, errors: 0, byStatus: {} };
    rows.forEach(function (r, idx) {
      var get = function (f) { return col[f] != null ? String(r[col[f]] == null ? "" : r[col[f]]).trim() : ""; };
      var issues = [], o = { custom: {} }, line = (opts.firstLine || 2) + idx;
      // number
      var num = get("number");
      if (num) {
        var np = numberProblem(num);
        if (np) { issues.push({ level: "error", field: "number", msg: "Work order # " + np + "." }); }
        o.number = num;
      }
      o.customer = get("customer"); if (customerMap[o.customer] != null) o.customer = customerMap[o.customer];
      o.po = get("po"); o.part = get("part"); o.rev = get("rev"); o.title = get("title"); o.notes = get("notes");
      var q = parseQty(get("qty"));
      if (q.bad) issues.push({ level: "warn", field: "qty", msg: "Quantity \"" + get("qty") + "\" isn't a number above 0, left blank." });
      o.qty = q.value == null ? "" : q.value;
      var rd = parseDate(get("received"), year);
      if (get("received") && rd.value == null) issues.push({ level: "warn", field: "received", msg: "Couldn't read received date \"" + get("received") + "\", left blank." });
      o.received = rd.value || "";
      var dd = parseDate(get("due"), year);
      if (!get("due")) issues.push({ level: "error", field: "due", msg: "No due date." });
      else if (dd.value == null) issues.push({ level: "error", field: "due", msg: "Couldn't read due date \"" + get("due") + "\"." });
      else if (dd.guessedYear) issues.push({ level: "warn", field: "due", msg: "Due date had no year; used " + dd.value.slice(0, 4) + "." });
      o.due = dd.value || "";
      if (o.received && o.due && o.due < o.received) issues.push({ level: "warn", field: "due", msg: "Due date is before the received date." });
      if (!o.customer) issues.push({ level: "error", field: "customer", msg: "No customer." });
      // status
      var sv = get("status"), sid = statusMap[sv] !== undefined ? statusMap[sv] : matchStatus(sv, settings).id;
      if (!sid) issues.push({ level: "error", field: "status", msg: "Status \"" + sv + "\" isn't matched to one of yours." });
      o.status = sid || firstStatus(settings); o._noStatus = !sv;
      if (sv && catOf(settings, o.status) === "hold") o.holdReason = sv !== (statusById(settings, o.status) || {}).name ? sv : "";
      // person
      var pv = get("assignee"); o.assignee = pv ? (personMap[pv] !== undefined ? personMap[pv] : null) : null;
      if (pv && !o.assignee && personMap[pv] === undefined) issues.push({ level: "warn", field: "assignee", msg: "\"" + pv + "\" isn't on your team, left unassigned." });
      o.priority = col.priority != null ? parsePriority(get("priority")) : "normal"; o._noPriority = !(col.priority != null && get("priority"));
      customCols.forEach(function (i) { var v = String(r[i] == null ? "" : r[i]).trim(); if (v) o.custom["x_" + i] = v; });
      fieldCols.forEach(function (fc) { var v = String(r[fc[0]] == null ? "" : r[fc[0]]).trim(); if (v) o.custom[fc[1]] = v; });
      if (settings.features.items && (o.part || o.qty)) o.items = [{ part: o.part, rev: o.rev, qty: o.qty || "" }];
      // duplicates in the file and against what's already in the app
      var action = "create";
      if (o.number) {
        var key = docId(o.number).toLowerCase();
        if (seenNumbers[key] != null) { issues.push({ level: "error", field: "number", msg: "Same work order # as row " + seenNumbers[key] + " in this file." }); }
        else seenNumbers[key] = line;
        if (existing[docId(o.number)]) {
          if (onExisting === "update") action = "update";
          else { action = "skip"; issues.push({ level: "info", field: "number", msg: o.number + " is already in the app, skipped." }); }
        }
      }
      var hasError = issues.some(function (x) { return x.level === "error"; });
      if (hasError) action = "skip";
      if (action === "create") totals.create++; else if (action === "update") totals.update++; else totals.skip++;
      if (hasError) totals.errors++; else if (issues.some(function (x) { return x.level === "warn"; })) totals.warnings++;
      if (action !== "skip") { var sn = (statusById(settings, o.status) || {}).name || "?"; totals.byStatus[sn] = (totals.byStatus[sn] || 0) + 1; }
      out.push({ line: line, order: o, issues: issues, action: action, overdue: action !== "skip" && isOverdue(o, settings, today) });
    });
    totals.overdue = out.filter(function (x) { return x.overdue; }).length;
    return { rows: out, totals: totals, customLabels: customCols.map(function (i) { return { id: "x_" + i, label: String(headers[i] || "Column " + (i + 1)).trim() || "Column " + (i + 1) }; }) };
  }
  // After import, numbering continues above the highest imported number that uses the current prefix.
  function nextSeqAfter(numbers, prefix, current) {
    var max = current || 0;
    numbers.forEach(function (n) { var s = seqOf(n, prefix); if (s != null && s >= max) max = s; });
    return max;
  }

  /* ---------------------------------------------------------------
     Sample shop (fictional) for demos and trying things out
     --------------------------------------------------------------- */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function sampleShop(today) {
    var R = rng(20261009), pick = function (a) { return a[Math.floor(R() * a.length)]; };
    var t = today ? parseISO(today) : new Date(), settings = defaultSettings("machine");
    settings.business.name = "Ridgeline Precision (sample)";
    OPT.forEach(function (k) { settings.features[k] = true; });
    settings.fields = [{ id: "f_mat", label: "Material", type: "text" }, { id: "f_heat", label: "Heat lot", type: "text" }, { id: "f_mach", label: "Machine", type: "select", options: ["Haas VF-2", "Haas ST-20", "Okuma LB3000", "Manual mill", "Saw"] }];
    var people = [["Dana Whitfield", "manager", "Office"], ["Marcus Reyes", "staff", "CNC mill"], ["Priya Natarajan", "staff", "CNC lathe"], ["Tom Kowalski", "staff", "CNC mill"], ["Jess Albright", "staff", "Inspection"], ["Luis Ortega", "staff", "Shipping"], ["Kim Haugen", "viewer", "Front desk"]]
      .map(function (p, i) { return { id: "p" + (i + 1), name: p[0], role: p[1], dept: p[2] }; });
    var customers = [["Northline Ag Equipment", "Brett Sorensen"], ["Summit Hydraulics", "Alicia Moreno"], ["Prairie Wind Services", "Kyle Brandt"], ["Cedar Falls Robotics", "Mei Tanaka"], ["Mississippi Valley Pump", "Rob Fenner"], ["Iron Ridge Trailer", "Sam Okafor"], ["Hawkeye Medical Devices", "Laura Pierce"], ["Driftless Brewing Co.", "Ned Albers"]]
      .map(function (c, i) { return { id: "c" + (i + 1), name: c[0], contact: c[1] }; });
    var parts = [["BRK-204", "Mounting bracket", "6061-T6"], ["PLT-081", "Adapter plate", "A36"], ["PIN-332", "Hinge pin", "4140 HT"], ["BSH-115", "Bronze bushing", "C932"], ["SHF-520", "Drive shaft", "1045"], ["HUB-077", "Wheel hub", "Ductile iron"], ["MAN-410", "Hydraulic manifold", "6061-T6"], ["SPC-019", "Spacer", "304 SS"], ["CLV-226", "Clevis", "1018"], ["FLG-300", "Flange", "316 SS"], ["GBX-640", "Gearbox cover", "Cast aluminum"], ["NZL-012", "Nozzle", "303 SS"]];
    var st = {}; settings.statuses.forEach(function (s) { st[s.name] = s.id; });
    var orders = [], events = [], start = addDays(t, -120), seq = 0, year = t.getFullYear();
    var prefix = resolvePrefix(settings.numbering, t);
    for (var i = 0; i < 160; i++) {
      var rec = addDays(start, Math.floor(i * 0.78) + Math.floor(R() * 2));
      if (rec > t) rec = t;
      var lead = 10 + Math.floor(R() * 25), due = addDays(rec, lead), age = (t - rec) / 864e5, p = pick(parts), c = pick(customers);
      var status, r = R();
      if (age > lead + 6) status = r < 0.94 ? "Shipped" : "Canceled";
      else if (age > lead * 0.7) status = r < 0.45 ? "Shipped" : r < 0.65 ? "Ready to ship" : r < 0.85 ? "Inspection" : "In production";
      else if (age > 4) status = r < 0.55 ? "In production" : r < 0.75 ? "Waiting on material" : r < 0.9 ? "Open" : "Inspection";
      else status = r < 0.8 ? "Open" : "Waiting on material";
      seq++;
      var qty = pick([5, 10, 12, 20, 25, 40, 50, 75, 100, 125, 200, 250, 500]);
      var assignee = status === "Open" && R() < 0.5 ? null : pick(people.slice(1, 6)).id;
      var o = {
        number: formatNumber(prefix, seq, 4),
        customer: c.name, customerId: c.id, po: "PO-" + (4100 + Math.floor(R() * 900)), part: p[0], rev: pick(["A", "A", "B", "C"]), qty: qty, title: p[1],
        received: iso(rec), due: iso(due), assignee: assignee, priority: R() < 0.08 ? "rush" : R() < 0.2 ? "high" : "normal",
        status: st[status], holdReason: status === "Waiting on material" ? pick(["Bar stock on backorder from supplier", "Waiting on customer-supplied castings", "Heat-treat vendor running behind"]) : "",
        notes: R() < 0.3 ? pick(["Deburr all edges. Break sharp corners .010 max.", "Customer requires first article inspection report.", "Anodize clear Type II after machining.", "Use customer-supplied material only.", "Pack in VCI bags, 10 per bag."]) : "",
        items: null,
        custom: { f_mat: p[2], f_heat: R() < 0.6 ? "H" + (20000 + Math.floor(R() * 9999)) : "", f_mach: pick(["Haas VF-2", "Haas ST-20", "Okuma LB3000", "Manual mill", "Saw"]) },
        files: [], createdAt: rec.getTime() + 8 * 36e5, createdBy: "p1", createdByName: "Dana Whitfield", ver: 1, source: "sample"
      };
      if (status === "Shipped" || status === "Canceled") { o.closedAt = Math.min(t.getTime() - 36e5, rec.getTime() + 864e5 * (lead - 2 + Math.floor(R() * 5))); o.closedBy = assignee || "p6"; }
      o.items = [{ part: p[0], rev: o.rev, qty: qty }];
      if (R() < 0.15) { o.items.push({ part: pick(parts)[0], rev: "A", qty: Math.max(1, Math.round(qty / 2)) }); summarizeItems(o); }
      orders.push(o);
      events.push({ id: "e" + i + "a", order: o.number, type: "created", by: "p1", byName: "Dana Whitfield", at: o.createdAt, changes: [] });
      if (status !== "Open") events.push({ id: "e" + i + "b", order: o.number, type: "status", by: assignee || "p2", byName: (people.find(function (x) { return x.id === (assignee || "p2"); }) || {}).name, at: o.createdAt + 864e5 * Math.min(age, 3), changes: [["status", st.Open, st[status]]] });
    }
    // a few overdue and a due-date change with a reason, to show the history and alerts
    var late = orders.filter(function (o) { return catOf(settings, o.status) !== "done" && catOf(settings, o.status) !== "canceled"; }).slice(0, 4);
    late.forEach(function (o, k) { var old = o.due; o.due = iso(addDays(t, -1 - k * 2)); if (k === 0) events.push({ id: "eL" + k, order: o.number, type: "changed", by: "p1", byName: "Dana Whitfield", at: t.getTime() - 3 * 864e5, changes: [["due", old, o.due]], reason: "Customer pulled the date in for an earlier ship." }); });
    var counters = {}; counters[counterKey(prefix)] = orders.filter(function (o) { return seqOf(o.number, prefix) != null; }).reduce(function (m, o) { return Math.max(m, seqOf(o.number, prefix)); }, 0);
    return { settings: settings, people: people, customers: customers, orders: orders, events: events, counters: counters };
  }

  var api = {
    CATS: CATS, CAT_ORDER: CAT_ORDER, PRESETS: PRESETS, FEATURES: FEATURES, OPT: OPT, PRIORITIES: PRIORITIES, FIELDS: FIELDS, FIELD_LABEL: FIELD_LABEL, ROLES: ROLES, SYN: SYN,
    pad: pad, uid: uid, clone: clone, iso: iso, parseISO: parseISO, addDays: addDays, daysBetween: daysBetween, norm: norm, same: same,
    defaultSettings: defaultSettings, makeStatuses: makeStatuses, defaultFlow: defaultFlow, statusById: statusById, catOf: catOf, firstStatus: firstStatus, catMap: catMap,
    resolvePrefix: resolvePrefix, formatNumber: formatNumber, counterKey: counterKey, previewNumber: previewNumber, seqOf: seqOf, numberProblem: numberProblem, docId: docId, nextSeqAfter: nextSeqAfter,
    effectiveRole: effectiveRole, canEdit: canEdit, canWork: canWork, canAdmin: canAdmin, canEditField: canEditField, canClose: canClose, nextStatuses: nextStatuses, STAFF_FIELDS: STAFF_FIELDS,
    isClosed: isClosed, isOverdue: isOverdue, isDueSoon: isDueSoon, urgency: urgency,
    validDate: validDate, validate: validate, summarizeItems: summarizeItems, diff: diff, merge: merge, TRACKED: TRACKED,
    parseCSV: parseCSV, toCSV: toCSV, detectDelimiter: detectDelimiter, findHeaderRow: findHeaderRow,
    guessField: guessField, guessMapping: guessMapping, parseDate: parseDate, parseQty: parseQty, parsePriority: parsePriority,
    similarity: similarity, nearNames: nearNames, matchStatus: matchStatus, distinctValues: distinctValues, planImport: planImport,
    sampleShop: sampleShop
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.WOCore = api;
})(typeof window !== "undefined" ? window : globalThis);
