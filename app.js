/* SCARHUB account, community and admin client. All security is enforced by the database (RLS), not by this file. */
(function () {
  "use strict";
  var CFG = window.SCAR_CFG || {};
  var PAGE = document.body.getAttribute("data-page") || "";
  var EN = function () { return document.documentElement.lang !== "ar"; };
  var tr = function (en, ar) { return EN() ? en : ar; };
  var sb = null, me = null, recovering = false;
  var EMAIL_RE = /^(?=.{6,254}$)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
  var USER_RE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/, ALIAS_RE = /^[A-Za-z][A-Za-z0-9_ ]{2,24}$/;
  function pwProblems(p) {
    var r = [];
    if (p.length < 12 || p.length > 64) r.push(tr("12 to 64 characters", "من 12 لـ 64 حرف"));
    if (!/[A-Za-z]/.test(p)) r.push(tr("a letter", "حرف"));
    if (!/[0-9]/.test(p)) r.push(tr("a number", "رقم"));
    if (!/[^A-Za-z0-9]/.test(p)) r.push(tr("a symbol", "رمز"));
    return r;
  }
  function h(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) { if (k === "text") e.textContent = attrs[k]; else if (k === "on") { for (var ev in attrs.on) e.addEventListener(ev, attrs.on[ev]); } else e.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return e;
  }
  var $ = function (id) { return document.getElementById(id); };
  function say(el, text, kind) { el.className = "msg " + (kind || ""); el.textContent = text; }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  /* avatars: b1-b8 boys, g1-g8 girls, generated SVG */
  var SKIN = ["#f1c9a5", "#e0a97d", "#c58c5c", "#8d5a3b"], HAIR = ["#1b1b1b", "#4a2c17", "#8a5a2b", "#c9a04a", "#7a1f1f", "#2f3d5a", "#3c3c3c", "#0e0e0e"], BG = ["#2a1215", "#122a24", "#12202a", "#2a2412"];
  var avN = 0;
  function avatarSvg(code, uid) {
    if (code === "custom" && uid) return h("img", { src: CFG.url + "/storage/v1/object/public/avatars/" + uid + "/avatar", alt: "", style: "width:100%;height:100%;border-radius:50%;object-fit:cover;display:block" });
    if (code === "custom") code = "b1";
    var NS = "http://www.w3.org/2000/svg", girl = code[0] === "g", n = (parseInt(code.slice(1), 10) || 1) - 1;
    var s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 64 64"); s.setAttribute("aria-hidden", "true");
    function add(tag, a, par) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); (par || s).appendChild(e); return e; }
    var SK = ["#f6d3b3", "#e8b88f", "#c68a5e", "#8c5a3c"], HR = ["#1c1917", "#3b2314", "#6b4423", "#b9893b", "#7c2d12", "#27324a", "#4b5563", "#0c0a09"];
    var CL = ["#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1"], BGS = ["#fde2e4", "#dbeafe", "#dcfce7", "#ede9fe", "#fef3c7", "#fce7f3", "#ccfbf1", "#e0e7ff"];
    var skin = SK[[0, 1, 2, 3, 1, 0, 2, 1][n]], hair = HR[(n * 3 + (girl ? 2 : 0)) % 8], shirt = CL[(n + (girl ? 3 : 0)) % 8], bg = BGS[(n + (girl ? 4 : 0)) % 8];
    var id = "avc" + (++avN), defs = add("defs", {}), cp = add("clipPath", { id: id }, defs); add("circle", { cx: 32, cy: 32, r: 32 }, cp);
    var g = add("g", { "clip-path": "url(#" + id + ")" });
    function A(tag, a) { return add(tag, a, g); }
    var hijab = girl && (n === 3 || n === 7), hc = hijab ? CL[(n + 1) % 8] : hair;
    A("rect", { width: 64, height: 64, fill: bg });
    if (girl && !hijab) {
      if (n === 0 || n === 6) A("path", { d: "M17 30c0-14 6-19 15-19s15 5 15 19v24H17z", fill: hair });
      if (n === 1) A("path", { d: "M17 30c0-14 6-19 15-19s15 5 15 19v8H17z", fill: hair });
      if (n === 4) [[19, 22], [17, 31], [19, 40], [45, 22], [47, 31], [45, 40], [26, 15], [32, 13], [38, 15]].forEach(function (c) { A("circle", { cx: c[0], cy: c[1], r: 5.5, fill: hair }); });
    }
    if (hijab) A("path", { d: "M15 32c0-16 7-22 17-22s17 6 17 22c0 9-3 15-7 19H22c-4-4-7-10-7-19z", fill: hc });
    A("path", { d: hijab ? "M8 64c1-10 9-15 24-15s23 5 24 15z" : "M8 64c1-12 10-17 24-17s23 5 24 17z", fill: hijab ? hc : shirt });
    if (!hijab) A("path", { d: "M26 47l6 6 6-6", fill: "none", stroke: "rgba(0,0,0,.18)", "stroke-width": 1.6, "stroke-linejoin": "round" });
    A("rect", { x: 28, y: 39, width: 8, height: 11, rx: 3, fill: skin }); A("rect", { x: 28, y: 39, width: 8, height: 4, fill: "rgba(0,0,0,.1)" });
    if (!hijab) { A("circle", { cx: 20.3, cy: 30, r: 2.6, fill: skin }); A("circle", { cx: 43.7, cy: 30, r: 2.6, fill: skin }); }
    A("ellipse", { cx: 32, cy: 29, rx: hijab ? 10.5 : 12, ry: hijab ? 12.5 : 13.5, fill: skin });
    var fr = "M19.5 29c0-11 5-15.5 12.5-15.5S44.5 18 44.5 29c-3.5-5-7.5-7-12.5-7s-9 2-12.5 7z";
    if (hijab) A("path", { d: "M20.5 30c0-9 5-14 11.5-14s11.5 5 11.5 14c-3-5-7-7-11.5-7s-8.5 2-11.5 7z", fill: hc });
    else if (girl) { A("path", { d: fr, fill: hair }); if (n === 2) { A("path", { d: "M44 22c8 0 10 9 6 17-1-6-3-9-6-11z", fill: hair }); A("circle", { cx: 45.5, cy: 23, r: 2, fill: shirt }); } if (n === 5) A("circle", { cx: 32, cy: 11.5, r: 5.5, fill: hair }); }
    else {
      if (n === 0 || n === 5) A("path", { d: "M20 27.5c0-10.5 5-14.5 12-14.5s12 4 12 14.5c-3-4.5-7-6.5-12-6.5s-9 2-12 6.5z", fill: hair });
      if (n === 1 || n === 6) A("path", { d: "M19.5 28c-1-11.5 5-15.5 13-15.5 7.5 0 12 4.5 11.5 13.5-2-5-6-7.5-10.5-7.5-5 0-10 3-14 9.5z", fill: hair });
      if (n === 2) [[22, 21], [27, 16.5], [33, 15.5], [39, 17], [43, 22], [20, 27], [44, 27]].forEach(function (c) { A("circle", { cx: c[0], cy: c[1], r: 5, fill: hair }); });
      if (n === 3) A("path", { d: "M20.5 26c0-9 5-12.5 11.5-12.5S43.5 17 43.5 26c-4-2.5-7-3.5-11.5-3.5s-7.5 1-11.5 3.5z", fill: hair, opacity: ".85" });
      if (n === 4) A("path", { d: "M18.5 33c-2.5-14 3-20 13.5-20s16 6 13.5 20c-1-8-4.5-12.5-13.5-12.5s-12.5 4.5-13.5 12.5z", fill: hair });
      if (n === 5) A("path", { d: "M20.5 31c0 11 5 16.5 11.5 16.5s11.5-5.5 11.5-16.5c-1 3.5-3.5 5.5-6 6.5-2-1.8-3.8-2.2-5.5-2.2s-3.5.4-5.5 2.2c-2.5-1-5-3-6-6.5z", fill: hair });
      if (n === 7) { A("path", { d: "M19 26c0-9.5 6-13.5 13-13.5S45 16.5 45 26z", fill: "#1f2937" }); A("path", { d: "M31 25.5h15q2.5 0 2.5 2.2H31z", fill: "#1f2937" }); }
    }
    A("path", { d: "M24 25.8q3-1.8 6 0", fill: "none", stroke: "#2b2118", "stroke-width": 1.4, "stroke-linecap": "round" }); A("path", { d: "M34 25.8q3-1.8 6 0", fill: "none", stroke: "#2b2118", "stroke-width": 1.4, "stroke-linecap": "round" });
    A("ellipse", { cx: 27, cy: 29.5, rx: 1.7, ry: 2.1, fill: "#1f2937" }); A("ellipse", { cx: 37, cy: 29.5, rx: 1.7, ry: 2.1, fill: "#1f2937" });
    A("circle", { cx: 27.6, cy: 28.8, r: 0.6, fill: "#fff" }); A("circle", { cx: 37.6, cy: 28.8, r: 0.6, fill: "#fff" });
    A("path", { d: "M32 30.5v4q-1.8 1.2-2.8.4", fill: "none", stroke: "rgba(0,0,0,.28)", "stroke-width": 1.2, "stroke-linecap": "round" });
    A("circle", { cx: 24.5, cy: 34.5, r: 2.4, fill: "#f43f5e", opacity: ".15" }); A("circle", { cx: 39.5, cy: 34.5, r: 2.4, fill: "#f43f5e", opacity: ".15" });
    A("path", { d: "M28.5 38q3.5 2.8 7 0", fill: "none", stroke: !girl && n === 5 ? "#f5d5c5" : "#a8453a", "stroke-width": 1.5, "stroke-linecap": "round" });
    if (n === 6) { A("circle", { cx: 27, cy: 29.5, r: 4.4, fill: "rgba(255,255,255,.15)", stroke: "#111827", "stroke-width": 1.2 }); A("circle", { cx: 37, cy: 29.5, r: 4.4, fill: "rgba(255,255,255,.15)", stroke: "#111827", "stroke-width": 1.2 }); A("path", { d: "M31.4 29.5h1.2", stroke: "#111827", "stroke-width": 1.2 }); }
    return s;
  }
  function avatarSvgOld(code) {
    var NS = "http://www.w3.org/2000/svg", girl = code[0] === "g", n = parseInt(code.slice(1), 10) - 1;
    var s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 64 64"); s.setAttribute("aria-hidden", "true");
    function add(tag, a) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); s.appendChild(e); return e; }
    var hair = HAIR[n % 8], skin = SKIN[n % 4];
    add("rect", { width: 64, height: 64, fill: BG[n % 4] });
    if (girl) { add("path", { d: "M14 58V30a18 18 0 0 1 36 0v28z", fill: hair }); }
    add("path", { d: "M10 64c2-14 12-18 22-18s20 4 22 18z", fill: ["#e11d2e", "#3b82f6", "#10b981", "#a855f7"][(n + 1) % 4] });
    add("circle", { cx: 32, cy: 30, r: 13, fill: skin });
    if (girl) add("path", { d: "M18 30c0-12 8-16 15-16s13 5 13 16c-4-6-9-8-14-8s-10 2-14 8z", fill: hair });
    else if (n % 3 === 0) add("path", { d: "M19 28c0-10 6-14 13-14s13 4 13 14c-5-4-9-5-13-5s-8 1-13 5z", fill: hair });
    else if (n % 3 === 1) add("path", { d: "M19 26c2-9 8-12 13-12s11 3 13 12c-6-2-9-6-13-6s-7 4-13 6z", fill: hair });
    else add("rect", { x: 19, y: 15, width: 26, height: 8, rx: 4, fill: hair });
    add("circle", { cx: 27, cy: 31, r: 1.6, fill: "#111" }); add("circle", { cx: 37, cy: 31, r: 1.6, fill: "#111" });
    add("path", { d: "M28 37q4 3 8 0", stroke: "#111", "stroke-width": 1.6, fill: "none", "stroke-linecap": "round" });
    return s;
  }
  function avatarBtn(code, pressed, onclick) {
    var b = h("button", { type: "button", "class": "av", "aria-label": "Avatar " + code, "aria-pressed": pressed ? "true" : "false" }, avatarSvg(code));
    if (onclick) b.addEventListener("click", onclick); return b;
  }
  function avatarPicker(box, initial, onpick) {
    var cur = initial; clear(box);
    function draw() { clear(box); ["b", "g"].forEach(function (g) { for (var i = 1; i <= 8; i++) (function (c) { box.appendChild(avatarBtn(c, c === cur, function () { cur = c; onpick(c); draw(); })); })(g + i); }); }
    draw(); return function () { return cur; };
  }

  function off(msg) {
    var m = $("app") || document.querySelector("section");
    clear(m); m.appendChild(h("div", { "class": "off" }, h("b", { text: tr("Accounts are not switched on yet.", "الحسابات لسه ما اتفعلتش.") }), h("p", { text: msg || tr("The backend is not connected. The owner must create the Supabase project and fill config.js first.", "الباك إند مش متوصل. المالك لازم يعمل مشروع Supabase ويملا config.js الأول.") })));
  }

  async function load() {
    if (!CFG.url || !CFG.anonKey || !window.supabase) { if (PAGE !== "tools" && PAGE) off(); return false; }
    sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" } });
    sb.auth.onAuthStateChange(function (ev) { if (ev === "PASSWORD_RECOVERY") recovering = true; });
    var cm = PAGE === "login" ? location.search.match(/[?&]code=([^&]+)/) : null;
    if (cm) { try { await sb.auth.exchangeCodeForSession(decodeURIComponent(cm[1])); } catch (e) {} history.replaceState(null, "", location.pathname); }
    var s = (await sb.auth.getSession()).data.session;
    if (s) {
      var r = await sb.from("profiles").select("id,email,username,alias,avatar,role,status").eq("id", s.user.id).maybeSingle();
      me = r.data && r.data.status === "active" ? r.data : null;
      if (!me) await sb.auth.signOut();
    }
    return true;
  }
  var isStaff = function () { return me && (me.role === "owner" || me.role === "admin"); };
  var go = function (u) { location.href = u; };

  /* ---------- in-site inbox ---------- */
  function noteText(n) {
    var m = n.meta || {}, plan = m.plan ? " (" + m.plan + ")" : "", until = m.until ? new Date(m.until).toLocaleDateString(EN() ? "en-GB" : "ar-EG") : "";
    if (n.kind === "free_plan_granted") return tr("You received a free subscription from the owner" + plan + "." + (until ? " Valid until " + until + "." : ""), "حصلت على اشتراك مجاني من المالك" + plan + "." + (until ? " صالح لحد " + until + "." : ""));
    if (n.kind === "free_plan_revoked") return tr("The owner ended your free subscription" + plan + ".", "المالك أنهى اشتراكك المجاني" + plan + ".");
    return "";
  }
  async function loadNotes() {
    var r = await sb.from("notifications").select("id,kind,meta,read_at,created_at").order("created_at", { ascending: false }).limit(50);
    return r.error ? [] : (r.data || []);
  }
  async function inboxPanel(box) {
    var list = await loadNotes(), p = h("div", { "class": "panel", id: "inbox" }, h("h2", { text: tr("Inbox", "صندوق الرسائل") }));
    box.appendChild(p);
    if (!list.length) { p.appendChild(h("p", { "class": "hint", text: tr("No messages yet.", "مفيش رسايل لسه.") })); return; }
    list.forEach(function (n) {
      p.appendChild(h("div", { "class": "row", style: "flex-direction:column;align-items:flex-start;gap:2px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)" + (n.read_at ? "" : ";border-inline-start:3px solid var(--r);padding-inline-start:8px") },
        h("span", { text: noteText(n) }), h("span", { "class": "hint", text: new Date(n.created_at).toLocaleString(EN() ? "en-GB" : "ar-EG") })));
    });
    if (list.some(function (n) { return !n.read_at; })) { await sb.rpc("mark_notifications_read"); var d = document.getElementById("inboxdot"); if (d) d.remove(); var il = document.getElementById("inboxlink"); if (il) il.textContent = tr("Inbox", "الرسائل"); }
  }

  /* ---------- signed-in look on every page: avatar chip in the header and a different background ---------- */
  function inMode() {
    if (!me || document.getElementById("inmode")) return;
    var st = document.createElement("style"); st.id = "inmode";
    st.textContent = "html.in body{background:radial-gradient(1100px 560px at 15% -10%,#3b2c0a 0,transparent 55%),radial-gradient(900px 500px at 90% 0,#2a0b10 0,transparent 60%),#0b0a08}html.in nav{border-bottom:1px solid #c9a22799;box-shadow:0 2px 18px #c9a22722}.chip{display:inline-flex;align-items:center;gap:8px;padding:3px 14px 3px 4px;border:1px solid #c9a227;border-radius:30px;color:#f0d98a;text-decoration:none;font-size:14px;white-space:nowrap}.chip svg,.chip img{width:30px;height:30px;border-radius:50%;display:block}.chip:hover{background:#c9a22722}";
    document.head.appendChild(st); document.documentElement.classList.add("in");
    var nav = document.getElementById("nav"); if (!nav) return;
    var chip = h("a", { "class": "chip", href: "account.html", title: tr("My account", "حسابي") }, avatarSvg(me.avatar, me.id), h("span", { text: isStaff() ? me.alias : me.username }));
    var lg = document.getElementById("lang"); if (lg && lg.parentNode === nav) nav.insertBefore(chip, lg); else nav.appendChild(chip);
  }

  /* ---------- side menu ---------- */
  function sideMenu() {
    if (!me) return;
    var scrim = h("div", { "class": "scrim" }), side = h("nav", { "class": "side", "aria-label": "Account", id: "side" });
    var btn = h("button", { "class": "acct", type: "button", "aria-label": tr("Account menu", "قائمة الحساب"), "aria-expanded": "false" }, avatarSvg(me.avatar, me.id));
    function toggle(o) { side.classList.toggle("open", o); scrim.classList.toggle("open", o); btn.setAttribute("aria-expanded", o ? "true" : "false"); }
    btn.addEventListener("click", function () { toggle(!side.classList.contains("open")); }); scrim.addEventListener("click", function () { toggle(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
    side.appendChild(h("p", { text: (isStaff() ? me.alias : me.username) + (me.role === "owner" ? " (owner)" : "") }));
    [["account.html", tr("My account", "حسابي")], ["community.html", tr("Community", "المجتمع")], ["tools.html", tr("Tools", "الأدوات")]].forEach(function (l) { side.appendChild(h("a", { href: l[0], text: l[1] })); });
    var inl = h("a", { href: "account.html#inbox", id: "inboxlink", text: tr("Inbox", "الرسائل") }); side.appendChild(inl);
    loadNotes().then(function (l) {
      var n = l.filter(function (x) { return !x.read_at; }).length; if (!n) return;
      inl.textContent = tr("Inbox", "الرسائل") + " (" + n + ")";
      btn.appendChild(h("span", { id: "inboxdot", text: String(n), style: "position:absolute;top:-6px;inset-inline-start:-6px;min-width:20px;height:20px;border-radius:10px;background:#d22;color:#fff;font:700 12px/20px sans-serif;text-align:center;padding:0 4px" }));
    });
    if (isStaff()) side.appendChild(h("a", { href: "admin.html", text: tr("Admin panel", "لوحة الإدارة") }));
    if (isStaff()) side.appendChild(h("a", { href: "admin.html#manage", text: tr("Manage tools", "إدارة الأدوات") }));
    side.appendChild(h("button", { type: "button", text: tr("Edit profile", "تعديل البروفايل"), on: { click: function () { go("account.html#edit"); } } }));
    side.appendChild(h("button", { type: "button", text: tr("Sign out", "تسجيل الخروج"), on: { click: async function () { await sb.auth.signOut(); go("index.html"); } } }));
    side.appendChild(h("button", { type: "button", "class": "danger", text: tr("Delete account", "حذف الحساب"), on: { click: function () { go("account.html#delete"); } } }));
    document.body.appendChild(scrim); document.body.appendChild(side); document.body.appendChild(btn);
    var mainEl = document.getElementById("main");
    if (mainEl) {
      var bar = h("div", { "class": "wide", style: "display:flex;gap:8px;flex-wrap:wrap;margin:10px auto 0" }), here = location.pathname.split("/").pop() || "index.html";
      [["account.html", "My account", "حسابي"], ["community.html", "Community", "المجتمع"], ["tools.html", "Tools", "الأدوات"]].concat(isStaff() ? [["admin.html", "Admin panel", "لوحة الإدارة"], ["admin.html#manage", "Manage tools", "إدارة الأدوات"]] : []).forEach(function (l) { bar.appendChild(h("a", { "class": "btn" + (here === l[0] ? " f" : ""), href: l[0], text: tr(l[1], l[2]) })); });
      bar.appendChild(h("a", { "class": "btn", href: "account.html#edit", text: tr("Edit profile", "تعديل البروفايل") }));
      bar.appendChild(h("button", { "class": "btn", type: "button", text: tr("Sign out", "تسجيل الخروج"), on: { click: async function () { await sb.auth.signOut(); go("index.html"); } } }));
      mainEl.insertBefore(bar, mainEl.children[1] || null);
    }
  }

  /* ---------- login ---------- */
  function loginPage() {
    var app = $("app"), mode = "in", pending = null;
    var email = h("input", { type: "email", id: "em", autocomplete: "email", maxlength: "254", required: "" });
    var pw = h("input", { type: "password", id: "pw", autocomplete: "current-password", maxlength: "64", required: "" });
    var uname = h("input", { type: "text", id: "un", autocomplete: "username", maxlength: "20" });
    var emHint = h("div", { "class": "hint" }), pwHint = h("div", { "class": "hint" }), unHint = h("div", { "class": "hint" });
    var avBox = h("div", { "class": "avatars" }), pick = null, avatar = "b1";
    var code = h("input", { type: "text", id: "otp", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "8" });
    var msg = h("div", { "class": "msg", role: "status", "aria-live": "polite" });
    var main = h("button", { "class": "btn f", type: "submit" }), tabIn = h("button", { "class": "btn", type: "button" }), tabUp = h("button", { "class": "btn", type: "button" });
    var upBox = h("div"), codeBox = h("div", { style: "display:none" }), form = h("form", { novalidate: "" });
    upBox.appendChild(h("label", { "for": "un", text: tr("Username (3-20: letters, numbers, _)", "اسم المستخدم (3-20: حروف وأرقام و _)") })); upBox.appendChild(uname); upBox.appendChild(unHint);
    upBox.appendChild(h("label", { text: tr("Choose an avatar", "اختار صورة") })); upBox.appendChild(avBox);
    codeBox.appendChild(h("label", { "for": "otp", text: tr("Verification code from your email", "كود التأكيد من الإيميل") })); codeBox.appendChild(code); var rsb = h("button", { type: "button", "class": "btn", style: "margin-top:10px", text: tr("Resend code", "ابعت الكود تاني") }); rsb.onclick = async function () { var ctr = takeCaptcha(); if (!ctr) return say(msg, tr("Please complete the check below first.", "كمّل التحقق اللي تحت الأول."), "err"); rsb.disabled = true; var rr = await sb.auth.resend({ type: "signup", email: pending, options: { captchaToken: ctr } }); setTimeout(function () { rsb.disabled = false; }, 30000); say(msg, rr.error ? tr("Could not resend. Wait a minute and try again.", "ماقدرناش نبعت تاني. استنى دقيقة وجرب.") : tr("New code sent.", "بعتنالك كود جديد."), rr.error ? "err" : "ok"); }; codeBox.appendChild(rsb);
    var cap = h("div", { id: "cap" }), capId = null, capTok = null;
    new Promise(function (ok) { if (window.turnstile) return ok(); var s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = ok; s.onerror = ok; document.head.appendChild(s); }).then(function () { if (!window.turnstile || !CFG.turnstileSiteKey) return; capId = window.turnstile.render(cap, { sitekey: CFG.turnstileSiteKey, callback: function (x) { capTok = x; }, "expired-callback": function () { capTok = null; }, "error-callback": function () { capTok = null; } }); });
    function takeCaptcha() { var x = capTok; if (x) { capTok = null; setTimeout(function () { window.turnstile.reset(capId); }, 0); } return x; }
    form.appendChild(h("label", { "for": "em", text: tr("Email", "الإيميل") })); form.appendChild(email); form.appendChild(emHint);
    form.appendChild(h("div", { id: "pwwrap" }, h("label", { "for": "pw", text: tr("Password (12-64: letters, numbers, symbols)", "الباسورد (12-64: حروف وأرقام ورموز)") }), pw, pwHint));
    form.appendChild(upBox); form.appendChild(codeBox); form.appendChild(cap); form.appendChild(h("div", { "class": "row" }, main)); form.appendChild(msg);
    var forgot = h("button", { "class": "btn", type: "button", text: tr("Forgot password?", "نسيت الباسورد؟") });
    forgot.onclick = async function () {
      var fe = email.value.trim(); if (!EMAIL_RE.test(fe)) return say(msg, tr("Enter your email first.", "اكتب إيميلك الأول."), "err");
      var fc = takeCaptcha(); if (!fc) return say(msg, tr("Please complete the check above first.", "كمّل التحقق اللي فوق الأول."), "err");
      forgot.disabled = true;
      var rr = await sb.auth.resetPasswordForEmail(fe, { captchaToken: fc, redirectTo: location.origin + location.pathname.replace(/[^/]*$/, "") + "login.html" });
      forgot.disabled = false;
      if (rr.error) return say(msg, tr("Could not send the email.", "ماقدرناش نبعت الإيميل.") + " [" + (rr.error.code || rr.error.status || "error") + "]", "err");
      say(msg, tr("If an account exists for that email, we sent a reset link.", "لو في حساب بالإيميل ده، بعتنا لينك إعادة الباسورد."), "ok");
    };
    form.appendChild(h("div", { "class": "row" }, forgot));
    pick = avatarPicker(avBox, avatar, function (c) { avatar = c; });
    function setMode(m) {
      mode = m; upBox.style.display = m === "up" ? "" : "none"; codeBox.style.display = m === "code" ? "" : "none"; $("pwwrap").style.display = m === "code" ? "none" : "";
      pw.autocomplete = m === "up" ? "new-password" : "current-password";
      main.textContent = m === "in" ? tr("Sign in", "دخول") : m === "up" ? tr("Create account", "إنشاء حساب") : tr("Verify email", "تأكيد الإيميل");
      forgot.style.display = m === "in" ? "" : "none"; tabIn.setAttribute("aria-pressed", m === "in"); tabUp.setAttribute("aria-pressed", m === "up"); say(msg, "");
    }
    tabIn.textContent = tr("Sign in", "دخول"); tabUp.textContent = tr("Sign up", "حساب جديد");
    tabIn.onclick = function () { setMode("in"); }; tabUp.onclick = function () { setMode("up"); };
    email.addEventListener("input", function () { var ok = EMAIL_RE.test(email.value.trim()); emHint.textContent = email.value ? (ok ? "OK" : tr("Not a valid email", "إيميل غير صحيح")) : ""; emHint.className = "hint " + (ok ? "good" : "bad"); });
    pw.addEventListener("input", function () { if (mode !== "up") return; var p = pwProblems(pw.value); pwHint.textContent = p.length ? tr("Needs: ", "ناقص: ") + p.join(", ") : "OK"; pwHint.className = "hint " + (p.length ? "bad" : "good"); });
    uname.addEventListener("input", function () { var ok = USER_RE.test(uname.value); unHint.textContent = uname.value ? (ok ? "OK" : tr("3-20 chars, start with a letter", "3-20 حرف وتبدأ بحرف")) : ""; unHint.className = "hint " + (ok ? "good" : "bad"); });
    form.addEventListener("submit", async function (e) {
      e.preventDefault(); main.disabled = true; say(msg, "...");
      try {
        var em = email.value.trim();
        if (mode === "code") {
          var v = await sb.auth.verifyOtp({ email: pending, token: code.value.trim(), type: "signup" });
          if (v.error) return say(msg, tr("Wrong or expired code.", "الكود غلط أو منتهي."), "err");
          return go("account.html");
        }
        if (!EMAIL_RE.test(em)) return say(msg, tr("Enter a valid email.", "اكتب إيميل صحيح."), "err");
        if (mode === "up") {
          var pr = pwProblems(pw.value); if (pr.length) return say(msg, tr("Password needs: ", "الباسورد ناقص: ") + pr.join(", "), "err");
          if (!USER_RE.test(uname.value)) return say(msg, tr("Invalid username.", "اسم مستخدم غير صحيح."), "err");
          var ct = takeCaptcha(); if (!ct) return say(msg, tr("Please complete the check above first.", "كمّل التحقق اللي فوق الأول."), "err");
          var r = await sb.auth.signUp({ email: em, password: pw.value, options: { captchaToken: ct, emailRedirectTo: location.origin + location.pathname.replace(/[^/]*$/, "") + "login.html", data: { username: uname.value, avatar: pick() } } });
          if (r.error) return say(msg, tr("Could not create the account. The email or username may already be used.", "ماقدرناش نعمل الحساب. الإيميل أو الاسم ممكن يكونوا مستخدمين.") + " [" + (r.error.code || r.error.status || "error") + "]", "err");
          pending = em; setMode("code"); return say(msg, tr("We sent a verification code to your email. Enter it below to confirm your account. Check spam if you do not see it.", "بعتنالك كود تأكيد على الإيميل. اكتبه تحت عشان تأكد حسابك. بص في السبام لو مش لاقيه."), "ok");
        }
        var ct2 = takeCaptcha(); if (!ct2) return say(msg, tr("Please complete the check above first.", "كمّل التحقق اللي فوق الأول."), "err");
        var s = await sb.auth.signInWithPassword({ email: em, password: pw.value, options: { captchaToken: ct2 } });
        if (s.error) return say(msg, tr("Wrong email or password.", "الإيميل أو الباسورد غلط.") + (s.error.code && s.error.code !== "invalid_credentials" ? " [" + s.error.code + "]" : ""), "err");
        go("account.html");
      } finally { main.disabled = false; }
    });
    clear(app); app.appendChild(h("div", { "class": "auth" }, h("h2", { text: tr("Welcome to SCARHUB", "أهلاً في SCARHUB") }), h("div", { "class": "tabs" }, tabIn, tabUp), form));
    setMode("in");
  }

  function resetPage() {
    var app = $("app"), p1 = h("input", { type: "password", id: "np", autocomplete: "new-password", maxlength: "64", required: "" });
    var hint = h("div", { "class": "hint" }), msg = h("div", { "class": "msg", role: "status", "aria-live": "polite" });
    var btn = h("button", { "class": "btn f", type: "submit", text: tr("Set new password", "حط الباسورد الجديد") }), form = h("form", { novalidate: "" });
    p1.addEventListener("input", function () { var q = pwProblems(p1.value); hint.textContent = q.length ? tr("Needs: ", "ناقص: ") + q.join(", ") : "OK"; hint.className = "hint " + (q.length ? "bad" : "good"); });
    form.appendChild(h("label", { "for": "np", text: tr("New password (12-64: letters, numbers, symbols)", "الباسورد الجديد (12-64: حروف وأرقام ورموز)") })); form.appendChild(p1); form.appendChild(hint);
    form.appendChild(h("div", { "class": "row" }, btn)); form.appendChild(msg);
    form.addEventListener("submit", async function (e) {
      e.preventDefault(); var q = pwProblems(p1.value); if (q.length) return say(msg, tr("Password needs: ", "الباسورد ناقص: ") + q.join(", "), "err");
      btn.disabled = true; var u = await sb.auth.updateUser({ password: p1.value }); btn.disabled = false;
      if (u.error) return say(msg, tr("Could not change the password.", "ماقدرناش نغير الباسورد.") + " [" + (u.error.code || u.error.status || "error") + "]", "err");
      await sb.auth.signOut(); say(msg, tr("Password changed. Taking you to sign in...", "الباسورد اتغير. هنوديك لتسجيل الدخول..."), "ok"); setTimeout(function () { go("login.html"); }, 1500);
    });
    clear(app); app.appendChild(h("div", { "class": "auth" }, h("h2", { text: tr("Choose a new password", "اختار باسورد جديد") }), form));
  }

  /* ---------- account ---------- */
  /* manual Vodafone Cash payment: customer sends money, uploads proof, owner approves in Admin. Amount and plan are checked by the database. */
  async function manualForm(p, box, msg) {
    clear(box); var ins = await sb.rpc("manual_instructions"), i = (ins.data || [])[0];
    if (!i) return say(msg, tr("Manual payment is not available right now.", "الدفع اليدوي مش متاح دلوقتي."), "err");
    var ref = h("input", { type: "text", maxlength: "40", placeholder: tr("Transaction id or your sending number", "رقم العملية أو رقم الموبايل اللي حولت منه") }), file = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp" });
    box.appendChild(h("div", { "class": "panel" },
      h("p", { text: tr("1. Send exactly ", "1. حوّل بالظبط ") + (p.price_minor / 100).toFixed(2) + " " + p.currency + tr(" by Vodafone Cash to ", " بفودافون كاش على ") + i.wallet_number + " (" + i.holder_name + ")" }),
      i.note ? h("p", { "class": "hint", text: i.note }) : null,
      h("p", { text: tr("2. Enter the transaction id and attach a screenshot (JPG, PNG or WebP, max 5 MB).", "2. اكتب رقم العملية وارفق صورة التحويل (JPG أو PNG أو WebP، 5 ميجا بحد أقصى).") }), ref, file,
      h("div", { "class": "row" }, h("button", { "class": "btn f", type: "button", text: tr("Send for approval", "ابعت للمراجعة"), on: { click: async function () {
        var f = file.files[0]; if (!f || !/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 5242880) return say(msg, tr("Attach a JPG, PNG or WebP image up to 5 MB.", "ارفق صورة JPG أو PNG أو WebP لحد 5 ميجا."), "err");
        if (!/^[A-Za-z0-9 -]{4,40}$/.test(ref.value.trim())) return say(msg, tr("Enter the transaction id (4 to 40 letters or numbers).", "اكتب رقم العملية (4 لـ 40 حرف أو رقم)."), "err");
        var path = me.id + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + "." + { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[f.type];
        var up = await sb.storage.from("payment-proofs").upload(path, f, { contentType: f.type, upsert: false });
        if (up.error) return say(msg, tr("Upload failed.", "فشل رفع الصورة."), "err");
        var r = await sb.rpc("submit_manual_payment", { p_plan: p.id, p_reference: ref.value.trim(), p_proof: path });
        if (r.error) return say(msg, /one_pending/.test(r.error.message) ? tr("You already have a payment waiting for approval.", "عندك دفعة مستنية المراجعة.") : tr("Could not submit.", "ماقدرتش أبعت."), "err");
        clear(box); say(msg, tr("Sent. The owner will review it and activate your subscription.", "اتبعتت. المالك هيراجعها ويفعّل اشتراكك."), "ok");
      } } }))));
  }
  /* ---------- 2-step login (TOTP) for owner/admin ---------- */
  async function mfaState() {
    var f = await sb.auth.mfa.listFactors(), a = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    var ver = ((f.data && f.data.totp) || []).filter(function (x) { return x.status === "verified"; })[0];
    return { factor: ver, level: a.data && a.data.currentLevel };
  }
  async function mfaPanel(box, onDone) {
    var st = await mfaState(), msg = h("div", { "class": "msg" }), p = h("div", { "class": "panel" }, h("h2", { text: tr("2-step login (authenticator app)", "التحقق بخطوتين (تطبيق المصادقة)") }));
    clear(box); box.appendChild(p); p.appendChild(msg);
    var code = h("input", { type: "text", inputmode: "numeric", maxlength: "6", autocomplete: "one-time-code", placeholder: "123456", "aria-label": "code" });
    if (st.factor) {
      if (st.level === "aal2") { p.appendChild(h("p", { "class": "hint", text: tr("On. This session is verified.", "شغال. الجلسة دي متأكدة.") })); return; }
      p.appendChild(h("p", { "class": "hint", text: tr("Enter the 6-digit code from your authenticator app.", "اكتب كود الـ6 أرقام من تطبيق المصادقة.") }));
      var go2 = h("button", { type: "button", "class": "btn", text: tr("Verify", "تأكيد") });
      go2.addEventListener("click", async function () {
        var r = await sb.auth.mfa.challengeAndVerify({ factorId: st.factor.id, code: code.value.trim() });
        if (r.error) return say(msg, tr("Wrong or expired code.", "الكود غلط أو منتهي."), "err");
        if (onDone) onDone(); else location.reload();
      });
      p.appendChild(h("div", { "class": "row" }, code, go2)); return;
    }
    var start = h("button", { type: "button", "class": "btn", text: tr("Turn on 2-step login", "تشغيل التحقق بخطوتين") });
    p.appendChild(h("p", { "class": "hint", text: tr("Not on yet. Staff accounts should turn it on.", "لسه مش شغال. حسابات الإدارة لازم تشغله.") }));
    p.appendChild(start);
    start.addEventListener("click", async function () {
      var e = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "SCARHUB " + Date.now() });
      if (e.error) return say(msg, e.error.message, "err");
      start.remove();
      var qr = String(e.data.totp.qr_code || ""), qi = qr.indexOf("<svg"), qsrc = qi >= 0 ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qr.slice(qi)) : qr;
      var img = h("img", { src: qsrc, alt: "QR", width: "200", height: "200", style: "display:block;background:#fff;padding:12px;border-radius:8px;margin:8px 0;width:200px;height:200px" });
      p.appendChild(h("p", { "class": "hint", text: tr("Scan this in Google Authenticator / Microsoft Authenticator, then enter the code.", "اعمل سكان في Google Authenticator أو Microsoft Authenticator وبعدين اكتب الكود.") }));
      p.appendChild(img); p.appendChild(h("p", { "class": "hint", style: "direction:ltr;user-select:all;word-break:break-all", text: tr("Or type this key by hand: ", "أو اكتب المفتاح ده بإيدك: ") + e.data.totp.secret }));
      var ok = h("button", { type: "button", "class": "btn", text: tr("Confirm", "تأكيد") });
      ok.addEventListener("click", async function () {
        var r = await sb.auth.mfa.challengeAndVerify({ factorId: e.data.id, code: code.value.trim() });
        if (r.error) return say(msg, tr("Wrong or expired code.", "الكود غلط أو منتهي."), "err");
        location.reload();
      });
      p.appendChild(h("div", { "class": "row" }, code, ok));
    });
  }

  async function accountPage() {
    var app = $("app"); if (!me) return go("login.html"); clear(app);
    var box = h("div", { "class": "wide" }); app.appendChild(box);
    var inboxBox = h("div"); box.appendChild(inboxBox); inboxPanel(inboxBox);
    if (isStaff()) { var mfaBox = h("div"); box.appendChild(mfaBox); mfaPanel(mfaBox); }
    var uname = h("input", { type: "text", maxlength: "20", value: me.username }), avBox = h("div", { "class": "avatars" }), msg = h("div", { "class": "msg" });
    var cur = me.avatar; avatarPicker(avBox, cur, function (c) { cur = c; });
    var upFile = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp", style: "max-width:230px" });
    var upBox = h("div", { "class": "row" }, h("span", { "class": "hint", text: tr("Own picture (owner/admin only, PNG/JPG/WebP, max 1 MB):", "صورتك الخاصة (للمالك والأدمن فقط، PNG/JPG/WebP، لحد 1 ميجا):") }), upFile, h("button", { "class": "btn", type: "button", text: tr("Upload picture", "ارفع الصورة"), on: { click: async function () {
      var f = upFile.files && upFile.files[0]; if (!f) return say(msg, tr("Choose an image.", "اختار صورة."), "err");
      if (["image/png", "image/jpeg", "image/webp"].indexOf(f.type) < 0 || f.size > 1048576) return say(msg, tr("PNG, JPG or WebP, max 1 MB.", "PNG أو JPG أو WebP، لحد 1 ميجا."), "err");
      var x = await sb.storage.from("avatars").upload(me.id + "/avatar", f, { upsert: true, contentType: f.type, cacheControl: "60" }); if (x.error) return say(msg, x.error.message, "err");
      var y = await sb.rpc("update_my_profile", { new_username: null, new_avatar: "custom" }); if (y.error) return say(msg, y.error.message, "err");
      cur = "custom"; me.avatar = "custom"; say(msg, tr("Picture saved. Refresh to see it everywhere.", "الصورة اتحفظت. اعمل Refresh عشان تظهر في كل حتة."), "ok");
    } } }));
    var save = h("button", { "class": "btn f", type: "button", text: tr("Save", "حفظ"), on: { click: async function () {
      if (!USER_RE.test(uname.value)) return say(msg, tr("Invalid username.", "اسم مستخدم غير صحيح."), "err");
      var r = await sb.rpc("update_my_profile", { new_username: uname.value, new_avatar: cur });
      say(msg, r.error ? tr("Could not save (name taken?).", "ماتحفظش (الاسم مستخدم؟).") : tr("Saved.", "اتحفظ."), r.error ? "err" : "ok");
    } } });
    box.appendChild(h("div", { "class": "panel", id: "edit" }, h("h2", { text: tr("My profile", "بروفايلي") }), h("p", { text: me.email }),
      h("p", { text: tr("Role: ", "الدور: ") + me.role }), h("label", { text: tr("Username", "اسم المستخدم") }), uname, avBox, isStaff() ? upBox : null, h("div", { "class": "row" }, save), msg));
    var plansBox = h("div", { "class": "panel" }, h("h2", { text: tr("Subscription", "الاشتراك") })); box.appendChild(plansBox);
    var subR = await sb.from("subscriptions").select("status,current_period_end").eq("user_id", me.id).maybeSingle();
    var active = subR.data && /^(active|trialing)$/.test(subR.data.status) && new Date(subR.data.current_period_end) > new Date();
    plansBox.appendChild(h("p", { text: active ? tr("Active until ", "نشط لحد ") + new Date(subR.data.current_period_end).toLocaleDateString() : tr("No active subscription. Private tools need one.", "مفيش اشتراك فعال. الأدوات الخاصة محتاجة اشتراك.") }));
    var pl = await sb.from("plans").select("id,name,price_minor,currency,period,scope,description").eq("active", true);
    var ptA = (await sb.from("plan_tools").select("plan_id,tool_id")).data || [], tnA = {}; ((await sb.from("tools").select("id,name")).data || []).forEach(function (x) { tnA[x.id] = x.name; });
    var upa = (await sb.from("user_plan_access").select("plan_id,current_period_end").eq("user_id", me.id)).data || [];
    upa.filter(function (a) { return new Date(a.current_period_end) > new Date(); }).forEach(function (a) { var pn_ = (pl.data || []).filter(function (q) { return q.id === a.plan_id; })[0]; plansBox.appendChild(h("p", { text: (pn_ ? pn_.name : tr("Plan", "خطة")) + tr(" active until ", " نشطة لحد ") + new Date(a.current_period_end).toLocaleDateString() })); });
    var pm = await sb.rpc("payment_methods"), methods = (pm.data || []).map(function (x) { return x.method; });
    var manualBox = h("div"), payMsg = h("div", { "class": "msg" });
    if ((pl.data || []).length && !methods.length) plansBox.appendChild(h("p", { "class": "hint", text: tr("Payments are not open yet.", "الدفع لسه مش مفتوح.") }));
    if (methods.length) plansBox.appendChild(h("p", { "class": "hint", text: tr("Choose how to pay:", "اختار طريقة الدفع:") }));
    (pl.data || []).forEach(function (p) {
      if (!methods.length) return;
      var covA = p.scope === "tools" ? tr("Covers only: ", "بتشمل بس: ") + ptA.filter(function (q) { return q.plan_id === p.id; }).map(function (q) { return tnA[q.tool_id] || "?"; }).join(", ") : tr("Covers all tools", "بتشمل كل الأدوات");
      plansBox.appendChild(h("p", { "class": "hint", text: p.name + ": " + covA + (p.description ? ". " + p.description : "") }));
      var row = h("div", { "class": "row" }, h("span", { text: p.name + " - " + (p.price_minor / 100).toFixed(2) + " " + p.currency + " / " + p.period + "  " }));
      if (methods.indexOf("paymob") > -1 && p.currency === "EGP") row.appendChild(h("button", { "class": "btn", type: "button", text: tr("Pay by card / wallet (Paymob)", "ادفع بكارت / محفظة (Paymob)"), on: { click: async function () {
        var s = (await sb.auth.getSession()).data.session;
        var r = await fetch(CFG.url + "/functions/v1/paymob-checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.access_token, apikey: CFG.anonKey }, body: JSON.stringify({ plan_id: p.id }) });
        var j = await r.json().catch(function () { return {}; }); if (j.url && /^https:\/\/eg\.checkout\.paymob\.com\//.test(j.url)) location.href = j.url; else say(payMsg, tr("Payment is not available right now.", "الدفع مش متاح دلوقتي."), "err");
      } } }));
      if (methods.indexOf("manual") > -1) row.appendChild(h("button", { "class": "btn", type: "button", text: tr("Vodafone Cash transfer", "تحويل فودافون كاش"), on: { click: function () { manualForm(p, manualBox, payMsg); } } }));
      plansBox.appendChild(row);
    });
    plansBox.appendChild(manualBox); plansBox.appendChild(payMsg);
    var mine = await sb.from("payment_requests").select("method,status,amount_minor,currency,created_at,reject_reason").order("created_at", { ascending: false }).limit(5);
    if ((mine.data || []).length) { plansBox.appendChild(h("h3", { text: tr("My payments", "مدفوعاتي") })); mine.data.forEach(function (q) {
      plansBox.appendChild(h("p", { "class": "hint", text: new Date(q.created_at).toLocaleDateString() + " - " + q.method + " - " + (q.amount_minor / 100).toFixed(2) + " " + q.currency + " - " + q.status + (q.reject_reason ? " (" + q.reject_reason + ")" : "") }));
    }); }
    var dpw = h("input", { type: "password", autocomplete: "current-password", maxlength: "64" }), dmsg = h("div", { "class": "msg" });
    box.appendChild(h("div", { "class": "panel", id: "delete" }, h("h2", { text: tr("Delete account", "حذف الحساب") }), h("p", { text: tr("This signs you out and removes your login. It cannot be undone.", "ده هيطلعك ويمسح الدخول بتاعك. ماينفعش يتراجع.") }), h("label", { text: tr("Confirm with your password", "أكد بالباسورد") }), dpw,
      h("div", { "class": "row" }, h("button", { "class": "btn", type: "button", text: tr("Delete my account", "احذف حسابي"), on: { click: async function () {
        if (!confirm(tr("Delete your account for good?", "تحذف حسابك نهائي؟"))) return;
        var s = (await sb.auth.getSession()).data.session;
        var r = await fetch(CFG.url + "/functions/v1/delete-account", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.access_token, apikey: CFG.anonKey }, body: JSON.stringify({ password: dpw.value }) });
        if (r.ok) { await sb.auth.signOut(); go("index.html"); } else say(dmsg, tr("Could not delete (wrong password, or this is the owner account).", "ماتمسحش (الباسورد غلط أو ده حساب المالك)."), "err");
      } } })), dmsg));
    if (location.hash) { var t = $(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  /* ---------- community ---------- */
  async function communityPage() {
    var app = $("app"); if (!me) return go("login.html"); clear(app);
    var chans = [["general", tr("General chat", "الشات العام"), true], ["admins", tr("Admins only", "للإدارة فقط"), isStaff()]].filter(function (c) { return c[2]; });
    var box = h("div", { "class": "wide" }), tabs = h("div", { "class": "tabs" }), log = h("div", { "class": "chatbox", role: "log", "aria-live": "polite" });
    var input = h("input", { type: "text", maxlength: "1000", "aria-label": tr("Message", "رسالة"), style: "flex:1;padding:11px;border-radius:10px;border:1px solid var(--b);background:var(--bg);color:var(--t)" });
    var err = h("div", { "class": "msg" }), cur = "general", names = {}, sub = null;
    async function who(ids) {
      var need = ids.filter(function (i) { return !names[i]; }); if (!need.length) return;
      var r = await sb.from("public_profiles").select("id,display_name,avatar,subscribed").in("id", need);
      (r.data || []).forEach(function (p) { names[p.id] = p; });
    }
    function line(m) {
      var p = names[m.user_id] || { display_name: "?", avatar: "b1" }, del = null;
      if (isStaff()) del = h("button", { "class": "btn", type: "button", text: "x", "aria-label": "delete", on: { click: async function () { await sb.from("chat_messages").delete().eq("id", m.id); load(); } } });
      var el = h("div", { "class": "cm" }, h("div", { "class": "av" }, avatarSvg(p.avatar, p.id)), h("div", { style: "flex:1" }, h("b", p.subscribed ? { text: "\u2605 " + p.display_name, style: "color:#d4a017", title: tr("Subscriber", "مشترك") } : { text: p.display_name }), h("p", { text: m.body })), del);
      el.setAttribute("data-id", m.id); return el;
    }
    async function load() {
      var r = await sb.from("chat_messages").select("id,user_id,body,created_at").eq("channel", cur).order("created_at", { ascending: false }).limit(60);
      var rows = (r.data || []).reverse(); await who(rows.map(function (x) { return x.user_id; }));
      clear(log); rows.forEach(function (m) { log.appendChild(line(m)); }); log.scrollTop = log.scrollHeight;
    }
    function select(c) {
      cur = c; if (sub) sb.removeChannel(sub);
      sub = sb.channel("chat-" + c).on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: "channel=eq." + c }, load).subscribe();
      Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-c") === c); }); load();
    }
    chans.forEach(function (c) { tabs.appendChild(h("button", { "class": "btn", type: "button", "data-c": c[0], text: c[1], on: { click: function () { select(c[0]); } } })); });
    var form = h("form", { "class": "row", style: "display:flex;gap:8px;margin-top:10px" }, input, h("button", { "class": "btn f", type: "submit", text: tr("Send", "إرسال") }));
    form.addEventListener("submit", async function (e) {
      e.preventDefault(); var b = input.value.trim(); if (!b) return;
      var r = await sb.from("chat_messages").insert({ channel: cur, user_id: me.id, body: b });
      if (r.error) say(err, tr("Slow down or try again.", "على مهلك أو جرب تاني."), "err"); else { input.value = ""; say(err, ""); load(); }
    });
    box.appendChild(h("div", { "class": "panel" }, h("h2", { text: tr("Community", "المجتمع") }), tabs, log, form, err)); app.appendChild(box); select("general");
  }

  /* ---------- admin ---------- */
  async function adminPage() {
    var app = $("app"); if (!me || !isStaff()) { clear(app); return app.appendChild(h("div", { "class": "off" }, h("p", { text: "404" }))); }
    var mst = await mfaState();
    if (mst.factor && mst.level !== "aal2") { clear(app); var gb = h("div", { "class": "wide" }); app.appendChild(gb); return mfaPanel(gb); }
    clear(app); var box = h("div", { "class": "wide" }); app.appendChild(box); var owner = me.role === "owner";
    /* users */
    var ut = h("div", { "class": "panel" }, h("h2", { text: tr("Accounts", "الحسابات") })), tb = h("tbody");
    ut.appendChild(h("table", { "class": "t" }, h("thead", null, h("tr", null, h("th", { text: tr("Name", "الاسم") }), h("th", { text: owner ? "Email" : "" }), h("th", { text: tr("Role", "الدور") }), h("th", { text: tr("Status", "الحالة") }), h("th", { text: tr("Sub", "اشتراك") }), h("th", { text: "" }))), tb));
    async function users() {
      var r = await sb.rpc("admin_list_users"); clear(tb); if (r.error) return;
      var gm = {}, plansL = [];
      if (owner) {
        var gr = await sb.rpc("admin_list_grants"); (gr.data || []).forEach(function (g) { (gm[g.user_id] = gm[g.user_id] || []).push(g); });
        var pr = await sb.from("plans").select("id,name,scope,active"); plansL = pr.data || [];
      }
      function endTxt(v) { return /^infinity/.test(String(v)) ? tr("no expiry", "من غير انتهاء") : tr("until ", "لحد ") + new Date(v).toLocaleDateString(); }
      r.data.forEach(function (u) {
        var staff = u.role !== "user", name = staff ? (u.alias + (owner && u.username ? " (" + u.username + ")" : "")) : u.username;
        var act = h("td");
        if (owner && u.role !== "owner" && u.status === "active") {
          var sel = h("select", { "aria-label": "role" }); ["user", "admin"].forEach(function (r2) { var o = h("option", { value: r2, text: r2 }); if (r2 === u.role) o.selected = true; sel.appendChild(o); });
          var al = h("input", { type: "text", placeholder: "alias", maxlength: "25", value: u.alias || "", style: "width:100px" });
          act.appendChild(sel); act.appendChild(al);
          act.appendChild(h("button", { "class": "btn", type: "button", text: tr("Apply", "تطبيق"), on: { click: async function () {
            if (sel.value === "admin" && !ALIAS_RE.test(al.value)) return alert(tr("Admin needs an alias (3-25 chars).", "الأدمن محتاج اسم مستعار (3-25)."));
            var x = await sb.rpc("set_role", { target: u.id, new_role: sel.value, new_alias: sel.value === "admin" ? al.value : null }); if (x.error) alert(x.error.message); users();
          } } }));
        }
        if (owner && u.role !== "owner" && u.status !== "deleted") {
          var banned = u.status === "banned", dn = u.username || u.alias || "";
          act.appendChild(h("button", { "class": "btn", type: "button", text: banned ? tr("Unblock", "فك الحظر") : tr("Block", "حظر"), on: { click: async function () {
            if (!banned && !confirm(tr("Block this user? They will be signed out and cannot log in again until you unblock them.", "تحظر المستخدم ده؟ هيتسجل خروج ومش هيقدر يدخل تاني لحد ما تفك الحظر."))) return;
            var x = await sb.rpc("admin_set_ban", { target: u.id, ban: !banned }); if (x.error) alert(x.error.message); users();
          } } }));
          act.appendChild(h("button", { "class": "btn", type: "button", style: "color:#e11d2e", text: tr("Delete", "حذف"), on: { click: async function () {
            if (!confirm(tr("Delete this user permanently? This cannot be undone.", "تحذف المستخدم ده نهائي؟ مش هتقدر ترجعه.") + (dn ? "\n" + dn : ""))) return;
            var x = await sb.rpc("admin_delete_user", { target: u.id }); if (x.error) alert(x.error.message); users();
          } } }));
        }
        var mine = gm[u.id] || [], subCell = h("td", { text: u.subscribed ? "yes" : "-" });
        if (mine.length) { clear(subCell); subCell.appendChild(h("span", { "class": "tag", text: tr("Free (owner)", "مجاني (من المالك)") })); mine.forEach(function (g) { subCell.appendChild(h("div", { "class": "hint", text: (g.plan_name || tr("All tools", "كل الأدوات")) + " " + endTxt(g.ends) })); }); }
        if (owner && u.role !== "owner" && u.status === "active") {
          var gs = h("select", { "aria-label": "plan" }); gs.appendChild(h("option", { value: "", text: tr("All tools", "كل الأدوات") }));
          plansL.forEach(function (p) { gs.appendChild(h("option", { value: p.id, text: p.name + (p.scope === "tools" ? "" : " (all)") })); });
          var gd = h("input", { type: "date", "aria-label": tr("Expiry (optional)", "الانتهاء (اختياري)"), title: tr("Expiry (optional)", "الانتهاء (اختياري)") });
          var gact = h("div", { "class": "hint" }, gs, gd, h("button", { "class": "btn", type: "button", text: tr("Give free plan", "اديله اشتراك مجاني"), on: { click: async function () {
            var until = gd.value ? new Date(gd.value + "T23:59:59").toISOString() : null;
            if (!confirm(tr("Give this user free access (", "تدي المستخدم ده وصول مجاني (") + gs.options[gs.selectedIndex].text + ", " + (until ? tr("until ", "لحد ") + gd.value : tr("no expiry", "من غير انتهاء")) + ")?")) return;
            var x = await sb.rpc("admin_grant_plan", { target: u.id, p_plan: gs.value || null, p_until: until }); if (x.error) alert(x.error.message); users();
          } } }));
          mine.forEach(function (g) { gact.appendChild(h("button", { "class": "btn", type: "button", style: "color:#e11d2e", text: tr("Revoke ", "الغي ") + (g.plan_name || tr("All tools", "كل الأدوات")), on: { click: async function () {
            if (!confirm(tr("Take back this free access?", "ترجّع الوصول المجاني ده؟"))) return;
            var x = await sb.rpc("admin_revoke_plan", { target: u.id, p_plan: g.plan_id || null }); if (x.error) alert(x.error.message); users();
          } } })); });
          act.appendChild(gact);
        }
        tb.appendChild(h("tr", null, h("td", null, h("span", { "class": "av", style: "display:inline-block;width:28px;vertical-align:middle;margin-inline-end:6px;cursor:default" }, avatarSvg(u.avatar, u.id)), name || "-"), h("td", { text: u.email || "" }),
          h("td", null, h("span", { "class": "tag " + (u.role === "owner" ? "owner" : ""), text: u.role })), h("td", null, h("span", { "class": "tag " + (u.status === "deleted" || u.status === "banned" ? "del" : ""), text: u.status })), subCell, act));
      });
    }
    if (owner) {
      var ap = h("div", { "class": "panel" }, h("h2", { text: tr("Admins", "الأدمنز") })), apmsg = h("div", { "class": "msg" }), apl = h("div"), pick = h("select", { "aria-label": "user" });
      var aal = h("input", { type: "text", placeholder: tr("Public alias (3-25)", "الاسم المستعار (3-25)"), maxlength: "25" });
      var adminsPanel = async function () {
        var rr = await sb.rpc("admin_list_users"); clear(apl); clear(pick); if (rr.error) return say(apmsg, rr.error.message, "err");
        pick.appendChild(h("option", { value: "", text: tr("Choose a user...", "اختار مستخدم...") }));
        rr.data.forEach(function (u) {
          if (u.status !== "active" || u.role === "owner") return;
          if (u.role === "user") pick.appendChild(h("option", { value: u.id, text: u.username + " - " + (u.email || "") }));
          else apl.appendChild(h("div", { "class": "row" }, h("span", { text: u.alias + " (" + u.username + ", " + (u.email || "") + ")  " }), h("button", { "class": "btn", type: "button", text: tr("Remove admin", "شيل الأدمن"), on: { click: async function () {
            if (!confirm(tr("Remove this admin?", "تشيل الأدمن ده؟"))) return;
            var x = await sb.rpc("set_role", { target: u.id, new_role: "user", new_alias: null }); say(apmsg, x.error ? x.error.message : tr("Removed.", "اتشال."), x.error ? "err" : "ok"); adminsPanel(); users();
          } } })));
        });
        if (!apl.firstChild) apl.appendChild(h("p", { "class": "hint", text: tr("No admins yet.", "مفيش أدمنز لسه.") }));
      };
      ap.appendChild(h("p", { "class": "hint", text: tr("Only you (the owner) can add or remove admins. The person must sign up first.", "انت بس (المالك) اللي تضيف أو تشيل أدمن. لازم الشخص يسجل الأول.") })); ap.appendChild(apl);
      ap.appendChild(h("div", { "class": "row" }, pick, aal, h("button", { "class": "btn f", type: "button", text: tr("Add admin", "ضيف أدمن"), on: { click: async function () {
        if (!pick.value) return say(apmsg, tr("Choose a user.", "اختار مستخدم."), "err"); if (!ALIAS_RE.test(aal.value)) return say(apmsg, tr("Alias needs 3-25 letters, numbers or spaces, starting with a letter.", "الاسم المستعار 3-25 حرف ويبدأ بحرف."), "err");
        var x = await sb.rpc("set_role", { target: pick.value, new_role: "admin", new_alias: aal.value }); say(apmsg, x.error ? x.error.message : tr("Admin added.", "اتضاف أدمن."), x.error ? "err" : "ok"); aal.value = ""; adminsPanel(); users();
      } } }))); ap.appendChild(apmsg); box.appendChild(ap); adminsPanel();
    }
    box.appendChild(ut); users();
    /* tool upload */
    var f = {}; function inp(id, label, attrs, tag) { var e = h(tag || "input", Object.assign({ id: "t_" + id }, attrs || {})); f[id] = e; return h("div", null, h("label", { "for": "t_" + id, text: label }), e); }
    var cls = h("select", { id: "t_class" }); ["recon", "forensics", "defense", "pentest", "crypto", "mobile", "platform"].forEach(function (c) { cls.appendChild(h("option", { value: c, text: c })); }); f["class"] = cls;
    var vis = h("select", { id: "t_vis" }, h("option", { value: "public", text: "public" }), h("option", { value: "private", text: "private (subscribers)" })), st = h("select", { id: "t_status" }, h("option", { value: "published", text: "published" }), h("option", { value: "draft", text: "draft" }));
    var file = h("input", { type: "file", id: "t_file", accept: ".zip,.gz,.tar,.txt" }), tmsg = h("div", { "class": "msg" });
    var tpChk = h("input", { type: "checkbox", id: "t_tp" });
    var tpBox = h("div", { style: "display:none" }, inp("ocr", tr("Original creator (person or project)", "المطوّر الأصلي (شخص أو مشروع)"), { type: "text", maxlength: "80" }), inp("olic", tr("License (e.g. MIT, GPL-3.0, Apache-2.0)", "الرخصة (مثلا MIT, GPL-3.0, Apache-2.0)"), { type: "text", maxlength: "60" }), inp("orepo", tr("Original GitHub repository URL", "رابط الريبو الأصلي على GitHub"), { type: "text", placeholder: "https://github.com/owner/repo" }),
      h("p", { "class": "hint", text: tr("Only open-source projects. Check the license allows linking. We link to the original and do not host or change their code.", "مشاريع اوبن سورس بس. اتأكد إن الرخصة بتسمح. بنحط لينك للأصلي ومش بنستضيف الكود ولا نعدله.") }));
    tpChk.addEventListener("change", function () { tpBox.style.display = tpChk.checked ? "block" : "none"; });
    var tf = h("form", { "class": "auth", style: "max-width:none;margin:0" }, h("h2", { text: tr("Add a tool", "ضيف أداة") }),
      inp("name", tr("Name", "الاسم"), { maxlength: "40", required: "", type: "text" }), inp("slug", "Slug (a-z, 0-9, -)", { maxlength: "41", required: "", type: "text" }),
      h("label", { text: tr("Class", "التصنيف") }), cls, inp("den", tr("Description (English)", "الوصف (انجليزي)"), { maxlength: "600", rows: "3" }, "textarea"), inp("dar", tr("Description (Arabic)", "الوصف (عربي)"), { maxlength: "600", rows: "3" }, "textarea"),
      inp("cmds", tr("Commands, one per line (max 10)", "الأوامر، واحد في السطر (10 كحد أقصى)"), { rows: "3" }, "textarea"), h("label", { text: tr("Visibility", "الظهور") }), vis, h("label", { text: tr("Status", "الحالة") }), st,
      inp("price", tr("Price (optional, e.g. 49.00)", "السعر (اختياري، مثلا 49.00)"), { type: "text", inputmode: "decimal", maxlength: "12" }), inp("cur", tr("Currency", "العملة"), { type: "text", maxlength: "3", value: "EGP" }),
      inp("video", tr("Video URL (https)", "رابط الفيديو (https)"), { type: "text" }), inp("repo", tr("GitHub repo URL", "رابط الريبو"), { type: "text" }), h("label", { "for": "t_file", text: tr("File (zip, max 50 MB)", "ملف (zip حتى 50MB)") }), file,
      h("label", { "for": "t_tp" }, tpChk, " " + tr("Third-party open-source tool from GitHub (not made by us)", "أداة اوبن سورس من GitHub (مش من عملنا)")), tpBox, h("div", { "class": "row" }, h("button", { "class": "btn f", type: "submit", text: tr("Publish", "نشر") })), tmsg);
    tf.addEventListener("submit", async function (e) {
      e.preventDefault(); var slug = f.slug.value.trim();
      if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) return say(tmsg, "slug?", "err");
      var cmds = f.cmds.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 10);
      var pm_ = null, cur_ = (f.cur.value.trim() || "EGP").toUpperCase();
      if (f.price.value.trim()) { pm_ = Math.round(parseFloat(f.price.value) * 100); if (!(pm_ >= 0 && pm_ <= 100000000)) return say(tmsg, tr("Price?", "السعر؟"), "err"); }
      if (!/^[A-Z]{3}$/.test(cur_)) return say(tmsg, tr("Currency?", "العملة؟"), "err");
      var tp_ = {};
      if (tpChk.checked) { var oc = f.ocr.value.trim(), ol = f.olic.value.trim(), orr = f.orepo.value.trim();
        if (oc.length < 2 || ol.length < 2) return say(tmsg, tr("Third-party tools need the original creator and the license.", "الأدوات التانية لازم المطوّر الأصلي والرخصة."), "err");
        if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(orr)) return say(tmsg, tr("Original repository must look like https://github.com/owner/repo", "رابط الريبو لازم يبقى https://github.com/owner/repo"), "err");
        tp_ = { third_party: true, orig_creator: oc, orig_license: ol, orig_repo: orr }; }
      if (tp_.third_party && pm_ != null) return say(tmsg, tr("Credited open-source tools cannot have a price.", "الأدوات المفتوحة المصدر المنسوبة مينفعش ليها سعر."), "err");
      var ins = await sb.from("tools").insert(Object.assign({ slug: slug, name: f.name.value.trim(), class: cls.value, description_en: f.den.value.trim(), description_ar: f.dar.value.trim() || null, commands: cmds, visibility: vis.value, status: st.value, created_by: me.id }, tp_, pm_ != null ? { price_minor: pm_, currency: cur_ } : {})).select("id").single();
      if (ins.error) return say(tmsg, ins.error.message, "err");
      var path = null;
      if (file.files[0]) { if (file.files[0].size > 52428800) return say(tmsg, "file > 50 MB", "err"); path = slug + "/" + file.files[0].name.replace(/[^A-Za-z0-9._-]/g, "_").toLowerCase(); var up = await sb.storage.from("tool-files").upload(path, file.files[0], { upsert: false }); if (up.error) return say(tmsg, up.error.message, "err"); }
      var ax = await sb.from("tool_assets").insert({ tool_id: ins.data.id, video_url: f.video.value.trim() || null, repo_url: f.repo.value.trim() || null, file_path: path });
      say(tmsg, ax.error ? ax.error.message : tr("Published.", "اتنشرت."), ax.error ? "err" : "ok");
    });
    box.appendChild(h("div", { "class": "panel" }, tf));
    var mp = h("div", { "class": "panel", id: "manage" }, h("h2", { text: tr("Manage tools", "إدارة الأدوات") })), mpl = h("div"), mmsg = h("div", { "class": "msg" }), editors = {};
    mp.appendChild(h("p", { "class": "hint", text: owner ? tr("You can edit or delete every tool.", "تقدر تعدل أو تمسح أي أداة.") : tr("You can edit or delete the tools you created.", "تقدر تعدل أو تمسح الأدوات اللي إنت عملتها.") })); mp.appendChild(mpl); mp.appendChild(mmsg); box.appendChild(mp);
    function guideRow(slug, canEdit) {
      var st = h("span", { "class": "hint", text: "..." }), msgG = h("span", { "class": "msg" }), fi = h("input", { type: "file", accept: "application/pdf", style: "max-width:220px" });
      var row = h("div", { "class": "row" }, h("b", { text: slug + ".pdf  " }), st);
      var refresh = async function () { var l = await sb.storage.from("tool-guides").list("", { search: slug + ".pdf", limit: 5 }); var ok = !l.error && (l.data || []).some(function (o) { return o.name === slug + ".pdf"; }); st.textContent = l.error ? tr("cannot check", "مش قادر اتأكد") : ok ? tr("uploaded", "مرفوع") : tr("not uploaded", "مش مرفوع"); st.dataset.ok = ok ? "1" : ""; };
      if (canEdit) {
        row.appendChild(fi);
        row.appendChild(h("button", { "class": "btn f", type: "button", text: tr("Upload / replace", "ارفع / استبدل"), on: { click: async function () {
          var f = fi.files && fi.files[0]; if (!f) return say(msgG, tr("Choose a PDF.", "اختار PDF."), "err"); if (f.type !== "application/pdf" || f.size > 10485760) return say(msgG, tr("PDF only, max 10 MB.", "PDF بس وأقصى 10 ميجا."), "err");
          var x = await sb.storage.from("tool-guides").upload(slug + ".pdf", f, { upsert: true, contentType: "application/pdf" }); say(msgG, x.error ? x.error.message : tr("Uploaded.", "اترفع."), x.error ? "err" : "ok"); fi.value = ""; refresh();
        } } }));
        row.appendChild(h("button", { "class": "btn", type: "button", text: tr("Delete", "مسح"), on: { click: async function () {
          if (!confirm(tr("Delete this guide?", "تمسح الدليل؟"))) return; var x = await sb.storage.from("tool-guides").remove([slug + ".pdf"]); say(msgG, x.error ? x.error.message : tr("Deleted.", "اتمسح."), x.error ? "err" : "ok"); refresh();
        } } }));
      }
      row.appendChild(h("button", { "class": "btn", type: "button", text: tr("Open", "افتح"), on: { click: async function () { var u = await sb.storage.from("tool-guides").createSignedUrl(slug + ".pdf", 60); if (u.error) return say(msgG, tr("Not found.", "مش موجود."), "err"); window.open(u.data.signedUrl, "_blank", "noopener"); } } }));
      row.appendChild(msgG); refresh(); return row;
    }
    var manageTools = async function () {
      var rt = await TSQ("id,slug,name,class,description_en,description_ar,commands,visibility,status,created_by,third_party,price_minor,currency,discount_percent,discount_until", function (q) { return q.order("name"); }); clear(mpl); if (rt.error) return say(mmsg, rt.error.message, "err");
      var ids = rt.data.map(function (t) { return t.id; }), amap = {};
      if (ids.length) ((await sb.from("tool_assets").select("tool_id,video_url,repo_url,file_path").in("tool_id", ids)).data || []).forEach(function (a) { amap[a.tool_id] = a; });
      if (!rt.data.length) mpl.appendChild(h("p", { "class": "hint", text: tr("No tools yet. Add one above.", "مفيش أدوات لسه. ضيف واحدة فوق.") }));
      rt.data.forEach(function (t) {
        var can = owner || t.created_by === me.id, a = amap[t.id] || {}, holder = h("div");
        var row = h("div", { "class": "row", id: "tool-" + t.slug }, h("span", { text: t.name + "  [" + t.class + ", " + t.status + ", " + t.visibility + "]" + (can ? "" : tr(" read only", " قراءة فقط")) + "  " }));
        function openEdit() {
          clear(holder);
          var n1 = h("input", { type: "text", maxlength: "40", value: t.name }), c1 = h("select"), d1 = h("textarea", { rows: "3", maxlength: "600" }), d2 = h("textarea", { rows: "3", maxlength: "600" }), cm1 = h("textarea", { rows: "3" });
          ["recon", "forensics", "defense", "pentest", "crypto", "mobile", "platform"].forEach(function (c) { var o = h("option", { value: c, text: c }); if (c === t.class) o.selected = true; c1.appendChild(o); });
          d1.value = t.description_en || ""; d2.value = t.description_ar || ""; cm1.value = (t.commands || []).join("\n");
          var v1 = h("select"), s1 = h("select"); ["public", "private"].forEach(function (c) { var o = h("option", { value: c, text: c }); if (c === t.visibility) o.selected = true; v1.appendChild(o); }); ["published", "draft"].forEach(function (c) { var o = h("option", { value: c, text: c }); if (c === t.status) o.selected = true; s1.appendChild(o); });
          var pr1 = h("input", { type: "text", inputmode: "decimal", maxlength: "12", placeholder: tr("no price", "من غير سعر"), value: t.price_minor == null ? "" : (t.price_minor / 100).toFixed(2) }), cu1 = h("input", { type: "text", maxlength: "3", value: t.currency || "EGP", style: "width:70px" });
          var ds1 = h("input", { type: "number", min: "0", max: "90", value: String(t.discount_percent || 0), style: "width:80px" }), du1 = h("input", { type: "date", value: t.discount_until ? String(t.discount_until).slice(0, 10) : "" }); ds1.disabled = du1.disabled = !owner;
          var vid = h("input", { type: "text", value: a.video_url || "" }), rp = h("input", { type: "text", value: a.repo_url || "" }), em = h("div", { "class": "msg" });
          var save = h("button", { "class": "btn f", type: "button", text: tr("Save changes", "احفظ التعديل"), on: { click: async function () {
            var upd = { name: n1.value.trim(), class: c1.value, description_en: d1.value.trim(), description_ar: d2.value.trim() || null, commands: cm1.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 10), visibility: v1.value, status: s1.value };
            var pv = pr1.value.trim(), cv = (cu1.value.trim() || "EGP").toUpperCase(); if (!/^[A-Z]{3}$/.test(cv)) return say(em, tr("Currency?", "العملة؟"), "err");
            if (pv === "") upd.price_minor = null; else { var pm = Math.round(parseFloat(pv) * 100); if (!(pm >= 0 && pm <= 100000000)) return say(em, tr("Price?", "السعر؟"), "err"); upd.price_minor = pm; } upd.currency = cv;
            if (owner) { var dv = parseInt(ds1.value || "0", 10); if (!(dv >= 0 && dv <= 90)) return say(em, tr("Discount 0 to 90", "الخصم من 0 لـ 90"), "err"); upd.discount_percent = upd.price_minor == null ? 0 : dv; upd.discount_until = du1.value ? new Date(du1.value + "T23:59:59Z").toISOString() : null; }
            if (t.third_party) { delete upd.currency; upd.price_minor = null; upd.discount_percent = 0; upd.discount_until = null; }
            var x = await sb.from("tools").update(upd).eq("id", t.id).select("id");
            if (x.error) return say(em, x.error.message, "err"); if (!x.data || !x.data.length) return say(em, tr("Not allowed: you can only edit your own tools.", "مش مسموح: تقدر تعدل أدواتك إنت بس."), "err");
            var y = await sb.from("tool_assets").upsert({ tool_id: t.id, video_url: vid.value.trim() || null, repo_url: rp.value.trim() || null, file_path: a.file_path || null }, { onConflict: "tool_id" });
            say(em, y.error ? y.error.message : "\u2713 " + tr("Saved.", "اتحفظ."), y.error ? "err" : "ok");
            if (y.error) toast("\u2717 " + y.error.message); else { toast("\u2713 " + tr("Saved: ", "اتحفظ: ") + t.name + " - " + priceTxt(upd)); manageTools(); }
          } } });
          if (t.third_party) { pr1.value = ""; pr1.disabled = cu1.disabled = ds1.disabled = du1.disabled = true; pr1.placeholder = tr("No price for credited tools", "مفيش سعر للأدوات المنسوبة"); }
          holder.appendChild(h("div", { "class": "auth", style: "max-width:none;margin:10px 0" }, h("h3", { text: tr("Edit ", "تعديل ") + t.name }), h("label", { text: tr("Name", "الاسم") }), n1, h("label", { text: tr("Class", "التصنيف") }), c1,
            h("label", { text: tr("Description (English)", "الوصف (انجليزي)") }), d1, h("label", { text: tr("Description (Arabic)", "الوصف (عربي)") }), d2, h("label", { text: tr("Commands, one per line", "الأوامر، واحد في السطر") }), cm1,
            h("label", { text: tr("Visibility", "الظهور") }), v1, h("label", { text: tr("Status", "الحالة") }), s1, h("label", { text: tr("Video URL (https)", "رابط الفيديو") }), vid, h("label", { text: tr("GitHub repo URL", "رابط الريبو") }), rp,
            h("label", { text: tr("Price (leave empty for none) and currency", "السعر (فاضي = من غير سعر) والعملة") }), h("div", { "class": "row" }, pr1, cu1),
            h("label", { text: tr("Discount % and end date (owner only)", "الخصم % وتاريخ انتهائه (للمالك فقط)") }), h("div", { "class": "row" }, ds1, du1),
            h("label", { text: tr("Usage guide (PDF, subscribers only)", "دليل الاستخدام (PDF للمشتركين فقط)") }), guideRow(t.slug, true),
            h("div", { "class": "row" }, save, h("button", { "class": "btn", type: "button", text: tr("Cancel", "إلغاء"), on: { click: function () { clear(holder); } } })), em));
          holder.scrollIntoView();
        }
        editors[t.slug] = openEdit;
        if (can) {
          row.appendChild(h("button", { "class": "btn f", type: "button", text: tr("Edit", "تعديل"), on: { click: openEdit } }));
          row.appendChild(h("button", { "class": "btn", type: "button", text: tr("Delete", "مسح"), on: { click: async function () {
            if (!confirm(tr("Delete this tool for good?", "تمسح الأداة نهائي؟"))) return;
            var x = await sb.from("tools").delete().eq("id", t.id).select("id");
            if (x.error) return say(mmsg, x.error.message, "err"); if (!x.data || !x.data.length) return say(mmsg, tr("Not allowed.", "مش مسموح."), "err");
            if (a.file_path) await sb.storage.from("tool-files").remove([a.file_path]);
            say(mmsg, tr("Deleted.", "اتمسحت."), "ok"); manageTools();
          } } }));
        }
        mpl.appendChild(row); mpl.appendChild(holder);
      });
      if (location.hash === "#manage") mp.scrollIntoView(); var hm = location.hash.match(/^#edit-(.+)$/); if (hm) { var sl = decodeURIComponent(hm[1]); if (editors[sl]) editors[sl](); }
    };
    manageTools();
    if (owner) {
      var gp = h("div", { "class": "panel" }, h("h2", { text: tr("Usage guides (PDF) for built-in tools", "أدلة الاستخدام (PDF) للأدوات الأساسية") })), SL = "scarbase scarcipher scarcustody scarcvss scardecode scardiff scardrone scarengage scargrab scarhash scarheaders scarhub scarioc scarjwt scarlan scarlist scarlog scarmeta scarnote scarosint scarpass scarperm scarports scarreport scartime".split(" ");
      gp.appendChild(h("p", { "class": "hint", text: tr("Only subscribers and staff can read these. Upload a new PDF to replace a guide.", "المشتركين والإدارة بس يقدروا يقروها. ارفع PDF جديد عشان تستبدل الدليل.") })); SL.forEach(function (s) { gp.appendChild(guideRow(s, true)); }); box.appendChild(gp);
    }
    /* tool prices: owner edits all tools and sets discounts; other admins edit only the price of tools they created */
    var tp = h("div", { "class": "panel" }, h("h2", { text: tr("Tool prices", "أسعار الأدوات") })), tpmsg = h("div", { "class": "msg" }); box.appendChild(tp);
    tp.appendChild(h("p", { "class": "hint", text: owner ? tr("You can edit the price and discount of every tool.", "تقدر تعدل السعر والخصم لأي أداة.") : tr("You can edit the price of tools you created. Discounts are set by the owner.", "تقدر تعدل سعر الأدوات اللي إنت عملتها. الخصومات من المالك بس.") }));
    var tl = await TSQ("id,name,created_by,third_party,price_minor,currency,discount_percent,discount_until", function (q) { return q.order("name"); });
    if (tl.error) tp.style.display = "none";
    (tl.data || []).forEach(function (t) {
      if (t.third_party) return;
      var mine = t.created_by === me.id, canPrice = owner || mine;
      var pr = h("input", { type: "text", inputmode: "decimal", maxlength: "12", placeholder: tr("no price", "من غير سعر"), value: t.price_minor == null ? "" : (t.price_minor / 100).toFixed(2) });
      var cu = h("input", { type: "text", maxlength: "3", value: t.currency, style: "width:70px" });
      var ds = h("input", { type: "number", min: "0", max: "90", value: String(t.discount_percent), style: "width:70px", title: "discount %" });
      var du = h("input", { type: "date", value: t.discount_until ? t.discount_until.slice(0, 10) : "" });
      pr.disabled = cu.disabled = !canPrice; ds.disabled = du.disabled = !owner;
      var row = h("div", { "class": "row" }, h("span", { text: t.name + (mine ? "" : tr(" (another admin's)", " (لأدمن تاني)")) + "  " }), pr, cu);
      if (owner) { row.appendChild(h("span", { text: " -% " })); row.appendChild(ds); row.appendChild(h("span", { text: tr(" until ", " لحد ") })); row.appendChild(du); }
      if (canPrice) row.appendChild(h("button", { "class": "btn f", type: "button", text: tr("Save", "حفظ"), on: { click: async function (ev) {
        var btn = ev.currentTarget, upd = {}, v = pr.value.trim(), c = cu.value.trim().toUpperCase();
        if (v === "") upd.price_minor = null; else { var m = Math.round(parseFloat(v) * 100); if (!(m >= 0 && m <= 100000000)) return say(tpmsg, tr("Price?", "السعر؟"), "err"); upd.price_minor = m; }
        if (!/^[A-Z]{3}$/.test(c)) return say(tpmsg, tr("Currency?", "العملة؟"), "err"); upd.currency = c;
        if (owner) { var d = parseInt(ds.value || "0", 10); if (!(d >= 0 && d <= 90)) return say(tpmsg, tr("Discount 0 to 90", "الخصم من 0 لـ 90"), "err"); upd.discount_percent = upd.price_minor == null ? 0 : d; upd.discount_until = du.value ? new Date(du.value + "T23:59:59Z").toISOString() : null; }
        var ob = btn.textContent; btn.disabled = true; btn.textContent = tr("Saving...", "بيتحفظ...");
        var x = await sb.from("tools").update(upd).eq("id", t.id).select("id"); btn.disabled = false;
        if (x.error || !x.data || !x.data.length) { btn.textContent = ob; var em2 = x.error ? x.error.message : tr("Not saved: you can only change prices of your own tools.", "اتحفظش: تقدر تغير أسعار أدواتك إنت بس."); say(tpmsg, em2, "err"); toast("\u2717 " + em2); return; }
        btn.textContent = "\u2713 " + tr("Saved", "اتحفظ"); setTimeout(function () { btn.textContent = ob; }, 3000);
        var okm = tr("Saved: ", "اتحفظ: ") + t.name + " - " + priceTxt(upd); say(tpmsg, "\u2713 " + okm, "ok"); toast("\u2713 " + okm);
      } } }));
      tp.appendChild(row);
    });
    tp.appendChild(tpmsg);
    if (!owner) return;
    /* plans (owner only) */
    var pp = h("div", { "class": "panel" }, h("h2", { text: tr("Payments", "المدفوعات") })), pmsg = h("div", { "class": "msg" }); box.appendChild(pp);
    var NAMES = { manual: "Manual (Vodafone Cash)", paymob: "Paymob" };
    var prov = await sb.from("payment_providers").select("provider,enabled").in("provider", ["manual", "paymob"]); (prov.data || []).forEach(function (p) {
      var c = h("input", { type: "checkbox" }); c.checked = p.enabled; c.disabled = !owner;
      c.addEventListener("change", async function () { var x = await sb.from("payment_providers").update({ enabled: c.checked }).eq("provider", p.provider); if (x.error) { c.checked = !c.checked; say(pmsg, x.error.message, "err"); } });
      pp.appendChild(h("label", { style: "display:inline-block;margin-inline-end:14px" }, c, " " + NAMES[p.provider] + (p.provider === "paymob" ? " (not tested yet)" : " (not tested yet)")));
    });
    var pl = await sb.from("plans").select("id,name,price_minor,currency,period,active,scope,description");
    var allT0 = (await TSQ("id,name,third_party", function (q) { return q.order("name"); })).data || [], allT = allT0.filter(function (x) { return !x.third_party; }), ptR = (await sb.from("plan_tools").select("plan_id,tool_id")).data || [], tName = {}; allT0.forEach(function (x) { tName[x.id] = x.name; });
    (pl.data || []).forEach(function (p) {
      var cov = p.scope === "tools" ? tr("only: ", "بس: ") + ptR.filter(function (q) { return q.plan_id === p.id; }).map(function (q) { return tName[q.tool_id] || "?"; }).join(", ") : tr("all tools", "كل الأدوات");
      var planLbl = h("span", { text: p.name + ": " + (p.price_minor / 100).toFixed(2) + " " + p.currency + "/" + p.period + " (" + cov + ")" + (p.description ? " - " + p.description : "") + (p.active ? "" : " (OFF)") + "  " });
      var planRow = h("p", null, planLbl); pp.appendChild(planRow);
      if (owner) {
        var editPlanBox = h("div", { style: "display:none;padding:6px 0 12px" });
        var en = h("input", { type: "text", maxlength: "40", value: p.name }), epr = h("input", { type: "text", inputmode: "decimal", value: (p.price_minor / 100).toFixed(2) }), edsc = h("input", { type: "text", maxlength: "300", value: p.description || "", placeholder: tr("Plan details", "تفاصيل الخطة"), style: "min-width:260px" });
        var esc = h("select", null, h("option", { value: "all", text: tr("All tools", "كل الأدوات") }), h("option", { value: "tools", text: tr("Only selected tools", "أدوات محددة بس") })); esc.value = p.scope;
        var epicks = {}, epBox = h("div", { style: "max-height:200px;overflow:auto;padding:6px 0;display:" + (p.scope === "tools" ? "block" : "none") });
        var mine = ptR.filter(function (q) { return q.plan_id === p.id; }).map(function (q) { return q.tool_id; });
        allT.forEach(function (x) { var cb = h("input", { type: "checkbox" }); cb.checked = mine.indexOf(x.id) > -1; epicks[x.id] = cb; epBox.appendChild(h("label", { style: "display:inline-block;margin:2px 10px 2px 0" }, cb, " " + x.name)); });
        esc.addEventListener("change", function () { epBox.style.display = esc.value === "tools" ? "block" : "none"; });
        var saveP = h("button", { "class": "btn f", type: "button", text: tr("Save plan", "احفظ الخطة"), on: { click: async function () {
          var mn = Math.round(parseFloat(epr.value) * 100); if (!(mn >= 0 && mn <= 100000000) || en.value.trim().length < 2) return say(pmsg, tr("Name or price?", "الاسم أو السعر؟"), "err");
          var ch = Object.keys(epicks).filter(function (k) { return epicks[k].checked; });
          if (esc.value === "tools" && !ch.length) return say(pmsg, tr("Pick at least one tool.", "اختار أداة واحدة على الأقل."), "err");
          var u = await sb.from("plans").update({ name: en.value.trim(), price_minor: mn, description: edsc.value.trim() || null, scope: esc.value }).eq("id", p.id).select("id");
          if (u.error || !u.data || !u.data.length) return say(pmsg, u.error ? u.error.message : tr("Not saved.", "ماتحفظش."), "err");
          var d = await sb.from("plan_tools").delete().eq("plan_id", p.id); if (d.error) return say(pmsg, d.error.message, "err");
          if (esc.value === "tools") { var ins2 = await sb.from("plan_tools").insert(ch.map(function (k) { return { plan_id: p.id, tool_id: k }; })); if (ins2.error) return say(pmsg, ins2.error.message, "err"); }
          say(pmsg, tr("Plan saved. Reload to see it.", "الخطة اتحفظت. حدّث الصفحة."), "ok");
        } } });
        editPlanBox.appendChild(h("div", { "class": "row" }, en, epr, esc, edsc)); editPlanBox.appendChild(epBox);
        editPlanBox.appendChild(h("p", { "class": "hint", text: tr("Price and tool changes apply to new payments. People who already paid keep their period, but their access follows the plan's current tools.", "تغيير السعر والأدوات بيسري على الدفعات الجديدة. اللي دفع قبل كده بيكمل مدته، بس وصوله بيتبع أدوات الخطة الحالية.") }));
        editPlanBox.appendChild(h("div", { "class": "row" }, saveP));
        planRow.appendChild(h("button", { "class": "btn", type: "button", text: tr("Edit", "تعديل"), on: { click: function () { editPlanBox.style.display = editPlanBox.style.display === "none" ? "block" : "none"; } } }));
        planRow.appendChild(document.createTextNode(" "));
        planRow.appendChild(h("button", { "class": "btn", type: "button", text: p.active ? tr("Turn off", "إيقاف") : tr("Turn on", "تشغيل"), on: { click: async function () {
          var o = await sb.from("plans").update({ active: !p.active }).eq("id", p.id).select("id");
          say(pmsg, o.error || !o.data || !o.data.length ? tr("Not changed.", "ماتغيرش.") : (p.active ? tr("Plan is off: not sold anymore. Current holders keep access until their period ends. Reload.", "الخطة اتوقفت: مبتتباعش. اللي معاه اشتراك يكمل لحد ما يخلص. حدّث الصفحة.") : tr("Plan is on. Reload.", "الخطة اشتغلت. حدّث الصفحة.")), o.error || !o.data || !o.data.length ? "err" : "ok");
        } } }));
        planRow.appendChild(document.createTextNode(" "));
        var delPlanBtn = h("button", { "class": "btn", type: "button", text: tr("Delete", "حذف"), on: { click: async function () {
          if (!window.confirm(tr("Delete the plan \"" + p.name + "\"? This cannot be undone.", "تحذف الخطة \"" + p.name + "\"؟ مينفعش ترجع."))) return;
          var dl = await sb.from("plans").delete().eq("id", p.id).select("id");
          if (dl.error) return say(pmsg, tr("This plan already has payments or holders, so it cannot be deleted. Use Turn off instead.", "الخطة دي عليها دفعات أو مشتركين فمينفعش تتحذف. استخدم إيقاف بدلها."), "err");
          if (!dl.data || !dl.data.length) return say(pmsg, tr("Not deleted.", "ماتحذفتش."), "err");
          planRow.remove(); editPlanBox.remove(); say(pmsg, tr("Plan deleted.", "الخطة اتحذفت."), "ok");
        } } });
        planRow.appendChild(delPlanBtn);
        pp.appendChild(editPlanBox);
      }
    });
    if (owner) {
      pp.appendChild(h("p", { "class": "hint", text: tr("A plan's price applies to every enabled method. Paymob needs EGP plans.", "سعر الخطة بيتطبق على كل طرق الدفع المفعلة. Paymob محتاج خطط بالجنيه.") }));
      var n = h("input", { type: "text", placeholder: "name", maxlength: "40" }), pr = h("input", { type: "text", placeholder: "price e.g. 99.00", inputmode: "decimal" }), cu = h("input", { type: "text", placeholder: "EGP", maxlength: "3" });
      var pe = h("select", null, h("option", { value: "month", text: "month" }), h("option", { value: "year", text: "year" }));
      var scSel = h("select", null, h("option", { value: "all", text: tr("All tools", "كل الأدوات") }), h("option", { value: "tools", text: tr("Only selected tools", "أدوات محددة بس") })), dsc = h("input", { type: "text", maxlength: "300", placeholder: tr("Plan details shown to customers (optional)", "تفاصيل الخطة للعملاء (اختياري)"), style: "min-width:260px" }), picks = {}, pickBox = h("div", { style: "display:none;max-height:220px;overflow:auto;padding:6px 0" });
      allT.forEach(function (x) { var cb = h("input", { type: "checkbox" }); picks[x.id] = cb; pickBox.appendChild(h("label", { style: "display:inline-block;margin:2px 10px 2px 0" }, cb, " " + x.name)); });
      scSel.addEventListener("change", function () { pickBox.style.display = scSel.value === "tools" ? "block" : "none"; });
      pp.appendChild(h("div", { "class": "row" }, n, pr, cu, pe, scSel, dsc));
      pp.appendChild(pickBox);
      pp.appendChild(h("div", { "class": "row" }, h("button", { "class": "btn f", type: "button", text: tr("Add plan", "ضيف خطة"), on: { click: async function () {
        var minor = Math.round(parseFloat(pr.value) * 100); if (!(minor >= 0) || !/^[A-Za-z]{3}$/.test(cu.value)) return say(pmsg, "price/currency?", "err");
        var chosen = Object.keys(picks).filter(function (k) { return picks[k].checked; });
        if (scSel.value === "tools" && !chosen.length) return say(pmsg, tr("Pick at least one tool.", "اختار أداة واحدة على الأقل."), "err");
        var x = await sb.from("plans").insert({ name: n.value.trim(), price_minor: minor, currency: cu.value.toUpperCase(), period: pe.value, provider: "manual", active: true, scope: scSel.value, description: dsc.value.trim() || null }).select("id").single();
        if (!x.error && scSel.value === "tools") { var y = await sb.from("plan_tools").insert(chosen.map(function (k) { return { plan_id: x.data.id, tool_id: k }; })); if (y.error) return say(pmsg, y.error.message, "err"); }
        say(pmsg, x.error ? x.error.message : tr("Added. Reload to see it.", "اتضافت. حدّث الصفحة."), x.error ? "err" : "ok");
      } } })));
      /* Vodafone Cash details shown to customers (owner only; kept in the database, not in the repo) */
      var ms = await sb.rpc("get_manual_settings"), cur = (ms.data || [])[0] || {};
      var wn = h("input", { type: "text", maxlength: "11", placeholder: "01XXXXXXXXX", value: cur.wallet_number || "" }), wh = h("input", { type: "text", maxlength: "60", placeholder: tr("Name on the wallet", "الاسم على المحفظة"), value: cur.holder_name || "" }), wt = h("input", { type: "text", maxlength: "300", placeholder: tr("Note for customers (optional)", "ملاحظة للعملاء (اختياري)"), value: cur.note || "" });
      pp.appendChild(h("h3", { text: tr("Vodafone Cash details", "بيانات فودافون كاش") }));
      pp.appendChild(h("div", { "class": "row" }, wn, wh, wt, h("button", { "class": "btn f", type: "button", text: tr("Save", "حفظ"), on: { click: async function () {
        if (!/^01[0125][0-9]{8}$/.test(wn.value.trim())) return say(pmsg, tr("Wallet number must be an Egyptian mobile number.", "الرقم لازم يكون موبايل مصري."), "err");
        var x = await sb.rpc("set_manual_instructions", { w: wn.value.trim(), holder: wh.value.trim(), n: wt.value.trim() });
        say(pmsg, x.error ? tr("Could not save.", "ماتحفظش.") : tr("Saved.", "اتحفظ."), x.error ? "err" : "ok");
      } } })));
      /* pending manual payments */
      pp.appendChild(h("h3", { text: tr("Manual payments waiting", "دفعات يدوية مستنية") }));
      var rq = await sb.from("payment_requests").select("id,user_id,amount_minor,currency,period,reference,proof_path,created_at").eq("method", "manual").eq("status", "pending").order("created_at");
      if (!(rq.data || []).length) pp.appendChild(h("p", { "class": "hint", text: tr("None.", "مفيش.") }));
      (rq.data || []).forEach(function (q) {
        var rowEl = h("div", { "class": "row" }, h("span", { text: new Date(q.created_at).toLocaleString() + " - " + (q.amount_minor / 100).toFixed(2) + " " + q.currency + "/" + q.period + " - ref " + q.reference + " - user " + q.user_id.slice(0, 8) + "  " }));
        rowEl.appendChild(h("button", { "class": "btn", type: "button", text: tr("View proof", "اعرض الإثبات"), on: { click: async function () {
          var u = await sb.storage.from("payment-proofs").createSignedUrl(q.proof_path, 60); if (u.data) window.open(u.data.signedUrl, "_blank", "noopener"); else say(pmsg, tr("Could not open the proof.", "ماقدرتش أفتح الإثبات."), "err");
        } } }));
        rowEl.appendChild(h("button", { "class": "btn f", type: "button", text: tr("Approve", "اقبل"), on: { click: async function () {
          if (!confirm(tr("Approve and activate this subscription?", "تقبل وتفعّل الاشتراك؟"))) return;
          var x = await sb.rpc("review_manual_payment", { p_id: q.id, p_approve: true }); if (x.error) say(pmsg, tr("Failed.", "فشل."), "err"); else { say(pmsg, tr("Approved.", "اتقبلت."), "ok"); rowEl.remove(); }
        } } }));
        rowEl.appendChild(h("button", { "class": "btn", type: "button", text: tr("Reject", "ارفض"), on: { click: async function () {
          var why = prompt(tr("Reason (shown to the customer)", "السبب (هيظهر للعميل)")); if (why === null) return;
          var x = await sb.rpc("review_manual_payment", { p_id: q.id, p_approve: false, p_reason: why.slice(0, 200) }); if (x.error) say(pmsg, tr("Failed.", "فشل."), "err"); else { say(pmsg, tr("Rejected.", "اترفضت."), "ok"); rowEl.remove(); }
        } } }));
        pp.appendChild(rowEl);
      });
    } else pp.appendChild(h("p", { "class": "hint", text: tr("Only the owner can change payment settings.", "المالك بس يقدر يغيّر إعدادات الدفع.") }));
    pp.appendChild(pmsg);
  }

  /* ---------- published tools on tools.html ---------- */
  function creditEl(t) { return h("div", { "class": "credit" }, h("b", { text: tr("Not created by Zenoth.", "مش من عمل Zenoth.") }), " " + tr("Created by ", "المطوّر الأصلي: ") + t.orig_creator + ". " + tr("License: ", "الرخصة: ") + t.orig_license + ". ", h("a", { href: t.orig_repo, target: "_blank", rel: "noopener noreferrer", text: tr("Original repository", "الريبو الأصلي") + " \u2197" })); }
  function toast(text) {
    var d = h("div", { role: "status", text: text, style: "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;background:#1e7a3c;color:#fff;padding:12px 22px;border-radius:10px;font-size:16px;font-weight:600;box-shadow:0 6px 24px rgba(0,0,0,.35)" });
    document.body.appendChild(d); setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 4500);
  }
  function priceTxt(upd) { return upd.price_minor == null ? tr("no price", "من غير سعر") : (upd.price_minor / 100).toFixed(2) + " " + (upd.currency || "") + (upd.discount_percent > 0 ? " (-" + upd.discount_percent + "%)" : ""); }
  async function TSQ(cols, f) {
    var r = await f(sb.from("tools_view").select(cols)); if (r.error) r = await f(sb.from("tools").select(cols)); return r;
  }
  async function canOpen(t) {
    if (t.visibility !== "private") return true; if (!me) return false; if (me.role === "owner" || me.role === "admin") return true;
    var x = await sb.rpc("has_tool_access", { uid: me.id, tid: t.id }); return x.data === true;
  }
  function lockText() { return "\uD83D\uDD12 " + tr("Subscribers only. Subscribe to unlock the commands, guide and files.", "\u0644\u0644\u0645\u0634\u062a\u0631\u0643\u064a\u0646 \u0641\u0642\u0637. \u0627\u0634\u062a\u0631\u0643 \u0639\u0634\u0627\u0646 \u062a\u0641\u062a\u062d \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0648\u0627\u0644\u062f\u0644\u064a\u0644 \u0648\u0627\u0644\u0645\u0644\u0641\u0627\u062a."); }

  async function dynTools() {
    var SELT = "id,slug,name,class,description_en,description_ar,commands,visibility,created_by,third_party,orig_creator,orig_license,orig_repo", PRC = ",price_minor,currency,discount_percent,discount_until";
    var pubF = function (q) { return q.eq("status", "published"); }, r = await TSQ(SELT + PRC, pubF); if (r.error) r = await TSQ(SELT, pubF); if (r.error || !r.data) return;
    var LK = {}, st = document.createElement("style"); st.textContent = ".card.locked{opacity:.85;border-style:dashed}.card.locked .lockmsg{margin:8px 0;padding:8px 10px;border:1px dashed currentColor;border-radius:8px;font-size:13px;opacity:.8}"; document.head.appendChild(st);
    await Promise.all(r.data.filter(function (t) { return t.visibility === "private"; }).map(async function (t) { LK[t.id] = !(await canOpen(t)); }));
    r.data.forEach(function (t) {
      var sc0 = document.querySelector('article.card[data-name^="' + t.slug + ' "]');
      if (sc0) {
        var pp0 = sc0.querySelector("p"); if (pp0) { pp0.setAttribute("data-en", t.description_en); if (t.description_ar) pp0.setAttribute("data-ar", t.description_ar); pp0.textContent = (EN() || !t.description_ar) ? t.description_en : t.description_ar; }
        var cm0 = sc0.querySelector(".cmds"); if (LK[t.id]) { sc0.classList.add("locked"); if (cm0) { clear(cm0); cm0.appendChild(h("div", { "class": "lockmsg", text: lockText() })); } } else if (cm0 && t.commands && t.commands.length) { clear(cm0); t.commands.forEach(function (c) { cm0.appendChild(h("code", { text: c })); }); }
        var ft0 = sc0.querySelector(".foot"), more0 = ft0 && ft0.querySelector("a.more");
        if (ft0 && t.price_minor != null && !t.third_party) { var on0 = t.discount_percent > 0 && (!t.discount_until || new Date(t.discount_until) > new Date()), eff0 = on0 ? Math.floor(t.price_minor * (100 - t.discount_percent) / 100) : t.price_minor;
          ft0.insertBefore(h("span", { "class": "priv" }, on0 ? h("s", { text: (t.price_minor / 100).toFixed(2) }) : null, on0 ? " " : null, (eff0 / 100).toFixed(2) + " " + t.currency + (on0 ? " (-" + t.discount_percent + "%)" : "")), more0 || null); }
        if (ft0 && me && me.role === "owner") ft0.appendChild(h("a", { "class": "more", href: "admin.html#edit-" + encodeURIComponent(t.slug), text: tr("Edit", "تعديل") }));
        return;
      }
      var grid = document.querySelector("#c-" + t.class + " .grid"); if (!grid) return;
      var locked = !!LK[t.id], cmds = h("div", { "class": "cmds" }); if (locked) cmds.appendChild(h("div", { "class": "lockmsg", text: lockText() })); else (t.commands || []).forEach(function (c) { cmds.appendChild(h("code", { text: c })); });
      var p = h("p", { text: t.description_en }); if (t.description_ar) { p.setAttribute("data-en", t.description_en); p.setAttribute("data-ar", t.description_ar); }
      var tagc = t.third_party ? h("span", { "class": "tag third", text: "THIRD-PARTY" }) : t.visibility === "private" ? h("span", { "class": "tag", text: locked ? tr("LOCKED", "مقفول") : "PRO" }) : h("span", { "class": "tag new", text: "NEW" });
      var priceEl = null;
      if (t.price_minor != null && !t.third_party) { var on = t.discount_percent > 0 && (!t.discount_until || new Date(t.discount_until) > new Date()), eff = on ? Math.floor(t.price_minor * (100 - t.discount_percent) / 100) : t.price_minor;
        priceEl = h("span", { "class": "priv" }, on ? h("s", { text: (t.price_minor / 100).toFixed(2) }) : null, on ? " " : null, (eff / 100).toFixed(2) + " " + t.currency + (on ? " (-" + t.discount_percent + "%)" : "")); }
      grid.appendChild(h("article", { "class": (t.third_party ? "card third" : "card") + (locked ? " locked" : ""), "data-o": t.third_party ? "third" : null, "data-name": t.slug + " " + t.class, "data-c": t.class }, h("div", { "class": "top" }, h("h3", { text: t.name }), h("span", null, tagc)), p, cmds, t.third_party && !locked ? creditEl(t) : null,
        h("div", { "class": "foot" }, h("span", { "class": "priv", text: t.visibility === "private" ? "Subscribers only" : "Public" }), priceEl, locked ? h("a", { "class": "more", href: me ? "account.html" : "login.html", text: tr("Unlock", "افتح") }) : null, h("a", { "class": "more", href: "tool.html?t=" + encodeURIComponent(t.slug), text: "Details" }), (me && (me.role === "owner" || (me.role === "admin" && t.created_by === me.id))) ? h("a", { "class": "more", href: "admin.html#edit-" + encodeURIComponent(t.slug), text: tr("Edit", "تعديل") }) : null)));
    });
    var tc = document.getElementById("tcount");
    if (tc) {
      var nz = document.querySelectorAll("article.card:not(.third)").length, n3 = document.querySelectorAll("article.card.third").length;
      var en = nz + " tools by Zenoth plus " + n3 + " credited third-party tools, in 7 classes. Pick a class, search by name, or hover a card for a demo.";
      var ar = nz + " \u0623\u062f\u0627\u0629 \u0645\u0646 Zenoth \u0648" + n3 + " \u0623\u062f\u0627\u0629 \u0645\u0646 \u0645\u0637\u0648\u0651\u0631\u064a\u0646 \u062a\u0627\u0646\u064a\u0646 \u0645\u0639 \u0646\u0633\u0628\u0647\u0627 \u0644\u064a\u0647\u0645\u060c \u0641\u064a 7 \u0641\u0626\u0627\u062a. \u0627\u062e\u062a\u0627\u0631 \u0641\u0626\u0629 \u0623\u0648 \u062f\u0648\u0651\u0631 \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0642\u0641 \u0628\u0627\u0644\u0645\u0627\u0648\u0633 \u0639\u0644\u0649 \u0643\u0627\u0631\u062a \u0644\u062a\u0634\u0648\u0641 \u062f\u064a\u0645\u0648.";
      tc.setAttribute("data-en", en); tc.setAttribute("data-ar", ar); tc.textContent = EN() ? en : ar;
    }
  }

  async function toolPage() {
    var app = $("app"), slug = new URLSearchParams(location.search).get("t") || ""; clear(app);
    var r = await TSQ("id,name,class,description_en,description_ar,commands,visibility,created_by,third_party,orig_creator,orig_license,orig_repo", function (q) { return q.eq("slug", slug).eq("status", "published").maybeSingle(); });
    var box = h("div", { "class": "wide" }); app.appendChild(box);
    if (!r.data) return box.appendChild(h("div", { "class": "off", text: "404" }));
    var t = r.data, a = (await sb.from("tool_assets").select("video_url,repo_url,file_path").eq("tool_id", t.id).maybeSingle()).data;
    var pn = h("div", { "class": "panel" }, h("h1", { text: t.name }), h("p", { text: EN() || !t.description_ar ? t.description_en : t.description_ar }));
    if (t.third_party && t.orig_repo) pn.appendChild(creditEl(t));
    var tOpen = await canOpen(t);
    if (!tOpen) pn.appendChild(h("p", { "class": "hint", text: lockText() })); else (t.commands || []).forEach(function (c) { pn.appendChild(h("code", { text: c, style: "display:block;margin:4px 0" })); });
    if (!a) { pn.appendChild(h("p", { "class": "hint", text: tr("Video, repo and files are for subscribers only.", "الفيديو والريبو والملفات للمشتركين بس.") })); pn.appendChild(h("a", { "class": "btn f", href: me ? "account.html" : "login.html", text: tr("Subscribe", "اشترك") })); }
    else {
      if (a.video_url && /^https:\/\//.test(a.video_url)) pn.appendChild(h("p", null, h("a", { "class": "btn", href: a.video_url, target: "_blank", rel: "noopener noreferrer", text: tr("Watch video", "شاهد الفيديو") })));
      if (a.repo_url) pn.appendChild(h("p", null, h("a", { "class": "btn", href: a.repo_url, target: "_blank", rel: "noopener noreferrer", text: "GitHub" })));
      if (a.file_path) pn.appendChild(h("button", { "class": "btn f", type: "button", text: tr("Download", "تحميل"), on: { click: async function () { var u = await sb.storage.from("tool-files").createSignedUrl(a.file_path, 60); if (u.data) location.href = u.data.signedUrl; } } }));
    }
    if (me && (me.role === "owner" || (me.role === "admin" && t.created_by === me.id))) pn.appendChild(h("p", null, h("a", { "class": "btn", href: "admin.html#edit-" + encodeURIComponent(slug), text: tr("Edit this tool", "عدّل الأداة دي") })));
    box.appendChild(pn);
  }
  (async function () {
    var ok = await load();
    if (ok) inMode();
    if (PAGE === "tool") { if (ok) { sideMenu(); toolPage(); } return; }
    if (PAGE === "tools") { if (ok) { dynTools(); sideMenu(); } return; }
    if (!ok) return;
    if (!PAGE) { sideMenu(); return; }
    if (PAGE === "login") { if (recovering) return resetPage(); if (me) return go("account.html"); loginPage(); }
    else { sideMenu(); if (PAGE === "account") accountPage(); else if (PAGE === "community") communityPage(); else if (PAGE === "admin") adminPage(); }
  })();
})();
