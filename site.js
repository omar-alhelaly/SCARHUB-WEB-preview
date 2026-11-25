
;(function(){var m=location.pathname.match(/tool-(scar[a-z]+)\.html$/);if(m)location.replace('tool.html?t='+m[1])})();

(function(){
var $=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var L=localStorage.l||'en';
function setLang(l){L=l;localStorage.l=l;var d=document.documentElement;d.lang=l;d.dir=l=='ar'?'rtl':'ltr';
 $('[data-en]').forEach(function(e){e.textContent=e.dataset[l]});
 $('[data-ph-en]').forEach(function(e){e.placeholder=l=='ar'?e.dataset.phAr:e.dataset.phEn});
 var b=document.getElementById('lang');if(b)b.textContent=l=='ar'?'English':'\u0627\u0644\u0639\u0631\u0628\u064a\u0629';
 var ti=document.documentElement.dataset['t'+l];if(ti)document.title=ti}
window.addEventListener('DOMContentLoaded',function(){
 $('img[data-k]').forEach(function(i){i.src=(window.SCAR_IMG||{})[i.dataset.k]||''});
 var b=document.getElementById('lang');if(b)b.onclick=function(){setLang(L=='en'?'ar':'en')};
 try{var ll=document.getElementById('loginlink');if(ll){for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.+-auth-token$/.test(k)&&/access_token/.test(localStorage.getItem(k)||'')){ll.href='account.html';ll.dataset.en='Account';ll.dataset.ar='\u062d\u0633\u0627\u0628\u064a';break}}}}catch(e){}
 try{var pn=location.pathname.split('/').pop()||'index.html',nv=document.getElementById('nav'),an=document.getElementById('loginlink')||document.getElementById('lang');
  if(nv&&an&&pn!=='index.html'&&!document.getElementById('backbtn')){
   var bb=document.createElement('button');bb.type='button';bb.id='backbtn';bb.className='lang';bb.dataset.en='\u2190 Back';bb.dataset.ar='\u0631\u062c\u0648\u0639 \u2192';bb.textContent=bb.dataset.en;
   bb.onclick=function(){var same=false;try{same=document.referrer&&new URL(document.referrer).host===location.host}catch(e){}if(same&&history.length>1)history.back();else location.href='index.html'};
   an.parentNode.insertBefore(bb,an)}}catch(e){}

 try{var lk=document.querySelector('#nav .links'),upd=lk&&lk.querySelector('a[href="updates.html"]');
  if(lk&&upd&&!lk.querySelector('a[href="research.html"]')){var pg=location.pathname.split('/').pop();
   [['research.html','Research','\u0628\u062d\u0648\u062b'],['incidents.html','Incidents','\u0642\u0635\u0635 \u0627\u0644\u062d\u0648\u0627\u062f\u062b']].reverse().forEach(function(x){var na=document.createElement('a');na.href=x[0];na.dataset.en=x[1];na.dataset.ar=x[2];na.textContent=x[1];if(pg===x[0])na.className='on';upd.parentNode.insertBefore(na,upd.nextSibling)})}}catch(e){}
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
