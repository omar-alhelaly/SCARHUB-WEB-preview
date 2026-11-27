(function () {
  var q = document.getElementById("gq"), cnt = document.getElementById("glcount"), none = document.getElementById("glnone"), cats = document.getElementById("glcats");
  if (!q) return;
  var cat = "all", items = [].slice.call(document.querySelectorAll(".gt")), secs = [].slice.call(document.querySelectorAll(".glsec"));
  function ar() { return (localStorage.l || "en") === "ar"; }
  function norm(s) { return String(s || "").toLowerCase().replace(/[\u064b-\u065f\u0670]/g, "").replace(/[\u0623\u0625\u0622]/g, "\u0627").replace(/\u0649/g, "\u064a").replace(/\u0629/g, "\u0647").trim(); }
  items.forEach(function (e) { e._k = norm(e.getAttribute("data-k")); });
  function run() {
    var s = norm(q.value), words = s ? s.split(/\s+/) : [], shown = 0;
    items.forEach(function (e) {
      var ok = (cat === "all" || e.parentNode.parentNode.getAttribute("data-c") === cat) && words.every(function (w) { return e._k.indexOf(w) >= 0; });
      e.hidden = !ok; if (ok) shown++;
    });
    secs.forEach(function (sec) { sec.hidden = !sec.querySelector(".gt:not([hidden])"); });
    none.hidden = shown > 0;
    cnt.textContent = ar() ? shown + " من " + items.length + " مصطلح" : shown + " of " + items.length + " terms";
  }
  q.addEventListener("input", run);
  cats.addEventListener("click", function (ev) {
    var b = ev.target.closest(".chip"); if (!b) return; cat = b.getAttribute("data-c");
    [].forEach.call(cats.children, function (c) { c.classList.toggle("on", c === b); }); run();
  });
  new MutationObserver(run).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });
  document.addEventListener("click", function (ev) { if (ev.target.closest && ev.target.closest("#lang")) setTimeout(run, 50); });
  run();
  if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t && t.scrollIntoView) t.scrollIntoView(); }
})();
