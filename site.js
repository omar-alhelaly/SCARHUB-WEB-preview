(function(){var m=document.querySelector('meta[name=viewport]');if(m&&!/viewport-fit/.test(m.content))m.content+=',viewport-fit=cover'})();

;(function(){var m=location.pathname.match(/tool-(scar[a-z]+)\.html$/);if(m)location.replace('tool.html?t='+m[1])})();

(function(){
var $=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var L=localStorage.l||'en';
function setLang(l){L=l;localStorage.l=l;var d=document.documentElement;d.lang=l;d.dir=l=='ar'?'rtl':'ltr';
 var iso=function(t){return l=='ar'?String(t).replace(/[A-Za-z0-9]+(?:[ .\-\/+_][A-Za-z0-9]+)*/g,'\u2066$&\u2069'):t};window.scarIso=function(t){return String(t).replace(/[A-Za-z0-9]+(?:[ .\-\/+_][A-Za-z0-9]+)*/g,'\u2066$&\u2069')};
 $('[data-en]').forEach(function(e){e.textContent=iso(e.dataset[l])});
 $('[data-ph-en]').forEach(function(e){e.placeholder=l=='ar'?e.dataset.phAr:e.dataset.phEn});
 var b=document.getElementById('lang');if(b)b.textContent=l=='ar'?'English':'\u0627\u0644\u0639\u0631\u0628\u064a\u0629';
 var ti=document.documentElement.dataset['t'+l];if(ti)document.title=ti}
window.addEventListener('DOMContentLoaded',function(){
 $('img[data-k]').forEach(function(i){i.src=(window.SCAR_IMG||{})[i.dataset.k]||''});
 var b=document.getElementById('lang');if(b)b.onclick=function(){setLang(L=='en'?'ar':'en')};
 try{var ll=document.getElementById('loginlink');if(ll){for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.+-auth-token$/.test(k)&&/access_token/.test(localStorage.getItem(k)||'')){ll.href='account.html';ll.dataset.en='Account';ll.dataset.ar='\u062d\u0633\u0627\u0628\u064a';break}}}}catch(e){}
 try{var pn=location.pathname.split('/').pop()||'index.html',nv=document.getElementById('nav'),an=document.getElementById('loginlink')||document.getElementById('lang');
  if(nv&&an&&pn!=='index.html'&&!document.getElementById('backbtn')){
   var bb=document.createElement('button');bb.type='button';bb.id='backbtn';bb.className='lang';bb.dataset.en='Back';bb.dataset.ar='\u0631\u062c\u0648\u0639';bb.textContent=bb.dataset.en;
   bb.onclick=function(){var same=false;try{same=document.referrer&&new URL(document.referrer).host===location.host}catch(e){}if(same&&history.length>1)history.back();else location.href='index.html'};
   an.parentNode.insertBefore(bb,an)}}catch(e){}

 try{var lk=document.querySelector('#nav .links'),upd=lk&&lk.querySelector('a[href="updates.html"]');
  if(lk&&upd&&!lk.querySelector('a[href="research.html"]')){var pg=location.pathname.split('/').pop();
   [['research.html','Research','\u0628\u062d\u0648\u062b'],['incidents.html','Incidents','\u0642\u0635\u0635 \u0627\u0644\u062d\u0648\u0627\u062f\u062b'],['challenges.html','Challenges','\u0627\u0644\u062a\u062d\u062f\u064a\u0627\u062a']].reverse().forEach(function(x){var na=document.createElement('a');na.href=x[0];na.dataset.en=x[1];na.dataset.ar=x[2];na.textContent=x[1];if(pg===x[0])na.className='on';upd.parentNode.insertBefore(na,upd.nextSibling)})}}catch(e){}
 try{var nv2=document.getElementById('nav'),an2=document.getElementById('loginlink')||document.getElementById('lang');
  if(nv2&&an2&&!document.getElementById('commlink')){var cl=document.createElement('a');cl.id='commlink';cl.href='community.html';cl.className='lang'+(location.pathname.split('/').pop()==='community.html'?' on':'');cl.dataset.en='Community';cl.dataset.ar='\u0627\u0644\u0645\u062c\u062a\u0645\u0639';cl.textContent=cl.dataset.en;cl.style.cssText='text-decoration:none;display:inline-flex;align-items:center';an2.parentNode.insertBefore(cl,an2)}}catch(e){}
 try{var lkx=document.querySelector('#nav .links');if(lkx&&!lkx.querySelector('.mx')){[['theme','Dark / light mode','\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u062f\u0627\u0643\u0646 / \u0627\u0644\u0641\u0627\u062a\u062d'],['lang','\u0627\u0644\u0639\u0631\u0628\u064a\u0629','English']].forEach(function(x){var bx=document.createElement('button');bx.type='button';bx.className='mx';bx.dataset.en=x[1];bx.dataset.ar=x[2];bx.textContent=x[1];bx.onclick=function(ev){ev.stopPropagation();var o=document.getElementById(x[0]);if(o)o.click()};lkx.appendChild(bx)})}}catch(e){}

 /* site structure: one source for the main menu, the footer and the "keep exploring" strip */
 try{(function(){
  var NAVD={learn:[["Challenges (rooms)", "\u0627\u0644\u062a\u062d\u062f\u064a\u0627\u062a (\u0627\u0644\u063a\u0631\u0641)", "challenges.html#/"], ["Learning paths", "\u0645\u0633\u0627\u0631\u0627\u062a \u0627\u0644\u062a\u0639\u0644\u0645", "challenges.html#/paths"], ["Career roadmaps", "\u062e\u0631\u0627\u0626\u0637 \u0627\u0644\u0645\u0647\u0646", "challenges.html#/roadmap"], ["Data Analysis Lab", "\u0645\u0639\u0645\u0644 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a", "data-lab.html"], ["AI Upskilling", "\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a", "challenges.html#/ai"], ["Live classes", "\u062d\u0635\u0635 \u0645\u0628\u0627\u0634\u0631\u0629", "challenges.html#/live"], ["Leaderboard", "\u0627\u0644\u0645\u062a\u0635\u062f\u0631\u064a\u0646", "challenges.html#/board"], ["Guides", "\u0627\u0644\u0623\u062f\u0644\u0629", "guides.html"], ["Glossary", "\u0627\u0644\u0645\u0635\u0637\u0644\u062d\u0627\u062a", "glossary.html"], ["Docs", "\u0627\u0644\u062a\u0648\u062b\u064a\u0642", "docs.html"]],explore:[["Research", "\u0628\u062d\u0648\u062b", "research.html"], ["Incidents", "\u0642\u0635\u0635 \u0627\u0644\u062d\u0648\u0627\u062f\u062b", "incidents.html"], ["Recent threats", "\u062a\u0647\u062f\u064a\u062f\u0627\u062a \u062d\u062f\u064a\u062b\u0629", "blog.html"], ["Updates", "\u0627\u0644\u062a\u062d\u062f\u064a\u062b\u0627\u062a", "updates.html"]],company:[["Solutions", "\u0627\u0644\u062d\u0644\u0648\u0644", "solutions.html"], ["About", "\u0645\u0646 \u0646\u062d\u0646", "about.html"], ["Our team", "\u0627\u0644\u0641\u0631\u064a\u0642", "team.html"], ["FAQ", "\u0627\u0644\u0623\u0633\u0626\u0644\u0629", "faq.html"], ["Security", "\u0627\u0644\u0623\u0645\u0627\u0646", "security.html"], ["Contact", "\u062a\u0648\u0627\u0635\u0644", "contact.html"]]};
  var GT={learn:['Learn','\u062a\u0639\u0644\u0651\u0645'],explore:['Explore','\u0627\u0643\u062a\u0634\u0641'],company:['Company','\u0627\u0644\u0634\u0631\u0643\u0629']};
  var pn=location.pathname.split('/').pop()||'index.html',hs=location.hash||'#/';
  function fileOf(h){return h.split('#')[0]}
  function isOn(h){var f=fileOf(h);if(f!==pn)return false;var i=h.indexOf('#');if(i<0)return true;if(pn!=='challenges.html')return true;var a=h.slice(i);return a==='#/'?(hs==='#/'||hs===''||/^#\/(room|folder|path)\//.test(hs)&&a==='#/'&&false):hs.indexOf(a)===0}
  function mk(x,cls){var a=document.createElement('a');a.href=x[2];a.dataset.en=x[0];a.dataset.ar=x[1];a.textContent=x[0];if(cls)a.className=cls;return a}
  var lk=document.querySelector('#nav .links');
  if(lk&&!lk.querySelector('.dd')){
   var keep=[].slice.call(lk.querySelectorAll('.mx'));lk.innerHTML='';
   var home=mk(['Home','\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629','index.html']);if(pn==='index.html')home.className='on';lk.appendChild(home);
   var tl=mk(['Tools','\u0627\u0644\u0623\u062f\u0648\u0627\u062a','tools.html']);if(pn==='tools.html'||pn==='tool.html')tl.className='on';lk.appendChild(tl);
   ['learn','explore','company'].forEach(function(k){
    var dd=document.createElement('div');dd.className='dd';var bt=document.createElement('button');bt.type='button';bt.className='ddb';bt.setAttribute('aria-haspopup','true');bt.setAttribute('aria-expanded','false');bt.dataset.en=GT[k][0];bt.dataset.ar=GT[k][1];bt.textContent=GT[k][0];
    var mn=document.createElement('div');mn.className='ddm';var any=false;
    NAVD[k].forEach(function(x){var on=isOn(x[2]);if(on)any=true;mn.appendChild(mk(x,on?'on':''))});
    if(any||(k==='learn'&&/^(glossary|guides|docs|guide-.*|data-lab)\.html$/.test(pn))||(k==='explore'&&/^(research-read|incident)\.html$/.test(pn))||(k==='company'&&/^(member)\.html$/.test(pn))){bt.classList.add('on');dd.classList.add('cur')}
    bt.onclick=function(ev){ev.stopPropagation();var o=dd.classList.contains('open');[].forEach.call(document.querySelectorAll('#nav .dd.open'),function(d){d.classList.remove('open');d.firstChild.setAttribute('aria-expanded','false')});if(!o){dd.classList.add('open');bt.setAttribute('aria-expanded','true')}};
    dd.appendChild(bt);dd.appendChild(mn);lk.appendChild(dd)});
   keep.forEach(function(m){lk.appendChild(m)});
   document.addEventListener('click',function(){[].forEach.call(document.querySelectorAll('#nav .dd.open'),function(d){d.classList.remove('open');d.firstChild.setAttribute('aria-expanded','false')})});
   document.addEventListener('keydown',function(e){if(e.key==='Escape')[].forEach.call(document.querySelectorAll('#nav .dd.open'),function(d){d.classList.remove('open');d.firstChild.setAttribute('aria-expanded','false')})});
  }
  var ft=document.querySelector('footer.site .ft');
  if(ft&&ft.children.length>=4&&!ft.querySelector('[data-sm]')){
   function col(h,lists){var d=document.createElement('div');d.dataset.sm='1';lists.forEach(function(L){if(L.h){var h4=document.createElement('h4');h4.dataset.en=L.h[0];h4.dataset.ar=L.h[1];h4.textContent=L.h[0];if(d.children.length)h4.style.marginTop='16px';d.appendChild(h4)}L.i.forEach(function(x){d.appendChild(mk(x))})});return d}
   var c3=col(0,[{h:GT.learn,i:NAVD.learn}]),c4=col(0,[{h:GT.explore,i:NAVD.explore},{h:GT.company,i:NAVD.company.concat([['Site map','\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0645\u0648\u0642\u0639','sitemap.html']])}]);
   var gh=document.createElement('a');gh.href='https://github.com/omar-alhelaly';gh.target='_blank';gh.rel='noopener';gh.innerHTML='GitHub &#8599;';c4.appendChild(gh);
   ft.replaceChild(c3,ft.children[2]);ft.replaceChild(c4,ft.children[3]);
  }
  /* keep exploring: related pages at the bottom of content pages */
  var REL={'data-lab.html':['challenges.html#/roadmap','glossary.html','guides.html','challenges.html#/'],'glossary.html':['challenges.html#/roadmap','guides.html','docs.html','data-lab.html'],'guides.html':['challenges.html#/','glossary.html','tools.html','docs.html'],'docs.html':['guides.html','glossary.html','tools.html','challenges.html#/'],'tools.html':['guides.html','docs.html','challenges.html#/','glossary.html'],'research.html':['incidents.html','blog.html','updates.html','glossary.html'],'incidents.html':['research.html','blog.html','guides.html','glossary.html'],'blog.html':['incidents.html','research.html','updates.html','glossary.html'],'updates.html':['research.html','blog.html','solutions.html','tools.html'],'solutions.html':['tools.html','about.html','contact.html','faq.html'],'about.html':['team.html','solutions.html','contact.html','faq.html'],'team.html':['about.html','contact.html','solutions.html','faq.html'],'faq.html':['docs.html','security.html','contact.html','guides.html'],'security.html':['faq.html','docs.html','contact.html','about.html'],'contact.html':['faq.html','about.html','team.html','solutions.html'],'community.html':['challenges.html#/','guides.html','glossary.html','updates.html']};
  var rl=REL[pn],all=[].concat(NAVD.learn,NAVD.explore,NAVD.company,[['Tools','\u0627\u0644\u0623\u062f\u0648\u0627\u062a','tools.html'],['Community','\u0627\u0644\u0645\u062c\u062a\u0645\u0639','community.html']]);
  var fe=document.querySelector('footer.site');
  if(rl&&fe&&!document.getElementById('rel')){var sec=document.createElement('section');sec.id='rel';sec.className='relbox';sec.setAttribute('aria-label','Keep exploring');var h3=document.createElement('h3');h3.dataset.en='Keep exploring';h3.dataset.ar='\u0643\u0645\u0651\u0644 \u0627\u0633\u062a\u0643\u0634\u0627\u0641';h3.textContent='Keep exploring';sec.appendChild(h3);var row=document.createElement('div');row.className='relrow';
   rl.forEach(function(h){var m=all.filter(function(x){return x[2]===h})[0];if(m)row.appendChild(mk(m,'relchip'))});sec.appendChild(row);fe.parentNode.insertBefore(sec,fe)}
 })()}catch(e){}
 setLang(L);
 var nav=document.querySelector('nav'),bg=document.getElementById('burger');
 if(bg)bg.onclick=function(){nav.classList.toggle('open')};
 $('nav .links a').forEach(function(a){a.addEventListener('click',function(){nav.classList.remove('open')})});
 // tools page: search + class chips
 var q=document.getElementById('q'),st={c:'all',q:''};
 function filt(){var n=0;$('.card').forEach(function(c){var th=c.dataset.o=='third';var ok=(st.c=='all'||(st.c=='third'?th:st.c=='zenoth'?!th:c.dataset.c==st.c))&&c.dataset.name.indexOf(st.q)>-1;c.style.display=ok?'':'none';if(ok)n++});
  $('.cls').forEach(function(s){var vis=$('.card',s).some(function(c){return c.style.display!='none'});s.style.display=vis?'':'none'});
  var e=document.getElementById('empty');if(e)e.style.display=n?'none':'block'}
 if(q)q.oninput=function(e){st.q=e.target.value.toLowerCase().trim();filt()};
 $('.chip').forEach(function(c){c.onclick=function(){st.c=c.dataset.c;$('.chip').forEach(function(x){x.classList.toggle('on',x===c)});filt()}});
 if(location.hash.indexOf('#c-')==0){var id=location.hash.slice(3);var ch=$('.chip').filter(function(x){return x.dataset.c==id})[0];if(ch)ch.click()}
 // counters
 $('[data-count]').forEach(function(e){var to=+e.dataset.count,s=0,step=Math.max(1,Math.ceil(to/25));var iv=setInterval(function(){s+=step;if(s>=to){s=to;clearInterval(iv)}e.textContent=s},35)});
 // reveal
 if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.08});$('.rv').forEach(function(e){io.observe(e)})}else $('.rv').forEach(function(e){e.classList.add('in')});setTimeout(function(){$('.rv').forEach(function(e){e.classList.add('in')})},1500);
 // hero terminal
 var tp=document.getElementById('heroterm');
 if(tp){var seq=[['$ ','scarlan demo'],['out','<em>[+]</em> 12 hosts, 34 open ports (demo data)'],['$ ','scarioc incident.log'],['out','<em>[+]</em> 6 IPs, 3 domains, 2 hashes extracted'],['$ ','scarbase check -b base.json'],['out','CHANGED  /etc/ssh/sshd_config'],['$ ','scarcvss CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'],['out','<b>9.8 Critical</b>']];
  var i=0,h='';(function step(){if(i>=seq.length){setTimeout(function(){i=0;h='';step()},2500);return}var s=seq[i++];
   if(s[0]=='out'){h+=s[1]+'\n';tp.innerHTML=h;setTimeout(step,500)}else{var c=0;(function ty(){tp.innerHTML=h+'<b>'+s[0]+'</b>'+s[1].slice(0,c)+'_';if(c++<s[1].length)setTimeout(ty,28);else{h+='<b>'+s[0]+'</b>'+s[1]+'\n';setTimeout(step,350)}})()}})()}
});
})();
;(function(){if(/tool-scar[a-z]+\.html$/.test(location.pathname)){var s=document.createElement('script');s.src='tool-guide.js';document.head.appendChild(s)}})();

