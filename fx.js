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
html[data-theme=light]{color-scheme:light;--bg:#f6f4f2;--p:#ffffff;--p2:#f1eeeb;--r:#c4121f;--r2:#a80f1a;--t:#1c1718;--m:#5f5558;--b:#d9d3d0}
html[data-theme=light] body{background:radial-gradient(1200px 600px at 70% -10%,#f7e1e4 0,transparent 60%),var(--bg)}
html[data-theme=light] nav{background:#ffffffe8;border-bottom:1px solid var(--b);box-shadow:0 1px 10px #1c17180d}
html[data-theme=light] .card,html[data-theme=light] .box,html[data-theme=light] .panel,html[data-theme=light] .auth,html[data-theme=light] .step,html[data-theme=light] .contact a{background:#fff;border-color:var(--b);box-shadow:0 1px 2px #1c17180d,0 6px 18px #1c17180a}
html[data-theme=light] .card:hover,html[data-theme=light] a.box:hover,html[data-theme=light] .box.h:hover{border-color:var(--r);box-shadow:0 10px 28px #c4121f1f}
html[data-theme=light] .card.third{border-color:#cdbfa8;border-style:dashed;background:#fffdf8}
html[data-theme=light] .card p{color:#3d3437}
html[data-theme=light] .notice{background:#fff;color:#2e2528;box-shadow:0 1px 2px #1c17180d}
html[data-theme=light] code{background:#f3efed;border-color:#ddd5d2;color:#8f0f19}
html[data-theme=light] .band{background:linear-gradient(90deg,#f7e1e4,#fbf6f6);border-color:var(--b)}
html[data-theme=light] .hero:before{background:repeating-linear-gradient(0deg,transparent 0 3px,#c4121f08 3px 4px)}
html[data-theme=light] .term{box-shadow:0 18px 44px #1c17182e}
html[data-theme=light] pre.logo{text-shadow:none;color:var(--r)}
html[data-theme=light] .btn:hover,html[data-theme=light] .btn.f{color:#fff}
html[data-theme=light] .auth input[type=email],html[data-theme=light] .auth input[type=password],html[data-theme=light] .auth input[type=text],html[data-theme=light] .auth textarea,html[data-theme=light] input,html[data-theme=light] select,html[data-theme=light] textarea{background:#fff;border-color:#c9c1be;color:var(--t)}
html[data-theme=light] input::placeholder,html[data-theme=light] textarea::placeholder{color:#8a7f82}
html[data-theme=light] .tabs{background:var(--p2)}
html[data-theme=light] .chatbox{background:#fbfaf9}
html[data-theme=light] .tag.third{border-color:#b98a00;color:#7a5600}
html[data-theme=light] .credit{background:#fbf3df;color:#4d4144}
html[data-theme=light] .msg.ok,html[data-theme=light] .hint.good{color:#0b7a45}
html[data-theme=light] .msg.err,html[data-theme=light] .hint.bad{color:#b0101c}
html[data-theme=light] .scrim{background:#1c17188c}
html[data-theme=light] .side{box-shadow:-8px 0 30px #1c17181a}
html[data-theme=light] .side a:hover,html[data-theme=light] .side button:hover{background:var(--p2)}
html[data-theme=light] .bdg.sub{background:#fbf0cf;color:#7a5600;border-color:#b98a00}
html[data-theme=light] nav .uchip.owner{color:#a80f1a}
html[data-theme=light] nav .uchip.admin{color:#1550b8}
html[data-theme=light] .uchip{color:#6b4a00!important;border-color:#b98a00!important;background:#fffdf5}
html[data-theme=light] .uchip:hover{background:#fbf0cf!important}
html[data-theme=light] .bell{color:#6b4a00!important;border-color:#b98a00!important}
html[data-theme=light] .bellpanel{background:#fff!important;color:var(--t)!important;border-color:#b98a00!important;box-shadow:0 12px 36px #1c17182e!important}
html[data-theme=light] .bellpanel .nrow{border-bottom-color:var(--b)!important}
html[data-theme=light] .rxpop{background:#fff!important;box-shadow:0 8px 28px #1c17182e!important}
html[data-theme=light] .rxq button:hover,html[data-theme=light] .rxg button:hover{background:#1c171812!important}
html[data-theme=light] .rxp.mine{border-color:#b98a00;background:#fbf0cf}
html.in[data-theme=light] body{background:radial-gradient(1100px 560px at 15% -10%,#f8ecc9 0,transparent 55%),radial-gradient(900px 500px at 90% 0,#f7e1e4 0,transparent 60%),#f6f4f2!important}
html.in[data-theme=light] nav{border-bottom:1px solid #b98a0099;box-shadow:0 2px 14px #b98a001f}
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

