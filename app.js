/* SCARHUB account, community and admin client. All security is enforced by the database (RLS), not by this file. */
(function () {
  "use strict";
  var CFG = window.SCAR_CFG || {};
  var PAGE = document.body.getAttribute("data-page") || "";
  var EN = function () { return document.documentElement.lang !== "ar"; };
  var tr = function (en, ar) { return EN() ? en : ar; };
  var sb = null, me = null, recovering = false;
  var EMAIL_RE = /^(?=.{6,254}$)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
  var USER_RE = /^[A-Za-z][A-Za-z0-9_]{2,19}$/, ALIAS_RE = /^[A-Za-z\u0621-\u064A][A-Za-z0-9_\u0621-\u064A ]{2,24}$/, STAFF_USER_RE = /^[A-Za-z\u0621-\u064A][A-Za-z0-9_\u0621-\u064A ]{2,19}$/;
  /* names nobody may register: anything that reads as "zenoth" (case, leetspeak, separators, repeats, Arabic). Also enforced in the database. */
  function reservedName(v) { var t = String(v || "").toLowerCase().replace(/[301!|4@5$7]/g, function (c) { return { "3": "e", "0": "o", "1": "i", "!": "i", "|": "i", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t" }[c]; }).replace(/[^a-z\u0621-\u064A]/g, "").replace(/(.)\1+/g, "$1"); return t.indexOf("zenoth") > -1 || t.indexOf("\u0632\u064A\u0646\u0648\u0633") > -1 || t.indexOf("\u0632\u064A\u0646\u0648\u062B") > -1; }
  function userNameOk(v, staff) { return (staff ? STAFF_USER_RE : USER_RE).test(v) && (staff || !reservedName(v)); }
  function pwProblems(p) {
    var r = [];
    if (p.length < 12 || p.length > 64) r.push(tr("12 to 64 characters", "من 12 لـ 64 حرف"));
    if (!/[a-z]/.test(p)) r.push(tr("a lowercase letter (a-z)", "حرف صغير (a-z)"));
    if (!/[A-Z]/.test(p)) r.push(tr("an uppercase letter (A-Z)", "حرف كبير (A-Z)"));
    if (!/[0-9]/.test(p)) r.push(tr("a number", "رقم"));
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,.\/`~]/.test(p)) r.push(tr("a symbol like ! @ # $ % & *", "رمز زي ! @ # $ % & *"));
    return r;
  }
  /* server (Supabase Auth) rule: 12+ chars with lowercase, uppercase, digit and symbol. Keep pwProblems equal to it. */
  function authErr(e, kind) {
    var c = (e && (e.code || e.error_code)) || "", st = e && e.status, m = String((e && e.message) || "").toLowerCase();
    if (c === "weak_password") {
      var rs = (e.weak_password && e.weak_password.reasons) || [];
      if (rs.indexOf("pwned") >= 0) return tr("This password appears in known data leaks. Choose a different one.", "الباسورد ده ظاهر في تسريبات معروفة. اختار باسورد تاني.");
      return tr("The password was rejected: it needs 12+ characters with a lowercase letter, an uppercase letter, a number and a symbol.", "الباسورد اترفض: لازم 12 حرف أو أكتر فيهم حرف صغير وحرف كبير ورقم ورمز.");
    }
    if (c === "same_password") return tr("The new password must be different from the old one.", "الباسورد الجديد لازم يختلف عن القديم.");
    if (c === "user_already_exists" || c === "email_exists" || c === "identity_already_exists" || m.indexOf("already registered") >= 0) return tr("This email is already registered. Try signing in or reset your password.", "الإيميل ده متسجل قبل كده. جرب تدخل أو اعمل استعادة للباسورد.");
    if (c === "over_email_send_rate_limit" || c === "over_request_rate_limit" || c === "over_sms_send_rate_limit" || st === 429) return tr("Too many attempts. Wait a few minutes and try again.", "محاولات كتير. استنى كام دقيقة وجرب تاني.");
    if (c === "captcha_failed") return tr("The security check failed or expired. Complete it again and retry.", "التحقق الأمني فشل أو انتهى. كمّله تاني وجرب.");
    if (c === "signup_disabled") return tr("New sign-ups are closed right now.", "التسجيل الجديد مقفول دلوقتي.");
    if (c === "email_address_invalid" || c === "validation_failed") return tr("Please check the email and the other fields.", "راجع الإيميل وباقي الخانات.");
    if (c === "email_not_confirmed") return tr("Confirm your email first using the code we sent.", "أكد الإيميل الأول بالكود اللي بعتناه.");
    if (c === "reauthentication_needed" || c === "session_not_found") return tr("Your session ended. Open the link from your email again.", "الجلسة خلصت. افتح اللينك من الإيميل تاني.");
    if (st === 0 || m.indexOf("fetch") >= 0 || m.indexOf("network") >= 0) return tr("Network problem. Check your connection and retry.", "مشكلة في النت. اتأكد من الاتصال وجرب تاني.");
    return (kind === "up" ? tr("Could not create the account.", "ماقدرناش نعمل الحساب.") : kind === "pw" ? tr("Could not change the password.", "ماقدرناش نغير الباسورد.") : tr("Something went wrong.", "حصل خطأ.")) + " [" + (c || st || "error") + "]";
  }
  /* show/hide eye next to a password field */
  function eye(inp) {
    var b = h("button", { type: "button", "class": "pw-eye", "aria-pressed": "false" }), on = false;
    var ic = function () { b.innerHTML = on ? '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>' : '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'; b.setAttribute("aria-label", on ? tr("Hide password", "إخفاء الباسورد") : tr("Show password", "إظهار الباسورد")); b.title = b.getAttribute("aria-label"); b.setAttribute("aria-pressed", on ? "true" : "false"); };
    b.addEventListener("click", function () { on = !on; inp.type = on ? "text" : "password"; ic(); inp.focus(); });
    ic();
    return h("div", { "class": "pwf" }, inp, b);
  }
  function h(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) { if (k === "text") e.textContent = attrs[k]; else if (k === "on") { for (var ev in attrs.on) e.addEventListener(ev, attrs.on[ev]); } else e.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return e;
  }
  var $ = function (id) { return document.getElementById(id); };
  /* staff removal dialog: optional reason + explicit opt-in to email it */
  async function askRemoval(title, who) {
    var flagOn = true; try { var fr = await sb.rpc("notice_settings_get"); if (fr && fr.data) flagOn = !!fr.data.admin_notices; } catch (e) {}
    return new Promise(function (resolve) {
      var ov = h("div", { style: "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" });
      var box = h("div", { role: "dialog", "aria-modal": "true", style: "background:var(--card,#fff);color:inherit;border:1px solid var(--line,#ccc);border-radius:12px;padding:18px;width:min(440px,100%);max-height:90vh;overflow:auto" });
      var ta = h("textarea", { rows: "3", maxlength: "500", style: "width:100%;box-sizing:border-box", "aria-label": tr("Reason (optional)", "السبب (اختياري)"), placeholder: tr("Reason (optional)", "السبب (اختياري)") });
      var cb = h("input", { type: "checkbox", id: "rmNotify" }); cb.disabled = true;
      var lbl = h("label", { "for": "rmNotify", style: "display:flex;gap:8px;align-items:flex-start;margin:10px 0" }, cb, h("span", { text: tr("Send to the user by email", "ابعت للمستخدم بالإيميل") }));
      var hint = h("p", { "class": "hint", text: (me && me.role === "owner") ? tr("Optional. The reason is saved in Admin > Logs. An email goes out only if you write a reason AND tick this box.", "اختياري. السبب بيتسجل في سجل الإدارة. الإيميل بيتبعت بس لو كتبت سبب وعلّمت على الخانة دي.") : flagOn ? tr("Optional. The reason is saved in Admin > Logs. An email goes out only if you write a reason AND tick this box. It is sent from the site account in your name, and replies go to your email.", "اختياري. السبب بيتسجل في سجل الإدارة. الإيميل بيتبعت بس لو كتبت سبب وعلّمت على الخانة. بيتبعت من حساب الموقع باسمك والرد بيروح لإيميلك.") : tr("Optional. The reason is saved in Admin > Logs. The owner turned off emails to users.", "اختياري. السبب بيتسجل في سجل الإدارة. المالك قفل الإيميلات للمستخدمين.") });
      function fin(v) { document.removeEventListener("keydown", esc, true); ov.remove(); resolve(v); }
      function esc(e) { if (e.key === "Escape") fin(null); }
      var canMail = !!me && (me.role === "owner" || flagOn); ta.addEventListener("input", function () { var has = !!ta.value.trim() && canMail; cb.disabled = !has; if (!has) cb.checked = false; });
      var ok = h("button", { "class": "btn", type: "button", style: "color:#e11d2e", text: tr("Confirm", "تأكيد"), on: { click: function () { var rs = ta.value.trim(); fin({ reason: rs || null, notify: !!(rs && cb.checked) }); } } });
      var no = h("button", { "class": "btn", type: "button", text: tr("Cancel", "إلغاء"), on: { click: function () { fin(null); } } });
      box.appendChild(h("h3", { text: title })); if (who) box.appendChild(h("p", { text: who })); box.appendChild(ta); box.appendChild(lbl); box.appendChild(hint);
      box.appendChild(h("div", { style: "display:flex;gap:8px;justify-content:flex-end" }, no, ok)); ov.appendChild(box); document.body.appendChild(ov);
      document.addEventListener("keydown", esc, true); ta.focus();
    });
  }
  async function sendNotices() {
    try {
      var r = await sb.auth.getSession(), t = r.data && r.data.session && r.data.session.access_token; if (!t) return false;
      var f = await fetch(CFG.url + "/functions/v1/send-notices", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t, apikey: CFG.anonKey }, body: "{}" });
      return f.ok;
    } catch (e) { return false; }
  }
  function noticeNote(ok) { return ok ? "" : "\n" + tr("The email could not be sent right now. The action itself went through.", "الإيميل ماتبعتش دلوقتي. الإجراء نفسه اتنفذ."); }
  function say(el, text, kind) { el.className = "msg " + (kind || ""); el.textContent = text; }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  /* avatars: b1-b8 boys, g1-g8 girls, generated SVG */
  var SKIN = ["#f1c9a5", "#e0a97d", "#c58c5c", "#8d5a3b"], HAIR = ["#1b1b1b", "#4a2c17", "#8a5a2b", "#c9a04a", "#7a1f1f", "#2f3d5a", "#3c3c3c", "#0e0e0e"], BG = ["#2a1215", "#122a24", "#12202a", "#2a2412"];
  var avN = 0;
  function avVer(uid) { try { return localStorage.getItem("scar_av_" + uid) || ""; } catch (e) { return ""; } }
  function avatarSvg(code, uid) {
    if (code === "custom" && uid) return h("img", { "data-avu": uid, src: CFG.url + "/storage/v1/object/public/avatars/" + uid + "/avatar" + (avVer(uid) ? "?v=" + avVer(uid) : ""), alt: "", style: "width:100%;height:100%;border-radius:50%;object-fit:cover;display:block" });
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
    if (uid) s.setAttribute("data-avu", uid);
    return s;
  }
  /* swap every copy of my avatar on the page (header chip, side button, bell, chat, account) without a refresh */
  function refreshMyAvatar(bump) {
    if (!me) return; if (bump) { try { localStorage.setItem("scar_av_" + me.id, String(Date.now())); } catch (e) {} }
    [].slice.call(document.querySelectorAll('[data-avu="' + me.id + '"]')).forEach(function (n) { if (n.parentNode) n.parentNode.replaceChild(avatarSvg(me.avatar, me.id), n); });
  }
  /* big viewer with zoom in / out (buttons, wheel, keys) for an avatar */
  function avatarLightbox(code, uid) {
    var o = h("div", { role: "dialog", "aria-modal": "true", "aria-label": "Avatar", style: "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;overflow:auto;padding:60px 12px 12px" });
    var size = Math.min(380, Math.floor(Math.min(innerWidth, innerHeight) * .8)), frame = h("div", { style: "flex:none;border-radius:50%;overflow:hidden;background:#0c0c0e;margin:auto" }), pct = h("span", { style: "color:#fff;font:600 14px sans-serif;min-width:48px;text-align:center" });
    function put() { frame.style.width = frame.style.height = size + "px"; pct.textContent = Math.round(size / 3.8) + "%"; }
    function bump(f) { size = Math.max(80, Math.min(3000, Math.round(size * f))); put(); }
    var big = avatarSvg(code, uid); big.removeAttribute("data-avu"); big.style.width = "100%"; big.style.height = "100%"; frame.appendChild(big);
    function mk(t, label, f) { return h("button", { type: "button", "aria-label": label, text: t, style: "font:700 22px/1 sans-serif;color:#fff;background:#222;border:1px solid #555;border-radius:8px;width:40px;height:36px;cursor:pointer", on: { click: function (e) { e.stopPropagation(); bump(f); } } }); }
    var bar = h("div", { style: "position:fixed;top:10px;inset-inline-start:12px;display:flex;gap:8px;align-items:center;z-index:2" }, mk("\u2212", tr("Zoom out", "تصغير"), 1 / 1.25), pct, mk("+", tr("Zoom in", "تكبير"), 1.25));
    var x = h("button", { type: "button", "aria-label": tr("Close", "إغلاق"), text: "\u00d7", style: "position:fixed;top:6px;inset-inline-end:14px;font:700 32px/1 sans-serif;color:#fff;background:transparent;border:0;cursor:pointer;z-index:2" });
    function close() { document.removeEventListener("keydown", key, true); o.remove(); }
    function key(e) { if (e.key === "Escape") close(); else if (e.key === "+" || e.key === "=") bump(1.25); else if (e.key === "-") bump(1 / 1.25); }
    x.addEventListener("click", close); o.addEventListener("click", function (e) { if (e.target === o) close(); });
    o.addEventListener("wheel", function (e) { e.preventDefault(); bump(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
    document.addEventListener("keydown", key, true); put(); o.appendChild(frame); o.appendChild(bar); o.appendChild(x); document.body.appendChild(o);
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
  window.scarAvatar = function (code, uid) { return avatarSvg(code, uid); };
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
      if (me) { try { if (!sessionStorage.getItem("lg_" + s.user.id)) { sessionStorage.setItem("lg_" + s.user.id, "1"); sb.rpc("log_login").then(function () {}, function () {}); } } catch (e) {} }
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
    if (n.kind === "new_user") return tr("New user registered: " + (m.user || ""), "مستخدم جديد سجل: " + (m.user || ""));
    if (n.kind === "payment_pending") return tr("Your payment" + plan + " was received. Waiting for confirmation from the team.", "دفعتك" + plan + " اتسلمت. مستنية تأكيد الفريق.");
    if (n.kind === "payment_approved") return tr("Your payment" + plan + " was approved. Your subscription is active.", "دفعتك" + plan + " اتقبلت. اشتراكك اتفعّل.");
    if (n.kind === "payment_rejected") return tr("Your payment" + plan + " was rejected." + (m.reason ? " Reason: " + m.reason : ""), "دفعتك" + plan + " اترفضت." + (m.reason ? " السبب: " + m.reason : ""));
    if (n.kind === "payment_submitted") return tr("New payment proof from " + (m.user || "a user") + ": " + (m.amount / 100).toFixed(2) + " " + m.currency + (m.plan ? " (" + m.plan + ")" : "") + ". Review it in Admin > Payments.", "إثبات دفع جديد من " + (m.user || "مستخدم") + ": " + (m.amount / 100).toFixed(2) + " " + m.currency + (m.plan ? " (" + m.plan + ")" : "") + ". راجعه في Admin > المدفوعات.");
    return "";
  }
  /* live updates: Supabase Realtime plus a 20 second poll as fallback */
  var noteSubs = [], paySubs = [], noteChan = null, payChan = null, pollOn = false;
  function fireAll(list) { return function () { list.forEach(function (f) { try { f(); } catch (e) {} }); }; }
  function livePoll() { if (!pollOn) { pollOn = true; setInterval(function () { if (!document.hidden) { fireAll(noteSubs)(); fireAll(paySubs)(); } }, 20000); } }
  function onNotes(cb) { noteSubs.push(cb); if (!noteChan && sb && me) { try { noteChan = sb.channel("notes-" + me.id).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: "user_id=eq." + me.id }, fireAll(noteSubs)).subscribe(); } catch (e) {} } livePoll(); }
  function onPay(cb) { payOn.push(cb); }
  var payOn = paySubs;
  function startPay() { if (!payChan && sb && me && isStaff()) { try { payChan = sb.channel("pay-" + me.id).on("postgres_changes", { event: "*", schema: "public", table: "payment_requests" }, fireAll(payOn)).subscribe(); } catch (e) {} } livePoll(); }
  /* payment proof inside an inbox message (staff): image preview + approve / reject */
  function noteExtras(n, row) {
    if (n.kind !== "payment_submitted" || !isStaff() || !n.meta || !n.meta.request) return;
    var box = h("div", { style: "margin-top:6px;width:100%" }); row.appendChild(box);
    (async function () {
      var q = await sb.from("payment_requests").select("id,status,proof_path,reference").eq("id", n.meta.request).maybeSingle();
      if (!q.data) return box.appendChild(h("span", { "class": "hint", text: tr("Request not found.", "الطلب مش موجود.") }));
      if (q.data.status !== "pending") return box.appendChild(h("span", { "class": "hint", text: tr("Already handled: ", "اتعالجت: ") + ({ approved: tr("approved", "اتقبلت"), rejected: tr("rejected", "اترفضت") }[q.data.status] || q.data.status) }));
      if (q.data.reference) box.appendChild(h("div", { "class": "hint", text: tr("Note: ", "ملاحظة: ") + q.data.reference }));
      var u = await sb.storage.from("payment-proofs").createSignedUrl(q.data.proof_path, 600);
      if (u.data) { var img = h("img", { src: u.data.signedUrl, alt: "proof", style: "max-width:100%;max-height:260px;border-radius:8px;display:block;margin:4px 0;cursor:zoom-in" }); img.addEventListener("click", function () { window.open(u.data.signedUrl, "_blank", "noopener"); }); box.appendChild(img); }
      else box.appendChild(h("div", { "class": "hint", text: tr("Could not load the proof image.", "ماقدرتش أحمل صورة الإثبات.") }));
      var msg = h("span", { "class": "hint" });
      var ok = h("button", { "class": "btn f", type: "button", text: tr("Approve", "اقبل") }), no = h("button", { "class": "btn", type: "button", text: tr("Reject", "ارفض") });
      ok.addEventListener("click", async function () {
        if (!confirm(tr("Approve and activate this subscription?", "تقبل وتفعّل الاشتراك؟"))) return;
        var x = await sb.rpc("review_manual_payment", { p_id: q.data.id, p_approve: true });
        if (x.error) { msg.textContent = tr("Failed.", "فشل."); } else { clear(box); box.appendChild(h("span", { "class": "hint", text: tr("Approved.", "اتقبلت.") })); }
      });
      no.addEventListener("click", async function () {
        var why = prompt(tr("Reason (shown to the customer)", "السبب (هيظهر للعميل)")); if (why === null) return;
        var x = await sb.rpc("review_manual_payment", { p_id: q.data.id, p_approve: false, p_reason: why.slice(0, 200) });
        if (x.error) { msg.textContent = tr("Failed.", "فشل."); } else { clear(box); box.appendChild(h("span", { "class": "hint", text: tr("Rejected.", "اترفضت.") })); }
      });
      box.appendChild(h("div", { "class": "row" }, ok, no, msg));
    })();
  }
  /* bell: opens the inbox as a dropdown on every page */
  function bellInit(nav, before) {
    if (document.getElementById("bellbtn")) return;
    var st = document.createElement("style");
    st.textContent = ".bell{position:relative;display:inline-flex;align-items:center;justify-content:center;height:36px;min-width:36px;padding:0 8px;box-sizing:border-box;border:1px solid #c9a227;border-radius:30px;background:transparent;color:#f0d98a;cursor:pointer;font-size:16px;margin-inline-start:6px;flex:none}.bell:hover{background:#c9a22722}.bell b{position:absolute;top:-7px;inset-inline-end:-5px;min-width:18px;height:18px;border-radius:9px;background:#d22;color:#fff;font:700 11px/18px sans-serif;padding:0 4px;text-align:center}.bellpanel{position:fixed;top:64px;inset-inline-end:12px;width:min(380px,calc(100vw - 24px));max-height:75vh;overflow:auto;background:#14100a;border:1px solid #c9a227;border-radius:12px;padding:10px 12px;z-index:99998;box-shadow:0 10px 40px #000a;color:#eee}.bellpanel .nrow{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;gap:2px}.bellpanel .nrow.u{border-inline-start:3px solid #d22;padding-inline-start:8px}";
    document.head.appendChild(st);
    var cnt = h("b", { style: "display:none", text: "0" });
    var bell = h("button", { type: "button", id: "bellbtn", "class": "bell", "aria-label": tr("Inbox", "الرسائل"), title: tr("Inbox", "الرسائل") }, "\u2709", cnt);
    var pnl = h("div", { "class": "bellpanel", style: "display:none", role: "dialog" }); document.body.appendChild(pnl);
    if (before && before.parentNode === nav) nav.insertBefore(bell, before); else nav.appendChild(bell);
    var open = false;
    async function render(list) {
      clear(pnl); pnl.appendChild(h("b", { text: tr("Inbox", "صندوق الرسائل") }));
      if (!list.length) pnl.appendChild(h("p", { "class": "hint", text: tr("No messages yet.", "مفيش رسايل لسه.") }));
      list.slice(0, 15).forEach(function (n) {
        var r = h("div", { "class": "nrow" + (n.read_at ? "" : " u") }, h("span", { text: noteText(n) }), h("span", { "class": "hint", text: new Date(n.created_at).toLocaleString(EN() ? "en-GB" : "ar-EG") }));
        if (n.kind === "payment_submitted" && isStaff()) r.appendChild(h("a", { href: "admin.html#payments", text: tr("Open Admin > payments", "افتح الإدارة > المدفوعات") }));
        pnl.appendChild(r); noteExtras(n, r);
      });
      pnl.appendChild(h("p", null, h("a", { href: "account.html#inbox", text: tr("Open full inbox", "افتح صندوق الرسائل كامل") })));
    }
    async function count() { var l = await loadNotes(), n = l.filter(function (x) { return !x.read_at; }).length; cnt.textContent = String(n); cnt.style.display = n ? "" : "none"; return l; }
    async function toggle(force) {
      open = force === undefined ? !open : force; pnl.style.display = open ? "block" : "none"; if (!open) return;
      var l = await loadNotes(); await render(l);
      if (l.some(function (x) { return !x.read_at; })) { await sb.rpc("mark_notifications_read"); cnt.style.display = "none"; var d = document.getElementById("inboxdot"); if (d) d.remove(); }
    }
    bell.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    pnl.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function (e) { if (open) { if (e.target && e.target.id === "inboxdot") return; toggle(false); } });
    document.addEventListener("click", function (e) { if (e.target && e.target.id === "inboxdot") { e.stopPropagation(); toggle(true); } }, true);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) toggle(false); });
    count(); onNotes(async function () { var l = await count(); if (open) render(l); });
  }
  async function loadNotes() {
    var r = await sb.from("notifications").select("id,kind,meta,read_at,created_at").order("created_at", { ascending: false }).limit(50);
    return r.error ? [] : (r.data || []);
  }
  async function inboxPanel(box) {
    var sig = null;
    async function draw() {
      var list = await loadNotes(), sg = list.map(function (n) { return n.id + (n.read_at ? "r" : "u"); }).join(",");
      if (sg === sig) return; sig = sg;
      clear(box); await drawInbox(box, list);
    }
    await draw(); onNotes(draw);
  }
  async function drawInbox(box, list) {
    var p = h("div", { "class": "panel", id: "inbox" }, h("h2", { text: tr("Inbox", "صندوق الرسائل") }));
    box.appendChild(p); if (location.hash === "#inbox") setTimeout(function () { p.scrollIntoView(); }, 50);
    if (!list.length) { p.appendChild(h("p", { "class": "hint", text: tr("No messages yet.", "مفيش رسايل لسه.") })); return; }
    list.forEach(function (n) {
      var nr = h("div", { "class": "row", style: "flex-direction:column;align-items:flex-start;gap:2px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)" + (n.read_at ? "" : ";border-inline-start:3px solid var(--r);padding-inline-start:8px") },
        h("span", { text: noteText(n) }), h("span", { "class": "hint", text: new Date(n.created_at).toLocaleString(EN() ? "en-GB" : "ar-EG") }));
      p.appendChild(nr); noteExtras(n, nr);
    });
    if (list.some(function (n) { return !n.read_at; })) { await sb.rpc("mark_notifications_read"); var d = document.getElementById("inboxdot"); if (d) d.remove(); var il = document.getElementById("inboxlink"); if (il) il.textContent = tr("Inbox", "الرسائل"); }
  }

  /* ---------- signed-in look on every page: avatar chip in the header and a different background ---------- */
  function inMode() {
    if (!me || document.getElementById("inmode")) return;
    var st = document.createElement("style"); st.id = "inmode";
    st.textContent = "html.in body{background:radial-gradient(1100px 560px at 15% -10%,#3b2c0a 0,transparent 55%),radial-gradient(900px 500px at 90% 0,#2a0b10 0,transparent 60%),#0b0a08}html.in #loginlink{display:none!important}html.in nav{border-bottom:1px solid #c9a22799;box-shadow:0 2px 18px #c9a22722}.uchip{display:inline-flex;align-items:center;gap:6px;height:36px;box-sizing:border-box;padding:2px 10px 2px 2px;border:1px solid #c9a227;border-radius:30px;color:#f0d98a;text-decoration:none;font-size:13px;white-space:nowrap;max-width:150px;flex:none;margin-inline-start:6px}.uchip .av{display:block;flex:none;width:30px;height:30px;border-radius:50%;overflow:hidden}.uchip .av>*{display:block;width:100%!important;height:100%!important;max-width:none;object-fit:cover;border-radius:50%}.uchip .nm{overflow:hidden;text-overflow:ellipsis;max-width:90px}.uchip:hover{background:#c9a22722}";
    document.head.appendChild(st); document.documentElement.classList.add("in");
    var nav = document.getElementById("nav"); if (!nav) return;
    var chip = h("a", { "class": "uchip" + (isStaff() ? " " + me.role : ""), href: "account.html", title: (isStaff() ? me.alias : me.username) + " - " + tr("My account", "حسابي") }, h("span", { "class": "av" }, avatarSvg(me.avatar, me.id)), h("span", { "class": "nm", text: isStaff() ? me.alias : me.username }), isStaff() ? h("span", { "class": "bdg " + me.role, text: me.role === "owner" ? tr("Owner", "المالك") : tr("Admin", "أدمن") }) : null);
    var lg = document.getElementById("lang"); if (lg && lg.parentNode === nav) nav.insertBefore(chip, lg); else nav.appendChild(chip);
    bellInit(nav, chip);
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
    function badge() { loadNotes().then(function (l) {
      var n = l.filter(function (x) { return !x.read_at; }).length, dot = document.getElementById("inboxdot");
      inl.textContent = tr("Inbox", "الرسائل") + (n ? " (" + n + ")" : "");
      if (!n) { if (dot) dot.remove(); return; }
      if (dot) dot.textContent = String(n); else btn.appendChild(h("span", { id: "inboxdot", text: String(n), style: "position:absolute;top:-6px;inset-inline-start:-6px;min-width:20px;height:20px;border-radius:10px;background:#d22;color:#fff;font:700 12px/20px sans-serif;text-align:center;padding:0 4px" }));
    }); }
    badge(); onNotes(badge);
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
    form.appendChild(h("div", { id: "pwwrap" }, h("label", { "for": "pw", text: tr("Password (12-64: upper and lower letters, numbers, symbols)", "الباسورد (12-64: حروف كبيرة وصغيرة وأرقام ورموز)") }), eye(pw), pwHint));
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
    uname.addEventListener("input", function () { var ok = userNameOk(uname.value, false); unHint.textContent = uname.value ? (ok ? "OK" : (USER_RE.test(uname.value) ? tr("This name is not allowed", "الاسم ده مش مسموح") : tr("3-20 English letters, numbers or _, start with a letter", "3-20 حرف إنجليزي أو رقم أو _ وتبدأ بحرف"))) : ""; unHint.className = "hint " + (ok ? "good" : "bad"); });
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
          if (!userNameOk(uname.value, false)) return say(msg, tr("Invalid or not allowed username (English letters, numbers, _).", "اسم مستخدم غير صحيح أو مش مسموح (حروف إنجليزي وأرقام و _)."), "err");
          var ct = takeCaptcha(); if (!ct) return say(msg, tr("Please complete the check above first.", "كمّل التحقق اللي فوق الأول."), "err");
          var r = await sb.auth.signUp({ email: em, password: pw.value, options: { captchaToken: ct, emailRedirectTo: location.origin + location.pathname.replace(/[^/]*$/, "") + "login.html", data: { username: uname.value, avatar: pick() } } });
          if (r.error) return say(msg, authErr(r.error, "up"), "err");
          pending = em; setMode("code"); return say(msg, tr("We sent a verification code to your email. Enter it below to confirm your account. Check spam if you do not see it.", "بعتنالك كود تأكيد على الإيميل. اكتبه تحت عشان تأكد حسابك. بص في السبام لو مش لاقيه."), "ok");
        }
        var ct2 = takeCaptcha(); if (!ct2) return say(msg, tr("Please complete the check above first.", "كمّل التحقق اللي فوق الأول."), "err");
        var s = await sb.auth.signInWithPassword({ email: em, password: pw.value, options: { captchaToken: ct2 } });
        if (s.error) return say(msg, s.error.code === "invalid_credentials" ? tr("Wrong email or password.", "الإيميل أو الباسورد غلط.") : authErr(s.error, "in"), "err");
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
    form.appendChild(h("label", { "for": "np", text: tr("New password (12-64: upper and lower letters, numbers, symbols)", "الباسورد الجديد (12-64: حروف كبيرة وصغيرة وأرقام ورموز)") })); form.appendChild(eye(p1)); form.appendChild(hint);
    form.appendChild(h("div", { "class": "row" }, btn)); form.appendChild(msg);
    form.addEventListener("submit", async function (e) {
      e.preventDefault(); var q = pwProblems(p1.value); if (q.length) return say(msg, tr("Password needs: ", "الباسورد ناقص: ") + q.join(", "), "err");
      btn.disabled = true; var u = await sb.auth.updateUser({ password: p1.value }); btn.disabled = false;
      if (u.error) return say(msg, authErr(u.error, "pw"), "err");
      await sb.auth.signOut(); say(msg, tr("Password changed. Taking you to sign in...", "الباسورد اتغير. هنوديك لتسجيل الدخول..."), "ok"); setTimeout(function () { go("login.html"); }, 1500);
    });
    clear(app); app.appendChild(h("div", { "class": "auth" }, h("h2", { text: tr("Choose a new password", "اختار باسورد جديد") }), form));
  }

  /* ---------- account ---------- */
  /* manual Vodafone Cash payment: customer sends money, uploads proof, owner approves in Admin. Amount and plan are checked by the database. */
  /* proof images: check the real file signature, then re-draw on a canvas and save as WebP/JPEG (drops metadata and anything hidden in the file). Final size must be under 3 MB. */
  async function cleanProofImage(f) {
    var b = new Uint8Array(await f.slice(0, 12).arrayBuffer()), ok = (b[0] === 255 && b[1] === 216 && b[2] === 255) || (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 && b[4] === 13 && b[5] === 10 && b[6] === 26 && b[7] === 10) || (b[0] === 82 && b[1] === 73 && b[2] === 70 && b[3] === 70 && b[8] === 87 && b[9] === 69 && b[10] === 66 && b[11] === 80);
    if (!ok) return null;
    var bmp; try { bmp = await createImageBitmap(f); } catch (e) { return null; }
    var sc = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)), steps = [[sc, 0.85], [sc, 0.7], [sc * 0.7, 0.7], [sc * 0.5, 0.6]];
    for (var i = 0; i < steps.length; i++) {
      var cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(bmp.width * steps[i][0])); cv.height = Math.max(1, Math.round(bmp.height * steps[i][0]));
      var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(bmp, 0, 0, cv.width, cv.height);
      var mime = "image/webp", blob = await new Promise(function (r) { cv.toBlob(r, mime, steps[i][1]); });
      if (!blob || blob.type !== "image/webp") { mime = "image/jpeg"; blob = await new Promise(function (r) { cv.toBlob(r, mime, steps[i][1]); }); }
      if (blob && blob.size <= 3145728) return { blob: blob, mime: blob.type, ext: blob.type === "image/webp" ? "webp" : "jpg" };
    }
    return null;
  }
  async function manualForm(p, box, msg) {
    clear(box); var ins = await sb.rpc("manual_instructions"), i = (ins.data || [])[0];
    if (!i) return say(msg, tr("Manual payment is not available right now.", "الدفع اليدوي مش متاح دلوقتي."), "err");
    var ref = h("input", { type: "text", maxlength: "40", placeholder: tr("Optional: transaction id or sending number", "اختياري: رقم العملية أو رقم الموبايل") }), file = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp" });
    box.appendChild(h("div", { "class": "panel" },
      h("p", { text: tr("1. Send exactly ", "1. حوّل بالظبط ") + (p.price_minor / 100).toFixed(2) + " " + p.currency + tr(" by Vodafone Cash to ", " بفودافون كاش على ") + i.wallet_number + " (" + i.holder_name + ")" }),
      i.note ? h("p", { "class": "hint", text: i.note }) : null,
      h("p", { text: tr("2. Attach a screenshot of the transfer (JPG, PNG or WebP image, max 3 MB after processing).", "2. ارفق صورة التحويل (صورة JPG أو PNG أو WebP، 3 ميجا بحد أقصى بعد المعالجة).") }), ref, file,
      h("div", { "class": "row" }, h("button", { "class": "btn f", type: "button", text: tr("Send for approval", "ابعت للمراجعة"), on: { click: async function () {
        var f = file.files[0]; if (!f || !/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 10485760) return say(msg, tr("Attach a real JPG, PNG or WebP image.", "ارفق صورة حقيقية JPG أو PNG أو WebP."), "err");
        var clean = await cleanProofImage(f); if (!clean) return say(msg, tr("This file is not a valid image or is too big (max 3 MB after processing).", "الملف ده مش صورة سليمة أو كبير أوي (3 ميجا بحد أقصى بعد المعالجة)."), "err");
        if (ref.value.trim() && !/^[A-Za-z0-9 -]{4,40}$/.test(ref.value.trim())) return say(msg, tr("The optional note must be 4 to 40 letters or numbers, or leave it empty.", "الملاحظة (اختياري) 4 لـ 40 حرف أو رقم، أو سيبها فاضية."), "err");
        var path = me.id + "/" + crypto.randomUUID() + "." + clean.ext;
        var up = await sb.storage.from("payment-proofs").upload(path, clean.blob, { contentType: clean.mime, upsert: false });
        if (up.error) return say(msg, /row-level|policy|Unauthorized|403/i.test(up.error.message || "") ? tr("Too many uploads this hour. Try again later.", "رفعت كتير في الساعة دي. جرب بعدين.") : tr("Upload failed.", "فشل رفع الصورة."), "err");
        var r = await sb.rpc("submit_manual_payment", { p_plan: p.id, p_reference: ref.value.trim() || null, p_proof: path });
        if (r.error) return say(msg, /one_pending/.test(r.error.message) ? tr("You already have a payment waiting for approval.", "عندك دفعة مستنية المراجعة.") : /rate limit/.test(r.error.message) ? tr("Too many attempts this hour. Try again later.", "محاولات كتير في الساعة دي. جرب بعدين.") : tr("Could not submit.", "ماقدرتش أبعت."), "err");
        clear(box); say(msg, tr("Received. Your subscription is NOT active yet: waiting for confirmation from the team. You will get a message in your inbox.", "اتسلمت. اشتراكك لسه مش شغال: مستني تأكيد الفريق. هتوصلك رسالة في الإنبوكس."), "ok");
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
    var uname = h("input", { type: "text", maxlength: "20", value: me.username }), alias = h("input", { type: "text", maxlength: "25", value: me.alias || "" }), avBox = h("div", { "class": "avatars" }), msg = h("div", { "class": "msg" });
    var cur = me.avatar; avatarPicker(avBox, cur, function (c) { cur = c; });
    var upFile = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp", style: "max-width:230px" });
    var upBox = h("div", { "class": "row" }, h("span", { "class": "hint", text: tr("Own picture (owner/admin only, PNG/JPG/WebP, max 1 MB):", "صورتك الخاصة (للمالك والأدمن فقط، PNG/JPG/WebP، لحد 1 ميجا):") }), upFile, h("button", { "class": "btn", type: "button", text: tr("Upload picture", "ارفع الصورة"), on: { click: async function () {
      var f = upFile.files && upFile.files[0]; if (!f) return say(msg, tr("Choose an image.", "اختار صورة."), "err");
      if (["image/png", "image/jpeg", "image/webp"].indexOf(f.type) < 0 || f.size > 1048576) return say(msg, tr("PNG, JPG or WebP, max 1 MB.", "PNG أو JPG أو WebP، لحد 1 ميجا."), "err");
      var x = await sb.storage.from("avatars").upload(me.id + "/avatar", f, { upsert: true, contentType: f.type, cacheControl: "60" }); if (x.error) return say(msg, x.error.message, "err");
      var y = await sb.rpc("update_my_profile", { new_username: null, new_avatar: "custom" }); if (y.error) return say(msg, y.error.message, "err");
      cur = "custom"; me.avatar = "custom"; refreshMyAvatar(true); say(msg, tr("Picture saved and updated everywhere.", "الصورة اتحفظت واتحدثت في كل حتة."), "ok");
    } } }));
    var save = h("button", { "class": "btn f", type: "button", text: tr("Save", "حفظ"), on: { click: async function () {
      if (!userNameOk(uname.value, isStaff())) return say(msg, isStaff() ? tr("Username: 3-20 letters (Arabic or English), numbers or _.", "اسم المستخدم: 3-20 حرف (عربي أو إنجليزي) أو أرقام أو _.") : tr("Invalid or not allowed username (English letters, numbers, _).", "اسم مستخدم غير صحيح أو مش مسموح (حروف إنجليزي وأرقام و _)."), "err");
      if (isStaff() && alias.value.trim() !== (me.alias || "")) { if (!ALIAS_RE.test(alias.value.trim())) return say(msg, tr("Display name: 3-25 letters (Arabic or English), numbers, _ or spaces.", "الاسم الظاهر: 3-25 حرف (عربي أو إنجليزي) أو أرقام أو _ أو مسافة."), "err"); var ra = await sb.rpc("update_my_alias", { new_alias: alias.value.trim() }); if (ra.error) return say(msg, tr("Could not save the display name (taken?).", "ماتحفظش الاسم الظاهر (مستخدم؟)."), "err"); me.alias = alias.value.trim(); }
      var r = await sb.rpc("update_my_profile", { new_username: uname.value, new_avatar: cur });
      if (!r.error) { me.username = uname.value; me.avatar = cur; refreshMyAvatar(false); if (typeof paintDetails === "function") paintDetails(); }
      say(msg, r.error ? tr("Could not save (name taken?).", "ماتحفظش (الاسم مستخدم؟).") : tr("Saved.", "اتحفظ."), r.error ? "err" : "ok");
    } } });
    var detBox = h("div", { "class": "panel", id: "details" }, h("h2", { text: tr("Account details", "بيانات الحساب") })), detHead = h("div", { style: "display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:10px" }), detGrid = h("div"), acc = null, planVal = null, subInfo = tr("No active subscription", "مفيش اشتراك فعال");
    function kv(k, v) { return h("div", { style: "display:flex;gap:10px;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap" }, h("span", { "class": "hint", text: k }), typeof v === "string" ? h("span", { text: v, dir: "auto" }) : v); }
    function paintDetails() {
      clear(detHead); clear(detGrid);
      var avw = h("button", { type: "button", "class": "av", title: tr("Click to enlarge", "دوس للتكبير"), "aria-label": tr("View picture", "عرض الصورة"), style: "width:96px;height:96px;flex:none;border:0;padding:0;background:none;cursor:zoom-in;border-radius:50%", on: { click: function () { avatarLightbox(me.avatar, me.id); } } }, avatarSvg(me.avatar, me.id));
      var nmEl = h("div", null, h("div", { style: "font-weight:700;font-size:1.15em", text: isStaff() && me.alias ? me.alias : me.username }), badgesEl(me.role, null, null));
      detHead.appendChild(avw); detHead.appendChild(nmEl);
      detGrid.appendChild(kv(tr("Username", "اسم المستخدم"), me.username));
      if (isStaff()) detGrid.appendChild(kv(tr("Display name", "الاسم الظاهر"), me.alias || "-"));
      detGrid.appendChild(kv(tr("Email", "الإيميل"), me.email + (acc && acc.email_confirmed ? "  \u2713 " + tr("verified", "متأكد") : "")));
      detGrid.appendChild(kv(tr("Role", "الدور"), me.role === "owner" ? tr("Owner", "المالك") : me.role === "admin" ? tr("Admin", "أدمن") : tr("Member", "عضو")));
      detGrid.appendChild(kv(tr("Status", "الحالة"), me.status === "active" ? tr("Active", "نشط") : String(me.status || "-")));
      planVal = h("span", { text: subInfo, dir: "auto" }); detGrid.appendChild(kv(tr("Plan", "الباقة"), planVal));
      if (acc) {
        detGrid.appendChild(kv(tr("Joined", "تاريخ الانضمام"), acc.created_at ? fmtTime(acc.created_at) : "-"));
        detGrid.appendChild(kv(tr("Last login", "آخر دخول"), acc.last_sign_in ? fmtTime(acc.last_sign_in) : "-"));
        if (acc.previous_login) detGrid.appendChild(kv(tr("Previous visit", "الزيارة اللي قبلها"), fmtTime(acc.previous_login)));
        detGrid.appendChild(kv(tr("Chat messages", "رسايل الشات"), String(acc.messages || 0)));
        if (isStaff()) detGrid.appendChild(kv(tr("Two-step verification", "التحقق بخطوتين"), acc.mfa ? tr("On", "شغال") : tr("Off", "مقفول")));
      }
      detGrid.appendChild(h("p", { "class": "hint", text: tr("Only you can see this page.", "الصفحة دي ليك إنت بس.") }));
    }
    detBox.appendChild(detHead); detBox.appendChild(detGrid); box.appendChild(detBox); paintDetails();
    sb.rpc("my_account").then(function (r) { if (r && r.data) { acc = r.data; paintDetails(); } });
    box.appendChild(h("div", { "class": "panel", id: "edit" }, h("h2", { text: tr("My profile", "بروفايلي") }), h("p", { text: me.email }),
      h("p", { text: tr("Role: ", "الدور: ") + me.role }), h("label", { text: tr("Username", "اسم المستخدم") }), uname, isStaff() ? h("label", { text: tr("Display name (shown to others)", "الاسم الظاهر للناس") }) : null, isStaff() ? alias : null, avBox, isStaff() ? upBox : null, h("div", { "class": "row" }, save), msg));
    var plansBox = h("div", { "class": "panel" }, h("h2", { text: tr("Subscription", "الاشتراك") })); box.appendChild(plansBox);
    var subR = await sb.from("subscriptions").select("status,current_period_end").eq("user_id", me.id).maybeSingle();
    var active = subR.data && /^(active|trialing)$/.test(subR.data.status) && new Date(subR.data.current_period_end) > new Date();
    plansBox.appendChild(h("p", { text: active ? tr("Active until ", "نشط لحد ") + new Date(subR.data.current_period_end).toLocaleDateString() : tr("No active subscription. Private tools need one.", "مفيش اشتراك فعال. الأدوات الخاصة محتاجة اشتراك.") }));
    var pl = await sb.from("plans").select("id,name,price_minor,currency,period,scope,description").eq("active", true);
    var ptA = (await sb.from("plan_tools").select("plan_id,tool_id")).data || [], tnA = {}; ((await sb.from("tools").select("id,name")).data || []).forEach(function (x) { tnA[x.id] = x.name; });
    var upa = (await sb.from("user_plan_access").select("plan_id,current_period_end").eq("user_id", me.id)).data || [];
    upa.filter(function (a) { return new Date(a.current_period_end) > new Date(); }).forEach(function (a) { var pn_ = (pl.data || []).filter(function (q) { return q.id === a.plan_id; })[0]; plansBox.appendChild(h("p", { text: (pn_ ? pn_.name : tr("Plan", "خطة")) + tr(" active until ", " نشطة لحد ") + new Date(a.current_period_end).toLocaleDateString() })); });
    var planBits = []; if (active) planBits.push(tr("Subscription until ", "اشتراك لحد ") + fmtDate(subR.data.current_period_end));
    upa.filter(function (a) { return new Date(a.current_period_end) > new Date(); }).forEach(function (a) { var pn2 = (pl.data || []).filter(function (q) { return q.id === a.plan_id; })[0]; planBits.push((pn2 ? pn2.name : tr("Plan", "خطة")) + " - " + (/^infinity/.test(String(a.current_period_end)) ? tr("no expiry", "من غير انتهاء") : tr("until ", "لحد ") + fmtDate(a.current_period_end))); });
    if (isStaff() && !planBits.length) planBits.push(tr("All tools (staff)", "كل الأدوات (إدارة)"));
    subInfo = planBits.length ? planBits.join(" | ") : tr("No active subscription", "مفيش اشتراك فعال"); if (planVal) planVal.textContent = subInfo;
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
      plansBox.appendChild(h("p", { "class": "hint", text: new Date(q.created_at).toLocaleDateString() + " - " + q.method + " - " + (q.amount_minor / 100).toFixed(2) + " " + q.currency + " - " + ({ pending: tr("waiting for confirmation", "مستني التأكيد"), approved: tr("approved", "اتقبلت"), rejected: tr("rejected", "اترفضت") }[q.status] || q.status) + (q.reject_reason ? " (" + q.reject_reason + ")" : "") }));
    }); }
    if (isStaff()) plansBox.appendChild(h("p", null, h("a", { href: "admin.html#payments", text: tr("Review payments waiting for confirmation (Admin)", "راجع الدفعات المستنية التأكيد (الإدارة)") })));
    var dpw = h("input", { type: "password", autocomplete: "current-password", maxlength: "64" }), dmsg = h("div", { "class": "msg" });
    box.appendChild(h("div", { "class": "panel", id: "delete" }, h("h2", { text: tr("Delete account", "حذف الحساب") }), h("p", { text: tr("This signs you out and removes your login. It cannot be undone.", "ده هيطلعك ويمسح الدخول بتاعك. ماينفعش يتراجع.") }), h("label", { text: tr("Confirm with your password", "أكد بالباسورد") }), eye(dpw),
      h("div", { "class": "row" }, h("button", { "class": "btn", type: "button", text: tr("Delete my account", "احذف حسابي"), on: { click: async function () {
        if (!confirm(tr("Delete your account for good?", "تحذف حسابك نهائي؟"))) return;
        var s = (await sb.auth.getSession()).data.session;
        var r = await fetch(CFG.url + "/functions/v1/delete-account", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.access_token, apikey: CFG.anonKey }, body: JSON.stringify({ password: dpw.value }) });
        if (r.ok) { await sb.auth.signOut(); go("index.html"); } else say(dmsg, tr("Could not delete (wrong password, or this is the owner account).", "ماتمسحش (الباسورد غلط أو ده حساب المالك)."), "err");
      } } })), dmsg));
    if (location.hash) { var t = $(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  /* ---------- badges, public profile, moderation, voice ---------- */
  function badgesEl(role, sub, plan) {
    var w = h("span", { "class": "bdgs" });
    if (role === "owner") w.appendChild(h("span", { "class": "bdg owner", text: tr("Owner", "المالك") }));
    else if (role === "admin") w.appendChild(h("span", { "class": "bdg admin", text: tr("Admin", "أدمن") }));
    if (sub) w.appendChild(h("span", { "class": "bdg sub", text: "\u2605 " + (plan || tr("Subscriber", "مشترك")) }));
    return w;
  }
  function fmtDate(v) { return v ? new Date(v).toLocaleDateString(EN() ? "en-GB" : "ar-EG") : "-"; }
  function fmtTime(v) { return v ? new Date(v).toLocaleString(EN() ? "en-GB" : "ar-EG") : "-"; }
  var ACT_LBL = { signup: ["Sign up", "تسجيل جديد"], block_user: ["Blocked", "حظر"], unblock_user: ["Unblocked", "فك حظر"], ban_user: ["Banned", "حظر"], unban_user: ["Unbanned", "فك حظر"], grant_plan: ["Free plan granted", "اشتراك مجاني اتمنح"], revoke_plan: ["Free plan revoked", "اشتراك مجاني اتسحب"], review_manual_payment: ["Payment reviewed", "مراجعة دفعة"], set_role: ["Role changed", "تغيير صلاحية"] };
  window.scarOpenProfile = function (id) { return openProfile(id); };
  async function openProfile(id) {
    var old = $("profmodal"); if (old) old.remove();
    var ov = h("div", { id: "profmodal", role: "dialog", "aria-modal": "true", style: "position:fixed;inset:0;z-index:1000;background:#000c;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:4vh 12px" });
    var card = h("div", { "class": "panel", style: "max-width:580px;width:100%;position:relative;margin:0" });
    var close = h("button", { "class": "btn", type: "button", text: "\u00d7", "aria-label": "close", style: "position:absolute;top:10px;inset-inline-end:10px", on: { click: function () { ov.remove(); } } });
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    card.appendChild(h("p", { "class": "hint", text: "..." })); ov.appendChild(card); document.body.appendChild(ov);
    var r = await sb.rpc("get_profile", { target: id });
    clear(card); card.appendChild(close);
    if (r.error || !r.data) return card.appendChild(h("p", { text: tr("Profile not available.", "البروفايل مش متاح.") }));
    var d = r.data;
    function row(k, v) { return h("p", { style: "margin:4px 0" }, h("b", { text: k + ": " }), typeof v === "string" ? document.createTextNode(v) : v); }
    var av = h("div", { "class": "av", style: "width:64px;height:64px;flex:none" }, avatarSvg(d.avatar, d.id));
    card.appendChild(h("div", { style: "display:flex;gap:14px;align-items:center;margin-bottom:10px;padding-inline-end:40px" }, av, h("div", null, h("h2", { text: d.name, style: "margin:0" }), badgesEl(d.role, d.subscribed, d.plans && d.plans.length ? d.plans.join(", ") : (d.all_access ? tr("All tools", "كل الأدوات") : null)))));
    if (d.id !== me.id) card.appendChild(h("p", { style: "margin:4px 0 8px" }, h("button", { "class": "btn f", type: "button", text: tr("Message privately", "ابعتله رسالة خاصة"), on: { click: function () { startDm(d.id); } } })));
    card.appendChild(row(tr("Joined", "انضم"), fmtDate(d.joined)));
    var pl = (d.plans || []).slice(); if (d.all_access) pl.unshift(tr("All tools", "كل الأدوات"));
    card.appendChild(row(tr("Plan", "الاشتراك"), pl.length ? pl.join(", ") : tr("None", "مفيش")));
    if (d.staff) {
    card.appendChild(row(tr("Chat messages", "رسايل الشات"), String(d.messages) + (d.voice ? " (" + d.voice + " " + tr("voice", "صوتية") + ")" : "")));
    card.appendChild(row(tr("Last post", "آخر مشاركة"), d.last_post ? fmtTime(d.last_post) : "-"));
    if ((d.posts || []).length) {
      card.appendChild(h("h3", { text: tr("Recent posts", "آخر المشاركات"), style: "margin:14px 0 4px" }));
      d.posts.forEach(function (p) { card.appendChild(h("p", { "class": "hint", style: "margin:2px 0", text: fmtDate(p.created_at) + " - " + (p.body ? p.body.slice(0, 140) : tr("Voice message", "رسالة صوتية") + " " + p.audio_secs + "s") })); });
    }
    }
    if (!d.staff) return;
    var s = d.staff;
    card.appendChild(h("h3", { text: tr("Staff only", "للإدارة فقط"), style: "margin:18px 0 4px;color:#d4a017" }));
    card.appendChild(row("Email", s.email || "-"));
    if (s.username) card.appendChild(row(tr("Username", "اسم المستخدم"), s.username));
    card.appendChild(row(tr("Status", "الحالة"), s.status));
    card.appendChild(h("h3", { text: tr("Payments and plans", "الدفعات والاشتراكات"), style: "margin:12px 0 4px" }));
    if (!(s.payments || []).length) card.appendChild(h("p", { "class": "hint", text: tr("No payments.", "مفيش دفعات.") }));
    (s.payments || []).forEach(function (p) { card.appendChild(h("p", { "class": "hint", style: "margin:2px 0", text: fmtDate(p.created_at) + " - " + (p.plan || "-") + " - " + (p.amount_minor / 100).toFixed(2) + " " + p.currency + " - " + p.method + " - " + p.status })); });
    card.appendChild(h("h3", { text: tr("Block history", "سجل الحظر"), style: "margin:12px 0 4px" }));
    var nowD = new Date(), act = (s.blocks || []).filter(function (b) { return !b.lifted_at && (!b.expires_at || new Date(b.expires_at) > nowD); });
    if (!(s.blocks || []).length) card.appendChild(h("p", { "class": "hint", text: tr("No blocks.", "مفيش حظر.") }));
    (s.blocks || []).forEach(function (b) { card.appendChild(h("p", { "class": "hint", style: "margin:2px 0", text: fmtDate(b.created_at) + " - " + (b.scope === "site" ? tr("Whole site", "الموقع كله") : tr("Chat", "الشات")) + " - " + b.reason + " - " + (b.lifted_at ? tr("lifted ", "اتفك ") + fmtDate(b.lifted_at) : b.expires_at ? tr("until ", "لحد ") + fmtTime(b.expires_at) : tr("permanent", "دائم")) + " (" + (b.by || "?") + ")" })); });
    card.appendChild(h("h3", { text: tr("Logs", "السجل"), style: "margin:12px 0 4px" }));
    (s.logs || []).forEach(function (l) { var lb = ACT_LBL[l.action]; card.appendChild(h("p", { "class": "hint", style: "margin:2px 0", text: fmtTime(l.at) + " - " + (lb ? tr(lb[0], lb[1]) : l.action) })); });
    var can = d.role !== "owner" && d.id !== me.id && s.status === "active" && (me.role === "owner" || d.role === "user");
    if (!can) return;
    var msg = h("div", { "class": "msg" });
    card.appendChild(h("h3", { text: tr("Block this user", "احظر المستخدم"), style: "margin:16px 0 6px;color:#e11d2e" }));
    act.forEach(function (b) {
      card.appendChild(h("p", { style: "margin:4px 0" }, h("span", { "class": "tag", text: (b.scope === "site" ? tr("Blocked from the whole site", "محظور من الموقع كله") : tr("Blocked from chat", "محظور من الشات")) + (b.expires_at ? " " + tr("until ", "لحد ") + fmtTime(b.expires_at) : " " + tr("(permanent)", "(دائم)")) }), " ",
        h("button", { "class": "btn", type: "button", text: tr("Unblock", "فك الحظر"), on: { click: async function () { var x = await sb.rpc("admin_unblock_user", { target: d.id, p_scope: b.scope }); if (x.error) return say(msg, tr("You cannot lift this block.", "ماينفعش تفك الحظر ده."), "err"); openProfile(id); } } })));
    });
    var sc = h("select", { "aria-label": "scope" }, h("option", { value: "chat", text: tr("Chat only", "الشات بس") }), h("option", { value: "site", text: tr("Whole website", "الموقع كله") }));
    var du = h("select", { "aria-label": "duration" }); [["24", tr("1 day", "يوم")], ["48", tr("2 days", "يومين")], ["72", tr("3 days", "3 أيام")], ["96", tr("4 days", "4 أيام")], ["custom", tr("Custom days", "عدد أيام مخصص")], ["perm", tr("Permanent", "دائم")]].forEach(function (o) { du.appendChild(h("option", { value: o[0], text: o[1] })); });
    var cd = h("input", { type: "number", min: "1", max: "365", value: "7", style: "width:80px;display:none", "aria-label": "days" });
    du.addEventListener("change", function () { cd.style.display = du.value === "custom" ? "" : "none"; });
    var why = h("input", { type: "text", maxlength: "200", placeholder: tr("Reason (shown to the user)", "السبب (هيظهر للمستخدم)"), style: "width:100%;margin:6px 0" });
    card.appendChild(h("div", { "class": "row", style: "display:flex;gap:8px;flex-wrap:wrap" }, sc, du, cd)); card.appendChild(why);
    card.appendChild(h("button", { "class": "btn f", type: "button", style: "background:#e11d2e", text: tr("Block", "حظر"), on: { click: async function () {
      var hrs = du.value === "perm" ? null : du.value === "custom" ? Math.round(+cd.value * 24) : +du.value;
      if (du.value === "custom" && !(hrs >= 24 && hrs <= 8760)) return say(msg, tr("Days must be 1 to 365.", "الأيام من 1 لـ 365."), "err");
      if (why.value.trim().length < 3) return say(msg, tr("Write a reason (3+ characters).", "اكتب السبب (3 حروف على الأقل)."), "err");
      if (!confirm(tr("Block ", "تحظر ") + d.name + " (" + sc.options[sc.selectedIndex].text + ", " + du.options[du.selectedIndex].text + ")?")) return;
      var x = await sb.rpc("admin_block_user", { target: d.id, p_scope: sc.value, p_reason: why.value.trim(), p_hours: hrs });
      if (x.error) return say(msg, tr("Could not block: ", "ماقدرتش أحظر: ") + x.error.message, "err"); openProfile(id);
    } } })); card.appendChild(msg);
  }
  async function startDm(uid) {
    var r = await sb.rpc("dm_open", { target: uid });
    if (r.error || !r.data) return alert(tr("Cannot open a private chat with this user.", "ماينفعش تفتح شات خاص مع المستخدم ده."));
    var pm = $("profmodal"); if (pm) pm.remove();
    if (window.__scarOpenDm) window.__scarOpenDm(r.data); else location.href = "community.html#dm=" + r.data;
  }
  /* voice player: total time comes from the stored audio_secs (Chrome webm has no duration header) */
  function fmtSecs(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function voicePlayer(url, total) {
    total = Math.max(1, total || 1);
    var au = new Audio(), playing = false, lbl = h("span", { text: "0:00 / " + fmtSecs(total), style: "font:600 12px sans-serif;direction:ltr;min-width:70px;text-align:center;flex:none" });
    au.preload = "none"; au.src = url;
    var fill = h("div", { style: "height:100%;width:0;background:#c9a227;border-radius:3px;transition:width .15s linear" });
    var track = h("div", { style: "flex:1;min-width:60px;height:6px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden;direction:ltr" }, fill);
    var btn = h("button", { type: "button", "class": "btn", "aria-label": tr("Play", "تشغيل"), text: "\u25b6", style: "width:36px;height:36px;border-radius:50%;padding:0;flex:none" });
    var wrap = h("div", { style: "display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid rgba(201,162,39,.5);border-radius:20px;background:rgba(0,0,0,.25);max-width:300px;direction:ltr" }, btn, track, lbl);
    function ui(p) { playing = p; btn.textContent = p ? "\u275a\u275a" : "\u25b6"; btn.setAttribute("aria-label", p ? tr("Pause", "إيقاف") : tr("Play", "تشغيل")); }
    au.addEventListener("timeupdate", function () { var c = Math.min(au.currentTime, total); fill.style.width = Math.min(100, c / total * 100) + "%"; lbl.textContent = fmtSecs(c) + " / " + fmtSecs(total); });
    au.addEventListener("ended", function () { ui(false); fill.style.width = "0"; lbl.textContent = "0:00 / " + fmtSecs(total); au.currentTime = 0; });
    au.addEventListener("pause", function () { ui(false); }); au.addEventListener("playing", function () { ui(true); });
    au.addEventListener("error", function () { ui(false); lbl.textContent = tr("Retry", "جرب تاني"); au.removeAttribute("src"); au.src = url; });
    btn.addEventListener("click", function () { if (playing) { au.pause(); return; } var pr = au.play(); if (pr && pr.catch) pr.catch(function () { lbl.textContent = tr("Retry", "جرب تاني"); au.load(); }); });
    return wrap;
  }
  var DM_NOTICE = function () { return tr("Private chat between the two of you.", "شات خاص بينكم الاتنين."); };
  /* whole-site block: the account stays signed in but sees only this notice */
  function blockedScreen(b) {
    var ov = h("div", { style: "position:fixed;inset:0;z-index:2000;background:#0a0708;display:flex;align-items:center;justify-content:center;padding:20px" });
    ov.appendChild(h("div", { "class": "panel", style: "max-width:480px;text-align:center" }, h("h2", { text: tr("Your account is blocked", "حسابك محظور") }),
      h("p", { text: tr("Reason: ", "السبب: ") + b.reason }), h("p", { "class": "hint", text: b.expires_at ? tr("The block ends on ", "الحظر بينتهي في ") + fmtTime(b.expires_at) + "." : tr("This block has no end date. Contact the owner.", "الحظر ده من غير مدة. كلم المالك.") }),
      h("button", { "class": "btn", type: "button", text: tr("Sign out", "تسجيل خروج"), on: { click: async function () { await sb.auth.signOut(); location.href = "index.html"; } } })));
    document.body.appendChild(ov);
  }


  /* ---------- emoji reactions (General chat, Admins chat and private chats) ---------- */
  var RX_QUICK = ["\ud83d\udc4d", "\u2764\ufe0f", "\ud83d\ude02", "\ud83d\udd25", "\ud83d\ude2e", "\ud83d\ude22"];
  var RX_CATS = [
    ["\ud83d\ude00", "Smileys", "\u0648\u062c\u0648\u0647", "\ud83d\ude00 \ud83d\ude03 \ud83d\ude04 \ud83d\ude01 \ud83d\ude06 \ud83d\ude05 \ud83e\udd23 \ud83d\ude02 \ud83d\ude42 \ud83d\ude43 \ud83d\ude09 \ud83d\ude0a \ud83d\ude07 \ud83e\udd70 \ud83d\ude0d \ud83e\udd29 \ud83d\ude18 \ud83d\ude17 \ud83d\ude1a \ud83d\ude19 \ud83d\ude0b \ud83d\ude1b \ud83d\ude1c \ud83e\udd2a \ud83d\ude1d \ud83e\udd11 \ud83e\udd17 \ud83e\udd2d \ud83e\udd2b \ud83e\udd14 \ud83e\udd10 \ud83e\udd28 \ud83d\ude10 \ud83d\ude11 \ud83d\ude36 \ud83d\ude0f \ud83d\ude12 \ud83d\ude44 \ud83d\ude2c \ud83e\udd25 \ud83d\ude0c \ud83d\ude14 \ud83d\ude2a \ud83e\udd24 \ud83d\ude34 \ud83d\ude37 \ud83e\udd12 \ud83e\udd15 \ud83e\udd22 \ud83e\udd2e \ud83e\udd27 \ud83e\udd75 \ud83e\udd76 \ud83e\udd74 \ud83d\ude35 \ud83e\udd2f \ud83e\udd20 \ud83e\udd73 \ud83d\ude0e \ud83e\udd13 \ud83e\uddd0 \ud83d\ude15 \ud83d\ude1f \ud83d\ude41 \ud83d\ude2e \ud83d\ude2f \ud83d\ude32 \ud83d\ude33 \ud83e\udd7a \ud83d\ude26 \ud83d\ude27 \ud83d\ude28 \ud83d\ude30 \ud83d\ude25 \ud83d\ude22 \ud83d\ude2d \ud83d\ude31 \ud83d\ude16 \ud83d\ude23 \ud83d\ude1e \ud83d\ude13 \ud83d\ude29 \ud83d\ude2b \ud83e\udd71 \ud83d\ude24 \ud83d\ude21 \ud83d\ude20 \ud83e\udd2c \ud83d\ude08 \ud83d\udc7f \ud83d\udc80 \ud83d\udca9 \ud83e\udd21 \ud83d\udc7b \ud83d\udc7d \ud83e\udd16"],
    ["\ud83d\udc4d", "Hands", "\u0623\u064a\u062f\u064a", "\ud83d\udc4d \ud83d\udc4e \ud83d\udc4c \u270c\ufe0f \ud83e\udd1e \ud83e\udd1f \ud83e\udd18 \ud83e\udd19 \ud83d\udc48 \ud83d\udc49 \ud83d\udc46 \ud83d\udc47 \u261d\ufe0f \u270b \ud83e\udd1a \ud83d\udd90\ufe0f \ud83d\udd96 \ud83d\udc4b \ud83e\udd1d \ud83d\ude4f \ud83d\udcaa \u270d\ufe0f \ud83d\udc4f \ud83d\ude4c \ud83d\udc50 \ud83e\udd32 \ud83e\udd1c \ud83e\udd1b \u270a \ud83d\udc4a \ud83d\udc40 \ud83e\udde0"],
    ["\u2764\ufe0f", "Hearts", "\u0642\u0644\u0648\u0628", "\u2764\ufe0f \ud83e\udde1 \ud83d\udc9b \ud83d\udc9a \ud83d\udc99 \ud83d\udc9c \ud83d\udda4 \ud83e\udd0d \ud83e\udd0e \ud83d\udc94 \u2763\ufe0f \ud83d\udc95 \ud83d\udc9e \ud83d\udc93 \ud83d\udc97 \ud83d\udc96 \ud83d\udc98 \ud83d\udc9d \ud83d\udcaf \ud83d\udca2 \ud83d\udca5 \ud83d\udcab \ud83d\udca6 \ud83d\udca8 \u2728 \ud83d\udd25 \u2b50 \ud83c\udf1f \u26a1 \ud83c\udf89 \ud83c\udf8a \ud83c\udf88 \ud83c\udf81 \ud83c\udfc6 \ud83e\udd47 \ud83c\udfaf"],
    ["\ud83d\udc36", "Nature", "\u0637\u0628\u064a\u0639\u0629", "\ud83d\udc36 \ud83d\udc31 \ud83d\udc2d \ud83d\udc39 \ud83d\udc30 \ud83e\udd8a \ud83d\udc3b \ud83d\udc3c \ud83d\udc28 \ud83d\udc2f \ud83e\udd81 \ud83d\udc2e \ud83d\udc37 \ud83d\udc38 \ud83d\udc35 \ud83d\ude48 \ud83d\ude49 \ud83d\ude4a \ud83d\udc14 \ud83d\udc27 \ud83d\udc26 \ud83e\udd86 \ud83e\udd85 \ud83e\udd89 \ud83d\udc3a \ud83d\udc34 \ud83e\udd84 \ud83d\udc1d \ud83e\udd8b \ud83d\udc22 \ud83d\udc0d \ud83d\udc19 \ud83d\udc2c \ud83d\udc33 \ud83e\udd88 \ud83c\udf39 \ud83c\udf38 \ud83c\udf3b \ud83c\udf32 \ud83c\udf34 \ud83c\udf40 \ud83c\udf0d \ud83c\udf19 \u2600\ufe0f \u26c5 \ud83c\udf08 \u2744\ufe0f \ud83c\udf0a"],
    ["\ud83c\udf55", "Food", "\u0623\u0643\u0644", "\ud83c\udf4e \ud83c\udf4c \ud83c\udf49 \ud83c\udf47 \ud83c\udf53 \ud83c\udf52 \ud83c\udf51 \ud83c\udf4d \ud83e\udd6d \ud83c\udf45 \ud83e\udd51 \ud83c\udf3d \ud83e\udd55 \ud83c\udf5e \ud83e\uddc0 \ud83c\udf73 \ud83e\udd5e \ud83c\udf54 \ud83c\udf5f \ud83c\udf55 \ud83c\udf2d \ud83c\udf2e \ud83c\udf2f \ud83c\udf57 \ud83c\udf56 \ud83c\udf63 \ud83c\udf5c \ud83c\udf5d \ud83c\udf69 \ud83c\udf6a \ud83c\udf82 \ud83c\udf70 \ud83c\udf6b \ud83c\udf6c \ud83c\udf6d \u2615 \ud83c\udf75 \ud83e\udd64 \ud83c\udf7a \ud83c\udf77"],
    ["\ud83d\udcbb", "Objects", "\u0623\u0634\u064a\u0627\u0621", "\u26bd \ud83c\udfc0 \ud83c\udfc8 \ud83c\udfbe \ud83c\udfd0 \ud83c\udfae \ud83d\udd79\ufe0f \ud83c\udfb2 \ud83c\udfa7 \ud83c\udfa4 \ud83c\udfb5 \ud83c\udfb6 \ud83c\udfac \ud83d\udcf7 \ud83d\udcbb \ud83d\udda5\ufe0f \u2328\ufe0f \ud83d\uddb1\ufe0f \ud83d\udcf1 \ud83d\udd0b \ud83d\udd0c \ud83d\udca1 \ud83d\udd12 \ud83d\udd13 \ud83d\udd11 \ud83d\udee1\ufe0f \u2694\ufe0f \ud83d\udd75\ufe0f \ud83d\udc1b \ud83e\uddea \ud83d\udd2c \ud83d\udd2d \ud83d\udce1 \ud83d\udcbe \ud83d\udcc1 \ud83d\udccc \ud83d\udcce \u270f\ufe0f \ud83d\udcdd \ud83d\udcda \ud83d\udcb0 \ud83d\udcb3 \ud83d\ude80 \u2708\ufe0f \ud83d\ude97 \ud83c\udfe0 \u23f0 \u231b"],
    ["\u2705", "Symbols", "\u0631\u0645\u0648\u0632", "\u2705 \u274c \u2753 \u2757 \u26a0\ufe0f \ud83d\udeab \u26d4 \u2714\ufe0f \u2795 \u2796 \u27a1\ufe0f \u2b05\ufe0f \u2b06\ufe0f \u2b07\ufe0f \ud83d\udd34 \ud83d\udfe2 \ud83d\udd35 \ud83d\udfe1 \u26aa \u26ab \ud83d\udd14 \ud83d\udd15 \u267b\ufe0f \ud83c\udd97 \ud83c\udd95 \ud83d\udd1d"]
  ];
  var RX_KW = [["like thumbs up good ok yes agree \u062a\u0645\u0627\u0645 \u0644\u0627\u064a\u0643 \u0645\u0648\u0627\u0641\u0642", "\ud83d\udc4d"], ["dislike thumbs down bad no \u0644\u0627 \u0633\u064a\u0621", "\ud83d\udc4e"], ["love heart \u062d\u0628 \u0642\u0644\u0628", "\u2764\ufe0f \ud83d\udc95 \ud83d\ude0d \ud83d\ude18"], ["laugh lol funny haha \u0636\u062d\u0643 \u0647\u0647\u0647", "\ud83d\ude02 \ud83e\udd23 \ud83d\ude06"], ["fire hot lit \u0646\u0627\u0631 \u0634\u063a\u0627\u0644", "\ud83d\udd25"], ["wow surprise shock \u0645\u0641\u0627\u062c\u0623\u0629", "\ud83d\ude2e \ud83d\ude32 \ud83e\udd2f"], ["sad cry \u062d\u0632\u064a\u0646 \u0628\u064a\u0628\u0643\u064a", "\ud83d\ude22 \ud83d\ude2d \ud83d\ude1e"], ["angry mad \u0632\u0639\u0644\u0627\u0646", "\ud83d\ude21 \ud83d\ude20 \ud83e\udd2c"], ["smile happy \u0633\u0639\u064a\u062f \u0627\u0628\u062a\u0633\u0627\u0645\u0629", "\ud83d\ude00 \ud83d\ude0a \ud83d\ude04"], ["cool sunglasses", "\ud83d\ude0e"], ["clap applause bravo \u062a\u0635\u0641\u064a\u0642", "\ud83d\udc4f"], ["pray thanks please \u0634\u0643\u0631\u0627 \u062f\u0639\u0627\u0621", "\ud83d\ude4f"], ["strong muscle power \u0642\u0648\u0629", "\ud83d\udcaa"], ["party celebrate congrats \u0645\u0628\u0631\u0648\u0643 \u062d\u0641\u0644\u0629", "\ud83c\udf89 \ud83e\udd73 \ud83c\udf8a"], ["100 perfect \u0645\u0645\u062a\u0627\u0632", "\ud83d\udcaf"], ["check done correct \u062a\u0645", "\u2705 \u2714\ufe0f"], ["wrong cross no", "\u274c"], ["think thinking hmm \u0645\u0645\u0645", "\ud83e\udd14"], ["eyes look see \u0639\u064a\u0648\u0646", "\ud83d\udc40"], ["skull dead \u0645\u0627\u062a", "\ud83d\udc80"], ["rocket launch fast", "\ud83d\ude80"], ["lock security secure \u0623\u0645\u0627\u0646 \u0642\u0641\u0644", "\ud83d\udd12 \ud83d\udee1\ufe0f"], ["bug", "\ud83d\udc1b"], ["computer laptop \u0643\u0645\u0628\u064a\u0648\u062a\u0631", "\ud83d\udcbb"], ["star", "\u2b50 \ud83c\udf1f"], ["coffee tea \u0642\u0647\u0648\u0629 \u0634\u0627\u064a", "\u2615 \ud83c\udf75"], ["pizza food \u0623\u0643\u0644", "\ud83c\udf55 \ud83c\udf54"], ["cat \u0642\u0637\u0629", "\ud83d\udc31"], ["dog \u0643\u0644\u0628", "\ud83d\udc36"], ["trophy win \u0643\u0623\u0633", "\ud83c\udfc6 \ud83e\udd47"], ["money cash \u0641\u0644\u0648\u0633", "\ud83d\udcb0"], ["sleep tired \u0646\u0648\u0645", "\ud83d\ude34 \ud83e\udd71"], ["hello hi wave \u0645\u0631\u062d\u0628\u0627", "\ud83d\udc4b"], ["shake deal handshake", "\ud83e\udd1d"]];
  var rxCss = false;
  function rxStyle() {
    if (rxCss) return; rxCss = true;
    var st = document.createElement("style");
    st.textContent = ".cm{position:relative}.rxbtn{opacity:0;border:1px solid var(--b);background:transparent;color:inherit;border-radius:999px;font-size:13px;line-height:1;padding:2px 6px;margin-inline-start:8px;cursor:pointer;transition:opacity .12s}.cm:hover .rxbtn,.rxbtn:focus-visible{opacity:.85}@media (hover:none){.rxbtn{opacity:.55}}.rx{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.rx:empty{display:none}.rxp{border:1px solid var(--b);background:transparent;color:inherit;border-radius:999px;padding:1px 8px;font-size:13px;cursor:pointer;line-height:1.5}.rxp.mine{border-color:#d4a017;background:rgba(212,160,23,.18)}.rxp:disabled{opacity:.5;cursor:not-allowed}.rxpop{position:fixed;z-index:1500;background:#17110f;border:1px solid var(--b);border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,.55);padding:6px}.rxq{display:flex;gap:2px;align-items:center}.rxq button,.rxg button{border:0;background:transparent;border-radius:8px;cursor:pointer;font-size:22px;line-height:1;padding:5px;color:inherit}.rxq button:hover,.rxg button:hover{background:rgba(255,255,255,.1)}.rxq button.mine{background:rgba(212,160,23,.3)}.rxfull{width:min(320px,86vw)}.rxfull input{width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid var(--b);background:var(--bg);color:var(--t);margin-bottom:6px}.rxtabs{display:flex;gap:2px;margin-bottom:4px;overflow-x:auto}.rxg{display:grid;grid-template-columns:repeat(8,1fr);max-height:210px;overflow-y:auto}.rxg button{font-size:20px}";
    document.head.appendChild(st);
  }
  function rxEmojis(q) {
    q = (q || "").trim().toLowerCase(); var out = [];
    RX_KW.forEach(function (k) { if (k[0].toLowerCase().indexOf(q) !== -1) k[1].split(" ").forEach(function (e) { if (out.indexOf(e) === -1) out.push(e); }); });
    RX_CATS.forEach(function (c) { c[3].split(" ").forEach(function (e) { if (e.indexOf(q) !== -1 && out.indexOf(e) === -1) out.push(e); }); });
    return out;
  }


  /* ---------- contact page: values come from site_contact (public read); only the owner sees the editor ---------- */
  var CT_KEYS = [["email", "Email", "الإيميل"], ["whatsapp", "WhatsApp", "واتساب"], ["linkedin", "LinkedIn", "لينكدإن"], ["github", "GitHub", "جيت هاب"], ["tiktok", "TikTok", "تيك توك"], ["facebook", "Facebook", "فيسبوك"], ["instagram", "Instagram", "انستجرام"]];
  var CT_RE = { email: /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/, linkedin: /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/[^\s<>"']{1,255}$/, github: /^https:\/\/github\.com\/[^\s<>"']{1,255}$/, tiktok: /^https:\/\/(www\.)?tiktok\.com\/[^\s<>"']{1,255}$/, facebook: /^https:\/\/(www\.|m\.)?(facebook\.com|fb\.com|fb\.me)\/[^\s<>"']{1,255}$/, instagram: /^https:\/\/(www\.)?instagram\.com\/[^\s<>"']{1,255}$/ };
  function ctValid(k, v) { if (k === "whatsapp") return /^\+?[0-9]{8,15}$/.test(v.replace(/[\s()-]/g, "")); return CT_RE[k] ? CT_RE[k].test(v) : false; }
  function ctHref(k, v) { if (!ctValid(k, v)) return null; if (k === "email") return "mailto:" + v; if (k === "whatsapp") return "https://wa.me/" + v.replace(/[\s()-]/g, "").replace(/^\+/, ""); return v; }
  async function contactPage() {
    var box = document.querySelector(".contact"); if (!box || !sb) return;
    var r = await sb.from("site_contact").select("key,value,label"), vals = {};
    if (!r.error) (r.data || []).forEach(function (x) { vals[x.key] = x; });
    function apply() { CT_KEYS.forEach(function (k) { var a = box.querySelector('a[data-k="' + k[0] + '"]'), v = vals[k[0]]; if (!a || !v) return; var href = ctHref(k[0], v.value); if (!href) return; a.setAttribute("href", href); var sm = a.querySelector("small"); if (sm) sm.textContent = v.label; }); }
    apply();
    if (!me || me.role !== "owner") return;
    var panel = h("div", { "class": "panel", style: "max-width:760px;margin:24px auto 0" }, h("h2", { text: tr("Edit contact details (owner only)", "عدّل بيانات التواصل (للمالك بس)") }), h("p", { "class": "hint", text: tr("Changes show on this page for everyone and are written to the Logs.", "التعديلات بتظهر لكل الناس وبتتسجل في السجل.") }));
    CT_KEYS.forEach(function (k) {
      var cur = vals[k[0]] || { value: "", label: "" }, plain = k[0] === "email" || k[0] === "whatsapp", msg = h("div", { "class": "msg" });
      var v = h("input", { type: "text", maxlength: "300", value: cur.value, "aria-label": tr(k[1] + " value", k[2]), placeholder: k[0] === "email" ? "name@example.com" : k[0] === "whatsapp" ? "+20 100 000 0000" : "https://..." });
      var l = plain ? null : h("input", { type: "text", maxlength: "60", value: cur.label, "aria-label": tr(k[1] + " shown text", "النص الظاهر"), placeholder: tr("Shown text", "النص الظاهر") });
      var sv = h("button", { type: "button", "class": "btn f", text: tr("Save", "حفظ") });
      sv.onclick = async function () {
        var val = v.value.trim(), lab = plain ? val : l.value.trim();
        if (!ctValid(k[0], val)) return say(msg, k[0] === "email" ? tr("Enter a valid email.", "اكتب إيميل صحيح.") : k[0] === "whatsapp" ? tr("Enter the number with country code, digits only (e.g. +201000000000).", "اكتب الرقم بكود الدولة، أرقام بس (مثال +201000000000).") : tr("Enter a full https link on the right site.", "اكتب لينك https كامل من الموقع الصح."), "err");
        if (!lab || /[<>]/.test(lab)) return say(msg, tr("Shown text is required (no < or >).", "النص الظاهر مطلوب (من غير < أو >)."), "err");
        sv.disabled = true; var x = await sb.rpc("set_contact", { p_key: k[0], p_value: val, p_label: lab }); sv.disabled = false;
        if (x.error) return say(msg, tr("Could not save: ", "ماتحفظش: ") + (x.error.message || ""), "err");
        vals[k[0]] = { key: k[0], value: val, label: lab }; apply(); say(msg, tr("Saved.", "اتحفظ."), "ok");
      };
      panel.appendChild(h("div", { "class": "row", style: "display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0" }, h("b", { style: "min-width:90px", text: tr(k[1], k[2]) }), v, l, sv, msg));
    });
    box.parentNode.appendChild(panel);
  }
  /* ---------- community ---------- */
  async function communityPage() {
    var app = $("app"); if (!me) return go("login.html"); clear(app);
    var chans = [["general", tr("General chat", "الشات العام"), true], ["admins", tr("Admins only", "للإدارة فقط"), isStaff()], ["dmlist", tr("Private", "خاص"), true]].filter(function (c) { return c[2]; });
    var box = h("div", { "class": "wide" }), tabs = h("div", { "class": "tabs" }), log = h("div", { "class": "chatbox", role: "log", "aria-live": "polite" });
    var input = h("input", { type: "text", maxlength: "1000", "aria-label": tr("Message", "رسالة"), style: "flex:1;padding:11px;border-radius:10px;border:1px solid var(--b);background:var(--bg);color:var(--t)" });
    var err = h("div", { "class": "msg" }), cur = "general", names = {}, urls = {}, urlsAt = Date.now(), sub = null, lastSig = "", lastRsig = "", rx = {}, pop = null, rxBusy = 0, myBlk = ((await sb.rpc("my_blocks")).data || [])[0] || null;
    setInterval(function () { if (!document.hidden) load(); }, 2000);
    async function who(ids) {
      var need = ids.filter(function (i) { return !names[i]; }); if (!need.length) return;
      var r = await sb.from("public_profiles").select("id,display_name,avatar,subscribed,role,joined,plan_name").in("id", need);
      (r.data || []).forEach(function (p) { names[p.id] = p; });
    }
    rxStyle();
    function rxScope() { return cur.indexOf("dm:") === 0 ? "dm" : "chat"; }
    function rxBlockedMsg() { return tr("You are blocked from chat, so you cannot react.", "إنت محظور من الشات، فماينفعش تتفاعل."); }
    function closePop() { if (pop) { pop.remove(); pop = null; } document.removeEventListener("mousedown", outPop, true); document.removeEventListener("touchstart", outPop, true); document.removeEventListener("keydown", escPop, true); }
    function outPop(e) { if (pop && !pop.contains(e.target)) closePop(); }
    function escPop(e) { if (e.key === "Escape") closePop(); }
    function placePop(anchor) {
      var r = anchor.getBoundingClientRect(), w = pop.offsetWidth, ph = pop.offsetHeight, left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top = r.top - ph - 6;
      if (top < 8) top = Math.min(r.bottom + 6, window.innerHeight - ph - 8); pop.style.left = left + "px"; pop.style.top = Math.max(8, top) + "px";
    }
    function openPicker(anchor, scope, id) {
      if (myBlk) return say(err, rxBlockedMsg(), "err");
      closePop(); var mine = (rx[scope + ":" + id] || {});
      pop = h("div", { "class": "rxpop", role: "dialog", "aria-label": tr("React", "تفاعل") }); document.body.appendChild(pop);
      function pickEmoji(em) { closePop(); toggle(scope, id, em); }
      function showBar() {
        clear(pop); var bar = h("div", { "class": "rxq" });
        RX_QUICK.forEach(function (em) { bar.appendChild(h("button", { type: "button", "class": mine[em] && mine[em].mine ? "mine" : "", text: em, "aria-label": em, on: { click: function () { pickEmoji(em); } } })); });
        bar.appendChild(h("button", { type: "button", text: "+", style: "font-size:20px;font-weight:700;width:34px", "aria-label": tr("More emojis", "إيموجي أكتر"), on: { click: showFull } })); pop.appendChild(bar); placePop(anchor);
      }
      function showFull() {
        clear(pop); var box = h("div", { "class": "rxfull" }), q = h("input", { type: "search", maxlength: "30", placeholder: tr("Search emoji", "دوّر على إيموجي"), "aria-label": tr("Search emoji", "دوّر على إيموجي") }), tabsEl = h("div", { "class": "rxtabs" }), grid = h("div", { "class": "rxg" });
        function fill(list) { clear(grid); list.forEach(function (em) { grid.appendChild(h("button", { type: "button", text: em, "aria-label": em, on: { click: function () { pickEmoji(em); } } })); }); if (!list.length) grid.appendChild(h("p", { "class": "hint", style: "grid-column:1/-1", text: tr("No match", "مفيش نتيجة") })); }
        RX_CATS.forEach(function (c, i) { tabsEl.appendChild(h("button", { type: "button", text: c[0], title: tr(c[1], c[2]), "aria-label": tr(c[1], c[2]), on: { click: function () { q.value = ""; fill(c[3].split(" ")); grid.scrollTop = 0; } } })); });
        q.addEventListener("input", function () { if (q.value.trim()) fill(rxEmojis(q.value)); else fill(RX_CATS[0][3].split(" ")); });
        box.appendChild(q); box.appendChild(tabsEl); box.appendChild(grid); pop.appendChild(box); fill(RX_CATS[0][3].split(" ")); placePop(anchor); q.focus();
      }
      showBar();
      setTimeout(function () { document.addEventListener("mousedown", outPop, true); document.addEventListener("touchstart", outPop, true); document.addEventListener("keydown", escPop, true); }, 0);
    }
    async function delMsg(scope, id, others) {
      var o = { reason: null, notify: false };
      if (others) { o = await askRemoval(tr("Delete this message?", "تمسح الرسالة دي؟")); if (!o) return; }
      else if (!confirm(tr("Delete this message?", "تمسح الرسالة دي؟"))) return;
      var r = await sb.rpc("delete_message", others ? { p_scope: scope, p_id: id, p_reason: o.reason, p_notify: o.notify } : { p_scope: scope, p_id: id });
      if (r.error) return say(err, tr("Could not delete: ", "ماقدرتش أمسح: ") + (r.error.message || ""), "err");
      var ok = true; if (o.notify) ok = await sendNotices();
      say(err, ok ? "" : noticeNote(false).trim(), ok ? "" : "err"); lastSig = ""; load();
    }
    async function openWho(anchor, scope, id, em) {
      closePop(); var rect = anchor.getBoundingClientRect(), snap = { getBoundingClientRect: function () { return rect; } };
      pop = h("div", { "class": "rxpop", role: "dialog", "aria-label": tr("Who reacted", "مين تفاعل") }); document.body.appendChild(pop);
      pop.appendChild(h("p", { "class": "hint", style: "margin:8px", text: tr("Loading...", "بيحمّل...") })); placePop(snap);
      setTimeout(function () { document.addEventListener("mousedown", outPop, true); document.addEventListener("touchstart", outPop, true); document.addEventListener("keydown", escPop, true); }, 0);
      var r = await sb.rpc("reaction_users", { p_scope: scope, p_id: id }); var mine = pop; if (!mine) return;
      clear(mine); if (r.error) { mine.appendChild(h("p", { "class": "hint", style: "margin:8px", text: tr("Could not load: ", "ماقدرتش أحمل: ") + (r.error.message || "") })); return placePop(snap); }
      var rows = r.data || [], cur2 = "", wrap = h("div", { style: "width:min(280px,84vw)" }), tabsEl = h("div", { "class": "rxtabs" }), list = h("div", { style: "max-height:220px;overflow-y:auto" });
      function draw() {
        clear(list); rows.filter(function (x) { return !cur2 || x.emoji === cur2; }).forEach(function (x) {
          list.appendChild(h("div", { style: "display:flex;align-items:center;gap:8px;padding:4px 6px" }, h("div", { "class": "av", style: "width:28px;height:28px;flex:none" }, avatarSvg(x.avatar, x.user_id)), h("span", { style: "flex:1", text: x.display_name + (x.user_id === me.id ? " (" + tr("You", "إنت") + ")" : "") }), h("span", { text: x.emoji })));
        }); if (!list.firstChild) list.appendChild(h("p", { "class": "hint", style: "margin:8px", text: tr("No reactions yet.", "مفيش تفاعلات لسه.") }));
      }
      var ems = []; rows.forEach(function (x) { if (ems.indexOf(x.emoji) === -1) ems.push(x.emoji); });
      [""].concat(ems).forEach(function (e) { tabsEl.appendChild(h("button", { type: "button", style: "font-size:14px;padding:3px 8px;white-space:nowrap", text: e ? e + " " + rows.filter(function (x) { return x.emoji === e; }).length : tr("All", "الكل") + " " + rows.length, on: { click: function () { cur2 = e; draw(); } } })); });
      cur2 = em; draw(); wrap.appendChild(tabsEl); wrap.appendChild(list);
      var has = rows.some(function (x) { return x.user_id === me.id && x.emoji === em; });
      var tb = h("button", { type: "button", "class": "btn", style: "margin-top:6px;width:100%", text: has ? tr("Tap to remove ", "دوس عشان تشيل ") + em : tr("React with ", "تفاعل بـ ") + em, on: { click: function () { closePop(); toggle(scope, id, em); } } }); tb.disabled = !!myBlk; wrap.appendChild(tb);
      mine.appendChild(wrap); placePop(snap);
    }
    var rcSent = {}, rcQ = [];
    function queueRc(scope, rows, key) {
      if (scope === "chat" && (isStaff() || cur !== "general")) return;   /* staff read invisibly; the database ignores them too */
      rows.forEach(function (x) { if (x[key] !== me.id && !x.deleted_at) rcQ.push([scope, x.id]); });
    }
    async function flushRc() {
      if (!rcQ.length) return; var seen = !document.hidden, lvl = seen ? 2 : 1, by = { chat: [], dm: [] }, q = rcQ; rcQ = [];
      q.forEach(function (it) { var k = it[0] + ":" + it[1]; if ((rcSent[k] || 0) < lvl && by[it[0]].indexOf(it[1]) === -1) by[it[0]].push(it[1]); });
      ["chat", "dm"].forEach(function (sc) {
        if (!by[sc].length) return; by[sc].forEach(function (i) { rcSent[sc + ":" + i] = lvl; });
        sb.rpc("mark_receipts", { p_scope: sc, p_ids: by[sc].slice(0, 100), p_seen: seen }).then(function (r) { if (r.error) by[sc].forEach(function (i) { delete rcSent[sc + ":" + i]; }); }, function () {});
      });
    }
    setInterval(flushRc, 3000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { Object.keys(rcSent).forEach(function (k) { if (rcSent[k] === 1) delete rcSent[k]; }); lastSig = ""; load(); } });
    var RC_START = new Date("2026-11-26T15:41:00Z");   /* receipts exist only for messages created after this moment */
    async function openInfo(anchor, scope, id, at) {
      closePop(); var rect = anchor.getBoundingClientRect(), snap = { getBoundingClientRect: function () { return rect; } };
      pop = h("div", { "class": "rxpop", role: "dialog", "aria-label": tr("Message info", "معلومات الرسالة") }); document.body.appendChild(pop);
      pop.appendChild(h("p", { "class": "hint", style: "margin:8px", text: tr("Loading...", "بيحمّل...") })); placePop(snap);
      setTimeout(function () { document.addEventListener("mousedown", outPop, true); document.addEventListener("touchstart", outPop, true); document.addEventListener("keydown", escPop, true); }, 0);
      var r = await sb.rpc("message_info", { p_scope: scope, p_id: id }), mine = pop; if (!mine) return; clear(mine);
      if (r.error) { mine.appendChild(h("p", { "class": "hint", style: "margin:8px", text: tr("Could not load: ", "ماقدرتش أحمل: ") + (r.error.message || "") })); return placePop(snap); }
      var rows = r.data || [], wrap = h("div", { style: "width:min(300px,86vw);max-height:300px;overflow-y:auto" });
      if (at && new Date(at) < RC_START) { mine.appendChild(h("p", { "class": "hint", style: "margin:10px;max-width:260px", text: tr("No delivery data for this message. Message info started on 26 Nov 2026 (about 17:40 Cairo time); older messages were not tracked.", "مفيش بيانات توصيل للرسالة دي. معلومات الرسالة بدأت يوم 26 نوفمبر 2026 (حوالي 5:40 م بتوقيت القاهرة) والرسايل الأقدم ماتتسجلش.") })); return placePop(snap); }
      function sect(title, list, tf) {
        wrap.appendChild(h("b", { style: "display:block;margin:6px 6px 2px", text: title + " (" + list.length + ")" }));
        list.slice(0, 100).forEach(function (x) { wrap.appendChild(h("div", { style: "display:flex;align-items:center;gap:8px;padding:3px 6px" }, h("div", { "class": "av", style: "width:26px;height:26px;flex:none" }, avatarSvg(x.avatar, x.user_id)), h("span", { style: "flex:1", text: x.display_name }), tf ? h("small", { "class": "hint", text: fmtTime(x[tf]) }) : null)); });
        if (list.length > 100) wrap.appendChild(h("p", { "class": "hint", style: "margin:2px 6px", text: "+" + (list.length - 100) }));
      }
      sect(tr("Seen by", "شافوها"), rows.filter(function (x) { return x.seen_at; }), "seen_at");
      sect(tr("Delivered, not seen yet", "وصلت ولسه ماشافوهاش"), rows.filter(function (x) { return x.delivered_at && !x.seen_at; }), "delivered_at");
      sect(tr("Not delivered yet", "لسه ماوصلتش"), rows.filter(function (x) { return !x.delivered_at; }), null);
      mine.appendChild(wrap); placePop(snap);
    }
    function paintPills(c) {
      var scope = c.getAttribute("data-s"), id = c.getAttribute("data-i"), o = rx[scope + ":" + id] || {}, sig = JSON.stringify(o) + (myBlk ? "b" : "");
      if (c.getAttribute("data-sig") === sig) return; c.setAttribute("data-sig", sig); clear(c);
      Object.keys(o).forEach(function (em) {
        var e = o[em], b = h("button", { type: "button", "class": "rxp" + (e.mine ? " mine" : ""), text: em + " " + e.n, "aria-pressed": e.mine ? "true" : "false", "aria-label": em + " " + e.n + (e.mine ? " (" + tr("yours", "إنت") + ")" : ""), on: { click: function () { openWho(b, scope, Number(id), em); } } });
        c.appendChild(b);
      });
    }
    function paintAll() { Array.prototype.forEach.call(log.querySelectorAll(".rx"), paintPills); }
    function reactUi(scope, id, headerEl, rowEl, info, at) {
      var btn = h("button", { type: "button", "class": "rxbtn", text: "\u263a", title: tr("React", "تفاعل"), "aria-label": tr("React to message", "تفاعل مع الرسالة"), on: { click: function (e) { e.stopPropagation(); openPicker(btn, scope, id); } } });
      var pills = h("div", { "class": "rx", "data-s": scope, "data-i": String(id) }); paintPills(pills);
      var t = null; rowEl.addEventListener("touchstart", function (e) { if (e.target.closest && e.target.closest("button,audio,a,input")) return; t = setTimeout(function () { t = null; openPicker(btn, scope, id); }, 500); }, { passive: true });
      ["touchend", "touchmove", "touchcancel"].forEach(function (ev) { rowEl.addEventListener(ev, function () { if (t) { clearTimeout(t); t = null; } }, { passive: true }); });
      rowEl.addEventListener("contextmenu", function (e) { if (t !== null || e.pointerType === "touch") e.preventDefault(); });
      headerEl.appendChild(btn); if (info) { var ib = h("button", { type: "button", "class": "rxbtn", text: "\u24d8", title: tr("Message info", "معلومات الرسالة"), "aria-label": tr("Message info", "معلومات الرسالة"), on: { click: function (e) { e.stopPropagation(); openInfo(ib, scope, id, at); } } }); headerEl.appendChild(ib); } return pills;
    }
    async function fetchRx(scope, ids) {
      if (!ids.length) return {};
      var r = await sb.rpc("reaction_counts", { p_scope: scope, p_ids: ids }), o = {};
      if (r.error) return null;
      (r.data || []).forEach(function (x) { var k = scope + ":" + x.message_id; (o[k] = o[k] || {})[x.emoji] = { n: Number(x.n), mine: !!x.mine }; });
      return o;
    }
    async function syncRx(scope, ids) { if (rxBusy) return false; var o = await fetchRx(scope, ids); if (o === null) return false; var s2 = JSON.stringify(o); if (s2 === lastRsig) return false; lastRsig = s2; rx = o; return true; }
    async function toggle(scope, id, em) {
      if (myBlk) return say(err, rxBlockedMsg(), "err");
      var k = scope + ":" + id, o = (rx[k] = rx[k] || {}), e = o[em], was = !!(e && e.mine);
      if (was) { e.n--; e.mine = false; if (e.n <= 0) delete o[em]; } else { if (!e) e = o[em] = { n: 0, mine: false }; e.n++; e.mine = true; }
      paintAll(); rxBusy++;
      var r = was ? await sb.from("chat_reactions").delete().eq("scope", scope).eq("message_id", id).eq("user_id", me.id).eq("emoji", em) : await sb.from("chat_reactions").insert({ scope: scope, message_id: id, user_id: me.id, emoji: em });
      if (r.error && r.error.code !== "23505") { try { console.error("reaction", r.error); } catch (x) {} say(err, tr("Could not react: ", "ماقدرتش أتفاعل: ") + (r.error.message || ""), "err"); }
      else say(err, "");
      rxBusy--; lastRsig = ""; load();
    }
    function line(m) {
      var p = names[m.user_id] || { display_name: "?", avatar: "b1" }, del = null;
      if (!m.deleted_at && (isStaff() || m.user_id === me.id)) del = h("button", { "class": "btn", type: "button", text: isStaff() ? "x" : tr("Delete", "احذف"), "aria-label": tr("Delete message", "احذف الرسالة"), on: { click: function () { delMsg("chat", m.id, m.user_id !== me.id); } } });
      var av = h("div", { "class": "av", style: "cursor:pointer", title: tr("View profile", "شوف البروفايل"), on: { click: function () { openProfile(m.user_id); } } }, avatarSvg(p.avatar, p.id));
      var nm = h("b", { text: p.display_name, style: "cursor:pointer", on: { click: function () { openProfile(m.user_id); } } });
      var body = m.audio_path ? (urls[m.audio_path] ? voicePlayer(urls[m.audio_path], m.audio_secs) : h("p", { "class": "hint", text: tr("Voice message (loading)", "رسالة صوتية (بتحمّل)") })) : h("p", { text: m.body });
      var dby = m.deleted_by && names[m.deleted_by] ? names[m.deleted_by].display_name : "?", hd = h("div", { style: "flex:1" }, nm, badgesEl(p.role, p.subscribed, p.plan_name), m.deleted_at ? h("span", { "class": "tag", style: "margin-inline-start:8px;color:#e55", text: tr("Deleted", "محذوفة") + (m.deleted_by === m.user_id ? "" : " " + tr("by ", "بواسطة ") + dby) }) : null), el = h("div", { "class": "cm" }, av, hd, del);
      if (m.deleted_at) body.style.opacity = ".55";
      var pills = reactUi("chat", m.id, hd, el, !m.deleted_at && cur === "general" && (m.user_id === me.id || isStaff()), m.created_at); hd.appendChild(body); hd.appendChild(pills);
      el.setAttribute("data-id", m.id); return el;
    }
    function openDm(id) { closePop(); cur = "dm:" + id; lastSig = ""; lastRsig = ""; rx = {}; Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-c") === "dmlist"); }); say(err, ""); load(); }
    window.__scarOpenDm = openDm;
    function dmNotice() { return h("p", { "class": "hint", style: "border:1px solid #d4a017;border-radius:8px;padding:8px;margin:0 0 8px;color:#d4a017", text: DM_NOTICE() }); }
    async function loadDmList() {
      var r = await sb.from("dm_threads").select("id,user_a,user_b,last_at").order("last_at", { ascending: false }).limit(50), rows = r.data || [];
      var others = rows.map(function (t) { return t.user_a === me.id ? t.user_b : t.user_a; }); await who(others);
      var sg = "dmlist:" + rows.map(function (t) { return t.id + t.last_at; }).join(","); if (sg === lastSig) return; lastSig = sg; clear(log); log.appendChild(dmNotice());
      if (!rows.length) log.appendChild(h("p", { "class": "hint", text: tr("No private chats yet. Click someone's avatar in the chat, then press Message privately.", "مفيش شاتات خاصة لسه. دوس على صورة حد في الشات وبعدين ابعتله رسالة خاصة.") }));
      rows.forEach(function (t, i) { var p = names[others[i]] || { display_name: "?", avatar: "b1" }; log.appendChild(h("div", { "class": "cm", style: "cursor:pointer", on: { click: function () { openDm(t.id); } } }, h("div", { "class": "av" }, avatarSvg(p.avatar, p.id)), h("div", { style: "flex:1" }, h("b", { text: p.display_name }), badgesEl(p.role, p.subscribed, p.plan_name), h("p", { "class": "hint", text: fmtTime(t.last_at) })))); });
    }
    async function loadDm() {
      var tid = cur.slice(3), r = await sb.from("dm_messages").select("id,sender,body,created_at,deleted_at").eq("thread_id", tid).order("created_at", { ascending: false }).limit(60), rows = (r.data || []).reverse();
      var sg = cur + ":" + rows.map(function (x) { return x.id; }).join(","), changed = await syncRx("dm", rows.map(function (x) { return x.id; })); queueRc("dm", rows, "sender");
      if (sg === lastSig) { if (changed) paintAll(); return; } lastSig = sg;
      var atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 80; await who(rows.map(function (x) { return x.sender; }));
      clear(log); log.appendChild(h("button", { "class": "btn", type: "button", text: tr("\u2190 All private chats", "\u2190 كل الشاتات الخاصة"), on: { click: function () { select("dmlist"); } } })); log.appendChild(dmNotice());
      rows.forEach(function (m) { var p = names[m.sender] || { display_name: "?", avatar: "b1" }, hd = h("div", { style: "flex:1" }, h("b", { text: p.display_name }), badgesEl(p.role, p.subscribed, p.plan_name)), row = h("div", { "class": "cm" }, h("div", { "class": "av", style: "cursor:pointer", on: { click: function () { openProfile(m.sender); } } }, avatarSvg(p.avatar, p.id)), hd, m.sender === me.id ? h("button", { "class": "btn", type: "button", text: tr("Delete", "احذف"), "aria-label": tr("Delete message", "احذف الرسالة"), on: { click: function () { delMsg("dm", m.id); } } }) : null); var pl = reactUi("dm", m.id, hd, row, m.sender === me.id, m.created_at); hd.appendChild(h("p", { text: m.body })); hd.appendChild(pl); log.appendChild(row); });
      if (atEnd || !log.getAttribute("data-dm")) { log.scrollTop = log.scrollHeight; log.setAttribute("data-dm", "1"); }
    }
    async function load() {
      if (cur === "dmlist") return loadDmList(); if (cur.indexOf("dm:") === 0) return loadDm();
      var r = await sb.from("chat_messages").select("id,user_id,body,created_at,audio_path,audio_secs,deleted_at,deleted_by").eq("channel", cur).order("created_at", { ascending: false }).limit(60);
      var rows = (r.data || []).reverse(), sg = cur + ":" + rows.map(function (x) { return x.id + (x.deleted_at ? "d" : ""); }).join(","), changed = await syncRx("chat", rows.map(function (x) { return x.id; })); queueRc("chat", rows, "user_id");
      if (sg === lastSig) { if (changed) paintAll(); return; } lastSig = sg;
      var atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 80; await who(rows.map(function (x) { return x.user_id; }).concat(rows.filter(function (x) { return x.deleted_by; }).map(function (x) { return x.deleted_by; })));
      if (Date.now() - urlsAt > 3000000) { urls = {}; urlsAt = Date.now(); }
      var needU = rows.filter(function (x) { return x.audio_path && !urls[x.audio_path]; }).map(function (x) { return x.audio_path; });
      if (needU.length) { var su = await sb.storage.from("chat-voice").createSignedUrls(needU, 3600); (su.data || []).forEach(function (s2) { if (s2.signedUrl && s2.path) urls[s2.path] = s2.signedUrl; }); }
      clear(log); rows.forEach(function (m) { log.appendChild(line(m)); }); if (atEnd || !log.getAttribute("data-init")) { log.scrollTop = log.scrollHeight; log.setAttribute("data-init", "1"); }
    }
    function select(c) {
      closePop(); cur = c; lastSig = ""; lastRsig = ""; rx = {}; log.removeAttribute("data-dm"); log.removeAttribute("data-init"); if (sub) sb.removeChannel(sub);
      sub = sb.channel("chat-" + c).on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: "channel=eq." + c }, load).on("postgres_changes", { event: "*", schema: "public", table: "chat_reactions" }, load).subscribe();
      Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-c") === c); }); load();
    }
    chans.forEach(function (c) { tabs.appendChild(h("button", { "class": "btn", type: "button", "data-c": c[0], text: c[1], on: { click: function () { select(c[0]); } } })); });
    var form = h("form", { "class": "row", style: "display:flex;gap:8px;margin-top:10px" }, input, h("button", { "class": "btn f", type: "submit", text: tr("Send", "إرسال") }));
    form.addEventListener("submit", async function (e) {
      e.preventDefault(); var b = input.value.trim(); if (!b) return;
      if (cur === "dmlist") return say(err, tr("Open a private chat first.", "افتح شات خاص الأول."), "err");
      if (cur.indexOf("dm:") === 0) { var dr = await sb.from("dm_messages").insert({ thread_id: cur.slice(3), sender: me.id, body: b }); if (dr.error) say(err, tr("Slow down or try again.", "على مهلك أو جرب تاني."), "err"); else { input.value = ""; say(err, ""); load(); } return; }
      var r = await sb.from("chat_messages").insert({ channel: cur, user_id: me.id, body: b });
      if (r.error) { try { console.error("chat insert", r.error); } catch (e) {} say(err, /row-level|policy/i.test(r.error.message || "") ? tr("You cannot send messages right now.", "مش مسموح تبعت دلوقتي.") : /rate|slow|many/i.test(r.error.message || "") ? tr("Slow down a little.", "على مهلك شوية.") : tr("Could not send: ", "ماقدرتش أبعت: ") + (r.error.message || ""), "err"); } else { input.value = ""; say(err, ""); load(); }
    });
    /* voice messages: WhatsApp-style recorder (live bars, timer, Cancel / Send), max 120 s, private chat-voice bucket */
    var micBtn = h("button", { "class": "btn", type: "button", text: tr("\u25cf Voice", "\u25cf صوت"), "aria-label": tr("Record a voice message", "سجّل رسالة صوتية") }), vstate = null, vbusy = false;
    function vErr(e) { var m = String((e && (e.message || e.error)) || e || ""), st = e && (e.statusCode || e.status); if (/row-level|policy|403|Unauthorized/i.test(m + st)) return tr("Not allowed to send voice messages right now (blocked or inactive account).", "مش مسموح تبعت رسائل صوتية دلوقتي (حساب محظور أو غير مفعل)."); if (/mime|type/i.test(m)) return tr("Audio format not supported.", "صيغة الصوت مش مدعومة."); if (/exceed|too large|size|413/i.test(m)) return tr("Recording is too big.", "التسجيل كبير أوي."); if (/limit|many|rate/i.test(m)) return tr("Too many voice messages, try again later.", "رسائل صوتية كتير، جرب بعد شوية."); return tr("Voice upload failed: ", "فشل رفع الصوت: ") + m; }
    function vCleanup() { var s = vstate; vstate = null; if (!s) return; clearInterval(s.tick); clearTimeout(s.cap); cancelAnimationFrame(s.raf); try { s.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} try { s.ac && s.ac.close(); } catch (e) {} if (s.bar.parentNode) s.bar.parentNode.removeChild(s.bar); form.style.display = "flex"; }
    micBtn.addEventListener("click", async function () {
      if (vbusy || vstate) return;
      if (cur !== "general" && cur !== "admins") return say(err, tr("Voice messages are for the community chat only.", "الرسائل الصوتية للشات العام بس."), "err");
      if (!navigator.mediaDevices || !window.MediaRecorder) return say(err, tr("Voice recording is not supported in this browser.", "التسجيل الصوتي مش مدعوم في المتصفح ده."), "err");
      var mt = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].filter(function (x) { return MediaRecorder.isTypeSupported(x); })[0];
      if (!mt) return say(err, tr("Voice recording is not supported in this browser.", "التسجيل الصوتي مش مدعوم في المتصفح ده."), "err");
      vbusy = true; var stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { vbusy = false; return say(err, tr("Microphone permission was denied.", "إذن الميكروفون اترفض."), "err"); }
      vbusy = false;
      var base = mt.split(";")[0], ext = base === "audio/webm" ? "webm" : base === "audio/ogg" ? "ogg" : "m4a", chunks = [], rec = new MediaRecorder(stream, { mimeType: mt, audioBitsPerSecond: 24000 }), t0 = Date.now();
      var cv = h("canvas", { width: 240, height: 36, style: "flex:1;min-width:0;height:36px;direction:ltr" }), tm = h("b", { text: "0:00", style: "min-width:42px;direction:ltr" }), bCancel = h("button", { "class": "btn", type: "button", text: tr("Cancel", "إلغاء") }), bSend = h("button", { "class": "btn", type: "button", text: tr("Send", "إرسال"), style: "background:#c9a227;color:#000" });
      var bar = h("div", { "class": "row", style: "gap:8px;align-items:center;padding:8px;border:1px solid #e11d2e;border-radius:12px;margin-top:8px" }, h("span", { text: "\u25cf", style: "color:#e11d2e;animation:scarpulse 1s infinite" }), tm, cv, bCancel, bSend);
      if (!document.getElementById("scarpulse")) { var stl = document.createElement("style"); stl.id = "scarpulse"; stl.textContent = "@keyframes scarpulse{50%{opacity:.2}}"; document.head.appendChild(stl); }
      var s = vstate = { stream: stream, bar: bar, tick: null, cap: null, raf: 0, ac: null }, levels = [], an = null, data = null;
      try { var AC = window.AudioContext || window.webkitAudioContext; s.ac = new AC(); var src = s.ac.createMediaStreamSource(stream); an = s.ac.createAnalyser(); an.fftSize = 256; src.connect(an); data = new Uint8Array(an.frequencyBinCount); } catch (e) { an = null; }
      function draw() { var cx = cv.getContext("2d"), W = cv.width, H = cv.height, n = 40; if (an) { an.getByteTimeDomainData(data); var mx = 0; for (var i = 0; i < data.length; i++) mx = Math.max(mx, Math.abs(data[i] - 128)); levels.push(Math.min(1, mx / 90)); } else levels.push(0.2 + Math.random() * 0.3); if (levels.length > n) levels.shift(); cx.clearRect(0, 0, W, H); cx.fillStyle = "#e11d2e"; var bw = W / n; levels.forEach(function (l, i) { var bh = Math.max(3, l * H); cx.fillRect(W - (levels.length - i) * bw + 1, (H - bh) / 2, bw - 2, bh); }); s.raf = requestAnimationFrame(draw); }
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      var stopped = new Promise(function (res) { rec.onstop = res; });
      rec.start(250); draw();
      s.tick = setInterval(function () { var sec = Math.floor((Date.now() - t0) / 1000); tm.textContent = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }, 250);
      form.style.display = "none"; form.parentNode.insertBefore(bar, form.nextSibling);
      async function finish(send) {
        if (!vstate) return; bSend.disabled = bCancel.disabled = true; var secs = Math.min(120, Math.round((Date.now() - t0) / 1000));
        try { if (rec.state !== "inactive") rec.stop(); } catch (e) {} await Promise.race([stopped, new Promise(function (r) { setTimeout(r, 3000); })]);
        vCleanup(); if (!send) return;
        var blob = new Blob(chunks, { type: base });
        if (secs < 1 || !blob.size) return say(err, tr("Recording too short.", "التسجيل قصير أوي."), "err");
        if (blob.size > 1572864) return say(err, tr("Recording is too big.", "التسجيل كبير أوي."), "err");
        say(err, tr("Sending...", "بيتبعت..."), "");
        var path = me.id + "/" + crypto.randomUUID() + "." + ext, up = await sb.storage.from("chat-voice").upload(path, blob, { contentType: base, upsert: false });
        if (up.error) { try { console.error("voice upload", up.error); } catch (e) {} return say(err, vErr(up.error), "err"); }
        var r = await sb.from("chat_messages").insert({ channel: cur, user_id: me.id, body: "", audio_path: path, audio_secs: secs });
        if (r.error) { try { console.error("voice insert", r.error); } catch (e) {} say(err, tr("Could not send the voice message: ", "ماقدرتش أبعت الرسالة الصوتية: ") + (r.error.message || ""), "err"); } else { say(err, ""); load(); }
      }
      bSend.addEventListener("click", function () { finish(true); }); bCancel.addEventListener("click", function () { finish(false); });
      s.cap = setTimeout(function () { finish(true); }, 120000);
    });
    form.insertBefore(micBtn, form.lastChild);
    if (myBlk) { input.disabled = true; micBtn.disabled = true; Array.prototype.forEach.call(form.querySelectorAll("button"), function (b) { b.disabled = true; }); say(err, tr("You are blocked from chat. Reason: ", "إنت محظور من الشات. السبب: ") + myBlk.reason + (myBlk.expires_at ? " (" + tr("until ", "لحد ") + fmtTime(myBlk.expires_at) + ")" : " (" + tr("no end date", "من غير مدة") + ")"), "err"); }
    box.appendChild(h("div", { "class": "panel" }, h("h2", { text: tr("Community", "المجتمع") }), tabs, log, form, err)); app.appendChild(box); var dmh = location.hash.match(/^#dm=([0-9a-f-]{36})$/); if (dmh) { select("dmlist"); openDm(dmh[1]); } else select("general");
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
    var view = "active", tabA = h("button", { type: "button", "class": "btn", text: "" }), tabD = h("button", { type: "button", "class": "btn", text: "" });
    tabA.addEventListener("click", function () { view = "active"; users(); }); tabD.addEventListener("click", function () { view = "deleted"; users(); });
    ut.insertBefore(h("div", { "class": "row" }, tabA, tabD), ut.children[1]);
    async function users() {
      var r = await sb.rpc("admin_list_users"); clear(tb); if (r.error) return;
      var nDel = r.data.filter(function (u) { return u.status === "deleted"; }).length;
      tabA.textContent = tr("Accounts", "الحسابات") + " (" + (r.data.length - nDel) + ")"; tabD.textContent = tr("Deleted", "المحذوفين") + " (" + nDel + ")";
      tabA.setAttribute("aria-pressed", view === "active" ? "true" : "false"); tabD.setAttribute("aria-pressed", view === "deleted" ? "true" : "false");
      tabA.style.opacity = view === "active" ? "1" : ".6"; tabD.style.opacity = view === "deleted" ? "1" : ".6";
      r.data = r.data.filter(function (u) { return view === "deleted" ? u.status === "deleted" : u.status !== "deleted"; });
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
          var sel = h("select", { "aria-label": "role", "data-g": "perm" }); ["user", "admin"].forEach(function (r2) { var o = h("option", { value: r2, text: r2 }); if (r2 === u.role) o.selected = true; sel.appendChild(o); });
          var al = h("input", { type: "text", placeholder: "alias", maxlength: "25", value: u.alias || "", "data-g": "perm" });
          act.appendChild(sel); act.appendChild(al);
          act.appendChild(h("button", { "class": "btn f", type: "button", "data-g": "perm", text: tr("Apply", "تطبيق"), on: { click: async function () {
            if (sel.value === "admin" && !ALIAS_RE.test(al.value)) return alert(tr("Admin needs an alias (3-25 chars).", "الأدمن محتاج اسم مستعار (3-25)."));
            var x = await sb.rpc("set_role", { target: u.id, new_role: sel.value, new_alias: sel.value === "admin" ? al.value : null }); if (x.error) alert(x.error.message); users();
          } } }));
        }
        if (owner && u.role !== "owner" && u.status !== "deleted") {
          var banned = u.status === "banned", dn = u.username || u.alias || "";
          act.appendChild(h("button", { "class": "btn", type: "button", "data-g": "mod", text: banned ? tr("Unblock", "فك الحظر") : tr("Block...", "حظر..."), on: { click: async function () {
            if (!banned) return openProfile(u.id);
            var x = await sb.rpc("admin_set_ban", { target: u.id, ban: !banned }); if (x.error) alert(x.error.message); users();
          } } }));
          act.appendChild(h("button", { "class": "btn dng", type: "button", "data-g": "danger", text: tr("Delete", "حذف"), on: { click: async function () {
            var o = await askRemoval(tr("Delete this user permanently? This cannot be undone.", "تحذف المستخدم ده نهائي؟ مش هتقدر ترجعه."), dn); if (!o) return;
            var x = await sb.rpc("admin_delete_user", { target: u.id, p_reason: o.reason, p_notify: o.notify }); if (x.error) alert(x.error.message); else if (o.notify && !(await sendNotices())) alert(noticeNote(false).trim()); users();
          } } }));
        }
        if (u.role !== "owner" && u.status !== "deleted") act.appendChild(h("button", { "class": "btn", type: "button", "data-g": "mod", text: tr("Clear chat", "امسح الشات"), on: { click: async function () {
          var o = await askRemoval(tr("Clear this user's chat messages?", "تمسح رسايل المستخدم ده في الشات؟"), name); if (!o) return;
          var x = await sb.rpc("admin_clear_user_chat", { target: u.id, p_reason: o.reason, p_notify: o.notify }); if (x.error) alert(x.error.message); else if (o.notify && !(await sendNotices())) alert(noticeNote(false).trim()); users();
        } } }));
        if (!owner && u.status === "active" && u.role === "user") act.appendChild(h("button", { "class": "btn", type: "button", "data-g": "mod", text: tr("Profile / block", "البروفايل / حظر"), on: { click: function () { openProfile(u.id); } } }));
        if (owner && u.status === "active") act.appendChild(h("button", { "class": "btn", type: "button", "data-g": "mod", text: tr("Profile", "البروفايل"), on: { click: function () { openProfile(u.id); } } }));
        var mine = gm[u.id] || [], subCell = h("td", { text: u.subscribed ? "yes" : "-" });
        if (mine.length) { clear(subCell); subCell.appendChild(h("span", { "class": "tag", text: tr("Free (owner)", "مجاني (من المالك)") })); mine.forEach(function (g) { subCell.appendChild(h("div", { "class": "hint", text: (g.plan_name || tr("All tools", "كل الأدوات")) + " " + endTxt(g.ends) })); }); }
        if (owner && u.role !== "owner" && u.status === "active") {
          var gs = h("select", { "aria-label": "plan" }); gs.appendChild(h("option", { value: "", text: tr("All tools", "كل الأدوات") }));
          plansL.forEach(function (p) { gs.appendChild(h("option", { value: p.id, text: p.name + (p.scope === "tools" ? "" : " (all)") })); });
          var gd = h("input", { type: "date", "aria-label": tr("Expiry (optional)", "الانتهاء (اختياري)"), title: tr("Expiry (optional)", "الانتهاء (اختياري)") });
          var gact = h("div", { "class": "hint", "data-g": "plan" }, gs, gd, h("button", { "class": "btn", type: "button", text: tr("Give free plan", "اديله اشتراك مجاني"), on: { click: async function () {
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
        (function () {
          var kids = [].slice.call(act.children), G = { perm: [tr("Permissions", "الصلاحيات"), []], plan: [tr("Plan", "الاشتراك"), []], mod: [tr("Moderation", "الإشراف"), []], danger: [tr("Danger", "خطر"), []] };
          kids.forEach(function (k) { var g = G[k.getAttribute("data-g")]; if (g) g[1].push(k); }); clear(act);
          var wrap = h("div", { "class": "ags" });
          ["perm", "plan", "mod", "danger"].forEach(function (key) { var g = G[key]; if (!g[1].length) return; var box = h("div", { "class": "ag ag-" + key }, h("div", { "class": "agl", text: g[0] })), row = h("div", { "class": "agr" }); g[1].forEach(function (k) { row.appendChild(k); }); box.appendChild(row); wrap.appendChild(box); });
          act.appendChild(wrap);
        })();
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
    /* payment confirmations (owner and admins) */
    var cp = h("div", { "class": "panel", id: "payments" }), cmsg = h("div", { "class": "msg" }); box.appendChild(cp);
    async function loadPending() {
      clear(cp); cp.appendChild(h("h3", { text: tr("Payments waiting for confirmation", "دفعات مستنية التأكيد") }));
      var rq = await sb.from("payment_requests").select("id,user_id,amount_minor,currency,period,reference,proof_path,created_at").eq("method", "manual").eq("status", "pending").order("created_at");
      if (!(rq.data || []).length) cp.appendChild(h("p", { "class": "hint", text: tr("None.", "مفيش.") }));
      (rq.data || []).forEach(function (q) {
        var rowEl = h("div", { style: "padding:10px 0;border-bottom:1px solid rgba(255,255,255,.1)" }, h("span", { text: new Date(q.created_at).toLocaleString() + " - " + (q.amount_minor / 100).toFixed(2) + " " + q.currency + "/" + q.period + (q.reference ? " - ref " + q.reference : "") + " - user " + q.user_id.slice(0, 8) + "  " }));
        noteExtras({ kind: "payment_submitted", meta: { request: q.id } }, rowEl);
        cp.appendChild(rowEl);
      });
    cp.appendChild(cmsg);
    }
    await loadPending(); onPay(loadPending); startPay(); if (location.hash === "#payments") cp.scrollIntoView();
    /* logs (owner and admins) */
    var lp = h("div", { "class": "panel", id: "logs" }, h("h2", { text: tr("Logs", "السجل") })), lmsg = h("div", { "class": "msg" }), ltb = h("tbody"), lsel = h("select", { "aria-label": "filter" });
    if (owner) {
      var swBox = h("div", { "class": "panel", id: "notice-switch" }, h("h2", { text: tr("Emails to users", "إيميلات للمستخدمين") })), swCb = h("input", { type: "checkbox", id: "adminNoticeSw" }), swMsg = h("div", { "class": "msg" });
      swCb.disabled = true;
      swBox.appendChild(h("label", { "for": "adminNoticeSw", style: "display:flex;gap:8px;align-items:flex-start" }, swCb, h("span", { text: tr("Let admins email a user when they delete or clear something (needs a reason and a tick). Sent from the site account in the admin's name, replies go to the admin.", "خلّي الأدمن يبعت إيميل للمستخدم لما يمسح حاجة (لازم سبب وعلامة). بيتبعت من حساب الموقع باسم الأدمن والرد بيروح له.") })));
      swBox.appendChild(swMsg); box.appendChild(swBox);
      sb.rpc("notice_settings_get").then(function (r) { if (r && r.data) { swCb.checked = !!r.data.admin_notices; swCb.disabled = false; } });
      swCb.addEventListener("change", async function () { swCb.disabled = true; var want = swCb.checked, r = await sb.rpc("set_admin_notices", { p_on: want }); if (r.error) { swCb.checked = !want; say(swMsg, tr("Could not save.", "ماتحفظش."), "err"); } else say(swMsg, want ? tr("Admins can email users.", "الأدمن يقدر يبعت إيميل.") : tr("Admin emails are off.", "إيميلات الأدمن مقفولة."), "ok"); swCb.disabled = false; });
    }
    box.appendChild(lp);
    var LBL = { signup: ["Sign up", "تسجيل جديد"], login: ["Login", "دخول"], view_dm: ["Owner viewed a private chat", "المالك فتح شات خاص"], block_user: ["Block", "حظر"], unblock_user: ["Unblock", "فك حظر"], ban_user: ["Ban", "حظر"], unban_user: ["Unban", "فك حظر"], admin_delete_user: ["Account deleted by admin", "حذف حساب بواسطة أدمن"], delete_account: ["Account deleted by user", "المستخدم حذف حسابه"], grant_plan: ["Free plan granted", "اشتراك مجاني اتمنح"], revoke_plan: ["Free plan revoked", "اشتراك مجاني اتسحب"], review_manual_payment: ["Payment reviewed", "مراجعة دفعة"], set_role: ["Role changed", "تغيير صلاحية"], claim_owner: ["Owner claimed", "استلام الأونر"], tool_price: ["Tool price", "سعر أداة"], set_manual_instructions: ["Wallet details changed", "تغيير بيانات المحفظة"], delete_message: ["Message deleted", "رسالة اتمسحت"], contact_change: ["Contact details changed", "تعديل بيانات التواصل"], tool_added: ["Tool added", "أداة اتضافت"], tool_change: ["Tool changed", "أداة اتعدلت"], tool_deleted: ["Tool deleted", "أداة اتمسحت"], clear_user_chat: ["User chat cleared", "شات مستخدم اتمسح"], notice_sent: ["Notice emailed", "إيميل اتبعت"], notice_failed: ["Notice email failed", "الإيميل فشل"], notice_skipped: ["Notice skipped", "الإيميل اتخطى"], set_alias: ["Alias changed", "تغيير اسم الظهور"], notice_setting: ["Admin email setting", "إعداد إيميلات الأدمن"], paymob_paid: ["Card payment confirmed", "دفع بالكارت اتأكد"] };
    lsel.appendChild(h("option", { value: "", text: tr("All", "الكل") })); Object.keys(LBL).forEach(function (k) { lsel.appendChild(h("option", { value: k, text: tr(LBL[k][0], LBL[k][1]) })); });
    var llive = h("span", { "class": "hint", style: "margin-inline-start:10px" }); lp.appendChild(h("div", { "class": "row" }, lsel, llive)); lp.appendChild(h("div", { style: "overflow-x:auto" }, h("table", { "class": "t" }, h("thead", null, h("tr", null, h("th", { text: tr("When", "الوقت") }), h("th", { text: tr("Action", "الإجراء") }), h("th", { text: tr("By", "بواسطة") }), h("th", { text: tr("Target", "الهدف") }), h("th", { text: tr("Details", "التفاصيل") }))), ltb))); lp.appendChild(lmsg);
    var allLogs = [];
    function lgMoney(v, c) { return v == null ? tr("no price", "من غير سعر") : (v / 100).toFixed(2) + " " + (c || ""); }
    function lgVis(v) { return v === "private" ? tr("subscribers only", "للمشتركين بس") : v === "public" ? tr("public", "عام") : v; }
    function lgSt(v) { return v === "published" ? tr("published", "منشورة") : v === "draft" ? tr("draft", "مسودة") : v; }
    function lgChange(c) {
      var f = c.f, ar = " \u2192 ";
      if (f === "price") return tr("Price ", "السعر ") + lgMoney(c.old, c.cur_old) + ar + lgMoney(c.new, c.cur);
      if (f === "discount") return tr("Discount ", "الخصم ") + (c.old || 0) + "%" + ar + (c.new || 0) + "%" + (c.new > 0 ? (c.until ? tr(" until ", " لحد ") + fmtTime(c.until) : "") : "");
      if (f === "visibility") return tr("Visibility ", "الظهور ") + lgVis(c.old) + ar + lgVis(c.new);
      if (f === "status") return tr("Status ", "الحالة ") + lgSt(c.old) + ar + lgSt(c.new);
      if (f === "name") return tr("Name ", "الاسم ") + c.old + ar + c.new;
      if (f === "slug") return tr("Slug ", "الرابط ") + c.old + ar + c.new;
      if (f === "class") return tr("Class ", "الفئة ") + c.old + ar + c.new;
      if (f === "description") return tr("Description changed", "الوصف اتعدل");
      if (f === "commands") return tr("Content/commands changed", "المحتوى والأوامر اتعدلت");
      if (f === "credit") return tr("Credit info changed", "بيانات النسب اتعدلت");
      if (f === "coming_soon") return c.new ? tr("Marked coming soon", "اتعلّمت قريبا") : tr("Coming soon removed", "اتشال قريبا");
      if (f === "video" || f === "repo") { var w = f === "video" ? tr("Video link", "رابط الفيديو") : tr("Repo link", "رابط الريبو"); return w + " " + (c.new ? (c.old ? tr("changed", "اتغير") : tr("added", "اتضاف")) : tr("removed", "اتشال")); }
      if (f === "file") { var fn = String(c.new || c.old || "").split("/").pop(); return tr("File ", "الملف ") + (c.new ? (c.old ? tr("replaced", "اتبدل") : tr("added", "اتضاف")) : tr("removed", "اتشال")) + (fn ? " (" + fn + ")" : ""); }
      if (f === "guide") return tr("Guide PDF ", "دليل الـPDF ") + (c.new === "added" ? tr("added", "اتضاف") : c.new === "removed" ? tr("removed", "اتشال") : tr("replaced", "اتبدل"));
      return String(f);
    }
    function lgTool(l) {
      var m = l.meta || {}, nm = (m.name || "?") + " (" + (m.slug || "?") + ")";
      if (l.action === "tool_added") return tr("Tool added: ", "أداة اتضافت: ") + nm + (m.price != null ? " - " + lgMoney(m.price, m.currency) : "") + (m.visibility ? " - " + lgVis(m.visibility) : "");
      if (l.action === "tool_deleted") return tr("Tool deleted: ", "أداة اتمسحت: ") + nm;
      return tr("Tool changed: ", "أداة اتعدلت: ") + nm + " - " + (m.changes || []).map(lgChange).join("; ");
    }
    function lgTime(v) { var d = new Date(v), p = function (n) { return String(n).padStart(2, "0"); }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()); }
    function lgRole(r) { return r === "owner" ? tr("Owner", "مالك") : r === "admin" ? tr("Admin", "أدمن") : r === "user" ? tr("User", "مستخدم") : (r || "?"); }
    function lgStat(r) { return r === "banned" ? tr("blocked", "محظور") : r === "active" ? tr("active", "نشط") : (r || "?"); }
    function lgMoney2(a, c) { return a == null ? "" : (a / 100).toFixed(2) + " " + (c || ""); }
    function lgUntil(u) { return u ? tr("until ", "لحد ") + lgTime(u) : tr("no expiry", "من غير انتهاء"); }
    function lgNotice(n) { return n === "queued" ? tr("queued", "في الطابور") : n === "skipped" ? tr("skipped", "اتخطى") : n; }
    function lgDetails(l) {
      var m = l.meta || {}, o = [], ar = " \u2192 ", A = l.action;
      if (/^tool_(added|change|deleted)$/.test(A)) return [lgTool(l)];
      if (A === "set_role") o.push(tr("Role: ", "الصلاحية: ") + lgRole(m.old) + ar + lgRole(m.role)), m.alias && o.push(tr("Alias: ", "اسم الظهور: ") + (m.old_alias ? m.old_alias + ar : "") + m.alias), !m.alias && m.old_alias && o.push(tr("Alias removed: ", "اتشال اسم الظهور: ") + m.old_alias);
      else if (A === "ban_user" || A === "unban_user") o.push(tr("Status: ", "الحالة: ") + lgStat(m.old || (A === "ban_user" ? "active" : "banned")) + ar + lgStat(m.new || (A === "ban_user" ? "banned" : "active")));
      else if (A === "block_user" || A === "unblock_user") { o.push((A === "block_user" ? tr("Blocked in: ", "حظر في: ") : tr("Unblocked in: ", "فك حظر في: ")) + (m.scope === "site" ? tr("the whole site", "الموقع كله") : tr("chat", "الشات"))); if (A === "block_user") o.push(m.until ? tr("Until ", "لحد ") + lgTime(m.until) : tr("Permanent", "دائم")); if (m.reason) o.push(tr("Reason: ", "السبب: ") + m.reason); }
      else if (A === "signup") o.push(tr("New account", "حساب جديد") + (m.user ? ": " + m.user : ""));
      else if (A === "login") o.push(tr("Signed in", "سجّل دخول"));
      else if (A === "claim_owner") o.push(tr("Became the owner", "بقى هو المالك"));
      else if (A === "view_dm") o.push(tr("Opened the private chat: ", "فتح الشات الخاص: ") + (m.users || "?"));
      else if (A === "admin_delete_user") { o.push(tr("Account deleted: ", "حساب اتحذف: ") + (m.name || l.target_name || "?")); if (m.reason) o.push(tr("Reason: ", "السبب: ") + m.reason); if (m.notice) o.push(tr("Email to user: ", "إيميل للمستخدم: ") + lgNotice(m.notice)); }
      else if (A === "delete_account") o.push(tr("The user deleted their own account", "المستخدم حذف حسابه بنفسه"));
      else if (A === "grant_plan") o.push(tr("Plan: ", "الباقة: ") + (m._plan || tr("all tools", "كل الأدوات")) + " (" + lgUntil(m.until) + ")");
      else if (A === "revoke_plan") o.push(tr("Plan revoked: ", "الباقة اتسحبت: ") + (m._plan || tr("all tools", "كل الأدوات")));
      else if (A === "review_manual_payment") { o.push((m.approved ? tr("Approved", "اتقبلت") : tr("Rejected", "اترفضت")) + (m._plan ? " - " + m._plan : "") + (m._amount != null ? " - " + lgMoney2(m._amount, m._cur) : "") + (m._period ? " / " + m._period : "") + (m._method ? " (" + m._method + ")" : "")); if (m._rej) o.push(tr("Reason: ", "السبب: ") + m._rej); }
      else if (A === "paymob_paid") o.push(tr("Card payment confirmed", "دفع بالكارت اتأكد") + (m._plan ? " - " + m._plan : "") + (m._amount != null ? " - " + lgMoney2(m._amount, m._cur) : ""));
      else if (A === "tool_price") { o.push(tr("Tool: ", "الأداة: ") + (m._tool || "?")); if (m.price_minor != null) o.push(tr("Price ", "السعر ") + lgMoney2(m.price_minor, m.currency)); if (m.discount) o.push(tr("Discount ", "الخصم ") + m.discount + "%" + (m.until ? " " + lgUntil(m.until) : "")); }
      else if (A === "delete_message") { o.push((m.scope === "dm" ? tr("Private message deleted", "رسالة خاصة اتمسحت") : tr("Chat message deleted", "رسالة شات اتمسحت")) + (m.channel ? " (#" + m.channel + ")" : "") + (m.self ? tr(" - by its author", " - بواسطة صاحبها") : "")); if (m.reason) o.push(tr("Reason: ", "السبب: ") + m.reason); if (m.notice) o.push(tr("Email to user: ", "إيميل للمستخدم: ") + lgNotice(m.notice)); }
      else if (A === "clear_user_chat") { o.push(tr("Chat messages cleared: ", "رسايل اتمسحت: ") + (m.count != null ? m.count : "?")); if (m.reason) o.push(tr("Reason: ", "السبب: ") + m.reason); if (m.notice) o.push(tr("Email to user: ", "إيميل للمستخدم: ") + lgNotice(m.notice)); }
      else if (A === "notice_sent" || A === "notice_failed" || A === "notice_skipped") { o.push(tr("Type: ", "النوع: ") + (m.kind || "?")); if (m.why) o.push(tr("Why: ", "السبب: ") + m.why); if (m.reason) o.push(tr("Reason: ", "السبب: ") + m.reason); if (m.by_role === "admin") o.push(tr("Sent by an admin, from the site account", "اتبعت من أدمن، من حساب الموقع")); if (m.error || m.err) o.push(String(m.error || m.err)); }
      else if (A === "notice_setting") o.push(tr("Admins may email users: ", "الأدمن يقدر يبعت إيميل للمستخدمين: ") + (m.old ? tr("on", "شغال") : tr("off", "مقفول")) + ar + (m.new ? tr("on", "شغال") : tr("off", "مقفول")));
      else if (A === "contact_change") o.push((m.users || "?") + ": " + (m.old ? m.old : "-") + ar + (m.new ? m.new : "-"));
      else if (A === "set_alias") o.push(tr("Alias: ", "اسم الظهور: ") + (m.old ? m.old + ar : "") + (m.alias || "?"));
      else if (A === "set_manual_instructions") { if (m.wallet_new != null) o.push(tr("Wallet: ", "المحفظة: ") + (m.wallet_old ? m.wallet_old + ar : "") + m.wallet_new); if (m.holder_new != null) o.push(tr("Holder: ", "الاسم: ") + (m.holder_old ? m.holder_old + ar : "") + m.holder_new); if (m.note_changed) o.push(tr("Note changed", "الملاحظة اتعدلت")); if (!o.length) o.push(tr("Wallet details changed", "بيانات المحفظة اتغيرت")); }
      return o.length ? o : ["-"];
    }
    var seen = {}, fresh = {}, firstLoad = true, liveBusy = false;
    function drawLogs() {
      clear(ltb);
      allLogs.filter(function (l) { return !lsel.value || l.action === lsel.value; }).slice(0, 300).forEach(function (l) {
        var lb = LBL[l.action], id = l.meta && l.meta._id, dc = h("td"); lgDetails(l).forEach(function (t) { dc.appendChild(h("div", { text: t })); });
        var tr1 = h("tr", null, h("td", { text: lgTime(l.at), dir: "ltr", style: "white-space:nowrap;text-align:start;unicode-bidi:isolate" }), h("td", { text: lb ? tr(lb[0], lb[1]) : l.action }), h("td", { text: l.actor_name || "-" }), h("td", { text: l.target_name || "-" }), dc);
        if (id != null && fresh[id]) { tr1.style.background = "rgba(255,90,40,.28)"; tr1.style.transition = "background 4s"; setTimeout(function () { tr1.style.background = ""; }, 60); }
        ltb.appendChild(tr1);
      });
    }
    async function loadLogs(n) {
      if (liveBusy) return; liveBusy = true;
      try {
        var lr = await sb.rpc("admin_logs", { p_limit: n || 500 }); if (lr.error) { if (firstLoad) say(lmsg, tr("Could not load logs.", "ماقدرتش أحمل السجل."), "err"); return; }
        var rows = lr.data || [], map = {}, changed = firstLoad;
        allLogs.forEach(function (l) { if (l.meta && l.meta._id != null) map[l.meta._id] = l; });
        rows.forEach(function (l) { var id = l.meta && l.meta._id; if (id == null || map[id]) return; map[id] = l; changed = true; if (!firstLoad) { fresh[id] = 1; setTimeout(function () { delete fresh[id]; }, 8000); } });
        if (changed) { allLogs = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return (new Date(b.at) - new Date(a.at)) || (String(b.meta._id) < String(a.meta._id) ? -1 : 1); }).slice(0, 500); drawLogs(); }
        firstLoad = false; llive.textContent = tr("Live", "مباشر") + " \u25CF";
      } finally { liveBusy = false; }
    }
    lsel.addEventListener("change", drawLogs);
    loadLogs(500);
    try { sb.channel("logs-" + me.id).on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_log" }, function () { loadLogs(40); }).subscribe(); } catch (e) {}
    setInterval(function () { if (!document.hidden) loadLogs(40); }, 3000);
    if (owner) {
      var dp = h("div", { "class": "panel", id: "dms" }, h("h2", { text: tr("Private chats (owner only, read-only)", "الشاتات الخاصة (للمالك فقط، قراءة بس)") })), dmsg = h("div", { "class": "msg" }), dview = h("div", { "class": "chatbox", style: "display:none;margin-top:10px" }), dtb = h("tbody");
      dp.appendChild(h("p", { "class": "hint", text: tr("Every time you open a conversation here it is written to the Logs. Admins cannot see private chats.", "كل مرة بتفتح محادثة هنا بتتسجل في السجل. الأدمن مايقدرش يشوف الشاتات الخاصة.") }));
      dp.appendChild(h("table", { "class": "t" }, h("thead", null, h("tr", null, h("th", { text: tr("Users", "المستخدمين") }), h("th", { text: tr("Messages", "الرسايل") }), h("th", { text: tr("Last", "آخر رسالة") }), h("th", { text: "" }))), dtb)); dp.appendChild(dview); dp.appendChild(dmsg); box.appendChild(dp);
      (async function () {
        var lr2 = await sb.rpc("owner_list_dms"); if (lr2.error) return say(dmsg, tr("Could not load.", "ماقدرتش أحمل."), "err");
        (lr2.data || []).forEach(function (t) { dtb.appendChild(h("tr", null, h("td", { text: t.a_name + " & " + t.b_name }), h("td", { text: String(t.msgs) }), h("td", { text: fmtTime(t.last_at) }), h("td", null, h("button", { "class": "btn", type: "button", text: tr("Open (logged)", "افتح (بتتسجل)"), on: { click: async function () {
          var vr = await sb.rpc("owner_view_dm", { p_thread: t.thread_id }); if (vr.error) return say(dmsg, tr("Could not open.", "ماقدرتش أفتح."), "err");
          clear(dview); dview.style.display = ""; (vr.data || []).forEach(function (m) { dview.appendChild(h("p", { style: "margin:4px 0" }, h("b", { text: m.sender_name + " " }), h("small", { "class": "hint", text: fmtTime(m.created_at) }), h("br"), document.createTextNode(m.body + (m.deleted_at ? "  [" + tr("deleted ", "محذوفة ") + fmtTime(m.deleted_at) + "]" : "")))); }); if (!(vr.data || []).length) dview.appendChild(h("p", { "class": "hint", text: tr("Empty.", "فاضية.") }));
        } } })))); });
        if (!(lr2.data || []).length) dtb.appendChild(h("tr", null, h("td", { text: tr("No private chats yet.", "مفيش شاتات خاصة لسه.") }), h("td"), h("td"), h("td")));
      })();
    }
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
  function soonText() { return "\u23F3 " + tr("Guide coming soon. The description is live now, and files will be added here.", "الدليل قريبا. الوصف شغال دلوقتي والملفات هتتضاف هنا.") }
  function lockText() { return "\uD83D\uDD12 " + tr("Subscribers only. Subscribe to unlock the commands, guide and files.", "\u0644\u0644\u0645\u0634\u062a\u0631\u0643\u064a\u0646 \u0641\u0642\u0637. \u0627\u0634\u062a\u0631\u0643 \u0639\u0634\u0627\u0646 \u062a\u0641\u062a\u062d \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0648\u0627\u0644\u062f\u0644\u064a\u0644 \u0648\u0627\u0644\u0645\u0644\u0641\u0627\u062a."); }

  async function dynTools() {
    var SELT = "id,slug,name,class,description_en,description_ar,commands,visibility,created_by,third_party,orig_creator,orig_license,orig_repo", PRC = ",price_minor,currency,discount_percent,discount_until,coming_soon";
    var pubF = function (q) { return q.eq("status", "published"); }, r = await TSQ(SELT + PRC, pubF); if (r.error) r = await TSQ(SELT, pubF); if (r.error || !r.data) return;
    var LK = {}, st = document.createElement("style"); st.textContent = ".card.locked{opacity:.85;border-style:dashed}.card.locked .lockmsg{margin:8px 0;padding:8px 10px;border:1px dashed currentColor;border-radius:8px;font-size:13px;opacity:.8}"; document.head.appendChild(st);
    await Promise.all(r.data.filter(function (t) { return t.visibility === "private"; }).map(async function (t) { LK[t.id] = !t.coming_soon && !(await canOpen(t)); }));
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
      var locked = !!LK[t.id], cmds = h("div", { "class": "cmds" }); if (t.coming_soon) cmds.appendChild(h("div", { "class": "lockmsg", style: "margin:8px 0;padding:8px 10px;border:1px dashed currentColor;border-radius:8px;font-size:13px;opacity:.8", text: soonText() })); else if (locked) cmds.appendChild(h("div", { "class": "lockmsg", text: lockText() })); else (t.commands || []).forEach(function (c) { cmds.appendChild(h("code", { text: c })); });
      var p = h("p", { text: (EN() || !t.description_ar) ? t.description_en : t.description_ar }); if (t.description_ar) { p.setAttribute("data-en", t.description_en); p.setAttribute("data-ar", t.description_ar); }
      var tagc = t.third_party ? h("span", { "class": "tag third", text: "THIRD-PARTY" }) : t.coming_soon ? h("span", { "class": "tag", text: tr("COMING SOON", "قريبا") }) : t.visibility === "private" ? h("span", { "class": "tag", text: locked ? tr("LOCKED", "مقفول") : "PRO" }) : h("span", { "class": "tag new", text: "NEW" });
      var priceEl = null;
      if (t.price_minor != null && !t.third_party) { var on = t.discount_percent > 0 && (!t.discount_until || new Date(t.discount_until) > new Date()), eff = on ? Math.floor(t.price_minor * (100 - t.discount_percent) / 100) : t.price_minor;
        priceEl = h("span", { "class": "priv" }, on ? h("s", { text: (t.price_minor / 100).toFixed(2) }) : null, on ? " " : null, (eff / 100).toFixed(2) + " " + t.currency + (on ? " (-" + t.discount_percent + "%)" : "")); }
      grid.appendChild(h("article", { "class": (t.third_party ? "card third" : "card") + (locked ? " locked" : ""), "data-o": t.third_party ? "third" : null, "data-name": t.slug + " " + t.class, "data-c": t.class }, h("div", { "class": "top" }, h("h3", { text: t.name }), h("span", null, tagc)), p, cmds, t.third_party && !locked ? creditEl(t) : null,
        h("div", { "class": "foot" }, h("span", { "class": "priv", text: t.coming_soon ? tr("Coming soon", "قريبا") : t.visibility === "private" ? "Subscribers only" : "Public" }), priceEl, locked ? h("a", { "class": "more", href: me ? "account.html" : "login.html", text: tr("Unlock", "افتح") }) : null, h("a", { "class": "more", href: "tool.html?t=" + encodeURIComponent(t.slug), text: "Details" }), (me && (me.role === "owner" || (me.role === "admin" && t.created_by === me.id))) ? h("a", { "class": "more", href: "admin.html#edit-" + encodeURIComponent(t.slug), text: tr("Edit", "تعديل") }) : null)));
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
    var r = await TSQ("id,name,class,description_en,description_ar,commands,visibility,created_by,third_party,orig_creator,orig_license,orig_repo,coming_soon", function (q) { return q.eq("slug", slug).eq("status", "published").maybeSingle(); });
    var box = h("div", { "class": "wide" }); app.appendChild(box);
    if (!r.data) return box.appendChild(h("div", { "class": "off", text: "404" }));
    var t = r.data, a = (await sb.from("tool_assets").select("video_url,repo_url,file_path").eq("tool_id", t.id).maybeSingle()).data;
    var pn = h("div", { "class": "panel" }, h("h1", { text: t.name }), h("p", { text: EN() || !t.description_ar ? t.description_en : t.description_ar }));
    if (t.third_party && t.orig_repo) pn.appendChild(creditEl(t));
    var tOpen = await canOpen(t);
    if (t.coming_soon) { pn.appendChild(h("p", { "class": "hint", text: soonText() })); if (me && (me.role === "owner" || (me.role === "admin" && t.created_by === me.id))) pn.appendChild(h("span", { style: "display:inline-block;margin-inline-start:10px;margin-top:8px" }, h("a", { "class": "btn", href: "admin.html#edit-" + encodeURIComponent(slug), text: tr("Edit this tool", "عدّل الأداة دي") }))); box.appendChild(pn); return; }
    if (!tOpen) { pn.appendChild(h("p", { "class": "hint", text: lockText() })); pn.appendChild(h("p", null, h("a", { "class": "btn f", href: me ? "account.html" : "login.html", text: me ? tr("Upgrade to unlock the docs", "رقّي حسابك عشان تفتح الدوكس") : tr("Sign in to unlock", "سجّل دخول عشان تفتح") }))); }
    else if (!t.coming_soon) {
      var dsec = function (en, ar) { return h("h2", { text: tr(en, ar), style: "font-size:20px;margin:22px 0 6px" }); };
      if (!t.third_party) {
        pn.appendChild(dsec("Install", "التثبيت"));
        pn.appendChild(h("p", { text: tr("Needs Python 3 only (standard library, no API keys). Download the tool from this page, unzip it and run its script with --help to see every option.", "محتاجة Python 3 بس (المكتبة القياسية، من غير API keys). نزّل الأداة من الصفحة دي، فك الضغط وشغّل السكربت بـ --help عشان تشوف كل الخيارات.") }));
      }
      if ((t.commands || []).length) { pn.appendChild(dsec("Usage examples", "أمثلة الاستخدام")); (t.commands || []).forEach(function (c) { pn.appendChild(h("code", { text: c, style: "display:block;margin:4px 0" })); }); }
      pn.appendChild(dsec("Legal notice", "تنبيه قانوني"));
      pn.appendChild(h("p", { "class": "hint", text: tr("Use this only on systems, accounts and data you own or have written permission to test. You are responsible for how you use it. Educational use only.", "استخدمها بس على أنظمة وحسابات وبيانات بتاعتك أو معاك إذن مكتوب باختبارها. إنت المسؤول عن طريقة الاستخدام. للتعلّم فقط.") }));
    }
    if (!a) { pn.appendChild(h("p", { "class": "hint", text: tr("Video, repo and files are for subscribers only.", "الفيديو والريبو والملفات للمشتركين بس.") })); pn.appendChild(h("a", { "class": "btn f", href: me ? "account.html" : "login.html", text: tr("Subscribe", "اشترك") })); }
    else {
      if (a.video_url && /^https:\/\//.test(a.video_url)) pn.appendChild(h("p", null, h("a", { "class": "btn", href: a.video_url, target: "_blank", rel: "noopener noreferrer", text: tr("Watch video", "شاهد الفيديو") })));
      if (a.repo_url) pn.appendChild(h("p", null, h("a", { "class": "btn", href: a.repo_url, target: "_blank", rel: "noopener noreferrer", text: "GitHub" })));
      if (a.file_path) pn.appendChild(h("button", { "class": "btn f", type: "button", text: tr("Download", "تحميل"), on: { click: async function () { var u = await sb.storage.from("tool-files").createSignedUrl(a.file_path, 60); if (u.data) location.href = u.data.signedUrl; } } }));
    }
    if (me && (me.role === "owner" || (me.role === "admin" && t.created_by === me.id))) pn.appendChild(h("span", { style: "display:inline-block;margin-inline-start:10px;margin-top:8px" }, h("a", { "class": "btn", href: "admin.html#edit-" + encodeURIComponent(slug), text: tr("Edit this tool", "عدّل الأداة دي") })));
    box.appendChild(pn);
  }
  (async function () {
    var ok = await load();
    if (ok && me) { var sbk = ((await sb.rpc("my_blocks")).data || []).filter(function (x) { return x.scope === "site"; })[0]; if (sbk) { blockedScreen(sbk); return; } }
    if (ok) inMode();
    if (PAGE === "tool") { if (ok) { sideMenu(); toolPage(); } return; }
    if (PAGE === "tools") { if (ok) { dynTools(); sideMenu(); } return; }
    if (!ok) return;
    if (!PAGE) { sideMenu(); return; }
    if (PAGE === "login") { if (recovering) return resetPage(); if (me) return go("account.html"); loginPage(); }
    else { sideMenu(); if (PAGE === "account") accountPage(); else if (PAGE === "community") communityPage(); else if (PAGE === "contact") contactPage(); else if (PAGE === "admin") adminPage(); }
  })();
})();



