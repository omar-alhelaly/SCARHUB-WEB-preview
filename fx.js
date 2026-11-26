(function(){
var css=`
:root{color-scheme:dark}
[dir=rtl] body{text-align:start}
[dir=rtl] p,[dir=rtl] li,[dir=rtl] .notice,[dir=rtl] .stats div{unicode-bidi:plaintext;text-align:start}
[dir=rtl] h1,[dir=rtl] h2,[dir=rtl] h3{text-align:start}
[dir=rtl] pre.logo{text-align:right;margin-left:auto;margin-right:0;display:block;width:fit-content}
[dir=rtl] .contact small{text-align:right;direction:ltr}
[dir=rtl] .contact a{align-items:flex-start}
[dir=rtl] .card{text-align:right}
[dir=rtl] input{text-align:right;direction:rtl}
[dir=rtl] footer{text-align:center}
html[data-theme=light]{color-scheme:light;--bg:#f7f2f3;--p:#ffffff;--p2:#fbf4f5;--r:#c4121f;--r2:#b0101c;--t:#1d1416;--m:#6b5d60;--b:#e3d3d6}
html[data-theme=light] body{background:radial-gradient(1200px 600px at 70% -10%,#f6d9dd 0,transparent 60%),var(--bg)}
html[data-theme=light] nav{background:#f7f2f3ee}
html[data-theme=light] .card p{color:#41363a}
html[data-theme=light] .notice{color:#3a2a2e}
html[data-theme=light] code{background:#f1e6e8;color:#8f0f19}
html[data-theme=light] .card:hover{box-shadow:0 8px 30px #c4121f22}
html[data-theme=light] pre.logo{text-shadow:none}
html[data-theme=light] .btn:hover,html[data-theme=light] .btn.f{color:#fff}
button.theme{background:none;border:1px solid var(--r);color:var(--r2);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:15px;line-height:1.2}
button.theme:hover{background:var(--r);color:#fff}
.card,.contact a{position:relative;overflow:hidden}
.pv{position:absolute;left:0;right:0;top:0;height:50%;z-index:3;background:#050304;color:#ffb3ba;border-bottom:2px solid var(--r);display:flex;flex-direction:column;direction:ltr;text-align:left;opacity:0;transform:translateY(-8px);pointer-events:none;animation:pvin .22s ease forwards;box-shadow:0 10px 28px #0008}
@keyframes pvin{to{opacity:1;transform:none}}
.pv .bar{display:flex;align-items:center;gap:6px;padding:7px 12px;background:#1c1114;font:11px ui-monospace,Menlo,Consolas,monospace;color:#9c8f92}
.pv .bar i{width:9px;height:9px;border-radius:50%;background:#e11d2e;display:inline-block}
.pv .bar i:nth-child(2){background:#ff9f1c}.pv .bar i:nth-child(3){background:#2ec27e}
.pv .bar span{margin-inline-start:auto;letter-spacing:.08em}
.pv pre{margin:0;padding:12px 14px;font:12.5px/1.6 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all;overflow:hidden;flex:1}
.pv pre b{color:#e11d2e;font-weight:400}
.pv .cur{display:inline-block;width:7px;height:13px;background:#ff4455;vertical-align:-2px;animation:bl .7s steps(1) infinite}
@keyframes bl{50%{opacity:0}}
.pv .prog{height:3px;background:#2c1a1e}.pv .prog u{display:block;height:100%;width:0;background:var(--r);text-decoration:none}
.pv.c{align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#2a0b10,#050304);height:100%;font:600 13px system-ui,sans-serif;text-align:center;padding:10px}
.pv.c b,.contact .pv.c b{color:#fff}
.pv.c small,.contact .pv.c small{color:#ffb3ba;font:12px ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere}
.pv.c .arr{font-size:26px;color:#ff4455;animation:mv .8s ease-in-out infinite alternate}
@keyframes mv{to{transform:translateX(8px)}}
`;
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var root=document.documentElement;
var T=localStorage.t||(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
function apply(t){T=t;localStorage.t=t;root.setAttribute('data-theme',t);var b=document.getElementById('theme');if(b){b.textContent=t=='dark'?'\u2600':'\u263E';b.title=t=='dark'?'Light mode':'Dark mode'}}
root.setAttribute('data-theme',T);
function init(){
 var nav=document.querySelector('nav'),lang=document.getElementById('lang');
 var b=document.createElement('button');b.id='theme';b.className='theme';b.type='button';b.onclick=function(){apply(T=='dark'?'light':'dark')};
 if(nav){nav.insertBefore(b,lang||null)}
 apply(T);
 document.querySelectorAll('.card').forEach(function(c){hover(c,function(){
  var name=(c.querySelector('h3')||{}).textContent||'';
  var cmds=[].map.call(c.querySelectorAll('code'),function(x){return x.textContent});
  return term(name,cmds)})});
 document.querySelectorAll('.contact a').forEach(function(a){hover(a,function(){
  var h=a.getAttribute('href')||'';var d=document.createElement('div');d.className='pv c';
  d.innerHTML='<span class="arr">\u279C</span><b></b><small></small>';
  d.querySelector('b').textContent=(a.querySelector('b')||{}).textContent||'';
  d.querySelector('small').textContent=h.replace(/^mailto:/,'').replace(/^https?:\/\//,'');
  return {el:d,stop:function(){}}})});
}
function term(name,cmds){
 var d=document.createElement('div');d.className='pv';
 d.innerHTML='<div class="bar"><i></i><i></i><i></i><span></span></div><pre></pre><div class="prog"><u></u></div>';
 d.querySelector('span').textContent=name.toLowerCase()+' \u00B7 demo';
 var pre=d.querySelector('pre'),pg=d.querySelector('u');
 var lines=cmds.length?cmds:[name.toLowerCase()];
 var li=0,ci=0,out='',tm;
 function draw(cur){pre.innerHTML='';var t=document.createElement('span');t.textContent=out;pre.appendChild(t);if(cur){var k=document.createElement('span');k.className='cur';pre.appendChild(k)}}
 function tick(){
  if(li>=lines.length){pg.style.width='100%';draw(true);tm=setTimeout(function(){li=0;ci=0;out='';pg.style.width='0';tick()},1800);return}
  var L=lines[li];
  if(ci==0)out+='$ ';
  if(ci<L.length){out+=L[ci++];draw(true);pg.style.width=Math.round((li+ci/L.length)/lines.length*100)+'%';tm=setTimeout(tick,28)}
  else{out+='\n';li++;ci=0;draw(true);tm=setTimeout(tick,450)}
 }
 tick();
 return {el:d,stop:function(){clearTimeout(tm)}};
}
function hover(card,make){
 var cur=null;
 card.addEventListener('mouseenter',function(){if(cur)return;cur=make();card.appendChild(cur.el)});
 card.addEventListener('mouseleave',function(){if(!cur)return;cur.stop();cur.el.remove();cur=null});
}
if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* click-to-zoom lightbox for images marked data-zoom (the poster is a vector SVG, so it stays sharp at any size) */
(function(){document.addEventListener("click",function(e){var t=e.target;if(!t||!t.getAttribute||!t.getAttribute("data-zoom"))return;
var o=document.createElement("div");o.setAttribute("role","dialog");o.setAttribute("aria-label","Image");
o.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:12px;cursor:zoom-out;overflow:auto";
var i=document.createElement("img");i.src=t.currentSrc||t.src;i.alt=t.alt||"";i.style.cssText="max-width:96vw;max-height:96vh;width:auto;height:auto;min-height:60vh;object-fit:contain;background:#0c0c0e;border-radius:6px";
var x=document.createElement("button");x.type="button";x.textContent="\u00d7";x.setAttribute("aria-label","Close");x.style.cssText="position:fixed;top:10px;inset-inline-end:14px;font:700 30px/1 sans-serif;color:#fff;background:transparent;border:0;cursor:pointer";
function c(){document.removeEventListener("keydown",k);if(o.parentNode)o.parentNode.removeChild(o)}function k(ev){if(ev.key==="Escape")c()}
o.addEventListener("click",c);document.addEventListener("keydown",k);o.appendChild(i);o.appendChild(x);document.body.appendChild(o)});})();
