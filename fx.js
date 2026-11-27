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
 var NOPV=/^(incidents|research|incident)\.html$/.test(location.pathname.split('/').pop());
 (NOPV?[]:document.querySelectorAll('.card')).forEach(function(c){hover(c,function(){
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


/* ===== v2.5 airspace layer: radar scene, section index, labels, intro, marquee, wordmark ===== */
;(function(){
var D=document,W=window,RM=W.matchMedia&&W.matchMedia('(prefers-reduced-motion:reduce)').matches;
var app=function(){var p=D.body&&D.body.dataset.page;return !!p&&/^(admin|account|community|profile)$/.test(p)};
var css='\
#radar{position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;opacity:.9}\
html[data-theme=light] #radar{opacity:.55}\
.sx{background:none!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;position:fixed;inset-inline-end:14px;top:50%;transform:translateY(-50%);z-index:30;display:none;flex-direction:column;gap:2px;font:11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.12em}\
@media (min-width:1280px) and (hover:hover){.sx{display:flex}}\
.sx a{font-size:15px;display:flex;align-items:center;justify-content:flex-end;gap:8px;color:var(--m);border:0;padding:6px 2px;min-height:0!important;text-decoration:none}\
.sx a i{display:block;width:10px;height:1px;background:var(--b);transition:width .35s cubic-bezier(.215,.61,.355,1),background .35s}\
.sx a b{font-weight:400;opacity:.8}\
.sx a em{font-style:normal;max-width:0;overflow:hidden;white-space:nowrap;opacity:0;transition:max-width .35s,opacity .35s;color:var(--t)}\
.sx a:hover em,.sx a.on em{max-width:180px;opacity:1}\
.sx a.on{color:var(--t)}.sx a.on i{width:26px;background:var(--r)}\
.sl{display:flex;gap:10px;align-items:center;font:12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--m);margin:0 0 14px}\
.sl b{color:var(--r);font-weight:500}\
.sl:after{content:"";flex:0 1 80px;height:1px;background:var(--b)}\
#intro{position:fixed;inset:0;z-index:99999;background:#050405;color:#f2eeee;display:flex;flex-direction:column;justify-content:space-between;padding:max(22px,env(safe-area-inset-top)) 5vw max(22px,env(safe-area-inset-bottom));font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;transition:opacity .6s,visibility .6s}\
#intro:before{content:"";position:absolute;inset:0;background:linear-gradient(#ffffff0a 1px,transparent 1px) 0 0/100% 56px,linear-gradient(90deg,#ffffff0a 1px,transparent 1px) 0 0/56px 100%;pointer-events:none}\
#intro.out{opacity:0;visibility:hidden}\
#intro .t{display:flex;justify-content:space-between;gap:12px;position:relative;color:#a89fa0}\
#intro .skip{all:unset;cursor:pointer;position:relative;color:#fff;border:1px solid #ffffff55;padding:10px 18px;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;gap:10px}\
#intro .skip:hover{background:var(--r);border-color:var(--r)}\
#intro .skip kbd{font:inherit;opacity:.6;border:1px solid #ffffff44;padding:1px 6px}\
#intro .m{position:relative;text-align:center}\
#intro .big{font:800 clamp(64px,19vw,260px)/.9 var(--fd-display,system-ui),system-ui,sans-serif;letter-spacing:.08em;text-transform:none;margin:0 0 22px}\
#intro .big span{display:inline-block;opacity:0;transform:translateY(40%);animation:ir .7s cubic-bezier(.215,.61,.355,1) forwards}\
#intro .big span:nth-child(2){animation-delay:.12s}#intro .big span:nth-child(3){animation-delay:.24s}#intro .big span:nth-child(4){animation-delay:.36s}\
#intro .big span:nth-child(4){color:var(--r)}\
@keyframes ir{to{opacity:1;transform:none}}\
#intro ul{list-style:none;margin:0 auto;padding:0;display:inline-flex;flex-direction:column;gap:6px;text-align:start;color:#a89fa0}\
#intro li{opacity:0;transform:translateX(-8px);transition:opacity .35s,transform .35s}\
#intro li.on{opacity:1;transform:none;color:#f2eeee}\
#intro li:before{content:"\\25B8  ";color:var(--r)}\
#intro .bar{position:relative;height:2px;background:#ffffff1f;overflow:hidden}\
#intro .bar i{position:absolute;inset:0;background:var(--r);transform-origin:0 50%;transform:scaleX(0);transition:transform 2.6s cubic-bezier(.455,.03,.515,.955)}\
#intro .bar.go i{transform:scaleX(1)}\
.mq{border-block:1px solid var(--b);overflow:hidden;white-space:nowrap;padding:16px 0;margin:0;background:transparent}\
.mq div{display:inline-flex;width:max-content;will-change:transform;gap:34px;padding-inline-end:34px;animation:mq var(--mqd,38s) linear infinite!important;font:800 clamp(20px,3.4vw,40px)/1 var(--fd-display,system-ui),system-ui,sans-serif;text-transform:uppercase;letter-spacing:.04em;color:var(--t)}\
.mq div span{flex:none;white-space:nowrap;display:inline-flex;align-items:center;gap:34px}\
.mq div span:after{content:"\\25B8";color:var(--r);font-size:.6em}\
@keyframes mq{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}\
.mq:hover div{animation-play-state:paused}\
[dir=rtl] .mq div{animation-direction:reverse}\
.wm{max-width:1360px;margin:0 auto;padding:10px 5vw 0;overflow:hidden;line-height:.8;user-select:none;pointer-events:none}\
.wm b{display:block;text-align:center;font:800 clamp(90px,26vw,420px)/.82 var(--fd-display,system-ui),system-ui,sans-serif;letter-spacing:.06em;color:transparent;-webkit-text-stroke:1.5px var(--b);margin-bottom:-.12em}\
@media (prefers-reduced-motion:reduce){.mq div{animation:none}#intro .big span{animation:none;opacity:1;transform:none}}';
var st=D.createElement('style');st.textContent=css;D.head.appendChild(st);

/* radar scene */
function radar(){if(D.getElementById('radar'))return;var c=D.createElement('canvas');c.id='radar';c.setAttribute('aria-hidden','true');D.body.insertBefore(c,D.body.firstChild);
 var x=c.getContext('2d');if(!x)return;var w,h,dpr=Math.min(W.devicePixelRatio||1,1.5),pts=[],t0=0,on=true,col='196,18,31';
 function rgb(){var v=getComputedStyle(D.documentElement).getPropertyValue('--r').trim();var m=v.match(/^#([0-9a-f]{6})$/i);if(m){var n=parseInt(m[1],16);col=(n>>16)+','+((n>>8)&255)+','+(n&255)}}
 function size(){w=c.width=Math.round(innerWidth*dpr);h=c.height=Math.round(innerHeight*dpr);pts=[];var n=Math.round(Math.min(70,innerWidth/18));for(var i=0;i<n;i++)pts.push({x:Math.random(),y:Math.random(),v:.00002+Math.random()*.00005,s:1+Math.random()*1.6,p:Math.random()*6})}
 function frame(t){if(!on)return;var cx=w*.68,cy=h*.46,R=Math.min(w,h)*.5,a=(t||0)/9000;x.clearRect(0,0,w,h);
  x.lineWidth=dpr;for(var i=1;i<=4;i++){x.strokeStyle='rgba('+col+','+(.16-i*.025)+')';x.beginPath();x.arc(cx,cy,R*i/3.2,0,6.283);x.stroke()}
  x.strokeStyle='rgba('+col+',.1)';x.beginPath();x.moveTo(cx-R*1.4,cy);x.lineTo(cx+R*1.4,cy);x.moveTo(cx,cy-R*1.4);x.lineTo(cx,cy+R*1.4);x.stroke();
  var g=x.createConicGradient?x.createConicGradient(a,cx,cy):null;if(g){g.addColorStop(0,'rgba('+col+',.22)');g.addColorStop(.12,'rgba('+col+',0)');g.addColorStop(1,'rgba('+col+',0)');x.fillStyle=g;x.beginPath();x.arc(cx,cy,R*1.25,0,6.283);x.fill()}
  for(var j=0;j<pts.length;j++){var p=pts[j];p.y=(p.y-p.v*16+1)%1;var al=.25+.25*Math.sin(t/900+p.p);x.fillStyle='rgba('+col+','+al+')';x.fillRect(p.x*w,p.y*h,p.s*dpr,p.s*dpr)}
  if(!RM)requestAnimationFrame(frame)}
 rgb();size();W.addEventListener('resize',function(){size();if(RM)frame(0)});
 D.addEventListener('visibilitychange',function(){on=!D.hidden;if(on&&!RM)requestAnimationFrame(frame)});
 new MutationObserver(function(){rgb();if(RM)frame(0)}).observe(D.documentElement,{attributes:true,attributeFilter:['data-theme']});
 frame(0);if(!RM)requestAnimationFrame(frame)}

/* section labels + scroll index */
function sections(){if(app())return;var main=D.getElementById('main')||D.querySelector('main');if(!main)return;
 var ss=[].slice.call(main.children).filter(function(e){return e.tagName=='SECTION'&&e.querySelector('h2')});if(ss.length<3)return;
 var L=localStorage.l||'en',T=ss.length,idx=D.createElement('div');idx.className='sx';idx.setAttribute('role','navigation');idx.setAttribute('aria-label','Sections');
 ss.forEach(function(s,i){var h2=s.querySelector('h2'),n=('0'+(i+1)).slice(-2),tt=('0'+T).slice(-2);if(!s.id)s.id='s'+n;
  var en=h2.dataset.en||h2.textContent,ar=h2.dataset.ar||en,lab=D.createElement('div');lab.className='sl';
  lab.dataset.en=n+' / '+tt+'  \u00B7  '+en;lab.dataset.ar=n+' / '+tt+'  \u00B7  '+ar;lab.textContent=lab.dataset[L]||lab.dataset.en;
  h2.parentNode.insertBefore(lab,h2);
  var a=D.createElement('a');a.href='#'+s.id;a.innerHTML='<em data-en="'+en.replace(/"/g,'&quot;')+'" data-ar="'+ar.replace(/"/g,'&quot;')+'"></em><b>'+n+'</b><i></i>';a.firstChild.textContent=(L=='ar'?ar:en);
  a.onclick=function(e){e.preventDefault();s.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})};idx.appendChild(a)});
 D.body.appendChild(idx);
 if('IntersectionObserver' in W){var links=[].slice.call(idx.children),io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var i=ss.indexOf(e.target);links.forEach(function(l,k){l.classList.toggle('on',k===i)})}})},{rootMargin:'-40% 0px -55% 0px'});ss.forEach(function(s){io.observe(s)})}}

/* marquee + footer wordmark (home marquee only) */
function marquee(){var hero=D.querySelector('main > header.hero');if(!hero||D.querySelector('.mq'))return;var L=localStorage.l||'en';
 var items=[['Offline first','أوفلاين أولاً'],['Authorized use only','للاستخدام المصرّح بيه بس'],['No API keys','من غير مفاتيح API'],['Stdlib first','المكتبة القياسية الأول'],['Simulated labs','معامل محاكاة']];
 var mk=function(){return items.map(function(i){return '<span data-en="'+i[0]+'" data-ar="'+i[1]+'">'+(L=='ar'?i[1]:i[0])+'</span>'}).join('')};
 var m=D.createElement('div');m.className='mq';m.setAttribute('aria-hidden','true');m.innerHTML='<div>'+mk()+mk()+'</div>';hero.parentNode.insertBefore(m,hero.nextSibling);
 var inner=m.firstChild;function fit(){var one=mk(),n=2;inner.innerHTML=one+one;var half=inner.scrollWidth/2,need=Math.max(innerWidth,screen.width||0)*1.1;if(!half)return;var k=Math.max(1,Math.ceil(need/half));inner.innerHTML=new Array(2*k+1).join(one);inner.style.setProperty('--mqd',Math.round(half*k/70)+'s')}
 fit();W.addEventListener('resize',function(){clearTimeout(fit.t);fit.t=setTimeout(fit,250)});if(D.fonts&&D.fonts.ready)D.fonts.ready.then(fit)}
function wordmark(){var f=D.querySelector('footer.site');if(!f||D.querySelector('.wm'))return;var w=D.createElement('div');w.className='wm';w.setAttribute('aria-hidden','true');w.innerHTML='<b>SCAR</b>';f.parentNode.insertBefore(w,f.nextSibling);f.parentNode.insertBefore(f,w)}

/* intro (home, once per session) */
function intro(){var p=location.pathname.split('/').pop();if(p&&p!=='index.html')return;if(RM)return;try{if(sessionStorage.scarIntro)return;sessionStorage.scarIntro='1'}catch(e){}
 var L=localStorage.l||'en',tx=function(a,b){return L=='ar'?b:a};
 var o=D.createElement('div');o.id='intro';o.setAttribute('role','dialog');o.setAttribute('aria-label','Intro');
 o.innerHTML='<div class="t"><span>SCARHUB</span><button class="skip" type="button">'+tx('Skip intro','\u062a\u062e\u0637\u0649')+' <kbd>Esc</kbd></button></div><div class="m"><div class="big" dir="ltr"><span>S</span><span>C</span><span>A</span><span>R</span></div><ul><li>'+tx('Loading toolkit','\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0623\u062f\u0648\u0627\u062a')+'</li><li>'+tx('Offline first','\u0623\u0648\u0641\u0644\u0627\u064a\u0646 \u0623\u0648\u0644\u0627\u064b')+'</li><li>'+tx('Authorized use only','\u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0635\u0631\u0651\u062d \u0628\u064a\u0647 \u0641\u0642\u0637')+'</li><li>'+tx('Ready','\u062c\u0627\u0647\u0632')+'</li></ul></div><div class="bar"><i></i></div>';
 D.body.appendChild(o);D.documentElement.style.overflow='hidden';
 var done=false,lis=[].slice.call(o.querySelectorAll('li')),tm=[];
 function end(){if(done)return;done=true;tm.forEach(clearTimeout);o.classList.add('out');D.documentElement.style.overflow='';setTimeout(function(){o.remove()},700);D.removeEventListener('keydown',kd)}
 function kd(e){if(e.key==='Escape')end()}
 D.addEventListener('keydown',kd);o.querySelector('.skip').onclick=end;
 requestAnimationFrame(function(){o.querySelector('.bar').classList.add('go')});
 lis.forEach(function(l,i){tm.push(setTimeout(function(){l.classList.add('on')},500+i*620))});tm.push(setTimeout(end,3100))}

function go(){try{radar()}catch(e){}try{sections()}catch(e){}try{marquee()}catch(e){}try{wordmark()}catch(e){}try{intro()}catch(e){}}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',go);else go();
})();
