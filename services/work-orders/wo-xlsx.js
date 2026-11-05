/* =====================================================================
   Reads Excel (.xlsx / .xlsm) files in the browser, with no outside library.

   An .xlsx file is a zip of XML files. This unzips the parts it needs with
   the browser's built-in DecompressionStream, then reads the sheets.
   Cells formatted as dates come back as YYYY-MM-DD.

   WOXlsx.read(arrayBuffer) -> Promise<[{ name, rows: [[cell, ...], ...] }]>
   ===================================================================== */
(function () {
  "use strict";
  function u16(v, o) { return v.getUint16(o, true); }
  function u32(v, o) { return v.getUint32(o, true); }

  function unzip(buf) {
    var v = new DataView(buf), n = buf.byteLength, eocd = -1;
    for (var i = n - 22; i >= Math.max(0, n - 65558); i--) { if (u32(v, i) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw new Error("not a zip");
    var count = u16(v, eocd + 10), off = u32(v, eocd + 16), files = {};
    var dec = new TextDecoder();
    for (var k = 0; k < count; k++) {
      if (u32(v, off) !== 0x02014b50) throw new Error("bad zip directory");
      var method = u16(v, off + 10), csize = u32(v, off + 20), nlen = u16(v, off + 28), xlen = u16(v, off + 30), clen = u16(v, off + 32), loc = u32(v, off + 42);
      var name = dec.decode(new Uint8Array(buf, off + 46, nlen));
      files[name] = { method: method, csize: csize, loc: loc };
      off += 46 + nlen + xlen + clen;
    }
    return {
      has: function (name) { return !!files[name]; },
      text: function (name) {
        var f = files[name]; if (!f) return Promise.resolve(null);
        var lnl = u16(v, f.loc + 26), lxl = u16(v, f.loc + 28), start = f.loc + 30 + lnl + lxl;
        var data = new Uint8Array(buf, start, f.csize);
        if (f.method === 0) return Promise.resolve(dec.decode(data));
        if (f.method !== 8) return Promise.reject(new Error("unsupported compression"));
        if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("This browser can't read .xlsx files. Save the sheet as .csv instead."));
        var stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Response(stream).arrayBuffer().then(function (ab) { return dec.decode(ab); });
      }
    };
  }
  function xml(s) { return new DOMParser().parseFromString(s, "application/xml"); }
  function tags(node, name) { return node ? Array.prototype.slice.call(node.getElementsByTagNameNS("*", name)) : []; }
  function textOf(node) { return tags(node, "t").map(function (t) { return t.textContent; }).join(""); }
  function colIndex(ref) { var m = /^([A-Z]+)/.exec(ref || ""), n = 0; if (!m) return -1; for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64); return n - 1; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function serialToISO(x) {
    var d = new Date(Date.UTC(1899, 11, 30) + Math.round(x * 864e5));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  var DATE_IDS = { 14: 1, 15: 1, 16: 1, 17: 1, 18: 0, 19: 0, 20: 0, 21: 0, 22: 1, 27: 1, 30: 1, 36: 1, 45: 0, 46: 0, 47: 0, 50: 1, 57: 1 };

  function read(buf) {
    var z;
    try { z = unzip(buf); } catch (e) { return Promise.reject(new Error("That file isn't a readable .xlsx file. Try saving it as .csv.")); }
    var wbPath = "xl/workbook.xml";
    return Promise.all([z.text(wbPath), z.text("xl/_rels/workbook.xml.rels"), z.text("xl/sharedStrings.xml"), z.text("xl/styles.xml")]).then(function (r) {
      if (!r[0]) throw new Error("That file isn't a readable .xlsx file. Try saving it as .csv.");
      var wb = xml(r[0]), rels = {}, strings = [], dateStyle = [];
      tags(xml(r[1] || "<x/>"), "Relationship").forEach(function (el) { rels[el.getAttribute("Id")] = el.getAttribute("Target"); });
      if (r[2]) tags(xml(r[2]), "si").forEach(function (si) { strings.push(textOf(si)); });
      if (r[3]) {
        var st = xml(r[3]), custom = {};
        tags(st, "numFmt").forEach(function (f) { var code = (f.getAttribute("formatCode") || "").replace(/"[^"]*"|\[[^\]]*\]/g, ""); custom[f.getAttribute("numFmtId")] = /[dy]/i.test(code) && !/^[#0.,%\s]*$/.test(code); });
        var xfs = tags(st, "cellXfs")[0];
        tags(xfs, "xf").forEach(function (xf) { var id = xf.getAttribute("numFmtId"); dateStyle.push(DATE_IDS[id] === 1 || custom[id] === true); });
      }
      var sheets = tags(wb, "sheet").map(function (s) {
        var rid = s.getAttribute("r:id") || s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
        var target = rels[rid] || "";
        var path = target.charAt(0) === "/" ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
        return { name: s.getAttribute("name"), path: path, state: s.getAttribute("state") };
      }).filter(function (s) { return s.state !== "hidden" && s.state !== "veryHidden"; });
      return Promise.all(sheets.map(function (s) { return z.text(s.path); })).then(function (texts) {
        return sheets.map(function (s, i) {
          var rows = [];
          if (texts[i]) tags(xml(texts[i]), "row").forEach(function (row) {
            var rIdx = (+row.getAttribute("r") || rows.length + 1) - 1, out = [];
            tags(row, "c").forEach(function (c, k) {
              var ci = colIndex(c.getAttribute("r")); if (ci < 0) ci = k;
              var t = c.getAttribute("t"), vEl = tags(c, "v")[0], v = vEl ? vEl.textContent : "", val;
              if (t === "s") val = strings[+v] || "";
              else if (t === "inlineStr") val = textOf(tags(c, "is")[0]);
              else if (t === "b") val = v === "1" ? "TRUE" : "FALSE";
              else if (t === "str" || t === "e") val = v;
              else if (v !== "" && dateStyle[+c.getAttribute("s") || 0] && !isNaN(+v)) val = serialToISO(+v);
              else val = v;
              out[ci] = val;
            });
            for (var j = 0; j < out.length; j++) if (out[j] == null) out[j] = "";
            rows[rIdx] = out;
          });
          for (var q = 0; q < rows.length; q++) if (!rows[q]) rows[q] = [];
          return { name: s.name, rows: rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ""; }); }) };
        });
      });
    });
  }
  window.WOXlsx = { read: read };
})();