/* signed-in visitors on pages without the account script: load it so the header shows their avatar */
window.addEventListener('DOMContentLoaded',function(){try{var k=Object.keys(localStorage).some(function(x){return /^sb-.*-auth-token$/.test(x)});if(!k||document.querySelector('script[src*="app.js"]'))return;if(!document.querySelector('link[href*="app.css"]')){var l=document.createElement('link');l.rel='stylesheet';l.href='app.css';document.head.appendChild(l)}['vendor-supabase.js','config.js','app.js'].forEach(function(f){var e=document.createElement('script');e.src=f;e.async=false;document.head.appendChild(e)})}catch(e){}});

/* auto-update (every page): after a deploy, refresh stale cached files once; every 3 minutes show a dismissible toast at the bottom */
(function(){
var NAMES=['app.js','app.css','site.css','site.js','fx.js','config.js'];
function used(){var o=[];[].slice.call(document.querySelectorAll('script[src],link[rel=stylesheet][href]')).forEach(function(e){var u=e.getAttribute('src')||e.getAttribute('href')||'';if(/^(https?:)?\/\//.test(u))return;var n=u.split('?')[0].split('/').pop();if(NAMES.indexOf(n)>=0&&o.indexOf(n)<0)o.push(n)});return o}
async function stale(F){var bad=[];await Promise.all(F.map(async function(f){try{var a=await fetch(f,{cache:'force-cache'}),b=await fetch(f,{method:'HEAD',cache:'no-store'});var la=a.headers.get('etag')||a.headers.get('last-modified'),lb=b.headers.get('etag')||b.headers.get('last-modified');if(b.ok&&la&&lb&&la!==lb)bad.push(f)}catch(e){}}));return bad}
async function refresh(F){await Promise.all(F.map(function(f){return fetch(f,{cache:'reload'}).catch(function(){})}))}
var dismissed=false;
function toast(F){
 if(dismissed||document.getElementById('newver'))return;
 var ar=(localStorage.l||'en')=='ar';
 var go=function(){refresh(F).then(function(){location.reload()})};
 var b=document.createElement('div');b.id='newver';b.setAttribute('role','status');b.setAttribute('aria-live','polite');b.tabIndex=0;
 b.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:10px;width:max-content;max-width:calc(100vw - 24px);box-sizing:border-box;background:#14100a;color:#f0d98a;border:1px solid #c9a227;border-inline-start:4px solid #d22;padding:11px 14px;border-radius:14px;font:600 14px/1.4 sans-serif;cursor:pointer;box-shadow:0 10px 36px #000c;animation:scarup .35s ease-out';
 if(ar)b.dir='rtl';
 var i=document.createElement('span');i.textContent='\u21bb';i.style.cssText='color:#d22;font-size:18px;flex:none';
 var s=document.createElement('span');s.textContent=ar?'\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u062a\u062d\u062f\u0651\u062b\u060c \u062f\u0648\u0633 \u0647\u0646\u0627 \u0639\u0634\u0627\u0646 \u062a\u062d\u062f\u0651\u062b\u0647':'The site was updated, tap here to refresh';
 var x=document.createElement('button');x.type='button';x.textContent='\u2715';x.setAttribute('aria-label',ar?'\u0625\u063a\u0644\u0627\u0642':'Dismiss');x.style.cssText='background:none;border:0;color:#9a8a5a;font-size:16px;cursor:pointer;padding:0 4px;flex:none';
 if(!document.getElementById('scarup')){var st=document.createElement('style');st.id='scarup';st.textContent='@keyframes scarup{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}';document.head.appendChild(st)}
 b.appendChild(i);b.appendChild(s);b.appendChild(x);
 b.addEventListener('click',go);b.addEventListener('keydown',function(e){if(e.key==='Enter')go()});
 x.addEventListener('click',function(e){e.stopPropagation();dismissed=true;b.remove()});
 document.body.appendChild(b)}
window.addEventListener('load',async function(){try{
 var F=used();if(!F.length)return;
 var bad=await stale(F),k='scar_autoreload',last=0;
 try{last=parseInt(sessionStorage.getItem(k)||'0',10)}catch(e){}
 if(bad.length&&Date.now()-last>120000){try{sessionStorage.setItem(k,String(Date.now()))}catch(e){}await refresh(bad);location.reload();return}
 window.__scarToast=function(){toast(F)};
 setInterval(async function(){if(document.hidden)return;var b2=await stale(F);if(b2.length)toast(F)},180000)}catch(e){}});
})();
