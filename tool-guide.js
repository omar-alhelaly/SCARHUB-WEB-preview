/* Per-tool "About" text and the subscribers-only PDF usage guide. Loaded by site.js on tool-*.html pages.
   The PDFs live in the private Supabase bucket "tool-guides". The database decides who can read them; this file only asks. */
(function () {
  "use strict";
  var m = location.pathname.match(/tool-(scar[a-z]+)\.html$/); if (!m) return;
  var slug = m[1], ABOUT = {
"scarbase": [
"You take a snapshot of a folder: the hash of every file. Later you compare the folder to that snapshot and see exactly what was added, removed or changed. Useful for spotting unexpected changes on a server.",
"بتاخد لقطة لفولدر: هاش لكل ملف. بعدين تقارن الفولدر بالقطة دي وتشوف بالظبط إيه اللي اتضاف أو اتشال أو اتغير. مفيدة لكشف أي تغيير غير متوقع على سيرفر."
],
"scarcipher": [
"A learning toolkit for encryption. It implements classical ciphers (Caesar, Playfair, Hill) and modern ones (DES, 3DES, AES) from scratch, so you can see how they work, and it checks them against NIST test vectors.",
"عدة تعليمية للتشفير. فيها شيفرات كلاسيكية (Caesar وPlayfair وHill) وحديثة (DES وAES) مكتوبة من الصفر عشان تفهم بتشتغل إزاي، ومتأكدة من نتايجها بمتجهات NIST."
],
"scarcustody": [
"Keeps a chain-of-custody log for evidence files. Each log entry contains the hash of the previous entry, so changing any past entry breaks the chain and the change is visible.",
"بتحتفظ بسجل سلسلة حيازة (chain of custody) لملفات الأدلة. كل سطر في السجل فيه هاش السطر اللي قبله، فأي تعديل قديم بيكسر السلسلة وبيبان."
],
"scarcvss": [
"Turns a CVSS v3.1 vector string into a base score and a severity rating, so you do not have to calculate it by hand.",
"بتحوّل سلسلة CVSS v3.1 (vector) لدرجة وتصنيف خطورة، من غير ما تحسبها بإيدك."
],
"scardecode": [
"A bench for decoding and identifying data. It decodes base64, hex, URL and ROT13, tries to undo several layers of encoding automatically, decodes JWTs and guesses what type a hash is.",
"ورشة لفك الترميز والتعرف على البيانات. بتفك base64 وhex وURL وROT13، وبتحاول تفك أكتر من طبقة ترميز لوحدها، وبتفك JWT وبتخمّن نوع الهاش."
],
"scardiff": [
"Compares two versions of a config file but ignores comments, blank lines and whitespace, so you only see the lines that really changed.",
"بتقارن نسختين من ملف إعدادات وبتتجاهل التعليقات والسطور الفاضية والمسافات، فبتشوف بس السطور اللي اتغيرت فعلا."
],
"scardrone": [
"A defensive security toolkit for drones in an authorized lab. It checks the network around the drone, audits ground-station software, looks for odd behavior in MAVLink flight logs, audits flight-controller parameters and reviews wireless setup.",
"عدة دفاعية لأمن الدرونز في معمل مصرّح بيه. بتفحص الشبكة حوالين الدرون، وبتراجع برامج محطة الأرض، وبتدور على سلوك غريب في لوجات MAVLink، وبتراجع إعدادات الـ flight controller وإعدادات اللاسلكي."
],
"scarengage": [
"A tracker for a penetration-test engagement: the client, the authorization reference, the approved scope, findings and evidence hashes. It produces client-ready reports. It has no scanning features.",
"متتبّع لمشروع اختبار اختراق: العميل ومرجع التصريح والنطاق المعتمد والنتائج وهاشات الأدلة. بيطلّع تقارير جاهزة للعميل. مفيهوش أي ميزة فحص."
],
"scargrab": [
"An Android app for personal use. You paste or share a link, pick video or audio and a quality, and it saves the file to Downloads/SCARGRAB. Built with Kotlin, Compose and yt-dlp.",
"تطبيق أندرويد للاستخدام الشخصي. بتلصق أو بتشارك لينك، وتختار فيديو أو صوت والجودة، وبيحفظ الملف في Downloads/SCARGRAB. متبني بـ Kotlin وCompose وyt-dlp."
],
"scarhash": [
"Calculates file hashes and checks files against a sha256sum-style list. For every file it says OK, FAILED or MISSING, so you can prove a file did not change.",
"بتحسب هاش للملفات وبتتحقق منها قصاد قايمة بصيغة sha256sum. لكل ملف بتقول OK أو FAILED أو MISSING، فتقدر تثبت إن الملف ماتغيرش."
],
"scarheaders": [
"Checks the HTTP security headers of a website you own, gives it a grade and shows the one-line fix for each missing header.",
"بتفحص HTTP security headers لموقع تملكه، وبتديله درجة وبتقولك الإصلاح في سطر لكل header ناقص."
],
"scarhub": [
"One launcher for the whole SCAR toolkit. It gives you a menu, an install check, help and examples for each tool, guided workflows, and installs or updates tools from git.",
"لانشر واحد لكل أدوات SCAR. فيه قايمة وفحص للتثبيت وهيلب وأمثلة لكل أداة ومسارات عمل موجهة، وبيثبّت ويحدّث الأدوات من git."
],
"scarioc": [
"Reads logs and reports and pulls out indicators of compromise: IP addresses, domains, URLs, emails, hashes and CVE ids. It understands defanged input and works fully offline.",
"بتقرا اللوجات والتقارير وبتستخرج مؤشرات الاختراق: عناوين IP ودومينات وروابط وإيميلات وهاشات وأرقام CVE. بتفهم الصيغة المعطّلة (defanged) وبتشتغل أوفلاين بالكامل."
],
"scarjwt": [
"Reads JSON Web Tokens and audits them. It flags alg none, a missing expiry, risky headers and sensitive claims, and can check an HMAC signature if you give it the key. Works offline.",
"بتقرا JSON Web Tokens وبتفحصها. بتنبّه على alg none وغياب الانتهاء وheaders خطرة وclaims حساسة، وتقدر تتحقق من توقيع HMAC لو إديتها المفتاح. أوفلاين."
],
"scarlan": [
"Takes inventory of a private network you own: hosts, open ports and services. It remembers the last run and shows what changed since then.",
"بتعمل جرد لشبكة خاصة تملكها: الأجهزة والبورتات المفتوحة والخدمات. وبتفتكر آخر تشغيل وبتوريك إيه اللي اتغير."
],
"scarlist": [
"Markdown checklists for engagements. Pick a template (web, network or DFIR), tick items off and see progress. The exit code is 1 while work remains, so it fits in scripts.",
"قوايم تشيك بصيغة Markdown للمشاريع. تختار قالب (ويب أو شبكة أو DFIR) وتعلّم اللي خلص وتشوف التقدم. كود الخروج 1 طول ما فيه شغل فاضل، فينفع في السكربتات."
],
"scarlog": [
"Reads SSH/auth logs and web access logs, merges them into one timeline and reports observations such as brute-force attempts and probing of common paths.",
"بتقرا لوجات SSH/auth ولوجات دخول الويب وبتدمجها في تايملاين واحد وبتطلّع ملاحظات زي محاولات brute force والبحث في مسارات معروفة."
],
"scarmeta": [
"Finds the real type of a file from its magic bytes, flags files whose extension does not match, and warns about high-entropy content, which often means packed or encrypted data.",
"بتعرف النوع الحقيقي للملف من magic bytes، وبتنبّه لو الامتداد مش مطابق، وبتحذّر من المحتوى عالي الإنتروبي اللي غالبا يبقى مضغوط أو مشفّر."
],
"scarnote": [
"A terminal notes and cheatsheet manager. Notes stay on your machine, can be searched and tagged, can be encrypted with a passphrase, and can be imported from or exported to Markdown.",
"مدير ملاحظات وcheatsheets في التيرمنال. الملاحظات على جهازك، وتتبحث وتتعلّم بتاجات، وتتشفّر بباسفريز، وتستورد وتصدّر Markdown."
],
"scarosint": [
"Collects public information about a domain you own without any API keys: DNS, web, TLS, archives and registration data.",
"بتجمع معلومات عامة عن دومين تملكه من غير أي API keys: DNS والويب وTLS والأرشيف وبيانات التسجيل."
],
"scarpass": [
"Checks how strong a password is, offline. It estimates entropy, flags common passwords and patterns, and can generate random passwords and passphrases. Nothing is stored or sent anywhere.",
"بتقيس قوة الباسورد أوفلاين. بتقدّر الإنتروبي وبتنبّه على الباسوردات الشائعة والأنماط، وبتولّد باسوردات وجمل عشوائية. مفيش حاجة بتتخزن أو بتتبعت."
],
"scarperm": [
"Explains Android permissions. Give it permission names or a decoded AndroidManifest.xml and it rates each permission and says why it matters.",
"بتشرح صلاحيات أندرويد. إديها أسماء صلاحيات أو AndroidManifest.xml مفكوك وهي بتقيّم كل صلاحية وبتقول ليه مهمة."
],
"scarports": [
"An offline reference for common network ports with a one-line security note for each. Look up by port number or by service name.",
"مرجع أوفلاين للبورتات الشائعة مع ملاحظة أمنية في سطر لكل واحد. بتدور برقم البورت أو باسم الخدمة."
],
"scarreport": [
"Takes the JSON output of SCAROSINT and turns it into a clean HTML and Markdown report with an executive summary, ordered findings and a simple fix for each finding.",
"بتاخد مخرجات JSON من SCAROSINT وتحوّلها لتقرير HTML وMarkdown نضيف فيه ملخص تنفيذي ونتايج مترتبة وإصلاح بسيط لكل نتيجة."
],
"scartime": [
"Converts timestamps between formats (Unix seconds, milliseconds and microseconds, Windows FILETIME, ISO 8601, syslog and web log formats) and merges several logs into one timeline.",
"بتحوّل التواريخ بين الصيغ (Unix بالثواني والملي والميكرو وWindows FILETIME وISO 8601 وsyslog وصيغ لوجات الويب) وبتدمج أكتر من لوج في تايملاين واحد."
]
};
  var L = function () { return document.documentElement.lang === "ar" ? "ar" : "en"; };
  function el(tag, attrs) { var e = document.createElement(tag); for (var k in (attrs || {})) e.setAttribute(k, attrs[k]); for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); } return e; }
  function bi(tag, en, ar, attrs) { var e = el(tag, attrs); e.setAttribute("data-en", en); e.setAttribute("data-ar", ar); e.textContent = L() === "ar" ? ar : en; return e; }
  function init() {
    var main = document.getElementById("main"), first = main && main.querySelector("section"); if (!main || !first || document.getElementById("tool-about")) return;
    var a = ABOUT[slug];
    if (a) { var s1 = el("section", { id: "tool-about" }, bi("h2", "About this tool", "عن الأداة"), bi("p", a[0], a[1], { style: "max-width:900px" })); main.insertBefore(s1, first); }
    var box = el("div", { "class": "notice", style: "max-width:900px" }), act = el("div", { "class": "cta", style: "margin-top:14px" });
    var s2 = el("section", { id: "tool-guide" }, bi("h2", "Usage guide (PDF)", "دليل الاستخدام (PDF)"), box, act); main.insertBefore(s2, first);
    function lock(enMsg, arMsg, href, enBtn, arBtn) {
      box.textContent = ""; box.appendChild(bi("span", enMsg, arMsg)); act.textContent = "";
      if (href) act.appendChild(bi("a", enBtn, arBtn, { "class": "btn f", href: href }));
    }
    lock("Locked. The PDF usage guide is for subscribers.", "مقفول. دليل الاستخدام PDF للمشتركين بس.", "login.html", "Login", "دخول");
    var CFG = window.SCAR_CFG || {}; if (!CFG.url || !CFG.anonKey || !window.supabase) return;     // site not connected yet: stay locked
    var sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } });
    sb.auth.getSession().then(async function (r) {
      var ses = r.data && r.data.session; if (!ses) return;
      var uid = ses.user.id, sub = await sb.rpc("has_active_sub", { uid: uid }), staff = await sb.rpc("is_staff", { uid: uid });
      if (!sub.data && !staff.data) return lock("Locked. Subscribe to unlock the PDF usage guide for this tool.", "مقفول. اشترك عشان تفتح دليل الاستخدام PDF للأداة دي.", "account.html", "Subscribe", "اشترك");
      box.textContent = ""; box.appendChild(bi("span", "Your subscription unlocks the usage guide.", "اشتراكك فتح دليل الاستخدام.")); act.textContent = "";
      var b = bi("button", "Open the PDF guide", "افتح دليل PDF", { "class": "btn f", type: "button" });
      b.addEventListener("click", async function () {
        var u = await sb.storage.from("tool-guides").createSignedUrl(slug + ".pdf", 120);
        if (u.data && u.data.signedUrl) window.open(u.data.signedUrl, "_blank", "noopener");
        else { box.textContent = ""; box.appendChild(bi("span", "The guide for this tool is not uploaded yet.", "دليل الأداة دي لسه مترفعش.")); }
      });
      act.appendChild(b);
    });
  }
  function loadScript(src, cb) { var s = document.createElement("script"); s.src = src; s.onload = cb; s.onerror = cb; document.head.appendChild(s); }
  function go() { loadScript("vendor-supabase.js", function () { loadScript("config.js", init); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
