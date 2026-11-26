/* SCARHUB Challenges (Phase 1): rooms, simulated viewers, terminal emulator, ranks, heatmap, admin editor.
   Everything is client-side display. Answers are checked by the database (ch_check). The terminal and the web view are emulators: no real execution, no network. */
(function () {
  "use strict";
  var CFG = window.SCAR_CFG || {};
  var EN = function () { return (localStorage.l || "en") !== "ar"; };
  var tr = function (en, ar) { return EN() ? en : ar; };
  var pick = function (o, k) { return EN() ? o[k + "_en"] : (o[k + "_ar"] || o[k + "_en"]); };
  var iso = function (t) { return window.scarIso ? window.scarIso(t) : t; };
  function h(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { var v = attrs[k]; if (v == null || v === false) continue; if (k === "text") e.textContent = v; else if (k === "class") e.className = v; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- backend ---------- */
  var sb = null, me = null, ready = null;
  function token() { try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^sb-.+-auth-token$/.test(k)) { var t = JSON.parse(localStorage.getItem(k)); if (t && t.access_token) return t.access_token; } } } catch (e) {} return null; }
  function init() {
    if (ready) return ready;
    ready = (async function () {
      if (window.CH_RPC) { me = window.CH_ME || null; return; }
      if (!CFG.url || !CFG.anonKey || !window.supabase) return;
      sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" } });
      var s = (await sb.auth.getSession()).data.session;
      if (s) {
        var r = await sb.from("profiles").select("id,username,alias,role,status").eq("id", s.user.id).maybeSingle();
        me = r.data && r.data.status === "active" ? r.data : null;
      }
    })();
    return ready;
  }
  async function rpc(name, args) {
    await init();
    if (window.CH_RPC) return window.CH_RPC(name, args || {});
    if (!sb) throw new Error("offline");
    var r = await sb.rpc(name, args || {});
    if (r.error) throw r.error;
    return r.data;
  }
  var isStaff = function () { return me && (me.role === "owner" || me.role === "admin"); };

  /* ---------- small helpers ---------- */
  function toast(msg) { var t = h("div", { "class": "toast", text: msg }); document.getElementById("ch").appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
  var DIFF = { easy: ["Easy", "سهل"], medium: ["Medium", "متوسط"], hard: ["Hard", "صعب"] };
  function diffPill(d) { return h("span", { "class": "pill " + d, text: tr(DIFF[d][0], DIFF[d][1]) }); }
  function ltr(n) { n.style.direction = "ltr"; n.style.textAlign = "left"; return n; }

  /* ---------- heatmap (green shades follow solves per day) ---------- */
  function dkey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function heatmap(times) {
    var counts = {}, total = 0;
    (times || []).forEach(function (t) { var k = dkey(new Date(t)); counts[k] = (counts[k] || 0) + 1; });
    var today = new Date(); today.setHours(12, 0, 0, 0);
    var start = new Date(today); start.setDate(start.getDate() - 52 * 7 - today.getDay());
    var cells = [], ms = {}, lastM = -1;
    var MN = [["Jan", "يناير"], ["Feb", "فبراير"], ["Mar", "مارس"], ["Apr", "أبريل"], ["May", "مايو"], ["Jun", "يونيو"], ["Jul", "يوليو"], ["Aug", "أغسطس"], ["Sep", "سبتمبر"], ["Oct", "أكتوبر"], ["Nov", "نوفمبر"], ["Dec", "ديسمبر"]];
    for (var d = new Date(start), i = 0; d <= today; d.setDate(d.getDate() + 1), i++) {
      var k = dkey(d), n = counts[k] || 0; total += n;
      var lvl = n === 0 ? 0 : Math.min(4, n);
      cells.push(h("i", { "class": lvl ? "l" + lvl : "", title: n + " " + tr(n === 1 ? "solve" : "solves", "حل") + " - " + k }));
      if (d.getDay() === 0 && d.getMonth() !== lastM) { ms[i / 7] = d.getMonth(); lastM = d.getMonth(); }
    }
    var mrow = h("div", { "class": "hmonths" });
    var weeks = Math.ceil(cells.length / 7);
    for (var w = 0; w < weeks; w++) { var sp = h("span", { text: ms[w] != null ? MN[ms[w]][EN() ? 0 : 1] : "" }); sp.style.gridColumn = String(w + 1); sp.style.whiteSpace = "nowrap"; mrow.appendChild(sp); }
    var grid = h("div", { "class": "heat" }); cells.forEach(function (c) { grid.appendChild(c); });
    grid.style.gridAutoColumns = "13px"; grid.style.columnGap = "3px";
    var wrap = h("div", { "class": "heatw" }, mrow, grid,
      h("div", { "class": "legend" }, h("span", { text: tr("Less", "أقل") }), h("i"), h("i", { "class": "l1" }), h("i", { "class": "l2" }), h("i", { "class": "l3" }), h("i", { "class": "l4" }), h("span", { text: tr("More", "أكتر") })));
    return { node: wrap, total: total };
  }
  function heatBox(stats) {
    var hm = heatmap(stats.times);
    return h("div", { "class": "box" }, h("h3", { text: tr("Challenge activity", "نشاط التحديات") }),
      h("div", { "class": "cnt", text: hm.total + " " + tr("solves in the last year", "حل في آخر سنة") + " · " + (stats.points || 0) + " " + tr("points", "نقطة") + (stats.rank ? " · " + tr("rank", "الترتيب") + " #" + stats.rank : "") }), hm.node);
  }

  /* ---------- viewers ---------- */
  function viewLog(a) {
    var f = h("input", { "class": "filter", type: "text", placeholder: tr("Filter lines (text, IP, user)...", "فلتر السطور (نص، IP، يوزر)..."), autocomplete: "off", spellcheck: "false" });
    var box = h("div", { "class": "logv" }), cnt = h("div", { "class": "cnt" });
    function paint() {
      var q = f.value.trim().toLowerCase(), n = 0; clear(box);
      a.lines.forEach(function (ln, i) {
        if (q && ln.toLowerCase().indexOf(q) < 0) return; n++;
        var row = h("div", null, h("i", { text: String(i + 1) }));
        if (q) { var lo = ln.toLowerCase(), p = 0, at; var s = h("span"); while ((at = lo.indexOf(q, p)) >= 0) { s.appendChild(document.createTextNode(ln.slice(p, at))); s.appendChild(h("mark", { text: ln.slice(at, at + q.length) })); p = at + q.length; } s.appendChild(document.createTextNode(ln.slice(p))); row.appendChild(s); }
        else row.appendChild(h("span", { text: ln }));
        box.appendChild(row);
      });
      cnt.textContent = n + " / " + a.lines.length + " " + tr("lines", "سطر");
    }
    f.addEventListener("input", paint); paint();
    return h("div", { "class": "art" }, f, cnt, box);
  }
  function viewHex(a) {
    var bytes = a.hex.trim().split(/\s+/).map(function (x) { return parseInt(x, 16); });
    var box = h("div", { "class": "hexv" });
    for (var o = 0; o < bytes.length; o += 16) {
      var sl = bytes.slice(o, o + 16), hx = sl.map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join(" ");
      var as = sl.map(function (b) { return b >= 32 && b < 127 ? String.fromCharCode(b) : "."; }).join("");
      box.appendChild(h("div", null, h("span", { "class": "o", text: ("00000000" + o.toString(16)).slice(-8) }), h("span", { "class": "h", text: (hx + "                                                ").slice(0, 47) }), h("span", { "class": "a", text: as })));
    }
    return h("div", { "class": "art" }, box);
  }
  function viewText(a) { return h("div", { "class": "art" }, h("div", { "class": "txtv", text: a.text })); }

  /* simulated web page: sandboxed iframe, no network (CSP), links and forms are routed by the lab, not by the browser */
  function viewWeb(a) {
    var cur = a.start || "/", srcOn = false, drafts = {};
    var bar = h("input", { type: "text", value: cur, spellcheck: "false", autocomplete: "off", autocapitalize: "off", autocorrect: "off", dir: "ltr", "aria-label": "address" });
    var frame = h("iframe", { "class": "wframe", sandbox: "allow-scripts allow-forms", referrerpolicy: "no-referrer", title: "lab page" });
    var src = h("pre", { "class": "src" }); src.style.display = "none";
    function pageOf(u) { return (a.pages && a.pages[u]) || null; }
    var glue = "<script>document.addEventListener('click',function(e){var x=e.target.closest&&e.target.closest('a[href]');if(x){e.preventDefault();parent.postMessage({ch:1,go:x.getAttribute('href')},'*')}});document.addEventListener('input',function(e){var i=e.target;if(i&&i.name)parent.postMessage({ch:1,draft:[i.name,i.value]},'*')});document.addEventListener('submit',function(e){e.preventDefault();var f=e.target,d={};[].forEach.call(f.elements,function(i){if(i.name)d[i.name]=i.value});parent.postMessage({ch:1,form:f.getAttribute('action')||'/',data:d},'*')},true)<\/script>";
    var csp = "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline'; form-action 'none'\">";
    function show(u) {
      cur = u; bar.value = u; var p = pageOf(u);
      var html = p ? p.html : (a.notfound || "<h2>404</h2>");
      src.textContent = html;
      var dk = u.split("?")[0], dv = drafts[dk] || {}, rs = Object.keys(dv).length ? "<script>(function(){var D=" + JSON.stringify(dv).replace(/</g, "\\u003c") + ";[].forEach.call(document.querySelectorAll('input[name]'),function(i){if(D[i.name]!=null)i.value=D[i.name]})})()<\/script>" : "";
      frame.srcdoc = csp + "<meta charset=utf-8>" + html + rs + glue;
    }
    function norm(u) { u = String(u || "/").trim(); if (/^[a-z]+:\/\//i.test(u)) { try { var x = new URL(u); u = x.pathname + x.search; } catch (e) {} } if (u[0] !== "/") u = "/" + u; return u; }
    function onMsg(ev) {
      if (ev.source !== frame.contentWindow || !ev.data || ev.data.ch !== 1) return;
      if (ev.data.draft) { var dk2 = cur.split("?")[0]; (drafts[dk2] = drafts[dk2] || {})[String(ev.data.draft[0]).slice(0, 40)] = String(ev.data.draft[1]).slice(0, 200); }
      else if (ev.data.go) show(norm(ev.data.go));
      else if (ev.data.form != null) {
        var f = (a.forms || {})[norm(ev.data.form)], d = ev.data.data || {}, to = f ? f["else"] : "/";
        if (f) (f.rules || []).some(function (r) { var ok = Object.keys(r.when).every(function (k) { return d[k] === r.when[k]; }); if (ok) to = r.go; return ok; });
        show(to);
      }
    }
    window.addEventListener("message", onMsg);
    bar.addEventListener("keydown", function (e) { if (e.key === "Enter") show(norm(bar.value)); });
    var go = h("button", { type: "button", text: tr("Go", "روح"), onclick: function () { show(norm(bar.value)); } });
    var sv = h("button", { type: "button", text: tr("View source", "اعرض الكود"), onclick: function () { srcOn = !srcOn; src.style.display = srcOn ? "block" : "none"; frame.style.display = srcOn ? "none" : "block"; } });
    show(cur);
    return h("div", { "class": "art web" }, h("div", { "class": "wbar" }, bar, go, sv), frame, src);
  }

  /* ---------- terminal emulator (fake filesystem, scripted commands, nothing is executed) ---------- */
  function viewTerm(a) {
    var user = a.user || "user", host = a.host || "lab", home = a.home || "/home/" + user, cwd = a.cwd || home, hist = [], hi = 0;
    var fs = {}; Object.keys(a.fs || {}).forEach(function (k) { fs[k] = a.fs[k]; });
    var dirs = { "/": 1 };
    Object.keys(fs).forEach(function (p) { var parts = p.split("/").filter(Boolean); for (var i = 1; i < parts.length; i++) dirs["/" + parts.slice(0, i).join("/")] = 1; });
    if (!dirs[home]) { var pp = home.split("/").filter(Boolean); for (var j = 1; j <= pp.length; j++) dirs["/" + pp.slice(0, j).join("/")] = 1; }
    function res(p) {
      if (!p) return cwd; if (p === "~") p = home; else if (p.indexOf("~/") === 0) p = home + p.slice(1);
      var parts = (p[0] === "/" ? p : cwd + "/" + p).split("/"), out = [];
      parts.forEach(function (s) { if (!s || s === ".") return; if (s === "..") out.pop(); else out.push(s); });
      return "/" + out.join("/");
    }
    function ls(p) { var base = p === "/" ? "/" : p + "/", seen = {}; Object.keys(fs).concat(Object.keys(dirs)).forEach(function (k) { if (k !== p && k.indexOf(base) === 0) { var rest = k.slice(base.length).split("/")[0]; if (rest) seen[rest] = dirs[base + rest] ? "d" : "f"; } }); return Object.keys(seen).sort().map(function (n) { return [n, seen[n]]; }); }
    function tok(s) { var out = [], cur = "", q = null, has = false; for (var i = 0; i < s.length; i++) { var c = s[i]; if (q) { if (c === q) q = null; else cur += c; } else if (c === "'" || c === '"') { q = c; has = true; } else if (c === " ") { if (cur || has) out.push(cur); cur = ""; has = false; } else cur += c; } if (cur || has) out.push(cur); return out; }
    function split(s) { var parts = [], cur = "", q = null; for (var i = 0; i < s.length; i++) { var c = s[i]; if (q) { cur += c; if (c === q) q = null; } else if (c === "'" || c === '"') { q = c; cur += c; } else if (c === "|") { parts.push(cur); cur = ""; } else cur += c; } parts.push(cur); return parts; }
    var out = h("div"), input = h("input", { type: "text", spellcheck: "false", autocomplete: "off", autocapitalize: "off", "aria-label": "terminal input" });
    var box = h("div", { "class": "term", onclick: function () { input.focus(); } }, out);
    var promptEl = h("span", { "class": "pr" });
    function prompt() { var d = cwd === home ? "~" : cwd; return user + "@" + host + ":" + d + "$ "; }
    function say(t, cls) { if (t === "" || t == null) return; var p = h("pre", { "class": cls || "", text: t.replace(/\n$/, "") }); out.appendChild(p); }
    var CMDS = {
      help: function () { return { o: "Available here: help ls cat cd pwd echo head tail grep wc sort uniq cut find base64 xxd rot sha256sum whoami id hostname date clear history\n" + (Object.keys(a.scripted || {}).length ? "Scripted lab commands (type them exactly):\n  " + Object.keys(a.scripted).join("\n  ") + "\n" : "") + "Pipes (|) work between commands. Nothing here touches a real system.\n" }; },
      whoami: function () { return { o: user + "\n" }; }, hostname: function () { return { o: host + "\n" }; }, id: function () { return { o: "uid=1000(" + user + ") gid=1000(" + user + ") groups=1000(" + user + ")\n" }; },
      date: function () { return { o: "Thu Nov 26 21:10:00 UTC 2026\n" }; }, pwd: function () { return { o: cwd + "\n" }; },
      echo: function (ar) { var n = ar[0] === "-n"; return { o: ar.slice(n ? 1 : 0).join(" ") + (n ? "" : "\n") }; },
      cd: function (ar) { var p = res(ar[0] || "~"); if (dirs[p]) { cwd = p; return { o: "" }; } return { e: "cd: " + (ar[0] || "") + ": No such file or directory\n" }; },
      ls: function (ar) { var long = false, all = false, paths = []; ar.forEach(function (x) { if (x[0] === "-") { if (x.indexOf("l") > 0) long = true; if (x.indexOf("a") > 0) all = true; } else paths.push(x); }); var p = res(paths[0]); if (fs[p] != null) return { o: (paths[0]) + "\n" }; if (!dirs[p]) return { e: "ls: cannot access '" + (paths[0] || "") + "': No such file or directory\n" }; var items = ls(p).filter(function (i) { return all || i[0][0] !== "."; }); return { o: long ? items.map(function (i) { return (i[1] === "d" ? "drwxr-xr-x" : "-rw-r--r--") + " 1 " + user + " " + user + " " + String(i[1] === "d" ? 4096 : (fs[(p === "/" ? "" : p) + "/" + i[0]] || "").length).padStart(5) + " Nov 26 20:00 " + i[0]; }).join("\n") + "\n" : items.map(function (i) { return i[0] + (i[1] === "d" ? "/" : ""); }).join("  ") + "\n" }; },
      cat: function (ar, inp) { if (!ar.length) return { o: inp || "" }; var o = ""; for (var i = 0; i < ar.length; i++) { var p = res(ar[i]); if (fs[p] == null) return { o: o, e: "cat: " + ar[i] + ": " + (dirs[p] ? "Is a directory" : "No such file or directory") + "\n" }; o += fs[p]; } return { o: o }; },
      head: function (ar, inp) { return lines(ar, inp, true); }, tail: function (ar, inp) { return lines(ar, inp, false); },
      wc: function (ar, inp) { var fl = ar.filter(function (x) { return x[0] === "-"; }).join(""), fa = ar.filter(function (x) { return x[0] !== "-"; }), t = inp; if (fa.length) { var p = res(fa[0]); if (fs[p] == null) return { e: "wc: " + fa[0] + ": No such file or directory\n" }; t = fs[p]; } t = t || ""; var l = (t.match(/\n/g) || []).length, w = t.split(/\s+/).filter(Boolean).length, c = t.length; var suffix = fa.length ? " " + fa[0] : ""; if (fl.indexOf("l") > -1) return { o: l + suffix + "\n" }; if (fl.indexOf("w") > -1) return { o: w + suffix + "\n" }; if (fl.indexOf("c") > -1) return { o: c + suffix + "\n" }; return { o: l + " " + w + " " + c + suffix + "\n" }; },
      grep: function (ar, inp) { var fl = "", rest = []; ar.forEach(function (x) { if (x[0] === "-" && x.length > 1 && !rest.length) fl += x.slice(1); else rest.push(x); }); if (!rest.length) return { e: "grep: missing pattern\n" }; var pat = rest[0], t = inp; if (rest[1]) { var p = res(rest[1]); if (fs[p] == null) return { e: "grep: " + rest[1] + ": No such file or directory\n" }; t = fs[p]; } var ic = fl.indexOf("i") > -1, inv = fl.indexOf("v") > -1, nn = fl.indexOf("n") > -1, re; try { re = new RegExp(pat, ic ? "i" : ""); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), ic ? "i" : ""); } var m = (t || "").split("\n").map(function (l, i) { return [l, i + 1]; }).filter(function (x, i, arr) { return !(i === arr.length - 1 && x[0] === "") && (re.test(x[0]) !== inv); }); if (fl.indexOf("c") > -1) return { o: m.length + "\n" }; return { o: m.map(function (x) { return (nn ? x[1] + ":" : "") + x[0]; }).join("\n") + (m.length ? "\n" : "") }; },
      sort: function (ar, inp) { var l = (inp || "").replace(/\n$/, "").split("\n").sort(); if (ar.indexOf("-r") > -1) l.reverse(); return { o: l.join("\n") + "\n" }; },
      uniq: function (ar, inp) { var l = (inp || "").replace(/\n$/, "").split("\n"), o = []; l.forEach(function (x) { if (!o.length || o[o.length - 1] !== x) o.push(x); }); return { o: o.join("\n") + "\n" }; },
      cut: function (ar, inp) { var d = "\t", f = 1; for (var i = 0; i < ar.length; i++) { if (ar[i] === "-d") d = ar[++i]; else if (ar[i].indexOf("-d") === 0) d = ar[i].slice(2); else if (ar[i] === "-f") f = +ar[++i]; else if (ar[i].indexOf("-f") === 0) f = +ar[i].slice(2); } return { o: (inp || "").replace(/\n$/, "").split("\n").map(function (l) { return l.split(d)[f - 1] || ""; }).join("\n") + "\n" }; },
      find: function (ar) { var p = res(ar[0] && ar[0][0] !== "-" ? ar[0] : "."), ni = ar.indexOf("-name"), pat = ni > -1 ? ar[ni + 1] : null, re = pat ? new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$") : null, all = Object.keys(fs).concat(Object.keys(dirs)).filter(function (k) { return k === p || k.indexOf(p === "/" ? "/" : p + "/") === 0; }).sort(); if (re) all = all.filter(function (k) { return re.test(k.split("/").pop()); }); return { o: all.join("\n") + (all.length ? "\n" : "") }; },
      base64: function (ar, inp) { var d = ar.indexOf("-d") > -1 || ar.indexOf("--decode") > -1, fa = ar.filter(function (x) { return x[0] !== "-"; }), t = inp; if (fa.length) { var p = res(fa[0]); if (fs[p] == null) return { e: "base64: " + fa[0] + ": No such file or directory\n" }; t = fs[p]; } t = (t || "").replace(/\s+/g, ""); try { if (d) { var bin = atob(t), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return { o: new TextDecoder().decode(u) + "\n" }; } var by = new TextEncoder().encode(t), s = ""; by.forEach(function (b) { s += String.fromCharCode(b); }); return { o: btoa(s) + "\n" }; } catch (e) { return { e: "base64: invalid input\n" }; } },
      xxd: function (ar, inp) { var rev = ar.indexOf("-r") > -1 && ar.indexOf("-p") > -1, fa = ar.filter(function (x) { return x[0] !== "-"; }), t = inp; if (fa.length) { var p = res(fa[0]); if (fs[p] == null) return { e: "xxd: " + fa[0] + ": No such file or directory\n" }; t = fs[p]; } if (!rev) return { e: "xxd: only 'xxd -r -p' is available in this lab\n" }; var hx = (t || "").replace(/\s+/g, ""); if (!/^([0-9a-f]{2})*$/i.test(hx)) return { e: "xxd: invalid hex\n" }; var by = new Uint8Array(hx.length / 2); for (var i = 0; i < by.length; i++) by[i] = parseInt(hx.substr(i * 2, 2), 16); return { o: new TextDecoder().decode(by) + "\n" }; },
      rot: function (ar, inp) { var n = parseInt(ar[0], 10); if (isNaN(n)) return { e: "usage: rot N [text]   (shifts letters forward by N)\n" }; var t = ar.length > 1 ? ar.slice(1).join(" ") : (inp || ""); n = ((n % 26) + 26) % 26; return { o: t.replace(/[a-z]/gi, function (c) { var b = c <= "Z" ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + n) % 26 + b); }).replace(/\n?$/, "\n") }; },
      rot13: function (ar, inp) { return CMDS.rot(["13"].concat(ar), inp); },
      sha256sum: async function (ar, inp) { var t = inp, nm = "-"; if (ar.length) { var p = res(ar[0]); if (fs[p] == null) return { e: "sha256sum: " + ar[0] + ": No such file or directory\n" }; t = fs[p]; nm = ar[0]; } var d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t || "")); return { o: Array.prototype.map.call(new Uint8Array(d), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("") + "  " + nm + "\n" }; },
      history: function () { return { o: hist.map(function (x, i) { return String(i + 1).padStart(4) + "  " + x; }).join("\n") + "\n" }; },
      clear: function () { clear(out); return { o: "" }; }
    };
    function lines(ar, inp, head) { var n = 10, fa = []; for (var i = 0; i < ar.length; i++) { if (ar[i] === "-n") n = +ar[++i]; else if (/^-\d+$/.test(ar[i])) n = +ar[i].slice(1); else if (ar[i][0] !== "-") fa.push(ar[i]); } var t = inp; if (fa.length) { var p = res(fa[0]); if (fs[p] == null) return { e: (head ? "head" : "tail") + ": cannot open '" + fa[0] + "'\n" }; t = fs[p]; } var l = (t || "").replace(/\n$/, "").split("\n"); return { o: (head ? l.slice(0, n) : l.slice(-n)).join("\n") + "\n" }; }
    async function run(line) {
      var raw = line.trim().replace(/\s+/g, " "); if (!raw) return;
      var sc = a.scripted || {}; if (sc[raw] != null) { say(sc[raw]); return; }
      if (/[>]|;|&&|`|\$\(/.test(raw.replace(/(["']).*?\1/g, ""))) { say("This lab shell supports pipes (|) only.", "er"); return; }
      var inp = null;
      var segs = split(line);
      for (var i = 0; i < segs.length; i++) {
        var t = tok(segs[i].trim()); if (!t.length) { say("syntax error near '|'", "er"); return; }
        var cmd = t[0], f = CMDS[cmd];
        if (!f) { say("bash: " + cmd + ": command not found" + ((sc[raw] == null && (cmd === "nmap" || cmd === "curl" || cmd === "ping")) ? "\n(In this lab only the scripted commands listed by help work.)" : ""), "er"); return; }
        var r = await f(t.slice(1), inp); if (r.e) say(r.e, "er");
        if (i === segs.length - 1) { if (r.o) say(r.o); } else inp = r.o || "";
        if (r.e && !r.o && i < segs.length - 1) return;
      }
    }
    var lineEl = h("div", { "class": "ln" }, promptEl, input);
    var busy = false;
    function setPrompt() { promptEl.textContent = prompt(); }
    input.addEventListener("keydown", async function (e) {
      if (e.key === "Enter") {
        if (busy) return; busy = true; var v = input.value; input.value = ""; if (lineEl.parentNode) lineEl.parentNode.removeChild(lineEl); out.appendChild(h("pre", null, h("span", { "class": "pr", text: prompt() }), document.createTextNode(v)));
        if (v.trim()) { hist.push(v); hi = hist.length; }
        try { await run(v); } catch (er) { say("error: " + er.message, "er"); }
        setPrompt(); busy = false; out.appendChild(lineEl); box.scrollTop = box.scrollHeight; input.focus();
      } else if (e.key === "ArrowUp") { if (hi > 0) { hi--; input.value = hist[hi]; } e.preventDefault(); }
      else if (e.key === "ArrowDown") { if (hi < hist.length) { hi++; input.value = hist[hi] || ""; } e.preventDefault(); }
      else if (e.key === "l" && e.ctrlKey) { clear(out); out.appendChild(lineEl); e.preventDefault(); }
    });
    if (a.motd) say(a.motd); setPrompt(); out.appendChild(lineEl);
    return h("div", { "class": "art" }, box);
  }

  var VIEWERS = { log: viewLog, hex: viewHex, text: viewText, web: viewWeb, term: viewTerm };

  /* ---------- pages ---------- */
  var root, state = { stats: null };
  function setTabs(active) {
    var t = h("div", { "class": "chtabs" });
    [["rooms", "#/", tr("Rooms", "الغرف")], ["board", "#/board", tr("Leaderboard", "المتصدرين")], ["me", "#/me", tr("My progress", "تقدمي")]].concat(isStaff() ? [["admin", "#/admin", tr("Manage", "الإدارة")]] : []).forEach(function (x) {
      t.appendChild(h("button", { "class": "tab" + (active === x[0] ? " on" : ""), type: "button", onclick: function () { location.hash = x[1]; } , text: x[2] }));
    });
    return t;
  }
  function progress(done, total) { var b = h("div", { "class": "bar" + (total && done >= total ? " done" : "") }, h("i")); b.firstChild.style.width = (total ? Math.round(100 * done / total) : 0) + "%"; return b; }

  async function pageRooms() {
    var cat = await rpc("ch_catalog"), stats = null;
    if (me) { try { stats = await rpc("ch_my_stats"); } catch (e) {} }
    clear(root); root.appendChild(setTabs("rooms"));
    if (!me) root.appendChild(h("div", { "class": "strip" }, h("div", null, tr("Sign in to save your progress, earn points and appear on the leaderboard.", "سجّل دخول عشان تحفظ تقدمك وتكسب نقاط وتظهر في المتصدرين."), h("br"), h("a", { href: "login.html", text: tr("Sign in", "تسجيل الدخول") }))));
    else if (stats) root.appendChild(h("div", { "class": "strip" }, h("div", null, tr("Points", "النقاط"), h("b", { text: String(stats.points || 0) })), h("div", null, tr("Solved tasks", "مهام محلولة"), h("b", { text: String(stats.solves || 0) })), h("div", null, tr("Overall rank", "الترتيب العام"), h("b", { text: stats.rank ? "#" + stats.rank : "-" }))));
    var any = false, HUES = [210, 28, 280, 150, 340, 50, 180], cards = [], bar = h("div", { "class": "fbar", role: "group", "aria-label": tr("Filter by section", "فلتر بالقسم") }), g = h("div", { "class": "rooms" }), cur = "all", fbtns = [];
    function setF(k) { cur = k; fbtns.forEach(function (x) { var on = x.k === k; x.b.className = "tab" + (on ? " on" : ""); x.b.setAttribute("aria-pressed", on ? "true" : "false"); }); cards.forEach(function (c) { c.el.style.display = (k === "all" || c.sec === k) ? "" : "none"; }); }
    function fb(k, label) { var b = h("button", { type: "button", "class": "tab", text: label, onclick: function () { setF(k); } }); fbtns.push({ k: k, b: b }); bar.appendChild(b); }
    fb("all", tr("All", "الكل"));
    cat.sections.forEach(function (s, si) {
      if (!s.rooms.length) return; any = true; fb(s.slug, pick(s, "title"));
      var hue = HUES[si % HUES.length];
      s.rooms.forEach(function (r) {
        var el = h("button", { "class": "room", type: "button", style: "--sh:" + hue, onclick: function () { location.hash = "#/room/" + r.slug; } },
          h("div", { "class": "meta" }, h("span", { "class": "stag", text: pick(s, "title") }), diffPill(r.difficulty), r.published ? null : h("span", { "class": "pill", text: tr("Draft", "مسودة") })),
          h("h3", { text: pick(r, "title") }), h("p", { text: pick(r, "summary") }), progress(r.solved, r.tasks),
          h("div", { "class": "meta", text: r.solved + " / " + r.tasks + " " + tr("solved", "اتحل") + " · " + r.points + " " + tr("pts", "نقطة") }));
        cards.push({ el: el, sec: s.slug }); g.appendChild(el);
      });
    });
    if (any) { root.appendChild(bar); root.appendChild(g); setF("all"); }
    if (!any) root.appendChild(h("div", { "class": "empty", text: tr("No rooms yet.", "مفيش غرف لسه.") }));
  }

  async function pageRoom(slug) {
    var r = await rpc("ch_room", { p_slug: slug });
    clear(root);
    if (!r) { root.appendChild(h("button", { "class": "back", onclick: function () { location.hash = "#/"; }, text: tr("< All rooms", "< كل الغرف") })); root.appendChild(h("div", { "class": "empty", text: tr("Room not found.", "الغرفة مش موجودة.") })); return; }
    var solved = r.tasks.filter(function (t) { return t.solved; }).length;
    root.appendChild(h("button", { "class": "back", type: "button", onclick: function () { location.hash = "#/"; }, text: tr("< All rooms", "< كل الغرف") }));
    root.appendChild(h("div", { "class": "roomh" }, h("div", { "class": "meta" }, diffPill(r.difficulty), r.published ? null : h("span", { "class": "pill", text: tr("Draft (only staff see it)", "مسودة (الإدارة بس تشوفها)") })), h("h2", { text: pick(r, "title") }), h("p", { text: pick(r, "summary") })));
    var left = h("div"), right = h("div");
    var body = r.body || {};
    var read = h("div", { "class": "box read" });
    (body.intro || []).forEach(function (b) {
      if (b.t === "h") read.appendChild(h("h3", { text: EN() ? b.en : (b.ar || b.en) }));
      else if (b.t === "p") read.appendChild(h("p", { text: EN() ? b.en : (b.ar || b.en) }));
      else if (b.t === "tip") read.appendChild(h("div", { "class": "tipb", text: (EN() ? b.en : (b.ar || b.en)) }));
      else if (b.t === "code") read.appendChild(h("pre", { "class": "cb", text: b.text }));
    });
    left.appendChild(read);
    var arts = body.artifacts || [];
    if (arts.length) {
      var holder = h("div", { "class": "box" }), tabs = h("div", { "class": "atabs" }), view = h("div");
      var views = [], open = function (i) { while (view.firstChild) view.removeChild(view.firstChild); [].forEach.call(tabs.children, function (b, j) { b.classList.toggle("on", i === j); }); var a = arts[i]; if (!views[i]) { var f = VIEWERS[a.type]; views[i] = f ? f(a) : h("div", { text: "?" }); } view.appendChild(views[i]); };
      if (arts.length > 1) arts.forEach(function (a, i) { tabs.appendChild(h("button", { "class": "tab", type: "button", text: pick(a, "title"), onclick: function () { open(i); } })); });
      else holder.appendChild(h("h3", { text: pick(arts[0], "title") }));
      if (arts.length > 1) holder.appendChild(tabs);
      holder.appendChild(view); left.appendChild(holder); open(0);
    }
    var tb = h("div", { "class": "box" }), cnt = h("h3");
    var total = r.tasks.reduce(function (s, t) { return s + t.points; }, 0), got = r.tasks.reduce(function (s, t) { return s + (t.solved ? t.points : 0); }, 0);
    function setCnt() { cnt.textContent = tr("Tasks", "المهام") + " · " + solved + " / " + r.tasks.length + " · " + got + " / " + total + " " + tr("pts", "نقطة"); }
    setCnt(); tb.appendChild(cnt);
    if (!me) tb.appendChild(h("div", { "class": "tipb" }, tr("Sign in to submit answers. ", "سجّل دخول عشان تبعت إجابات. "), h("a", { href: "login.html", text: tr("Sign in", "تسجيل الدخول") })));
    var cards = [];
    r.tasks.forEach(function (t, i) {
      var st = h("div", { "class": "st" }), inp = h("input", { type: "text", placeholder: tr("Your answer", "إجابتك"), maxlength: "200", autocomplete: "off", spellcheck: "false", "aria-label": tr("answer", "إجابة") });
      var btn = h("button", { "class": "btn2 f", type: "button", text: tr("Check", "تحقق") });
      var card = h("div", { "class": "task" + (t.solved ? " ok" : "") });
      function lockSolved() { card.classList.add("ok"); inp.disabled = true; btn.disabled = true; inp.value = ""; inp.placeholder = tr("Solved", "اتحلت"); st.className = "st good"; st.textContent = "✓ " + tr("Solved", "اتحلت") + " (+" + t.points + ")"; }
      async function check() {
        if (!me) { st.className = "st warn"; st.textContent = tr("Sign in first.", "سجّل دخول الأول."); return; }
        if (!inp.value.trim()) return; btn.disabled = true;
        try {
          var res = await rpc("ch_check", { p_task: t.id, p_answer: inp.value });
          if (res.status === "correct") { t.solved = true; solved++; got += t.points; setCnt(); lockSolved(); toast("+" + res.points + " " + tr("points", "نقطة") + " · " + res.total); }
          else if (res.status === "already") { t.solved = true; lockSolved(); }
          else if (res.status === "wrong") { st.className = "st bad"; st.textContent = tr("Not correct. Try again.", "مش صح. جرّب تاني."); }
          else if (res.status === "rate") { st.className = "st warn"; st.textContent = tr("Too many attempts. Wait a minute.", "محاولات كتير. استنى دقيقة."); }
          else if (res.status === "login") { st.className = "st warn"; st.textContent = tr("Sign in first.", "سجّل دخول الأول."); }
          else { st.className = "st warn"; st.textContent = tr("Cannot check this task now.", "مش قادر أتحقق من المهمة دلوقتي."); }
        } catch (e) { st.className = "st warn"; st.textContent = tr("Connection problem. Try again.", "مشكلة اتصال. جرّب تاني."); }
        if (!t.solved) btn.disabled = false;
      }
      btn.addEventListener("click", check); inp.addEventListener("keydown", function (e) { if (e.key === "Enter") check(); });
      var gd = body.modules ? null : (body.guides || [])[i];
      if (gd) {
        if (gd.learn && gd.learn.length) { var lb = h("div", { "class": "learn" }, h("h4", { text: tr("Learn", "اتعلّم") })); gd.learn.forEach(function (b) { if (b.t === "p") lb.appendChild(h("p", { text: EN() ? b.en : (b.ar || b.en) })); else if (b.t === "tip") lb.appendChild(h("div", { "class": "tipb", text: EN() ? b.en : (b.ar || b.en) })); else if (b.t === "code") lb.appendChild(h("pre", { "class": "cb", text: b.text })); }); card.appendChild(lb); }
        if (gd.how && gd.how.length) { var hl = h("ol"); gd.how.forEach(function (x) { hl.appendChild(h("li", { text: EN() ? x.en : (x.ar || x.en) })); }); card.appendChild(h("div", { "class": "howto" }, h("h4", { text: tr("How to do it in this lab", "إزاي تعملها في المعمل") }), hl)); }
      }
      card.appendChild(h("p", { "class": "q", text: (i + 1) + ". " + pick(t, "question") + "  (" + t.points + " " + tr("pts", "نقطة") + ")" }));
      card.appendChild(h("div", { "class": "row" }, inp, btn)); card.appendChild(st);
      var hint = pick(t, "hint");
      if (hint) { var hb = h("div"); hb.style.display = "none"; hb.textContent = hint; card.appendChild(h("button", { "class": "hint", type: "button", text: tr("Show hint", "اظهر تلميح"), onclick: function (e) { hb.style.display = hb.style.display === "none" ? "block" : "none"; } })); card.appendChild(hb); }
      cards[i] = card; if (t.solved) lockSolved();
    });
    var mods = body.modules || [], used = {};
    mods.forEach(function (m, mi) {
      var mb = h("div", { "class": "mod " + (m.kind || "") }, h("h3", { "class": "mh" }, h("span", { "class": "mk", text: (m.kind === "practical" ? tr("Practical", "عملي") : tr("Theory", "نظري")) }), " " + tr("Task ", "المهمة ") + (mi + 1) + ": " + pick(m, "title")));
      if (m.learn && m.learn.length) { var lb = h("div", { "class": "learn" }); m.learn.forEach(function (b) { if (b.t === "p") lb.appendChild(h("p", { text: EN() ? b.en : (b.ar || b.en) })); else if (b.t === "tip") lb.appendChild(h("div", { "class": "tipb", text: EN() ? b.en : (b.ar || b.en) })); else if (b.t === "code") lb.appendChild(h("pre", { "class": "cb", text: b.text })); }); mb.appendChild(lb); }
      if (m.how && m.how.length) { var hl = h("ul"); m.how.forEach(function (x) { hl.appendChild(h("li", { text: EN() ? x.en : (x.ar || x.en) })); }); mb.appendChild(h("div", { "class": "howto" }, h("h4", { text: tr("Lab guide", "دليل المعمل") }), hl)); }
      (m.tasks || []).forEach(function (ti) { if (cards[ti]) { mb.appendChild(cards[ti]); used[ti] = 1; } });
      tb.appendChild(mb);
    });
    cards.forEach(function (c, i) { if (!used[i]) tb.appendChild(c); });
    right.appendChild(tb);
    root.appendChild(h("div", { "class": "rg" }, left, right));
  }

  var BSEC = null;
  async function pageBoard(sec) {
    var cat = await rpc("ch_catalog"), d = await rpc("ch_leaderboard", { p_section: sec || null });
    clear(root); root.appendChild(setTabs("board"));
    var tabs = h("div", { "class": "chtabs" });
    tabs.appendChild(h("button", { "class": "tab" + (!sec ? " on" : ""), type: "button", text: tr("Overall", "الكل"), onclick: function () { BSEC = null; pageBoard(null); } }));
    cat.sections.forEach(function (s) { tabs.appendChild(h("button", { "class": "tab" + (sec === s.slug ? " on" : ""), type: "button", text: pick(s, "title"), onclick: function () { BSEC = s.slug; pageBoard(s.slug); } })); });
    root.appendChild(tabs);
    if (!d.top.length) { root.appendChild(h("div", { "class": "empty", text: tr("No solves yet. Be the first.", "مفيش حد حل لسه. كن أول واحد.") })); return; }
    var t = h("table", { "class": "lb" }, h("tr", null, h("th", { text: "#" }), h("th", { text: tr("Player", "اللاعب") }), h("th", { text: tr("Solved", "المهام") }), h("th", { text: tr("Points", "النقاط") })));
    d.top.forEach(function (x) { t.appendChild(h("tr", { "class": x.me ? "me" : "" }, h("td", { text: String(x.rank) }), h("td", { text: x.username }), h("td", { text: String(x.solves) }), h("td", { text: String(x.points) }))); });
    root.appendChild(t);
    if (d.me && !d.top.some(function (x) { return x.me; })) root.appendChild(h("p", { "class": "cnt", text: tr("Your rank: #", "ترتيبك: #") + d.me.rank + " · " + d.me.points + " " + tr("points", "نقطة") }));
  }

  async function pageMe() {
    clear(root); root.appendChild(setTabs("me"));
    if (!me) { root.appendChild(h("div", { "class": "strip" }, h("div", null, tr("Sign in to see your progress.", "سجّل دخول عشان تشوف تقدمك."), h("br"), h("a", { href: "login.html", text: tr("Sign in", "تسجيل الدخول") })))); return; }
    var s = await rpc("ch_my_stats"), cat = await rpc("ch_catalog");
    root.appendChild(h("div", { "class": "strip" }, h("div", null, tr("Points", "النقاط"), h("b", { text: String(s.points) })), h("div", null, tr("Solved tasks", "مهام محلولة"), h("b", { text: String(s.solves) })), h("div", null, tr("Overall rank", "الترتيب العام"), h("b", { text: s.rank ? "#" + s.rank : "-" }))));
    root.appendChild(heatBox(s));
    var by = {}; (s.sections || []).forEach(function (x) { by[x.section] = x; });
    var t = h("table", { "class": "lb" }, h("tr", null, h("th", { text: tr("Section", "القسم") }), h("th", { text: tr("Points", "النقاط") }), h("th", { text: tr("Rank", "الترتيب") })));
    cat.sections.forEach(function (c) { var x = by[c.slug]; t.appendChild(h("tr", null, h("td", { text: pick(c, "title") }), h("td", { text: x ? String(x.points) : "0" }), h("td", { text: x ? "#" + x.rank : "-" }))); });
    root.appendChild(t);
  }

  /* ---------- admin editor ---------- */
  var TEMPLATE = { intro: [{ t: "h", en: "Title", ar: "عنوان" }, { t: "p", en: "Reading text.", ar: "نص القراءة." }], artifacts: [{ id: "log1", type: "log", title_en: "Log", title_ar: "لوج", lines: ["line one", "line two"] }] };
  async function pageAdmin(sel) {
    if (!isStaff()) { location.hash = "#/"; return; }
    var d = await rpc("ch_admin_list");
    clear(root); root.appendChild(setTabs("admin"));
    var wrap = h("div", { "class": "adm" }); root.appendChild(wrap);
    var errs = h("div", { "class": "st" });
    function save(fn, okmsg) { return async function () { try { errs.className = "st"; errs.textContent = ""; await fn(); toast(okmsg); await pageAdmin(sel); } catch (e) { errs.className = "st bad"; errs.textContent = String((e && (e.message || e.details)) || e).slice(0, 200); } }; }
    var list = h("div", { "class": "box" }, h("h3", { text: tr("Rooms", "الغرف") }));
    var tbl = h("table", null, h("tr", null, h("th", { text: tr("Room", "الغرفة") }), h("th", { text: tr("Section", "القسم") }), h("th", { text: tr("Tasks", "المهام") }), h("th", { text: tr("Status", "الحالة") }), h("th")));
    d.rooms.forEach(function (r) { tbl.appendChild(h("tr", null, h("td", { text: pick(r, "title") }), h("td", { text: r.section }), h("td", { text: String(r.tasks.length) }), h("td", { text: r.published ? tr("Published", "منشورة") : tr("Draft", "مسودة") }), h("td", null, h("button", { "class": "btn2", type: "button", text: tr("Edit", "تعديل"), onclick: function () { pageAdmin(r.id); } })))); });
    list.appendChild(tbl); list.appendChild(h("div", { "class": "rowb" }, h("button", { "class": "btn2 f", type: "button", text: tr("New room", "غرفة جديدة"), onclick: function () { pageAdmin("new"); } }), h("button", { "class": "btn2", type: "button", text: tr("New section", "قسم جديد"), onclick: function () { pageAdmin("sec"); } })));
    wrap.appendChild(list);
    function field(label, el) { return h("div", null, h("label", { text: label }), el); }
    if (sel === "sec") {
      var sl = h("input", { type: "text", placeholder: "slug (a-z, 0-9, -)" }), se = h("input", { type: "text" }), sa = h("input", { type: "text" }), so = h("input", { type: "number", value: "10" });
      wrap.appendChild(h("div", { "class": "box" }, h("h3", { text: tr("New or edit section", "قسم جديد أو تعديل") }), field("Slug", sl), h("div", { "class": "two" }, field("Title EN", se), field("Title AR", sa)), field(tr("Sort", "الترتيب"), so),
        h("div", { "class": "rowb" }, h("button", { "class": "btn2 f", type: "button", text: tr("Save", "حفظ"), onclick: save(function () { return rpc("ch_admin_save_section", { p: { slug: sl.value.trim(), title_en: se.value, title_ar: sa.value, sort: +so.value || 0 } }); }, tr("Saved", "اتحفظ")) })), errs));
    } else if (sel) {
      var r = sel === "new" ? { id: null, section: d.sections[0] ? d.sections[0].slug : "", slug: "", title_en: "", title_ar: "", summary_en: "", summary_ar: "", difficulty: "easy", published: false, sort: 10, body: TEMPLATE, tasks: [] } : d.rooms.filter(function (x) { return x.id === sel; })[0];
      if (r) {
        var sSel = h("select"); d.sections.forEach(function (s) { sSel.appendChild(h("option", { value: s.slug, text: s.title_en, selected: s.slug === r.section })); });
        var slug = h("input", { type: "text", value: r.slug }), te = h("input", { type: "text", value: r.title_en }), ta = h("input", { type: "text", value: r.title_ar }), se2 = h("input", { type: "text", value: r.summary_en }), sa2 = h("input", { type: "text", value: r.summary_ar });
        var df = h("select"); ["easy", "medium", "hard"].forEach(function (x) { df.appendChild(h("option", { value: x, text: x, selected: x === r.difficulty })); });
        var pub = h("input", { type: "checkbox" }); pub.checked = !!r.published; var so2 = h("input", { type: "number", value: String(r.sort) });
        var bd = h("textarea", { rows: "16", spellcheck: "false" }); bd.value = JSON.stringify(r.body, null, 1);
        wrap.appendChild(h("div", { "class": "box" }, h("h3", { text: (r.id ? tr("Edit room", "تعديل الغرفة") : tr("New room", "غرفة جديدة")) }),
          h("div", { "class": "two" }, field(tr("Section", "القسم"), sSel), field("Slug", slug)), h("div", { "class": "two" }, field("Title EN", te), field("Title AR", ta)), h("div", { "class": "two" }, field("Summary EN", se2), field("Summary AR", sa2)),
          h("div", { "class": "two" }, field(tr("Difficulty", "الصعوبة"), df), field(tr("Sort", "الترتيب"), so2)),
          h("label", null, pub, " " + tr("Published (visible to everyone)", "منشورة (الكل يشوفها)")),
          field(tr("Content (JSON: intro blocks + artifacts: log, text, hex, web, term)", "المحتوى (JSON: الشرح + العناصر: log, text, hex, web, term)"), bd),
          h("div", { "class": "rowb" }, h("button", { "class": "btn2 f", type: "button", text: tr("Save room", "حفظ الغرفة"), onclick: save(function () { var b; try { b = JSON.parse(bd.value); } catch (e) { throw new Error("JSON: " + e.message); } return rpc("ch_admin_save_room", { p: { id: r.id, section: sSel.value, slug: slug.value.trim(), title_en: te.value, title_ar: ta.value, summary_en: se2.value, summary_ar: sa2.value, difficulty: df.value, published: pub.checked, sort: +so2.value || 0, body: b } }); }, tr("Saved", "اتحفظ")) }),
            r.id ? h("button", { "class": "btn2", type: "button", text: tr("Open room", "افتح الغرفة"), onclick: function () { location.hash = "#/room/" + r.slug; } }) : null,
            r.id && me.role === "owner" ? h("button", { "class": "btn2", type: "button", text: tr("Delete room", "احذف الغرفة"), onclick: save(async function () { if (!confirm(tr("Delete this room and its tasks?", "تحذف الغرفة ومهامها؟"))) throw new Error(tr("Cancelled", "اتلغى")); await rpc("ch_admin_delete", { p_kind: "room", p_id: r.id }); sel = null; }, tr("Deleted", "اتحذفت")) }) : null), errs));
        if (r.id) {
          var tk = h("div", { "class": "box" }, h("h3", { text: tr("Tasks", "المهام") + " (" + r.tasks.length + ")" }));
          function taskForm(t) {
            var qe = h("input", { type: "text", value: t.question_en || "" }), qa = h("input", { type: "text", value: t.question_ar || "" }), he = h("input", { type: "text", value: t.hint_en || "" }), ha = h("input", { type: "text", value: t.hint_ar || "" }), pt = h("input", { type: "number", value: String(t.points || 10) }), so3 = h("input", { type: "number", value: String(t.sort || 0) });
            var an = h("textarea", { rows: "3", placeholder: t.id ? tr("Leave empty to keep the current answers (" + t.answers_set + " set). One accepted answer per line to replace them.", "سيبها فاضية عشان الإجابات الحالية تفضل (" + t.answers_set + "). إجابة مقبولة في كل سطر عشان تستبدلهم.") : tr("One accepted answer per line (stored hashed, nobody can read it back).", "إجابة مقبولة في كل سطر (بتتخزن مشفّرة ومحدش يقدر يقراها).") });
            var f = h("div", { "class": "task" }, field(tr("Question EN", "السؤال EN"), qe), field(tr("Question AR", "السؤال AR"), qa), h("div", { "class": "two" }, field("Hint EN", he), field("Hint AR", ha)), h("div", { "class": "two" }, field(tr("Points", "النقاط"), pt), field(tr("Sort", "الترتيب"), so3)), field(tr("Accepted answers (write-only)", "الإجابات المقبولة (كتابة بس)"), an),
              h("div", { "class": "rowb" }, h("button", { "class": "btn2 f", type: "button", text: tr("Save task", "حفظ المهمة"), onclick: save(function () { var p = { id: t.id || null, room_id: r.id, question_en: qe.value, question_ar: qa.value, hint_en: he.value, hint_ar: ha.value, points: +pt.value || 10, sort: +so3.value || 0 }; var ans = an.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean); if (ans.length) p.answers = ans; else if (!t.id) throw new Error(tr("Add at least one answer", "ضيف إجابة واحدة على الأقل")); return rpc("ch_admin_save_task", { p: p }); }, tr("Saved", "اتحفظ")) }),
                t.id && me.role === "owner" ? h("button", { "class": "btn2", type: "button", text: tr("Delete task", "احذف المهمة"), onclick: save(async function () { if (!confirm(tr("Delete this task?", "تحذف المهمة؟"))) throw new Error(tr("Cancelled", "اتلغى")); await rpc("ch_admin_delete", { p_kind: "task", p_id: t.id }); }, tr("Deleted", "اتحذفت")) }) : null));
            return f;
          }
          r.tasks.forEach(function (t) { tk.appendChild(taskForm(t)); });
          tk.appendChild(h("h3", { text: tr("New task", "مهمة جديدة") })); tk.appendChild(taskForm({ sort: r.tasks.length + 1, points: 10 }));
          wrap.appendChild(tk);
        }
      }
    }
  }

  /* ---------- router ---------- */
  var busy = 0;
  async function render() {
    var my = ++busy;
    try {
      await init();
      if (my !== busy) return;
      var hs = location.hash || "#/", m;
      if ((m = hs.match(/^#\/room\/([a-z0-9-]+)/))) await pageRoom(m[1]);
      else if (hs.indexOf("#/board") === 0) await pageBoard(BSEC);
      else if (hs.indexOf("#/me") === 0) await pageMe();
      else if (hs.indexOf("#/admin") === 0) await pageAdmin(null);
      else await pageRooms();
    } catch (e) {
      if (my !== busy) return;
      clear(root); root.appendChild(h("div", { "class": "empty", text: tr("Could not load challenges. Check your connection and refresh.", "مقدرتش أحمّل التحديات. اتأكد من النت واعمل ريفريش.") }));
    }
  }
  function boot() {
    root = $("chroot");
    if (root) {
      window.addEventListener("hashchange", render);
      try { new MutationObserver(function () { render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (e) {}
      window.CH = { render: render };
      render();
      return;
    }
    var hb = $("chheat"); /* account page: show the contribution heatmap for the signed-in user */
    if (hb) (async function () {
      try {
        var t = token(); if (!t || !CFG.url) return;
        var r = await fetch(CFG.url + "/rest/v1/rpc/ch_my_stats", { method: "POST", headers: { "Content-Type": "application/json", apikey: CFG.anonKey, Authorization: "Bearer " + t }, body: "{}" });
        if (!r.ok) return; var s = await r.json(); if (!s) return;
        var paint = function () { clear(hb); hb.appendChild(heatBox(s)); hb.appendChild(h("a", { "class": "btn2", href: "challenges.html#/me", text: tr("Open challenges", "افتح التحديات") })); };
        paint(); try { new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (e) {}
      } catch (e) {}
    })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
