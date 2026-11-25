/* SCARHUB account, community and admin client. All security is enforced by the database (RLS), not by this file. */
(function () {
  "use strict";
  var CFG = window.SCAR_CFG || {};
  var PAGE = document.body.getAttribute("data-page") || "";
  var EN = function () { return document.documentElement.lang !== "ar"; };
  var tr = function (en, ar) { return EN() ? en : ar; };
  var sb = null, me = null;
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
  function avatarSvg(code) {
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
    if (!CFG.url || !CFG.anonKey || !window.supabase) { if (PAGE !== "tools") off(); return false; }
    sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce" } });
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

  /* ---------- side menu ---------- */
  function sideMenu() {
    if (!me) return;
    var scrim = h("div", { "class": "scrim" }), side = h("nav", { "class": "side", "aria-label": "Account", id: "side" });
    var btn = h("button", { "class": "acct", type: "button", "aria-label": tr("Account menu", "قائمة الحساب"), "aria-expanded": "false" }, avatarSvg(me.avatar));
    function toggle(o) { side.classList.toggle("open", o); scrim.classList.toggle("open", o); btn.setAttribute("aria-expanded", o ? "true" : "false"); }
    btn.addEventListener("click", function () { toggle(!side.classList.contains("open")); }); scrim.addEventListener("click", function () { toggle(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
    side.appendChild(h("p", { text: (isStaff() ? me.alias : me.username) + (me.role === "owner" ? " (owner)" : "") }));
    [["account.html", tr("My account", "حسابي")], ["community.html", tr("Community", "المجتمع")], ["tools.html", tr("Tools", "الأدوات")]].forEach(function (l) { side.appendChild(h("a", { href: l[0], text: l[1] })); });
    if (isStaff()) side.appendChild(h("a", { href: "admin.html", text: tr("Admin panel", "لوحة الإدارة") }));
    side.appendChild(h("button", { type: "button", text: tr("Edit profile", "تعديل البروفايل"), on: { click: function () { go("account.html#edit"); } } }));
    side.appendChild(h("button", { type: "button", text: tr("Sign out", "تسجيل الخروج"), on: { click: async function () { await sb.auth.signOut(); go("index.html"); } } }));
    side.appendChild(h("button", { type: "button", "class": "danger", text: tr("Delete account", "حذف الحساب"), on: { click: function () { go("account.html#delete"); } } }));
    document.body.appendChild(scrim); document.body.appendChild(side); document.body.appendChild(btn);
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
    codeBox.appendChild(h("label", { "for": "otp", text: tr("Verification code from your email", "كود التأكيد من الإيميل") })); codeBox.appendChild(code);
    var cap = h("div", { id: "cap" }), capId = null, capTok = null;
    new Promise(function (ok) { if (window.turnstile) return ok(); var s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = ok; s.onerror = ok; document.head.appendChild(s); }).then(function () { if (!window.turnstile || !CFG.turnstileSiteKey) return; capId = window.turnstile.render(cap, { sitekey: CFG.turnstileSiteKey, callback: function (x) { capTok = x; }, "expired-callback": function () { capTok = null; }, "error-callback": function () { capTok = null; } }); });
    function takeCaptcha() { var x = capTok; if (x) { capTok = null; setTimeout(function () { window.turnstile.reset(capId); }, 0); } return x; }
    form.appendChild(h("label", { "for": "em", text: tr("Email", "الإيميل") })); form.appendChild(email); form.appendChild(emHint);
    form.appendChild(h("div", { id: "pwwrap" }, h("label", { "for": "pw", text: tr("Password (12-64: letters, numbers, symbols)", "الباسورد (12-64: حروف وأرقام ورموز)") }), pw, pwHint));
    form.appendChild(upBox); form.appendChild(codeBox); form.appendChild(cap); form.appendChild(h("div", { "class": "row" }, main)); form.appendChild(msg);
    pick = avatarPicker(avBox, avatar, function (c) { avatar = c; });
    function setMode(m) {
      mode = m; upBox.style.display = m === "up" ? "" : "none"; codeBox.style.display = m === "code" ? "" : "none"; $("pwwrap").style.display = m === "code" ? "none" : "";
      pw.autocomplete = m === "up" ? "new-password" : "current-password";
      main.textContent = m === "in" ? tr("Sign in", "دخول") : m === "up" ? tr("Create account", "إنشاء حساب") : tr("Verify email", "تأكيد الإيميل");
      tabIn.setAttribute("aria-pressed", m === "in"); tabUp.setAttribute("aria-pressed", m === "up"); say(msg, "");
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
          pending = em; setMode("code"); return say(msg, tr("We sent you an email. Open the link in it to confirm your account, then sign in. If it shows a code, enter it below.", "بعتنالك إيميل. افتح اللينك اللي فيه عشان تأكد حسابك وبعدين سجل دخول. لو فيه كود اكتبه تحت."), "ok");
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
  async function accountPage() {
    var app = $("app"); if (!me) return go("login.html"); clear(app);
    var box = h("div", { "class": "wide" }); app.appendChild(box);
    var uname = h("input", { type: "text", maxlength: "20", value: me.username }), avBox = h("div", { "class": "avatars" }), msg = h("div", { "class": "msg" });
    var cur = me.avatar; avatarPicker(avBox, cur, function (c) { cur = c; });
    var save = h("button", { "class": "btn f", type: "button", text: tr("Save", "حفظ"), on: { click: async function () {
      if (!USER_RE.test(uname.value)) return say(msg, tr("Invalid username.", "اسم مستخدم غير صحيح."), "err");
      var r = await sb.rpc("update_my_profile", { new_username: uname.value, new_avatar: cur });
      say(msg, r.error ? tr("Could not save (name taken?).", "ماتحفظش (الاسم مستخدم؟).") : tr("Saved.", "اتحفظ."), r.error ? "err" : "ok");
    } } });
    box.appendChild(h("div", { "class": "panel", id: "edit" }, h("h2", { text: tr("My profile", "بروفايلي") }), h("p", { text: me.email }),
      h("p", { text: tr("Role: ", "الدور: ") + me.role }), h("label", { text: tr("Username", "اسم المستخدم") }), uname, avBox, h("div", { "class": "row" }, save), msg));
    var plansBox = h("div", { "class": "panel" }, h("h2", { text: tr("Subscription", "الاشتراك") })); box.appendChild(plansBox);
    var subR = await sb.from("subscriptions").select("status,current_period_end").eq("user_id", me.id).maybeSingle();
    var active = subR.data && /^(active|trialing)$/.test(subR.data.status) && new Date(subR.data.current_period_end) > new Date();
    plansBox.appendChild(h("p", { text: active ? tr("Active until ", "نشط لحد ") + new Date(subR.data.current_period_end).toLocaleDateString() : tr("No active subscription. Private tools need one.", "مفيش اشتراك فعال. الأدوات الخاصة محتاجة اشتراك.") }));
    var pl = await sb.from("plans").select("id,name,price_minor,currency,period").eq("active", true);
    var pm = await sb.rpc("payment_methods"), methods = (pm.data || []).map(function (x) { return x.method; });
    var manualBox = h("div"), payMsg = h("div", { "class": "msg" });
    if ((pl.data || []).length && !methods.length) plansBox.appendChild(h("p", { "class": "hint", text: tr("Payments are not open yet.", "الدفع لسه مش مفتوح.") }));
    if (methods.length) plansBox.appendChild(h("p", { "class": "hint", text: tr("Choose how to pay:", "اختار طريقة الدفع:") }));
    (pl.data || []).forEach(function (p) {
      if (!methods.length) return;
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
      var r = await sb.from("public_profiles").select("id,display_name,avatar").in("id", need);
      (r.data || []).forEach(function (p) { names[p.id] = p; });
    }
    function line(m) {
      var p = names[m.user_id] || { display_name: "?", avatar: "b1" }, del = null;
      if (isStaff()) del = h("button", { "class": "btn", type: "button", text: "x", "aria-label": "delete", on: { click: async function () { await sb.from("chat_messages").delete().eq("id", m.id); load(); } } });
      var el = h("div", { "class": "cm" }, h("div", { "class": "av" }, avatarSvg(p.avatar)), h("div", { style: "flex:1" }, h("b", { text: p.display_name }), h("p", { text: m.body })), del);
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
    clear(app); var box = h("div", { "class": "wide" }); app.appendChild(box); var owner = me.role === "owner";
    /* users */
    var ut = h("div", { "class": "panel" }, h("h2", { text: tr("Accounts", "الحسابات") })), tb = h("tbody");
    ut.appendChild(h("table", { "class": "t" }, h("thead", null, h("tr", null, h("th", { text: tr("Name", "الاسم") }), h("th", { text: owner ? "Email" : "" }), h("th", { text: tr("Role", "الدور") }), h("th", { text: tr("Status", "الحالة") }), h("th", { text: tr("Sub", "اشتراك") }), h("th", { text: "" }))), tb));
    async function users() {
      var r = await sb.rpc("admin_list_users"); clear(tb); if (r.error) return;
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
        tb.appendChild(h("tr", null, h("td", null, h("span", { "class": "av", style: "display:inline-block;width:28px;vertical-align:middle;margin-inline-end:6px;cursor:default" }, avatarSvg(u.avatar)), name || "-"), h("td", { text: u.email || "" }),
          h("td", null, h("span", { "class": "tag " + (u.role === "owner" ? "owner" : ""), text: u.role })), h("td", null, h("span", { "class": "tag " + (u.status === "deleted" ? "del" : ""), text: u.status })), h("td", { text: u.subscribed ? "yes" : "-" }), act));
      });
    }
    box.appendChild(ut); users();
    /* tool upload */
    var f = {}; function inp(id, label, attrs, tag) { var e = h(tag || "input", Object.assign({ id: "t_" + id }, attrs || {})); f[id] = e; return h("div", null, h("label", { "for": "t_" + id, text: label }), e); }
    var cls = h("select", { id: "t_class" }); ["recon", "forensics", "defense", "pentest", "crypto", "mobile", "platform"].forEach(function (c) { cls.appendChild(h("option", { value: c, text: c })); }); f["class"] = cls;
    var vis = h("select", { id: "t_vis" }, h("option", { value: "public", text: "public" }), h("option", { value: "private", text: "private (subscribers)" })), st = h("select", { id: "t_status" }, h("option", { value: "published", text: "published" }), h("option", { value: "draft", text: "draft" }));
    var file = h("input", { type: "file", id: "t_file", accept: ".zip,.gz,.tar,.txt" }), tmsg = h("div", { "class": "msg" });
    var tf = h("form", { "class": "auth", style: "max-width:none;margin:0" }, h("h2", { text: tr("Add a tool", "ضيف أداة") }),
      inp("name", tr("Name", "الاسم"), { maxlength: "40", required: "", type: "text" }), inp("slug", "Slug (a-z, 0-9, -)", { maxlength: "41", required: "", type: "text" }),
      h("label", { text: tr("Class", "التصنيف") }), cls, inp("den", tr("Description (English)", "الوصف (انجليزي)"), { maxlength: "600", rows: "3" }, "textarea"), inp("dar", tr("Description (Arabic)", "الوصف (عربي)"), { maxlength: "600", rows: "3" }, "textarea"),
      inp("cmds", tr("Commands, one per line (max 10)", "الأوامر، واحد في السطر (10 كحد أقصى)"), { rows: "3" }, "textarea"), h("label", { text: tr("Visibility", "الظهور") }), vis, h("label", { text: tr("Status", "الحالة") }), st,
      inp("video", tr("Video URL (https)", "رابط الفيديو (https)"), { type: "text" }), inp("repo", tr("GitHub repo URL", "رابط الريبو"), { type: "text" }), h("label", { "for": "t_file", text: tr("File (zip, max 50 MB)", "ملف (zip حتى 50MB)") }), file,
      h("div", { "class": "row" }, h("button", { "class": "btn f", type: "submit", text: tr("Publish", "نشر") })), tmsg);
    tf.addEventListener("submit", async function (e) {
      e.preventDefault(); var slug = f.slug.value.trim();
      if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) return say(tmsg, "slug?", "err");
      var cmds = f.cmds.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 10);
      var ins = await sb.from("tools").insert({ slug: slug, name: f.name.value.trim(), class: cls.value, description_en: f.den.value.trim(), description_ar: f.dar.value.trim() || null, commands: cmds, visibility: vis.value, status: st.value, created_by: me.id }).select("id").single();
      if (ins.error) return say(tmsg, ins.error.message, "err");
      var path = null;
      if (file.files[0]) { if (file.files[0].size > 52428800) return say(tmsg, "file > 50 MB", "err"); path = slug + "/" + file.files[0].name.replace(/[^A-Za-z0-9._-]/g, "_").toLowerCase(); var up = await sb.storage.from("tool-files").upload(path, file.files[0], { upsert: false }); if (up.error) return say(tmsg, up.error.message, "err"); }
      var ax = await sb.from("tool_assets").insert({ tool_id: ins.data.id, video_url: f.video.value.trim() || null, repo_url: f.repo.value.trim() || null, file_path: path });
      say(tmsg, ax.error ? ax.error.message : tr("Published.", "اتنشرت."), ax.error ? "err" : "ok");
    });
    box.appendChild(h("div", { "class": "panel" }, tf));
    if (!owner) return;
    /* plans (owner only) */
    var pp = h("div", { "class": "panel" }, h("h2", { text: tr("Payments", "المدفوعات") })), pmsg = h("div", { "class": "msg" }); box.appendChild(pp);
    var NAMES = { manual: "Manual (Vodafone Cash)", paymob: "Paymob" };
    var prov = await sb.from("payment_providers").select("provider,enabled").in("provider", ["manual", "paymob"]); (prov.data || []).forEach(function (p) {
      var c = h("input", { type: "checkbox" }); c.checked = p.enabled; c.disabled = !owner;
      c.addEventListener("change", async function () { var x = await sb.from("payment_providers").update({ enabled: c.checked }).eq("provider", p.provider); if (x.error) { c.checked = !c.checked; say(pmsg, x.error.message, "err"); } });
      pp.appendChild(h("label", { style: "display:inline-block;margin-inline-end:14px" }, c, " " + NAMES[p.provider] + (p.provider === "paymob" ? " (not tested yet)" : " (not tested yet)")));
    });
    var pl = await sb.from("plans").select("id,name,price_minor,currency,period,active"); (pl.data || []).forEach(function (p) {
      pp.appendChild(h("p", { text: p.name + ": " + (p.price_minor / 100).toFixed(2) + " " + p.currency + "/" + p.period + (p.active ? "" : " (off)") }));
    });
    if (owner) {
      pp.appendChild(h("p", { "class": "hint", text: tr("A plan's price applies to every enabled method. Paymob needs EGP plans.", "سعر الخطة بيتطبق على كل طرق الدفع المفعلة. Paymob محتاج خطط بالجنيه.") }));
      var n = h("input", { type: "text", placeholder: "name", maxlength: "40" }), pr = h("input", { type: "text", placeholder: "price e.g. 99.00", inputmode: "decimal" }), cu = h("input", { type: "text", placeholder: "EGP", maxlength: "3" });
      var pe = h("select", null, h("option", { value: "month", text: "month" }), h("option", { value: "year", text: "year" }));
      pp.appendChild(h("div", { "class": "row" }, n, pr, cu, pe, h("button", { "class": "btn f", type: "button", text: tr("Add plan", "ضيف خطة"), on: { click: async function () {
        var minor = Math.round(parseFloat(pr.value) * 100); if (!(minor >= 0) || !/^[A-Za-z]{3}$/.test(cu.value)) return say(pmsg, "price/currency?", "err");
        var x = await sb.from("plans").insert({ name: n.value.trim(), price_minor: minor, currency: cu.value.toUpperCase(), period: pe.value, provider: "manual", active: true });
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
  async function dynTools() {
    var r = await sb.from("tools").select("id,slug,name,class,description_en,description_ar,commands,visibility").eq("status", "published"); if (r.error || !r.data) return;
    r.data.forEach(function (t) {
      var grid = document.querySelector("#c-" + t.class + " .grid"); if (!grid) return;
      var cmds = h("div", { "class": "cmds" }); (t.commands || []).forEach(function (c) { cmds.appendChild(h("code", { text: c })); });
      var p = h("p", { text: t.description_en }); if (t.description_ar) { p.setAttribute("data-en", t.description_en); p.setAttribute("data-ar", t.description_ar); }
      var tagc = t.visibility === "private" ? h("span", { "class": "tag", text: "PRO" }) : h("span", { "class": "tag new", text: "NEW" });
      grid.appendChild(h("article", { "class": "card", "data-name": t.slug + " " + t.class, "data-c": t.class }, h("div", { "class": "top" }, h("h3", { text: t.name }), h("span", null, tagc)), p, cmds,
        h("div", { "class": "foot" }, h("span", { "class": "priv", text: t.visibility === "private" ? "Subscribers only" : "Public" }), h("a", { "class": "more", href: "tool.html?t=" + encodeURIComponent(t.slug), text: "Details" }))));
    });
  }

  async function toolPage() {
    var app = $("app"), slug = new URLSearchParams(location.search).get("t") || ""; clear(app);
    var r = await sb.from("tools").select("id,name,class,description_en,description_ar,commands,visibility").eq("slug", slug).eq("status", "published").maybeSingle();
    var box = h("div", { "class": "wide" }); app.appendChild(box);
    if (!r.data) return box.appendChild(h("div", { "class": "off", text: "404" }));
    var t = r.data, a = (await sb.from("tool_assets").select("video_url,repo_url,file_path").eq("tool_id", t.id).maybeSingle()).data;
    var pn = h("div", { "class": "panel" }, h("h1", { text: t.name }), h("p", { text: EN() || !t.description_ar ? t.description_en : t.description_ar }));
    (t.commands || []).forEach(function (c) { pn.appendChild(h("code", { text: c, style: "display:block;margin:4px 0" })); });
    if (!a) { pn.appendChild(h("p", { "class": "hint", text: tr("Video, repo and files are for subscribers only.", "الفيديو والريبو والملفات للمشتركين بس.") })); pn.appendChild(h("a", { "class": "btn f", href: me ? "account.html" : "login.html", text: tr("Subscribe", "اشترك") })); }
    else {
      if (a.video_url && /^https:\/\//.test(a.video_url)) pn.appendChild(h("p", null, h("a", { "class": "btn", href: a.video_url, target: "_blank", rel: "noopener noreferrer", text: tr("Watch video", "شاهد الفيديو") })));
      if (a.repo_url) pn.appendChild(h("p", null, h("a", { "class": "btn", href: a.repo_url, target: "_blank", rel: "noopener noreferrer", text: "GitHub" })));
      if (a.file_path) pn.appendChild(h("button", { "class": "btn f", type: "button", text: tr("Download", "تحميل"), on: { click: async function () { var u = await sb.storage.from("tool-files").createSignedUrl(a.file_path, 60); if (u.data) location.href = u.data.signedUrl; } } }));
    }
    box.appendChild(pn);
  }
  (async function () {
    var ok = await load();
    if (PAGE === "tool") { if (ok) { sideMenu(); toolPage(); } return; }
    if (PAGE === "tools") { if (ok) dynTools(); return; }
    if (!ok) return;
    if (PAGE === "login") { if (me) return go("account.html"); loginPage(); }
    else { sideMenu(); if (PAGE === "account") accountPage(); else if (PAGE === "community") communityPage(); else if (PAGE === "admin") adminPage(); }
  })();
})();
