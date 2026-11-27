/* SCARHUB Data Lab: a spreadsheet, a dashboard builder and a SQL box that run in the page, on invented data. Nothing is sent anywhere. */
(function () {
  "use strict";
  var D = window.SCAR_DL; if (!D) return;
  var $ = function (id) { return document.getElementById(id); };
  function ar() { return (localStorage.l || "en") === "ar"; }
  function T(a, b) { return ar() ? b : a; }
  function h(tag, at) {
    var e = document.createElement(tag); at = at || {};
    for (var k in at) { var v = at[k]; if (k === "text") e.textContent = v; else if (k === "class") e.className = v; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v); else if (v != null && v !== false) e.setAttribute(k, v); }
    (function add(list) { for (var i = 0; i < list.length; i++) { var c = list[i]; if (c == null || c === false) continue; if (Array.isArray(c)) add(c); else e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); } })([].slice.call(arguments, 2));
    return e;
  }
  var NS = "http://www.w3.org/2000/svg";
  function sv(tag, at, kids) { var e = document.createElementNS(NS, tag); for (var k in (at || {})) e.setAttribute(k, at[k]); (kids || []).forEach(function (c) { if (c) e.appendChild(c); }); return e; }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function fmtN(x, d) { if (typeof x !== "number" || !isFinite(x)) return String(x); var r = Math.round(x * Math.pow(10, d == null ? 2 : d)) / Math.pow(10, d == null ? 2 : d); return r.toLocaleString("en-US", { maximumFractionDigits: d == null ? 2 : d }); }
  function r2(x, n) { var f = Math.pow(10, n || 0), s = x < 0 ? -1 : 1; return s * Math.round(Math.abs(x) * f + 1e-9) / f; }

  /* ---------- data ---------- */
  var CAT = {}, COST = {};
  D.products.forEach(function (p) { CAT[p[0]] = p[1]; COST[p[0]] = p[2]; });
  var FACT = D.sales.map(function (r) { return { id: r[0], date: r[1], month: r[1].slice(0, 7), region: r[2], product: r[3], category: CAT[r[3]], channel: r[4], units: r[5], price: r[6], revenue: r[5] * r[6], profit: r[5] * (r[6] - COST[r[3]]), orders: 1 }; });

  /* ---------- spreadsheet engine ---------- */
  var COLS = "ABCDEFGHIJKL".split(""), NROW = 130, raw = {}, cache = {};
  var HDR = ["ID", "Date", "Region", "Product", "Channel", "Units", "Price", "Total"];
  function resetSheet() {
    raw = {}; cache = {};
    HDR.forEach(function (x, i) { raw[COLS[i] + "1"] = x; });
    D.sales.forEach(function (r, i) { var n = i + 2; for (var c = 0; c < 7; c++) raw[COLS[c] + n] = String(r[c]); raw["H" + n] = "=F" + n + "*G" + n; });
  }
  function colNum(s) { var n = 0; for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n; }
  function colName(n) { var s = ""; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function splitRef(k) { var m = /^\$?([A-Za-z]{1,2})\$?(\d+)$/.exec(k); return m ? { c: colNum(m[1].toUpperCase()), r: +m[2] } : null; }
  function tokenize(s) {
    var t = [], i = 0, m, rest;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '"') { var j = i + 1, str = ""; while (j < s.length) { if (s[j] === '"') { if (s[j + 1] === '"') { str += '"'; j += 2; continue; } break; } str += s[j++]; } if (j >= s.length) throw "#VALUE!"; t.push({ t: "s", v: str }); i = j + 1; continue; }
      rest = s.slice(i);
      if ((m = /^(\d+(\.\d+)?|\.\d+)/.exec(rest))) { t.push({ t: "n", v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_.]*(?=\()/.exec(rest))) { t.push({ t: "f", v: m[0].toUpperCase() }); i += m[0].length; continue; }
      if ((m = /^\$?[A-Za-z]{1,2}\$?\d+(:\$?[A-Za-z]{1,2}\$?\d+)?(?![A-Za-z0-9_])/.exec(rest))) { t.push({ t: "r", v: m[0].replace(/\$/g, "").toUpperCase() }); i += m[0].length; continue; }
      if ((m = /^(TRUE|FALSE)(?![A-Za-z0-9_])/i.exec(rest))) { t.push({ t: "b", v: m[0].toUpperCase() === "TRUE" }); i += m[0].length; continue; }
      if ((m = /^(<=|>=|<>)/.exec(rest))) { t.push({ t: "o", v: m[0] }); i += 2; continue; }
      if ("+-*/^&=<>(),%".indexOf(c) >= 0) { t.push({ t: "o", v: c }); i++; continue; }
      throw "#NAME?";
    }
    return t;
  }
  function parseF(s) {
    var t = tokenize(s), p = 0;
    function pk() { return t[p]; }
    function op(v) { return t[p] && t[p].t === "o" && t[p].v === v; }
    function cmp() { var l = cat(); while (t[p] && t[p].t === "o" && ["=", "<>", "<", ">", "<=", ">="].indexOf(t[p].v) >= 0) { var o = t[p++].v; l = { k: "b", o: o, l: l, r: cat() }; } return l; }
    function cat() { var l = add(); while (op("&")) { p++; l = { k: "b", o: "&", l: l, r: add() }; } return l; }
    function add() { var l = mul(); while (op("+") || op("-")) { var o = t[p++].v; l = { k: "b", o: o, l: l, r: mul() }; } return l; }
    function mul() { var l = pw(); while (op("*") || op("/")) { var o = t[p++].v; l = { k: "b", o: o, l: l, r: pw() }; } return l; }
    function pw() { var l = un(); while (op("^")) { p++; l = { k: "b", o: "^", l: l, r: un() }; } return l; }
    function un() { if (op("-")) { p++; return { k: "u", o: "-", x: un() }; } if (op("+")) { p++; return un(); } return pf(); }
    function pf() { var x = pr(); while (op("%")) { p++; x = { k: "b", o: "/", l: x, r: { k: "n", v: 100 } }; } return x; }
    function pr() {
      var x = t[p++]; if (!x) throw "#VALUE!";
      if (x.t === "n") return { k: "n", v: x.v }; if (x.t === "s") return { k: "s", v: x.v }; if (x.t === "b") return { k: "l", v: x.v };
      if (x.t === "r") return { k: "r", v: x.v };
      if (x.t === "o" && x.v === "(") { var e = cmp(); if (!op(")")) throw "#VALUE!"; p++; return e; }
      if (x.t === "f") { p++; var args = []; if (!op(")")) { args.push(cmp()); while (op(",")) { p++; args.push(cmp()); } } if (!op(")")) throw "#VALUE!"; p++; return { k: "f", n: x.v, a: args }; }
      throw "#VALUE!";
    }
    var e = cmp(); if (p < t.length) throw "#VALUE!"; return e;
  }
  function num(v) { if (v == null || v === "") return 0; if (typeof v === "number") return v; if (typeof v === "boolean") return v ? 1 : 0; var n = Number(v); if (isNaN(n)) throw "#VALUE!"; return n; }
  function str(v) { return v == null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v); }
  function loose(a, b) { if (a == null) a = ""; if (b == null) b = ""; if (typeof a === "number" && typeof b === "number") return a === b; return str(a).toLowerCase() === str(b).toLowerCase(); }
  function compare(a, b) { if (typeof a === "number" && typeof b === "number") return a - b; var x = str(a).toLowerCase(), y = str(b).toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  function wildcard(p) { return new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i"); }
  function critFn(c) {
    if (typeof c === "number" || typeof c === "boolean") return function (v) { return loose(v, c); };
    var s = str(c), m = /^(<=|>=|<>|=|<|>)?(.*)$/.exec(s), o = m[1] || "=", rhs = m[2], n = rhs !== "" && !isNaN(Number(rhs)) ? Number(rhs) : null;
    return function (v) {
      if (n !== null) { if (typeof v !== "number") return o === "<>"; var d = v - n; return o === "=" ? d === 0 : o === "<>" ? d !== 0 : o === "<" ? d < 0 : o === ">" ? d > 0 : o === "<=" ? d <= 0 : d >= 0; }
      var sv2 = str(v);
      if (o === "=") return wildcard(rhs).test(sv2); if (o === "<>") return !wildcard(rhs).test(sv2);
      var cm = compare(sv2, rhs); return o === "<" ? cm < 0 : o === ">" ? cm > 0 : o === "<=" ? cm <= 0 : cm >= 0;
    };
  }
  function cellVal(k, stack) {
    if (k in cache) { var c = cache[k]; if (c && c.e) throw c.e; return c ? c.v : null; }
    var r = raw[k]; if (r == null || r === "") return null;
    if (r.charAt(0) !== "=") { var tr2 = r.trim(); if (tr2 !== "" && !isNaN(Number(tr2)) && /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(tr2)) return Number(tr2); if (/^(true|false)$/i.test(tr2)) return tr2.toLowerCase() === "true"; return r; }
    if (stack[k]) throw "#CIRC!";
    stack[k] = 1;
    try { var v = ev(parseF(r.slice(1)), stack); cache[k] = { v: v }; return v; }
    catch (e) { var code = typeof e === "string" ? e : "#VALUE!"; cache[k] = { e: code }; throw code; }
    finally { delete stack[k]; }
  }
  function rangeOf(ref, stack) {
    var p = ref.split(":"), a = splitRef(p[0]), b = splitRef(p[1]); if (!a || !b) throw "#REF!";
    var r1 = Math.min(a.r, b.r), r2_ = Math.max(a.r, b.r), c1 = Math.min(a.c, b.c), c2 = Math.max(a.c, b.c);
    if (r2_ > 5000 || c2 > 52) throw "#REF!";
    var rows = []; for (var r = r1; r <= r2_; r++) { var row = []; for (var c = c1; c <= c2; c++) row.push(cellVal(colName(c) + r, stack)); rows.push(row); }
    return { rng: rows };
  }
  function flat(args, onlyNum) { var o = []; args.forEach(function (a) { if (a && a.rng) a.rng.forEach(function (r) { r.forEach(function (v) { if (onlyNum ? typeof v === "number" : v != null) o.push(v); }); }); else if (onlyNum) o.push(num(a)); else if (a != null) o.push(a); }); return o; }
  function ev(n, stack) {
    switch (n.k) {
      case "n": case "s": case "l": return n.v;
      case "r": return n.v.indexOf(":") >= 0 ? rangeOf(n.v, stack) : (function () { if (!splitRef(n.v)) throw "#REF!"; return cellVal(n.v, stack); })();
      case "u": return -num(sc(ev(n.x, stack)));
      case "b": {
        var a = sc(ev(n.l, stack)), b = sc(ev(n.r, stack));
        switch (n.o) {
          case "+": return num(a) + num(b); case "-": return num(a) - num(b); case "*": return num(a) * num(b);
          case "/": { var d = num(b); if (d === 0) throw "#DIV/0!"; return num(a) / d; }
          case "^": return Math.pow(num(a), num(b)); case "&": return str(a) + str(b);
          case "=": return loose(a, b); case "<>": return !loose(a, b);
          case "<": return compare(a, b) < 0; case ">": return compare(a, b) > 0; case "<=": return compare(a, b) <= 0; case ">=": return compare(a, b) >= 0;
        }
        throw "#VALUE!";
      }
      case "f": return fn(n, stack);
    }
    throw "#VALUE!";
  }
  function sc(v) { if (v && v.rng) { if (v.rng.length === 1 && v.rng[0].length === 1) return v.rng[0][0]; throw "#VALUE!"; } return v; }
  function fn(n, stack) {
    var N = n.n, A = n.a;
    function E(i) { return ev(A[i], stack); }
    if (N === "IF") { if (A.length < 2) throw "#VALUE!"; var c = sc(E(0)); var t = typeof c === "string" ? (function () { throw "#VALUE!"; })() : !!c; return t ? sc(E(1)) : (A.length > 2 ? sc(E(2)) : false); }
    if (N === "IFERROR") { try { return sc(E(0)); } catch (e) { return sc(E(1)); } }
    var a = A.map(function (x) { return ev(x, stack); });
    function nums() { return flat(a, true); }
    function R(i) { if (!a[i] || !a[i].rng) throw "#VALUE!"; return a[i].rng; }
    function fl(i) { var o = []; R(i).forEach(function (r) { r.forEach(function (v) { o.push(v); }); }); return o; }
    switch (N) {
      case "SUM": return nums().reduce(function (x, y) { return x + y; }, 0);
      case "AVERAGE": { var x = nums(); if (!x.length) throw "#DIV/0!"; return x.reduce(function (p, q) { return p + q; }, 0) / x.length; }
      case "COUNT": return flat(a, false).filter(function (v) { return typeof v === "number"; }).length;
      case "COUNTA": return flat(a, false).length;
      case "MIN": { var m1 = nums(); return m1.length ? Math.min.apply(null, m1) : 0; }
      case "MAX": { var m2 = nums(); return m2.length ? Math.max.apply(null, m2) : 0; }
      case "MEDIAN": { var s = nums().sort(function (p, q) { return p - q; }); if (!s.length) throw "#NUM!"; var mid = s.length >> 1; return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2; }
      case "LARGE": { var l1 = nums().slice(0, -1).sort(function (p, q) { return q - p; }), k1 = num(sc(a[1])); if (k1 < 1 || k1 > l1.length) throw "#NUM!"; return l1[k1 - 1]; }
      case "SMALL": { var l2 = flat([a[0]], true).sort(function (p, q) { return p - q; }), k2 = num(sc(a[1])); if (k2 < 1 || k2 > l2.length) throw "#NUM!"; return l2[k2 - 1]; }
      case "ROUND": return r2(num(sc(a[0])), a.length > 1 ? num(sc(a[1])) : 0);
      case "ABS": return Math.abs(num(sc(a[0])));
      case "SQRT": { var q = num(sc(a[0])); if (q < 0) throw "#NUM!"; return Math.sqrt(q); }
      case "INT": return Math.floor(num(sc(a[0])));
      case "MOD": { var dd = num(sc(a[1])); if (dd === 0) throw "#DIV/0!"; var mm = num(sc(a[0])) % dd; return mm !== 0 && (mm < 0) !== (dd < 0) ? mm + dd : mm; }
      case "POWER": return Math.pow(num(sc(a[0])), num(sc(a[1])));
      case "AND": return flat(a, false).every(function (v) { return !!v; });
      case "OR": return flat(a, false).some(function (v) { return !!v; });
      case "NOT": return !sc(a[0]);
      case "ISNUMBER": return typeof sc(a[0]) === "number";
      case "COUNTIF": { var f = critFn(sc(a[1])); return fl(0).filter(f).length; }
      case "SUMIF": { var f2 = critFn(sc(a[1])), r1 = fl(0), sr = a.length > 2 ? fl(2) : r1, t2 = 0; r1.forEach(function (v, i) { if (f2(v) && typeof sr[i] === "number") t2 += sr[i]; }); return t2; }
      case "AVERAGEIF": { var f3 = critFn(sc(a[1])), r3 = fl(0), s3 = a.length > 2 ? fl(2) : r3, t3 = 0, c3 = 0; r3.forEach(function (v, i) { if (f3(v) && typeof s3[i] === "number") { t3 += s3[i]; c3++; } }); if (!c3) throw "#DIV/0!"; return t3 / c3; }
      case "COUNTIFS": case "SUMIFS": {
        var sumr = null, st = 0; if (N === "SUMIFS") { sumr = fl(0); st = 1; }
        var conds = []; for (var i = st; i + 1 < a.length; i += 2) conds.push([fl(i), critFn(sc(a[i + 1]))]);
        if (!conds.length) throw "#VALUE!"; var tot = 0, len = conds[0][0].length;
        for (var j = 0; j < len; j++) { if (conds.every(function (cd) { return cd[1](cd[0][j]); })) { if (N === "COUNTIFS") tot++; else if (typeof sumr[j] === "number") tot += sumr[j]; } }
        return tot;
      }
      case "SUMPRODUCT": { var p1 = fl(0), p2 = fl(1), sp = 0; if (p1.length !== p2.length) throw "#VALUE!"; p1.forEach(function (v, i) { sp += (typeof v === "number" ? v : 0) * (typeof p2[i] === "number" ? p2[i] : 0); }); return sp; }
      case "VLOOKUP": {
        var key = sc(a[0]), tb = R(1), ci = num(sc(a[2])), ex = a.length > 3 ? !sc(a[3]) : false; if (ci < 1 || ci > (tb[0] || []).length) throw "#REF!";
        for (var r = 0; r < tb.length; r++) if (loose(tb[r][0], key)) return tb[r][ci - 1];
        if (ex) { var best = -1; for (var r4 = 0; r4 < tb.length; r4++) if (typeof tb[r4][0] === "number" && typeof key === "number" && tb[r4][0] <= key) best = r4; if (best >= 0) return tb[best][ci - 1]; }
        throw "#N/A";
      }
      case "INDEX": { var tb2 = R(0), rr = num(sc(a[1])), cc = a.length > 2 ? num(sc(a[2])) : 1; if (tb2.length === 1 && a.length === 2) { cc = rr; rr = 1; } if (rr < 1 || rr > tb2.length || cc < 1 || cc > tb2[0].length) throw "#REF!"; return tb2[rr - 1][cc - 1]; }
      case "MATCH": { var kk = sc(a[0]), arr = fl(1); for (var q2 = 0; q2 < arr.length; q2++) if (loose(arr[q2], kk)) return q2 + 1; throw "#N/A"; }
      case "LEN": return str(sc(a[0])).length;
      case "UPPER": return str(sc(a[0])).toUpperCase(); case "LOWER": return str(sc(a[0])).toLowerCase(); case "TRIM": return str(sc(a[0])).trim().replace(/\s+/g, " ");
      case "LEFT": return str(sc(a[0])).slice(0, a.length > 1 ? num(sc(a[1])) : 1);
      case "RIGHT": { var sr2 = str(sc(a[0])), k5 = a.length > 1 ? num(sc(a[1])) : 1; return k5 ? sr2.slice(-k5) : ""; }
      case "MID": { var s6 = str(sc(a[0])), st6 = num(sc(a[1])); return s6.substr(st6 - 1, num(sc(a[2]))); }
      case "CONCAT": case "CONCATENATE": return flat(a, false).map(str).join("");
      case "MONTH": { var d1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(sc(a[0]))); if (!d1) throw "#VALUE!"; return +d1[2]; }
      case "YEAR": { var d2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(sc(a[0]))); if (!d2) throw "#VALUE!"; return +d2[1]; }
    }
    throw "#NAME?";
  }
  function evalRaw(k) { cache = {}; try { var v = cellVal(k, {}); return { v: v }; } catch (e) { return { e: typeof e === "string" ? e : "#VALUE!" }; } }
  function shiftF(f, dr) {
    return f.split('"').map(function (seg, i) { if (i % 2) return seg; return seg.replace(/(\$?)([A-Za-z]{1,2})(\$?)(\d+)(?![A-Za-z0-9_(])/g, function (m, d1, c, d2, r) { return d2 ? m : d1 + c + d2 + (+r + dr); }); }).join('"');
  }

  /* ---------- tabs and shell ---------- */
  var view = $("dlview"), tabsEl = $("dltabs"), taskEl = $("dltask"), tab = "labs", lab = null, done = {};
  try { done = JSON.parse(localStorage.getItem("scar_dl_done") || "{}") || {}; } catch (e) { done = {}; }
  var TABS = [["labs", "Labs", "المعامل"], ["sheet", "Sheet", "الجدول"], ["dash", "Dashboard", "لوحة البيانات"], ["sql", "SQL", "SQL"], ["learn", "Cheat sheet", "ملخص سريع"]];
  function go(t) { tab = t; if (location.hash.slice(1) !== t) history.replaceState(null, "", "#" + t); draw(); }
  function drawTabs() {
    clear(tabsEl);
    TABS.forEach(function (x) { tabsEl.appendChild(h("button", { type: "button", "class": "chip" + (tab === x[0] ? " on" : ""), role: "tab", "aria-selected": tab === x[0] ? "true" : "false", text: T(x[1], x[2]), onclick: function () { go(x[0]); } })); });
  }
  function draw() {
    drawTabs(); drawTask(); clear(view);
    if (tab === "labs") labsView(); else if (tab === "sheet") sheetView(); else if (tab === "dash") dashView(); else if (tab === "sql") sqlView(); else learnView();
  }

  /* ---------- labs ---------- */
  var LABS = [
    { id: "x1", lv: 1, tool: "sheet", t: ["Total sales", "إجمالي المبيعات"], q: ["What is the sum of the Total column (column H) for all 120 orders? Whole number, in EGP.", "إيه مجموع عمود Total (العمود H) لكل الـ 120 طلب؟ رقم صحيح بالجنيه."], hint: ["Use SUM on the range H2:H121.", "استخدم SUM على النطاق H2:H121."], dec: 0 },
    { id: "x2", lv: 1, tool: "sheet", t: ["Online orders", "طلبات الأونلاين"], q: ["How many orders came through the Online channel?", "كام طلب جه من قناة Online؟"], hint: ["COUNTIF counts the cells in a range that match a value. The channel is in column E.", "COUNTIF بتعد الخلايا اللي بتطابق قيمة. القناة في العمود E."], dec: 0 },
    { id: "x3", lv: 1, tool: "sheet", t: ["Average units", "متوسط الوحدات"], q: ["What is the average number of units per order? Round to 2 decimals.", "إيه متوسط عدد الوحدات في الطلب؟ قرّب لرقمين عشريين."], hint: ["AVERAGE over the Units column, then wrap it in ROUND(...,2).", "AVERAGE على عمود Units، وبعدين لفّها في ROUND(...,2)."], dec: 2 },
    { id: "x4", lv: 2, tool: "sheet", t: ["Coast revenue", "إيراد الساحل"], q: ["What is the total revenue (Total column) of the Coast region? Whole number.", "إيه إجمالي الإيراد (عمود Total) لمنطقة Coast؟ رقم صحيح."], hint: ["SUMIF(range, criteria, sum_range): check column C, add up column H.", "SUMIF(نطاق, شرط, نطاق_الجمع): افحص العمود C واجمع العمود H."], dec: 0 },
    { id: "x5", lv: 2, tool: "sheet", t: ["Best-selling product", "المنتج الأكتر مبيعا"], q: ["Which product sold the most units in total? Type its name.", "أنهي منتج باع أكتر وحدات إجمالا؟ اكتب اسمه."], hint: ["Write the product names in empty cells, then a SUMIF for each one. Compare the results.", "اكتب أسماء المنتجات في خلايا فاضية، وبعدين SUMIF لكل واحد. قارن النتايج."], dec: -1 },
    { id: "d1", lv: 1, tool: "dash", t: ["Top region", "أعلى منطقة"], q: ["Which region has the highest revenue? Type its name.", "أنهي منطقة إيرادها الأعلى؟ اكتب اسمها."], hint: ["Add a Bar visual: Category = Region, Measure = Revenue, Sum.", "ضيف Bar: التصنيف = Region والقياس = Revenue، Sum."], dec: -1 },
    { id: "d2", lv: 2, tool: "dash", t: ["March online profit", "ربح مارس أونلاين"], q: ["What is the total profit of Online orders in March 2026 (2026-03)? Whole number.", "إيه إجمالي الربح لطلبات Online في مارس 2026 (2026-03)؟ رقم صحيح."], hint: ["Add a Card for Profit (Sum). Then use the slicers: Channel = Online and Month = 2026-03.", "ضيف Card للربح (Sum). وبعدين استخدم الفلاتر: Channel = Online وMonth = 2026-03."], dec: 0 },
    { id: "d3", lv: 2, tool: "dash", t: ["Most profitable category", "الفئة الأربح"], q: ["Which category earns the most profit? Type its name.", "أنهي فئة بتكسب أكتر ربح؟ اكتب اسمها."], hint: ["Bar visual: Category = Category, Measure = Profit. Clear the slicers first.", "Bar: التصنيف = Category والقياس = Profit. امسح الفلاتر الأول."], dec: -1 },
    { id: "d4", lv: 3, tool: "dash", t: ["Cairo store electronics", "إلكترونيات متاجر القاهرة"], q: ["What is the revenue of Electronics sold in Cairo through the Store channel? Whole number.", "إيه إيراد الإلكترونيات المباعة في Cairo من قناة Store؟ رقم صحيح."], hint: ["A Revenue card plus three slicers: Category, Region and Channel.", "Card للإيراد ومعاه 3 فلاتر: Category وRegion وChannel."], dec: 0 },
    { id: "s1", lv: 1, tool: "sql", t: ["Delta orders", "طلبات الدلتا"], q: ["How many orders came from the Delta region?", "كام طلب جه من منطقة Delta؟"], hint: ["SELECT COUNT(*) FROM sales WHERE region = 'Delta'", "SELECT COUNT(*) FROM sales WHERE region = 'Delta'"], dec: 0 },
    { id: "s2", lv: 2, tool: "sql", t: ["Electronics price", "سعر الإلكترونيات"], q: ["What is the average unit price (sales.price) of sold items in the Electronics category? Round to 2 decimals.", "إيه متوسط سعر الوحدة (sales.price) للمنتجات المباعة في فئة Electronics؟ قرّب لرقمين."], hint: ["Join sales to products ON sales.product = products.name, filter the category, then AVG(price).", "اعمل JOIN بين sales وproducts ON sales.product = products.name، فلتر الفئة، وبعدين AVG(price)."], dec: 2 },
    { id: "s3", lv: 2, tool: "sql", t: ["Top product by revenue", "أعلى منتج إيرادا"], q: ["Which product has the highest total revenue (units x price)? Type its name.", "أنهي منتج إيراده الإجمالي (الوحدات x السعر) الأعلى؟ اكتب اسمه."], hint: ["GROUP BY product, SUM(units * price), then ORDER BY that sum DESC LIMIT 1.", "GROUP BY product، وSUM(units * price)، وبعدين ORDER BY المجموع ده DESC LIMIT 1."], dec: -1 },
    { id: "s4", lv: 3, tool: "sql", t: ["Best month", "أحسن شهر"], q: ["Which month has the highest revenue? Answer in the form 2026-06.", "أنهي شهر إيراده الأعلى؟ اكتب بالشكل 2026-06."], hint: ["SUBSTR(date, 1, 7) gives the month. Group by it.", "SUBSTR(date, 1, 7) بتدي الشهر. اعمل GROUP BY بيه."], dec: -1 },
    { id: "s5", lv: 3, tool: "sql", t: ["Busy products", "المنتجات النشطة"], q: ["How many products have more than 85 units sold in total?", "كام منتج مبيعاته الإجمالية أكتر من 85 وحدة؟"], hint: ["GROUP BY product with HAVING SUM(units) > 85, then count the rows returned.", "GROUP BY product مع HAVING SUM(units) > 85، وبعدين عد الصفوف الراجعة."], dec: 0 },
    { id: "s6", lv: 3, tool: "sql", t: ["First-quarter profit", "ربح الربع الأول"], q: ["What is the total profit for January to March (dates before 2026-04-01)? Profit = units x (price - cost). Whole number.", "إيه إجمالي الربح من يناير لمارس (التواريخ قبل 2026-04-01)؟ الربح = الوحدات x (السعر - التكلفة). رقم صحيح."], hint: ["Join to products for cost. SUM(units * (price - cost)) with WHERE date < '2026-04-01'.", "اعمل JOIN مع products عشان التكلفة. SUM(units * (price - cost)) مع WHERE date < '2026-04-01'."], dec: 0 }
  ];
  function canon(l, v) {
    v = String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (l.dec >= 0) { var n = Number(v.replace(/[, ]/g, "").replace(/egp$/, "")); if (v === "" || isNaN(n)) return null; return n.toFixed(l.dec); }
    return v;
  }
  function sha(s) { var b = new TextEncoder().encode(s); return crypto.subtle.digest("SHA-256", b).then(function (d) { return Array.prototype.map.call(new Uint8Array(d), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }); }
  function saveDone() { try { localStorage.setItem("scar_dl_done", JSON.stringify(done)); } catch (e) {} }
  function labsView() {
    var n = Object.keys(done).length;
    view.appendChild(h("p", { "class": "dlnote", text: T("Practice labs on made-up data from an invented shop. Pick one, open the tool, find the answer and type it in the bar at the top. Answers are checked in your browser and your progress stays on this device. These labs give no points.", "معامل تدريب على بيانات مخترعة لمحل وهمي. اختار واحد وافتح الأداة وادور على الإجابة واكتبها في الشريط اللي فوق. الإجابات بتتفحص في متصفحك والتقدم بيفضل على جهازك. المعامل دي مفيهاش نقاط.") }));
    view.appendChild(h("p", { "class": "dlprog", text: T(n + " of " + LABS.length + " labs done", n + " من " + LABS.length + " معمل خلصوا") }));
    var tl = { sheet: ["Sheet", "الجدول"], dash: ["Dashboard", "لوحة البيانات"], sql: ["SQL", "SQL"] }, lv = ["", ["Starter", "مبتدئ"], ["Core", "أساسي"], ["Stretch", "متقدم"]];
    var g = h("div", { "class": "dlgrid" });
    LABS.forEach(function (l) {
      g.appendChild(h("div", { "class": "dlcard" + (done[l.id] ? " ok" : "") + (lab === l.id ? " cur" : "") },
        h("div", { "class": "dlmeta" }, h("span", { "class": "tag", text: T(tl[l.tool][0], tl[l.tool][1]) }), h("span", { "class": "tag", text: T(lv[l.lv][0], lv[l.lv][1]) }), done[l.id] ? h("span", { "class": "tag good", text: T("Done", "تم") }) : null),
        h("h3", { text: T(l.t[0], l.t[1]) }), h("p", { text: T(l.q[0], l.q[1]) }),
        h("button", { type: "button", "class": "btn f", text: done[l.id] ? T("Open again", "افتح تاني") : T("Start", "ابدأ"), onclick: function () { lab = l.id; go(l.tool); } })));
    });
    view.appendChild(g);
    view.appendChild(h("p", { "class": "dlnote", text: T("All of it is a simulation. The shop, the people and the numbers are invented. The sheet, the dashboard and the SQL box are small learning tools that only look like the real ones.", "كل ده محاكاة. المحل والناس والأرقام مخترعة. الجدول واللوحة وصندوق SQL أدوات تعلم صغيرة بتشبه الأدوات الحقيقية بس.") }));
  }
  function drawTask() {
    clear(taskEl); var l = LABS.filter(function (x) { return x.id === lab; })[0]; taskEl.hidden = !l || tab === "labs" || tab === "learn"; if (taskEl.hidden) return;
    var inp = h("input", { type: "text", maxlength: "60", autocomplete: "off", "aria-label": T("Your answer", "إجابتك"), placeholder: T("Your answer", "إجابتك") }), msg = h("span", { "class": "dlmsg", role: "status" });
    function check() {
      var c = canon(l, inp.value); if (c === null) { msg.textContent = T("Type a number.", "اكتب رقم."); msg.className = "dlmsg bad"; return; }
      if (!window.crypto || !crypto.subtle) { msg.textContent = T("Checking needs a secure page (https).", "الفحص محتاج صفحة آمنة (https)."); msg.className = "dlmsg bad"; return; }
      sha(D.salt + ":" + l.id + ":" + c).then(function (hx) {
        if (hx === D.hash[l.id]) { done[l.id] = 1; saveDone(); msg.textContent = T("Correct. Well done.", "صح. أحسنت."); msg.className = "dlmsg good"; }
        else { msg.textContent = l.dec >= 0 ? T("Not yet. Check the range, the filter and the rounding.", "لسه. راجع النطاق والفلتر والتقريب.") : T("Not yet. Check the spelling and the filters.", "لسه. راجع الكتابة والفلاتر."); msg.className = "dlmsg bad"; }
      });
    }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
    var hint = h("p", { "class": "dlhint", hidden: true, text: T("Hint: ", "تلميحة: ") + T(l.hint[0], l.hint[1]) });
    taskEl.appendChild(h("div", { "class": "dltk" }, h("strong", { text: T(l.t[0], l.t[1]) + ": " }), h("span", { text: T(l.q[0], l.q[1]) })));
    taskEl.appendChild(h("div", { "class": "dlans" }, inp, h("button", { type: "button", "class": "btn f", text: T("Check", "افحص"), onclick: check }), h("button", { type: "button", "class": "btn", text: T("Hint", "تلميحة"), onclick: function () { hint.hidden = !hint.hidden; } }), h("button", { type: "button", "class": "btn", text: T("Close", "اقفل"), onclick: function () { lab = null; draw(); } }), msg));
    taskEl.appendChild(hint);
  }

  /* ---------- sheet view ---------- */
  var sel = "A1", filterText = "", sortState = { c: -1, dir: 1 };
  function dispVal(k) {
    var r = evalRaw(k); if (r.e) return { t: r.e, err: true }; var v = r.v; if (v == null) return { t: "" };
    if (typeof v === "number") return { t: fmtN(v, 2).replace(/,/g, ""), num: true }; if (typeof v === "boolean") return { t: v ? "TRUE" : "FALSE" };
    if (v && v.rng) return { t: "#VALUE!", err: true }; return { t: String(v) };
  }
  function sheetView() {
    var tds = {}, bar = h("input", { type: "text", "class": "dlbar", spellcheck: "false", autocomplete: "off", "aria-label": T("Formula bar", "شريط الصيغة") }), nameBox = h("span", { "class": "dlname", text: sel }), msg = h("span", { "class": "dlmsg" });
    var wrap = h("div", { "class": "dlsheetw", tabindex: "0" }), tb = h("table", { "class": "dlg", role: "grid" });
    function paint() { cache = {}; Object.keys(tds).forEach(function (k) { var d = dispVal(k); tds[k].textContent = d.t; tds[k].className = (d.num ? "n " : "") + (d.err ? "e " : "") + (sel === k ? "sel" : ""); }); }
    function select(k) { if (tds[sel]) tds[sel].classList.remove("sel"); sel = k; if (tds[k]) tds[k].classList.add("sel"); nameBox.textContent = k; bar.value = raw[k] == null ? "" : raw[k]; }
    function commit(move) { var v = bar.value; if (v === "") delete raw[sel]; else raw[sel] = v; paint(); if (move) { var p = splitRef(sel); if (p && p.r < NROW) select(colName(p.c) + (p.r + 1)); wrap.focus(); } }
    var head = h("tr", null, h("th", { "class": "corner" }));
    COLS.forEach(function (c, i) { head.appendChild(h("th", { "class": "ch", scope: "col", title: i < 7 ? T("Click to sort", "اضغط للترتيب") : "", text: c + (sortState.c === i ? (sortState.dir > 0 ? " \u25B2" : " \u25BC") : ""), onclick: function () { if (i < 7) sortBy(i); } })); });
    tb.appendChild(h("thead", null, head)); var tbody = h("tbody");
    for (var r = 1; r <= NROW; r++) {
      var tr = h("tr", { "data-r": r }, h("th", { "class": "rh", scope: "row", text: r }));
      COLS.forEach(function (c) { var k = c + r, td = h("td", { "data-k": k, onclick: function () { select(k); wrap.focus(); }, ondblclick: function () { select(k); bar.focus(); bar.select(); } }); tds[k] = td; tr.appendChild(td); });
      tbody.appendChild(tr);
    }
    tb.appendChild(tbody); wrap.appendChild(tb);
    function applyFilter() { var f = filterText.trim().toLowerCase(); for (var i = 0; i < tbody.children.length; i++) { var rr = i + 1; if (rr < 2 || rr > 121) { tbody.children[i].hidden = false; continue; } var show = !f; if (f) for (var c = 0; c < 8 && !show; c++) { var d = dispVal(COLS[c] + rr); if (String(d.t).toLowerCase().indexOf(f) >= 0) show = true; } tbody.children[i].hidden = !show; } }
    function sortBy(ci) {
      sortState.dir = sortState.c === ci ? -sortState.dir : 1; sortState.c = ci;
      var rows = []; for (var r2_ = 2; r2_ <= 121; r2_++) { var o = []; for (var c = 0; c < 7; c++) o.push(raw[COLS[c] + r2_]); rows.push(o); }
      rows.sort(function (x, y) { var a = x[ci], b = y[ci], na = Number(a), nb = Number(b); var cm = (!isNaN(na) && !isNaN(nb)) ? na - nb : (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0); return cm * sortState.dir; });
      rows.forEach(function (o, i) { for (var c = 0; c < 7; c++) raw[COLS[c] + (i + 2)] = o[c]; raw["H" + (i + 2)] = "=F" + (i + 2) + "*G" + (i + 2); });
      draw();
    }
    bar.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); commit(true); } else if (e.key === "Escape") { bar.value = raw[sel] == null ? "" : raw[sel]; wrap.focus(); } });
    bar.addEventListener("blur", function () { if ((raw[sel] == null ? "" : raw[sel]) !== bar.value) commit(false); });
    wrap.addEventListener("keydown", function (e) {
      var p = splitRef(sel); if (!p || e.target !== wrap) return; var dr = 0, dc = 0;
      if (e.key === "ArrowDown") dr = 1; else if (e.key === "ArrowUp") dr = -1; else if (e.key === "ArrowLeft") dc = -1; else if (e.key === "ArrowRight") dc = 1;
      else if (e.key === "Delete" || e.key === "Backspace") { if (sel === "A1" && false) return; delete raw[sel]; paint(); bar.value = ""; e.preventDefault(); return; }
      else if (e.key === "Enter" || e.key === "F2") { bar.focus(); bar.select(); e.preventDefault(); return; }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { bar.focus(); bar.value = e.key; e.preventDefault(); return; }
      else return;
      e.preventDefault(); var nc = Math.max(1, Math.min(COLS.length, p.c + dc)), nr = Math.max(1, Math.min(NROW, p.r + dr)); select(colName(nc) + nr);
      var el = tds[sel]; if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    var ff = h("input", { type: "search", maxlength: "40", "aria-label": T("Filter rows", "فلتر الصفوف"), placeholder: T("Filter rows (text)", "فلتر الصفوف (نص)"), value: filterText, oninput: function () { filterText = ff.value; applyFilter(); } });
    var tools = h("div", { "class": "dlrow" }, nameBox, bar, h("button", { type: "button", "class": "btn", text: T("Fill down 10", "انسخ لتحت 10"), title: T("Copy the selected cell into the 10 cells below, shifting its references", "انسخ الخلية المحددة لـ 10 خلايا تحتها مع تحريك المراجع"), onclick: function () { var f = raw[sel]; if (f == null) return; var p = splitRef(sel); for (var i = 1; i <= 10 && p.r + i <= NROW; i++) raw[colName(p.c) + (p.r + i)] = f.charAt(0) === "=" ? shiftF(f, i) : f; paint(); } }), h("button", { type: "button", "class": "btn", text: T("Reset sheet", "رجّع الجدول"), onclick: function () { if (confirm(T("Reset the sheet to the original data?", "ترجّع الجدول للبيانات الأصلية؟"))) { resetSheet(); sortState = { c: -1, dir: 1 }; filterText = ""; draw(); } } }), ff);
    view.appendChild(h("p", { "class": "dlnote", text: T("A small spreadsheet with 120 made-up orders. Click a cell, then type in the formula bar (or just start typing). Column H is Units x Price. Cells I to L are free for your own formulas. Click a column letter A to G to sort.", "جدول صغير فيه 120 طلب مخترع. اضغط على خلية واكتب في شريط الصيغة (أو ابدأ اكتب على طول). العمود H هو Units x Price. الخلايا I لـ L فاضية لصيغك. اضغط على حرف عمود A لـ G للترتيب.") }));
    view.appendChild(tools); view.appendChild(wrap); view.appendChild(msg);
    view.appendChild(h("details", { "class": "dlref" }, h("summary", { text: T("Functions you can use", "الدوال المتاحة") }), h("p", { "class": "dlcode", text: "SUM AVERAGE COUNT COUNTA MIN MAX MEDIAN LARGE SMALL ROUND ABS SQRT INT MOD POWER IF AND OR NOT IFERROR ISNUMBER COUNTIF SUMIF AVERAGEIF COUNTIFS SUMIFS SUMPRODUCT VLOOKUP INDEX MATCH LEN UPPER LOWER TRIM LEFT RIGHT MID CONCAT MONTH YEAR" }), h("p", { "class": "hint", text: T("Examples: =SUM(H2:H121)   =COUNTIF(E2:E121,\"Online\")   =SUMIF(C2:C121,\"Cairo\",H2:H121)   =ROUND(AVERAGE(F2:F121),2)", "أمثلة: =SUM(H2:H121)   =COUNTIF(E2:E121,\"Online\")   =SUMIF(C2:C121,\"Cairo\",H2:H121)   =ROUND(AVERAGE(F2:F121),2)") })));
    paint(); select(sel); applyFilter();
  }

  /* ---------- dashboard ---------- */
  var DIMS = [["region", "Region", "المنطقة"], ["product", "Product", "المنتج"], ["category", "Category", "الفئة"], ["channel", "Channel", "القناة"], ["month", "Month", "الشهر"]];
  var MEAS = [["revenue", "Revenue", "الإيراد"], ["profit", "Profit", "الربح"], ["units", "Units", "الوحدات"], ["orders", "Orders", "الطلبات"], ["price", "Price", "السعر"]];
  var FNS = [["sum", "Sum", "مجموع"], ["avg", "Average", "متوسط"], ["count", "Count", "عدد"], ["min", "Min", "أقل"], ["max", "Max", "أكبر"]];
  var TYPES = [["card", "Card", "كارت"], ["bar", "Bar", "أعمدة"], ["line", "Line", "خط"], ["donut", "Donut", "دونات"], ["table", "Table", "جدول"]];
  var PAL = ["#c8102e", "#e8793a", "#d4a017", "#3aa17e", "#2f7fbf", "#7a5ac8", "#8a8f98", "#c25a8a"];
  var vis = [], flt = {}, vsel = null, vid = 0;
  function nameOf(list, key) { var x = list.filter(function (e) { return e[0] === key; })[0]; return x ? T(x[1], x[2]) : key; }
  function rowsNow() { return FACT.filter(function (r) { return Object.keys(flt).every(function (d) { return !flt[d].length || flt[d].indexOf(r[d]) >= 0; }); }); }
  function aggr(rows, field, f) {
    if (f === "count") return rows.length; if (!rows.length) return 0; var xs = rows.map(function (r) { return r[field]; });
    if (f === "sum") return xs.reduce(function (a, b) { return a + b; }, 0); if (f === "avg") return xs.reduce(function (a, b) { return a + b; }, 0) / xs.length;
    return f === "min" ? Math.min.apply(null, xs) : Math.max.apply(null, xs);
  }
  function groups(rows, v) {
    var m = {}, order = []; rows.forEach(function (r) { var k = r[v.dim]; if (!m[k]) { m[k] = []; order.push(k); } m[k].push(r); });
    var out = order.map(function (k) { return { k: k, v: aggr(m[k], v.field, v.fn) }; });
    if (v.dim === "month") out.sort(function (a, b) { return a.k < b.k ? -1 : 1; }); else out.sort(function (a, b) { return b.v - a.v; });
    return out;
  }
  function titleOf(v) { return v.type === "card" ? T(nameOf(FNS, v.fn) + " of " + nameOf(MEAS, v.field), nameOf(FNS, v.fn) + " " + nameOf(MEAS, v.field)) : v.type === "table" ? T("Summary by ", "ملخص حسب ") + nameOf(DIMS, v.dim) : T(nameOf(FNS, v.fn) + " of " + nameOf(MEAS, v.field) + " by " + nameOf(DIMS, v.dim), nameOf(FNS, v.fn) + " " + nameOf(MEAS, v.field) + " حسب " + nameOf(DIMS, v.dim)); }
  function toggleFlt(dim, key) { var a = flt[dim] || (flt[dim] = []), i = a.indexOf(key); if (i >= 0) a.splice(i, 1); else a.push(key); if (!a.length) delete flt[dim]; dashDraw(); }
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + "\u2026" : s; }
  function chartBar(g, v) {
    var W = 320, rh = 26, max = Math.max.apply(null, g.map(function (x) { return x.v; }).concat([1])), s = sv("svg", { viewBox: "0 0 " + W + " " + (rh * g.length + 6), "class": "dlsvg", role: "img", "aria-label": titleOf(v) });
    g.forEach(function (x, i) {
      var y = i * rh + 3, w = Math.max(1, (x.v / max) * 150), on = flt[v.dim] && flt[v.dim].indexOf(x.k) >= 0, dim = flt[v.dim] && flt[v.dim].length && !on;
      var gr = sv("g", { "class": "dlhit", style: "cursor:pointer;opacity:" + (dim ? ".35" : "1") }, [sv("rect", { x: 0, y: y, width: W, height: rh - 2, fill: "transparent" }), sv("text", { x: 0, y: y + 15, "class": "dlt" }), sv("rect", { x: 92, y: y + 3, width: w, height: rh - 8, rx: 3, fill: PAL[i % PAL.length] }), sv("text", { x: 92 + w + 5, y: y + 15, "class": "dlt" })]);
      gr.childNodes[1].textContent = trunc(x.k, 14); gr.childNodes[3].textContent = fmtN(x.v, v.fn === "avg" || v.field === "price" ? 1 : 0);
      gr.addEventListener("click", function () { toggleFlt(v.dim, x.k); }); s.appendChild(gr);
    });
    return s;
  }
  function chartLine(g, v) {
    var W = 320, Hh = 170, pl = 8, pr = 8, pt = 18, pb = 28, max = Math.max.apply(null, g.map(function (x) { return x.v; }).concat([1])), n = g.length, s = sv("svg", { viewBox: "0 0 " + W + " " + Hh, "class": "dlsvg", role: "img", "aria-label": titleOf(v) });
    function X(i) { return n === 1 ? W / 2 : pl + (W - pl - pr) * i / (n - 1); } function Y(val) { return pt + (Hh - pt - pb) * (1 - val / max); }
    s.appendChild(sv("line", { x1: pl, y1: Hh - pb, x2: W - pr, y2: Hh - pb, stroke: "currentColor", "stroke-opacity": ".3" }));
    s.appendChild(sv("polyline", { points: g.map(function (x, i) { return X(i) + "," + Y(x.v); }).join(" "), fill: "none", stroke: PAL[0], "stroke-width": 2.5 }));
    var top = sv("text", { x: pl, y: 11, "class": "dlt" }); top.textContent = T("max ", "أقصى ") + fmtN(max, v.fn === "avg" ? 1 : 0); s.appendChild(top);
    g.forEach(function (x, i) {
      var on = flt[v.dim] && flt[v.dim].indexOf(x.k) >= 0, gr = sv("g", { "class": "dlhit", style: "cursor:pointer" }, [sv("circle", { cx: X(i), cy: Y(x.v), r: on ? 6 : 4, fill: on ? PAL[1] : PAL[0] }), sv("text", { x: X(i), y: Hh - 10, "text-anchor": "middle", "class": "dlt" })]);
      gr.childNodes[1].textContent = trunc(x.k.length > 5 && v.dim === "month" ? x.k.slice(5) : x.k, 8); gr.addEventListener("click", function () { toggleFlt(v.dim, x.k); }); s.appendChild(gr);
    });
    return s;
  }
  function chartDonut(g, v) {
    var tot = g.reduce(function (a, x) { return a + Math.max(0, x.v); }, 0) || 1, C = 2 * Math.PI * 40, off = 0, s = sv("svg", { viewBox: "0 0 320 150", "class": "dlsvg", role: "img", "aria-label": titleOf(v) });
    g.forEach(function (x, i) {
      var len = Math.max(0, x.v) / tot * C, on = flt[v.dim] && flt[v.dim].indexOf(x.k) >= 0, dim = flt[v.dim] && flt[v.dim].length && !on;
      var c = sv("circle", { cx: 75, cy: 75, r: 40, fill: "none", stroke: PAL[i % PAL.length], "stroke-width": 26, "stroke-dasharray": len + " " + (C - len), "stroke-dashoffset": -off, transform: "rotate(-90 75 75)", style: "cursor:pointer;opacity:" + (dim ? ".35" : "1") });
      c.addEventListener("click", function () { toggleFlt(v.dim, x.k); }); s.appendChild(c); off += len;
      var ly = 14 + i * 17, lg = sv("g", { style: "cursor:pointer;opacity:" + (dim ? ".5" : "1") }, [sv("rect", { x: 160, y: ly - 9, width: 10, height: 10, fill: PAL[i % PAL.length], rx: 2 }), sv("text", { x: 176, y: ly, "class": "dlt" })]);
      lg.childNodes[1].textContent = trunc(x.k, 12) + "  " + Math.round(Math.max(0, x.v) / tot * 100) + "%"; lg.addEventListener("click", function () { toggleFlt(v.dim, x.k); }); if (i < 8) s.appendChild(lg);
    });
    return s;
  }
  function tileBody(v, rows) {
    if (v.type === "card") { return h("div", { "class": "dlkpi", text: fmtN(aggr(rows, v.field, v.fn), v.fn === "avg" || v.field === "price" ? 2 : 0) }); }
    if (v.type === "table") {
      var m = {}, order = []; rows.forEach(function (r) { var k = r[v.dim]; if (!m[k]) { m[k] = []; order.push(k); } m[k].push(r); }); if (v.dim === "month") order.sort();
      var t = h("table", { "class": "dltab" }, h("thead", null, h("tr", null, h("th", { text: nameOf(DIMS, v.dim) }), h("th", { text: T("Revenue", "الإيراد") }), h("th", { text: T("Profit", "الربح") }), h("th", { text: T("Units", "الوحدات") }), h("th", { text: T("Orders", "الطلبات") }))));
      var tbd = h("tbody"); order.forEach(function (k) { var on = flt[v.dim] && flt[v.dim].indexOf(k) >= 0; tbd.appendChild(h("tr", { "class": on ? "on" : "", onclick: function () { toggleFlt(v.dim, k); } }, h("td", { text: k }), h("td", { text: fmtN(aggr(m[k], "revenue", "sum"), 0) }), h("td", { text: fmtN(aggr(m[k], "profit", "sum"), 0) }), h("td", { text: fmtN(aggr(m[k], "units", "sum"), 0) }), h("td", { text: fmtN(m[k].length, 0) }))); });
      t.appendChild(tbd); return h("div", { "class": "dlscroll" }, t);
    }
    var g = groups(rows, v); if (!g.length) return h("p", { "class": "hint", text: T("No data for the current filters.", "مفيش بيانات للفلاتر الحالية.") });
    return v.type === "bar" ? chartBar(g, v) : v.type === "line" ? chartLine(g, v) : chartDonut(g, v);
  }
  var dctl = {}, dgrid = null, dsl = null;
  function addVis(o) { var v = { id: ++vid, type: o.type, dim: o.dim, field: o.field, fn: o.fn }; vis.push(v); vsel = v.id; return v; }
  function starter() { vis = []; flt = {}; vid = 0; addVis({ type: "card", dim: "region", field: "revenue", fn: "sum" }); addVis({ type: "card", dim: "region", field: "profit", fn: "sum" }); addVis({ type: "card", dim: "region", field: "orders", fn: "count" }); addVis({ type: "bar", dim: "product", field: "revenue", fn: "sum" }); addVis({ type: "line", dim: "month", field: "revenue", fn: "sum" }); addVis({ type: "donut", dim: "region", field: "revenue", fn: "sum" }); vsel = null; }
  function dashView() {
    if (!vis.length && !dashView.init) { starter(); dashView.init = true; }
    view.appendChild(h("p", { "class": "dlnote", text: T("Build a dashboard from the shop data. Pick a visual type and fields, then Add. Click a bar, slice, point or table row (or a slicer chip) to filter every visual. Select a visual to change it.", "ابني لوحة بيانات من بيانات المحل. اختار نوع الرسم والحقول وبعدين Add. اضغط على عمود أو شريحة أو نقطة أو صف جدول (أو زرار فلتر) عشان تفلتر كل الرسومات. اختار رسم عشان تعدله.") }));
    function sel2(key, list, onch) { var s = h("select", { "aria-label": key, onchange: function () { onch(s.value); } }); list.forEach(function (x) { s.appendChild(h("option", { value: x[0], text: T(x[1], x[2]) })); }); dctl[key] = s; return s; }
    var ctl = h("div", { "class": "dlrow dlctl" });
    ["type", "dim", "field", "fn"].forEach(function (k) { var list = k === "type" ? TYPES : k === "dim" ? DIMS : k === "field" ? MEAS : FNS; var lbl = k === "type" ? T("Visual", "الرسم") : k === "dim" ? T("Category", "التصنيف") : k === "field" ? T("Measure", "القياس") : T("Aggregation", "التجميع"); ctl.appendChild(h("label", null, h("span", { text: lbl }), sel2(k, list, function (val) { var v = vis.filter(function (x) { return x.id === vsel; })[0]; if (v) { v[k] = val; if (k === "field" && val === "orders") v.fn = "count"; syncCtl(); dashDraw(); } }))); });
    ctl.appendChild(h("button", { type: "button", "class": "btn f", text: T("Add", "ضيف"), onclick: function () { addVis({ type: dctl.type.value, dim: dctl.dim.value, field: dctl.field.value, fn: dctl.fn.value }); dashDraw(); } }));
    ctl.appendChild(h("button", { type: "button", "class": "btn", text: T("Remove selected", "امسح المحدد"), onclick: function () { vis = vis.filter(function (x) { return x.id !== vsel; }); vsel = null; dashDraw(); } }));
    ctl.appendChild(h("button", { type: "button", "class": "btn", text: T("Starter layout", "تصميم جاهز"), onclick: function () { starter(); dashDraw(); } }));
    ctl.appendChild(h("button", { type: "button", "class": "btn", text: T("Clear all", "امسح الكل"), onclick: function () { vis = []; flt = {}; vsel = null; dashDraw(); } }));
    dsl = h("div", { "class": "dlsl" }); dgrid = h("div", { "class": "dltiles" });
    view.appendChild(ctl); view.appendChild(dsl); view.appendChild(dgrid); dashDraw();
  }
  function syncCtl() { var v = vis.filter(function (x) { return x.id === vsel; })[0]; if (v) ["type", "dim", "field", "fn"].forEach(function (k) { dctl[k].value = v[k]; }); }
  function dashDraw() {
    if (!dgrid) return; var rows = rowsNow(); clear(dsl);
    DIMS.forEach(function (d) {
      var vals = []; FACT.forEach(function (r) { if (vals.indexOf(r[d[0]]) < 0) vals.push(r[d[0]]); }); vals.sort();
      var box = h("div", { "class": "dlslc" }, h("b", { text: T(d[1], d[2]) + ": " }));
      vals.forEach(function (x) { var on = flt[d[0]] && flt[d[0]].indexOf(x) >= 0; box.appendChild(h("button", { type: "button", "class": "chip" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false", text: x, onclick: function () { toggleFlt(d[0], x); } })); });
      dsl.appendChild(box);
    });
    dsl.appendChild(h("p", { "class": "hint", text: T("Orders in view: ", "الطلبات المعروضة: ") + rows.length + " / " + FACT.length + (Object.keys(flt).length ? "   " : "") }, Object.keys(flt).length ? h("button", { type: "button", "class": "btn", text: T("Clear filters", "امسح الفلاتر"), onclick: function () { flt = {}; dashDraw(); } }) : null));
    clear(dgrid);
    if (!vis.length) dgrid.appendChild(h("p", { "class": "hint", text: T("The canvas is empty. Pick a visual and press Add, or use Starter layout.", "اللوحة فاضية. اختار رسم واضغط Add أو استخدم التصميم الجاهز.") }));
    vis.forEach(function (v) {
      dgrid.appendChild(h("div", { "class": "dltile " + v.type + (vsel === v.id ? " sel" : ""), onclick: function (e) { if (e.target.closest && e.target.closest(".dlhit,tr,button")) return; vsel = v.id; syncCtl(); dashDraw(); } }, h("div", { "class": "dltt", text: titleOf(v) }), tileBody(v, rows)));
    });
    syncCtl();
  }

  /* ---------- SQL ---------- */
  var SQLT = { sales: ["id", "date", "region", "product", "channel", "units", "price"], products: ["name", "category", "cost"] };
  var KW = ["SELECT", "DISTINCT", "FROM", "JOIN", "INNER", "ON", "WHERE", "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "AS", "AND", "OR", "NOT", "LIKE", "IN", "BETWEEN", "IS", "NULL"];
  function tableRows(name) { if (name === "sales") return D.sales.map(function (r) { return { id: r[0], date: r[1], region: r[2], product: r[3], channel: r[4], units: r[5], price: r[6] }; }); return D.products.map(function (p) { return { name: p[0], category: p[1], cost: p[2] }; }); }
  function sqlTok(s) {
    var t = [], i = 0, m;
    while (i < s.length) {
      var c = s[i]; if (/\s/.test(c)) { i++; continue; }
      if (c === "-" && s[i + 1] === "-") { while (i < s.length && s[i] !== "\n") i++; continue; }
      if (c === "'") { var j = i + 1, st = ""; while (j < s.length) { if (s[j] === "'") { if (s[j + 1] === "'") { st += "'"; j += 2; continue; } break; } st += s[j++]; } if (j >= s.length) throw T("Unclosed quote.", "علامة اقتباس مش مقفولة."); t.push({ t: "s", v: st, p: i }); i = j + 1; continue; }
      var rest = s.slice(i);
      if ((m = /^\d+(\.\d+)?/.exec(rest))) { t.push({ t: "n", v: parseFloat(m[0]), p: i }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { var up = m[0].toUpperCase(); t.push(KW.indexOf(up) >= 0 ? { t: "k", v: up, p: i } : { t: "i", v: m[0], p: i }); i += m[0].length; continue; }
      if ((m = /^(<=|>=|<>|!=)/.exec(rest))) { t.push({ t: "o", v: m[0] === "!=" ? "<>" : m[0], p: i }); i += 2; continue; }
      if ("=<>+-*/%(),.;".indexOf(c) >= 0) { t.push({ t: "o", v: c, p: i }); i++; continue; }
      throw T("Unexpected character: ", "حرف غير متوقع: ") + c;
    }
    return t;
  }
  function sqlParse(src) {
    var t = sqlTok(src), p = 0;
    function pk() { return t[p]; } function isK(v) { return t[p] && t[p].t === "k" && t[p].v === v; } function isO(v) { return t[p] && t[p].t === "o" && t[p].v === v; }
    function bad(w) { var x = t[p]; throw T("Syntax error near ", "خطأ في الصياغة جنب ") + (x ? "'" + (x.t === "s" ? x.v : (src.substr(x.p, 12).split(/\s/)[0])) + "'" : T("the end", "النهاية")) + (w ? " (" + w + ")" : ""); }
    function eatK(v) { if (!isK(v)) bad(T("expected ", "متوقع ") + v); p++; } function eatO(v) { if (!isO(v)) bad(T("expected ", "متوقع ") + v); p++; }
    function ident() { var x = t[p]; if (!x || x.t !== "i") bad(T("expected a name", "متوقع اسم")); p++; return x.v; }
    function orE() { var l = andE(); while (isK("OR")) { p++; l = { k: "or", l: l, r: andE() }; } return l; }
    function andE() { var l = notE(); while (isK("AND")) { p++; l = { k: "and", l: l, r: notE() }; } return l; }
    function notE() { if (isK("NOT")) { p++; return { k: "not", x: notE() }; } return cmpE(); }
    function cmpE() {
      var l = addE(); var x = t[p];
      if (x && x.t === "o" && ["=", "<>", "<", ">", "<=", ">="].indexOf(x.v) >= 0) { p++; return { k: "cmp", o: x.v, l: l, r: addE() }; }
      var neg = false; if (isK("NOT") && t[p + 1] && t[p + 1].t === "k" && ["LIKE", "IN", "BETWEEN"].indexOf(t[p + 1].v) >= 0) { neg = true; p++; }
      if (isK("LIKE")) { p++; return { k: "like", l: l, r: addE(), neg: neg }; }
      if (isK("IN")) { p++; eatO("("); var list = [orE()]; while (isO(",")) { p++; list.push(orE()); } eatO(")"); return { k: "in", l: l, list: list, neg: neg }; }
      if (isK("BETWEEN")) { p++; var lo = addE(); eatK("AND"); var hi = addE(); return { k: "btw", l: l, lo: lo, hi: hi, neg: neg }; }
      if (isK("IS")) { p++; var n2 = false; if (isK("NOT")) { p++; n2 = true; } eatK("NULL"); return { k: "isnull", l: l, neg: n2 }; }
      return l;
    }
    function addE() { var l = mulE(); while (isO("+") || isO("-")) { var o = t[p++].v; l = { k: "ar", o: o, l: l, r: mulE() }; } return l; }
    function mulE() { var l = unE(); while (isO("*") || isO("/") || isO("%")) { var o = t[p++].v; l = { k: "ar", o: o, l: l, r: unE() }; } return l; }
    function unE() { if (isO("-")) { p++; return { k: "ar", o: "-", l: { k: "lit", v: 0 }, r: unE() }; } return prim(); }
    function prim() {
      var x = t[p]; if (!x) bad();
      if (x.t === "n" || x.t === "s") { p++; return { k: "lit", v: x.v }; }
      if (isO("(")) { p++; var e = orE(); eatO(")"); return e; }
      if (x.t === "i") {
        p++;
        if (isO("(")) {
          p++; var name = x.v.toUpperCase(), args = [], dist = false;
          if (isO("*")) { p++; args.push({ k: "star" }); } else if (!isO(")")) { if (isK("DISTINCT")) { p++; dist = true; } args.push(orE()); while (isO(",")) { p++; args.push(orE()); } }
          eatO(")"); return { k: "fn", n: name, a: args, dist: dist };
        }
        if (isO(".")) { p++; var c = ident(); return { k: "col", q: x.v, c: c }; }
        return { k: "col", c: x.v };
      }
      bad();
    }
    function tref() { var n = ident(), a = n; if (isK("AS")) { p++; a = ident(); } else if (t[p] && t[p].t === "i") a = ident(); return { n: n.toLowerCase(), a: a.toLowerCase() }; }
    eatK("SELECT"); var q = { items: [], joins: [], group: [], order: [], distinct: false, limit: null, where: null, having: null };
    if (isK("DISTINCT")) { p++; q.distinct = true; }
    do {
      if (isO(",")) p++;
      if (isO("*")) { p++; q.items.push({ star: true, text: "*" }); continue; }
      var s0 = t[p] ? t[p].p : 0, e0 = orE(), s1 = t[p] ? t[p].p : src.length, al = null;
      if (isK("AS")) { p++; al = ident(); } else if (t[p] && t[p].t === "i") al = ident();
      q.items.push({ e: e0, alias: al, text: src.slice(s0, s1).trim() });
    } while (isO(","));
    eatK("FROM"); q.from = tref();
    while (isK("JOIN") || isK("INNER")) { if (isK("INNER")) p++; eatK("JOIN"); var tr = tref(); eatK("ON"); q.joins.push({ t: tr, on: orE() }); }
    if (isK("WHERE")) { p++; q.where = orE(); }
    if (isK("GROUP")) { p++; eatK("BY"); q.group.push(orE()); while (isO(",")) { p++; q.group.push(orE()); } }
    if (isK("HAVING")) { p++; q.having = orE(); }
    if (isK("ORDER")) { p++; eatK("BY"); do { if (isO(",")) p++; var oe = orE(), dir = 1; if (isK("ASC")) p++; else if (isK("DESC")) { p++; dir = -1; } q.order.push({ e: oe, dir: dir }); } while (isO(",")); }
    if (isK("LIMIT")) { p++; var ln = t[p]; if (!ln || ln.t !== "n") bad(T("expected a number", "متوقع رقم")); q.limit = ln.v; p++; }
    if (isO(";")) p++;
    if (p < t.length) bad();
    return q;
  }
  var AGG = { COUNT: 1, SUM: 1, AVG: 1, MIN: 1, MAX: 1 };
  function hasAgg(e) { if (!e || typeof e !== "object") return false; if (e.k === "fn" && AGG[e.n]) return true; return ["l", "r", "x", "lo", "hi"].some(function (k) { return e[k] && hasAgg(e[k]); }) || (e.list && e.list.some(hasAgg)) || (e.a && e.a.some(hasAgg)); }
  function sqlRun(src) {
    var q = sqlParse(src), tabs = {}; var tl = [q.from].concat(q.joins.map(function (j) { return j.t; }));
    tl.forEach(function (x) { if (!SQLT[x.n]) throw T("Unknown table: ", "جدول غير معروف: ") + x.n + " (" + Object.keys(SQLT).join(", ") + ")"; tabs[x.a] = x.n; });
    function colOf(row, e) {
      if (e.q) { var q2 = e.q.toLowerCase(); if (!row[q2]) throw T("Unknown table or alias: ", "جدول أو اسم مستعار غير معروف: ") + e.q; if (!(e.c in row[q2])) { var lc = Object.keys(row[q2]).filter(function (c) { return c.toLowerCase() === e.c.toLowerCase(); })[0]; if (!lc) throw T("Unknown column: ", "عمود غير معروف: ") + e.q + "." + e.c; return row[q2][lc]; } return row[q2][e.c]; }
      var hit = [], cl = e.c.toLowerCase(); Object.keys(row).forEach(function (a) { Object.keys(row[a]).forEach(function (c) { if (c.toLowerCase() === cl) hit.push(row[a][c]); }); });
      if (!hit.length) throw T("Unknown column: ", "عمود غير معروف: ") + e.c; if (hit.length > 1) throw T("Ambiguous column: ", "عمود مكرر: ") + e.c; return hit[0];
    }
    function like(v, p) { return new RegExp("^" + String(p).replace(/[.+^${}()|[\]\\*?]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i").test(String(v)); }
    function cmpv(a, b) { if (typeof a === "number" && typeof b === "number") return a - b; var x = String(a), y = String(b); return x < y ? -1 : x > y ? 1 : 0; }
    function E(e, ctx) {
      switch (e.k) {
        case "lit": return e.v;
        case "col": return colOf(ctx.row || ctx.rows[0] || {}, e);
        case "ar": { var a = E(e.l, ctx), b = E(e.r, ctx); if (a == null || b == null) return null; if (typeof a !== "number" || typeof b !== "number") throw T("Arithmetic needs numbers.", "العمليات الحسابية تحتاج أرقام."); if (e.o === "+") return a + b; if (e.o === "-") return a - b; if (e.o === "*") return a * b; if (b === 0) return null; return e.o === "/" ? a / b : a % b; }
        case "cmp": { var l = E(e.l, ctx), r = E(e.r, ctx); if (l == null || r == null) return false; var d = cmpv(l, r); return e.o === "=" ? d === 0 : e.o === "<>" ? d !== 0 : e.o === "<" ? d < 0 : e.o === ">" ? d > 0 : e.o === "<=" ? d <= 0 : d >= 0; }
        case "and": return !!E(e.l, ctx) && !!E(e.r, ctx); case "or": return !!E(e.l, ctx) || !!E(e.r, ctx); case "not": return !E(e.x, ctx);
        case "like": { var rs = like(E(e.l, ctx), E(e.r, ctx)); return e.neg ? !rs : rs; }
        case "in": { var v = E(e.l, ctx), f = e.list.some(function (x) { return cmpv(v, E(x, ctx)) === 0; }); return e.neg ? !f : f; }
        case "btw": { var v2 = E(e.l, ctx), ok = cmpv(v2, E(e.lo, ctx)) >= 0 && cmpv(v2, E(e.hi, ctx)) <= 0; return e.neg ? !ok : ok; }
        case "isnull": { var n = E(e.l, ctx) == null; return e.neg ? !n : n; }
        case "fn": return F(e, ctx);
      }
      throw T("Cannot evaluate this.", "مش قادر أحسب ده.");
    }
    function F(e, ctx) {
      var N = e.n;
      if (AGG[N]) {
        if (!ctx.rows) throw T("Aggregate functions are not allowed here (use HAVING).", "دوال التجميع مش مسموحة هنا (استخدم HAVING).");
        if (e.a.length !== 1) throw N + T(" takes one argument.", " بتاخد قيمة واحدة.");
        if (e.a[0].k === "star") { if (N !== "COUNT") throw T("* only works with COUNT.", "* بتشتغل مع COUNT بس."); return ctx.rows.length; }
        var vals = ctx.rows.map(function (row) { return E(e.a[0], { row: row }); }).filter(function (x) { return x != null; });
        if (e.dist) { var seen = {}; vals = vals.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; }); }
        if (N === "COUNT") return vals.length; if (!vals.length) return null;
        if (N === "MIN" || N === "MAX") return vals.reduce(function (a, b) { return (N === "MIN" ? cmpv(b, a) < 0 : cmpv(b, a) > 0) ? b : a; });
        vals.forEach(function (x) { if (typeof x !== "number") throw N + T(" needs numbers.", " بتحتاج أرقام."); });
        var s = vals.reduce(function (a, b) { return a + b; }, 0); return N === "SUM" ? s : s / vals.length;
      }
      var a = e.a.map(function (x) { return E(x, ctx); });
      switch (N) {
        case "ROUND": return a[0] == null ? null : r2(a[0], a.length > 1 ? a[1] : 0);
        case "ABS": return a[0] == null ? null : Math.abs(a[0]);
        case "UPPER": return a[0] == null ? null : String(a[0]).toUpperCase(); case "LOWER": return a[0] == null ? null : String(a[0]).toLowerCase();
        case "LENGTH": return a[0] == null ? null : String(a[0]).length;
        case "SUBSTR": case "SUBSTRING": return a[0] == null ? null : String(a[0]).substr(a[1] - 1, a.length > 2 ? a[2] : undefined);
      }
      throw T("Unknown function: ", "دالة غير معروفة: ") + N;
    }
    var rows = tableRows(q.from.n).map(function (r) { var o = {}; o[q.from.a] = r; return o; });
    q.joins.forEach(function (j) { var right = tableRows(j.t.n), out = []; rows.forEach(function (l) { right.forEach(function (rr) { var o = {}; for (var k in l) o[k] = l[k]; o[j.t.a] = rr; if (E(j.on, { row: o })) out.push(o); }); }); rows = out; });
    if (q.where) { if (hasAgg(q.where)) throw T("Aggregates are not allowed in WHERE. Use HAVING.", "دوال التجميع مش مسموحة في WHERE. استخدم HAVING."); rows = rows.filter(function (r) { return !!E(q.where, { row: r }); }); }
    var agg = q.group.length > 0 || q.items.some(function (x) { return !x.star && hasAgg(x.e); }) || (q.having && hasAgg(q.having)) || q.order.some(function (o) { return hasAgg(o.e); });
    var groupsL;
    if (agg) { if (q.group.length) { var m = {}, ord = []; rows.forEach(function (r) { var k = JSON.stringify(q.group.map(function (g) { return E(g, { row: r }); })); if (!m[k]) { m[k] = []; ord.push(k); } m[k].push(r); }); groupsL = ord.map(function (k) { return m[k]; }); } else groupsL = [rows]; if (q.having) groupsL = groupsL.filter(function (g) { return !!E(q.having, { rows: g }); }); }
    else { if (q.having) throw T("HAVING needs GROUP BY or an aggregate.", "HAVING محتاجة GROUP BY أو دالة تجميع."); groupsL = rows.map(function (r) { return [r]; }); }
    var cols = [], out = [];
    q.items.forEach(function (x) { if (x.star) { tl.forEach(function (tt) { SQLT[tt.n].forEach(function (c) { cols.push({ star: tt.a, c: c, name: c }); }); }); } else cols.push({ e: x.e, name: x.alias || x.text }); });
    groupsL.forEach(function (g) {
      var ctx = agg ? { rows: g, row: g[0] } : { row: g[0] }; if (agg && !g.length && q.group.length) return;
      var vals = cols.map(function (c) { return c.star ? g[0][c.star][c.c] : E(c.e, agg ? { rows: g, row: g[0] } : { row: g[0] }); });
      var o = { vals: vals, ctx: ctx }; out.push(o);
    });
    if (q.distinct) { var seen2 = {}; out = out.filter(function (o) { var k = JSON.stringify(o.vals); if (seen2[k]) return false; seen2[k] = 1; return true; }); }
    if (q.order.length) {
      var keyed = out.map(function (o) {
        return { o: o, k: q.order.map(function (od) {
          var e = od.e; if (e.k === "lit" && typeof e.v === "number") { if (e.v < 1 || e.v > cols.length) throw T("ORDER BY position out of range.", "رقم ORDER BY خارج النطاق."); return o.vals[e.v - 1]; }
          if (e.k === "col" && !e.q) { var ix = -1; cols.forEach(function (c, i) { if (c.name.toLowerCase() === e.c.toLowerCase() && ix < 0) ix = i; }); if (ix >= 0) return o.vals[ix]; }
          return E(e, o.ctx);
        }) };
      });
      keyed.sort(function (a, b) { for (var i = 0; i < q.order.length; i++) { var x = a.k[i], y = b.k[i], c = x == null ? (y == null ? 0 : -1) : y == null ? 1 : cmpv(x, y); if (c) return c * q.order[i].dir; } return 0; });
      out = keyed.map(function (z) { return z.o; });
    }
    if (q.limit != null) out = out.slice(0, q.limit);
    return { cols: cols.map(function (c) { return c.name; }), rows: out.map(function (o) { return o.vals; }) };
  }
  var sqlText = "SELECT region, SUM(units * price) AS revenue\nFROM sales\nGROUP BY region\nORDER BY revenue DESC;";
  var EXQ = [["Orders per channel", "طلبات كل قناة", "SELECT channel, COUNT(*) AS orders\nFROM sales\nGROUP BY channel;"], ["Join with products", "ربط مع المنتجات", "SELECT p.category, ROUND(AVG(s.price), 2) AS avg_price\nFROM sales s\nJOIN products p ON s.product = p.name\nGROUP BY p.category\nORDER BY avg_price DESC;"], ["Big orders", "طلبات كبيرة", "SELECT id, product, units, price\nFROM sales\nWHERE units >= 8 AND channel = 'Online'\nORDER BY units DESC, id\nLIMIT 10;"], ["Filter groups", "فلترة المجموعات", "SELECT product, SUM(units) AS total_units\nFROM sales\nGROUP BY product\nHAVING SUM(units) > 60\nORDER BY total_units DESC;"], ["Monthly revenue", "إيراد الشهور", "SELECT SUBSTR(date, 1, 7) AS month, SUM(units * price) AS revenue\nFROM sales\nGROUP BY SUBSTR(date, 1, 7)\nORDER BY month;"]];
  function sqlView() {
    var ta = h("textarea", { "class": "dlsql", rows: "7", spellcheck: "false", "aria-label": "SQL", value: sqlText }), out = h("div", { "class": "dlout" });
    ta.value = sqlText;
    function run() {
      sqlText = ta.value; clear(out);
      try {
        var r = sqlRun(sqlText), shown = r.rows.slice(0, 200), tb = h("table", { "class": "dltab" }, h("thead", null, h("tr", null, r.cols.map(function (c) { return h("th", { text: c }); }))));
        var body = h("tbody"); shown.forEach(function (row) { body.appendChild(h("tr", null, row.map(function (v) { return h("td", { "class": typeof v === "number" ? "n" : "", text: v == null ? "NULL" : typeof v === "number" ? String(Math.round(v * 1e6) / 1e6) : String(v) }); }))); }); tb.appendChild(body);
        out.appendChild(h("p", { "class": "hint", text: r.rows.length + T(" row(s)", " صف") + (r.rows.length > 200 ? T(" (showing 200)", " (بيعرض 200)") : "") })); out.appendChild(h("div", { "class": "dlscroll" }, tb));
      } catch (e) { out.appendChild(h("p", { "class": "dlmsg bad", role: "alert", text: typeof e === "string" ? e : T("Could not run this query.", "ماقدرتش أشغل الاستعلام ده.") })); }
    }
    ta.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); } });
    view.appendChild(h("p", { "class": "dlnote", text: T("A small SQL box that runs on two made-up tables. It supports SELECT, JOIN, WHERE, GROUP BY, HAVING, ORDER BY and LIMIT. It is read-only and runs in your browser.", "صندوق SQL صغير بيشتغل على جدولين مخترعين. بيدعم SELECT وJOIN وWHERE وGROUP BY وHAVING وORDER BY وLIMIT. للقراءة بس وبيشتغل في متصفحك.") }));
    var sch = h("div", { "class": "dlschema" }); Object.keys(SQLT).forEach(function (n) { sch.appendChild(h("div", null, h("b", { text: n }), h("span", { "class": "dlcols2", text: "(" + SQLT[n].join(", ") + ")" }))); }); view.appendChild(sch);
    var ex = h("div", { "class": "dlrow" }); EXQ.forEach(function (x) { ex.appendChild(h("button", { type: "button", "class": "chip", text: T(x[0], x[1]), onclick: function () { ta.value = x[2]; run(); } })); });
    view.appendChild(ex); view.appendChild(ta); view.appendChild(h("div", { "class": "dlrow" }, h("button", { type: "button", "class": "btn f", text: T("Run (Ctrl+Enter)", "شغّل (Ctrl+Enter)"), onclick: run }))); view.appendChild(out); run();
  }

  /* ---------- cheat sheet and downloads ---------- */
  var LEARN = [
    ["Total of a column", "مجموع عمود", "=SUM(H2:H121)", "SELECT SUM(units * price) FROM sales;", "(df.units * df.price).sum()"],
    ["Count rows that match", "عد الصفوف المطابقة", "=COUNTIF(E2:E121,\"Online\")", "SELECT COUNT(*) FROM sales WHERE channel = 'Online';", "(df.channel == 'Online').sum()"],
    ["Sum with a condition", "مجموع بشرط", "=SUMIF(C2:C121,\"Coast\",H2:H121)", "SELECT SUM(units * price) FROM sales WHERE region = 'Coast';", "df.loc[df.region == 'Coast', 'total'].sum()"],
    ["Average, rounded", "متوسط مقرّب", "=ROUND(AVERAGE(F2:F121),2)", "SELECT ROUND(AVG(units), 2) FROM sales;", "round(df.units.mean(), 2)"],
    ["Total by group (pivot)", "مجموع حسب مجموعة (Pivot)", "Insert > PivotTable: rows = Region, values = Sum of Total", "SELECT region, SUM(units * price)\nFROM sales GROUP BY region;", "df.groupby('region')['total'].sum()"],
    ["Biggest first", "الأكبر الأول", "Sort the column from largest to smallest", "SELECT * FROM sales ORDER BY price DESC LIMIT 5;", "df.sort_values('price', ascending=False).head(5)"],
    ["Look up a value", "دوّر على قيمة", "=VLOOKUP(\"Backpack\", table, 2, FALSE)", "SELECT category FROM products WHERE name = 'Backpack';", "products.set_index('name').loc['Backpack', 'category']"],
    ["Join two tables", "اربط جدولين", "XLOOKUP / VLOOKUP into a new column", "SELECT s.id, p.category\nFROM sales s JOIN products p ON s.product = p.name;", "sales.merge(products, left_on='product', right_on='name')"],
    ["Filter by month", "فلتر بالشهر", "=MONTH(B2)  then filter on that column", "SELECT * FROM sales WHERE SUBSTR(date, 1, 7) = '2026-03';", "df[df.date.str[:7] == '2026-03']"]
  ];
  function dl(name, text) { var b = new Blob([text], { type: "text/csv" }), a = h("a", { href: URL.createObjectURL(b), download: name }); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function learnView() {
    view.appendChild(h("p", { "class": "dlnote", text: T("The same question in a spreadsheet, in SQL and in Python with pandas. The sheet and the SQL box run here. The pandas lines are for you to try in your own Python, using the CSV files below (this page does not run Python).", "نفس السؤال في جدول بيانات وفي SQL وفي بايثون مع pandas. الجدول وصندوق SQL بيشتغلوا هنا. أسطر pandas تجربها في بايثون عندك باستخدام ملفات CSV تحت (الصفحة دي مش بتشغّل بايثون).") }));
    var row = h("div", { "class": "dlrow" });
    row.appendChild(h("button", { type: "button", "class": "btn", text: T("Download sales.csv", "نزّل sales.csv"), onclick: function () { dl("sales.csv", "id,date,region,product,channel,units,price\n" + D.sales.map(function (r) { return r.join(","); }).join("\n") + "\n"); } }));
    row.appendChild(h("button", { type: "button", "class": "btn", text: T("Download products.csv", "نزّل products.csv"), onclick: function () { dl("products.csv", "name,category,cost\n" + D.products.map(function (r) { return r.join(","); }).join("\n") + "\n"); } }));
    view.appendChild(row);
    view.appendChild(h("p", { "class": "dlcode", text: "import pandas as pd\ndf = pd.read_csv('sales.csv')\ndf['total'] = df.units * df.price\nproducts = pd.read_csv('products.csv')" }));
    LEARN.forEach(function (x) {
      view.appendChild(h("div", { "class": "dlcmp" }, h("h3", { text: T(x[0], x[1]) }), h("div", { "class": "dlcols" }, h("div", null, h("b", { text: T("Spreadsheet", "جدول بيانات") }), h("pre", { text: x[2] })), h("div", null, h("b", { text: "SQL" }), h("pre", { text: x[3] }), h("button", { type: "button", "class": "chip", text: T("Try it", "جرّبه"), onclick: function () { sqlText = x[3]; go("sql"); } })), h("div", null, h("b", { text: "pandas" }), h("pre", { text: x[4] })))));
    });
  }

  /* ---------- boot ---------- */
  resetSheet();
  var hs = location.hash.slice(1); if (["labs", "sheet", "dash", "sql", "learn"].indexOf(hs) >= 0) tab = hs;
  window.addEventListener("hashchange", function () { var x = location.hash.slice(1); if (["labs", "sheet", "dash", "sql", "learn"].indexOf(x) >= 0 && x !== tab) { tab = x; draw(); } });
  var lastLang = ar();
  new MutationObserver(function () { if (ar() !== lastLang) { lastLang = ar(); draw(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });
  draw();
  window.__dl = { sql: sqlRun, cell: function (k, v) { raw[k] = v; return evalRaw(k); } };
})();
