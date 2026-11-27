(function () {
  "use strict";
  var D = window.SCAR_TEAM || [], IMG = window.SCAR_IMG || {};
  function L() { return document.documentElement.lang === "ar" ? "ar" : "en"; }
  function h(tag, attrs) {
    var e = document.createElement(tag), k;
    if (attrs) for (k in attrs) { if (k === "text") e.textContent = attrs[k]; else if (k === "class") e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) e.appendChild(arguments[i]);
    return e;
  }
  function tr(en, ar) { return L() === "ar" ? ar : en; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function find(slug) { for (var i = 0; i < D.length; i++) if (D[i].slug === slug) return D[i]; return null; }
  function reveal(root) {
    var els = root.querySelectorAll(".mb-rv");
    if (!("IntersectionObserver" in window)) { for (var i = 0; i < els.length; i++) els[i].classList.add("in"); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    for (var j = 0; j < els.length; j++) io.observe(els[j]);
  }
  function teamPage(root) {
    root.textContent = "";
    var g = h("div", { "class": "tm-grid" });
    D.forEach(function (m, i) {
      g.appendChild(h("a", { "class": "tm-card", href: "member.html?m=" + m.slug, style: "--i:" + i },
        h("div", { "class": "ph" }, h("img", { src: IMG[m.slug] || "", alt: m.name[L()], width: "320", height: "320" })),
        h("div", { "class": "tx" }, h("div", { "class": "tm-mono", text: "FILE " + pad(m.n) + " / " + D.length }), h("h3", { text: m.name[L()] }), h("p", { text: m.role[L()] }), h("span", { "class": "go", text: tr("View profile", "شوف الصفحة") + " \u2192" }))));
    });
    root.appendChild(g);
  }
  function sec(label, body) { return h("section", { "class": "mb-sec mb-rv" }, h("h2", { text: label }), body); }
  function memberPage(root) {
    var slug = (location.search.match(/[?&]m=([a-z0-9-]+)/) || [])[1], m = find(slug);
    root.textContent = "";
    if (!m) { root.appendChild(h("div", { "class": "tm-empty" }, h("p", { text: tr("This team member was not found.", "العضو ده مش موجود.") }), h("a", { href: "team.html", text: tr("Back to the team", "ارجع للفريق") }))); return; }
    var l = L(), nx = D[m.n % D.length], parts = m.name[l].split(" "), cut = Math.ceil(parts.length / 2);
    document.title = m.name[l] + " | SCARHUB";
    var wrap = h("div", { "class": "mb" });
    wrap.appendChild(h("div", { "class": "mb-top tm-mono" }, h("span", null, h("b", { text: "FILE " + pad(m.n) }), document.createTextNode("  \u00b7  " + m.role[l] + "  \u00b7  " + tr("Assiut, EG", "أسيوط، مصر"))), h("span", { text: pad(m.n) + " / " + D.length })));
    var hero = h("div", { "class": "mb-hero" });
    var left = h("div", null, h("h1", null, h("span", { text: parts.slice(0, cut).join(" ") }), h("span", { text: parts.slice(cut).join(" ") })), h("p", { "class": "sum", text: m.sum[l] }));
    if (m.aka) left.appendChild(h("p", { "class": "aka", text: m.aka[l] }));
    hero.appendChild(left); hero.appendChild(h("figure", null, h("img", { src: IMG[m.slug] || "", alt: m.name[l], width: "340", height: "340" })));
    wrap.appendChild(hero);
    if (m.focus[l].length) { var ul = h("ul", { "class": "mb-tags" }); m.focus[l].forEach(function (t) { ul.appendChild(h("li", { text: t })); }); wrap.appendChild(sec(tr("Focus areas", "مجالات التركيز"), ul)); }
    if (m.bg[l]) wrap.appendChild(sec(tr("Background", "الخلفية"), h("div", { "class": "mb-bg" }, h("p", { text: m.bg[l] }), h("img", { src: IMG[m.slug] || "", alt: "", width: "220", height: "220" }))));
    if (m.at[l]) wrap.appendChild(sec(tr("Role at SCAR", "الدور في SCAR"), h("p", { "class": "mb-big", text: m.at[l] })));
    if (m.tools.length) { var tl = h("ul", { "class": "mb-tools" }); m.tools.forEach(function (t) { tl.appendChild(h("li", { text: t })); }); wrap.appendChild(sec(tr("Toolkit", "الأدوات"), tl)); }
    if (m.hl[l] && m.hl[l].length) { var hl = h("ul", { "class": "mb-hl" }); m.hl[l].forEach(function (x) { var li = h("li", null, h("h3", { text: x.t }), h("p", { text: x.d })); if (x.u) li.appendChild(h("a", { href: x.u, target: "_blank", rel: "noopener", text: tr("Visit", "زور") + " \u2197" })); hl.appendChild(li); }); wrap.appendChild(sec(tr("Highlights", "أبرز الأعمال"), hl)); }
    if (m.links.length) { var lk = h("ul", { "class": "mb-links" }); m.links.forEach(function (x) { lk.appendChild(h("li", null, h("a", { href: x[1], target: "_blank", rel: "noopener" }, h("span", { text: x[0] }), h("span", { text: "\u2197" })))); }); wrap.appendChild(sec(tr("Links", "الروابط"), lk)); }
    wrap.appendChild(h("div", { "class": "mb-next mb-rv" }, h("a", { "class": "nx", href: "member.html?m=" + nx.slug }, h("img", { src: IMG[nx.slug] || "", alt: "", width: "96", height: "96" }), h("div", null, h("div", { "class": "tm-mono", text: tr("Next crew member", "العضو التالي") }), h("h2", { text: nx.name[l] }))), h("a", { "class": "mb-all", href: "team.html", text: tr("All the crew", "الفريق كامل") + " \u2192" })));
    root.appendChild(wrap); reveal(root);
  }
  function go() {
    var t = document.getElementById("tmroot"), m = document.getElementById("mbroot");
    function draw() { if (t) teamPage(t); if (m) memberPage(m); }
    draw();
    try { new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
