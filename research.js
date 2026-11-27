(function(){
var D=document,id=(new URLSearchParams(location.search).get('i')||''),I=(window.SCAR_RES||{})[id];
var ih=D.getElementById('ih'),ib=D.getElementById('ib');
function el(t,a,txt){var e=D.createElement(t);if(a)for(var k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;return e}
function bi(t,en,ar,a){var e=el(t,a,en);e.dataset.en=en;e.dataset.ar=ar;return e}
if(!I){ih.appendChild(bi('h1','Research not found','البحث مش موجود'));ib.appendChild(bi('p','Pick an item from the list.','اختار حاجة من القائمة.'));return}
var L=localStorage.l||'en',i=L=='ar'?1:0;
D.title=I.t[0]+' | SCARHUB';D.documentElement.dataset.ten=D.title;D.documentElement.dataset.tar=I.t[1]+' | SCARHUB';
var eb=el('span',{'class':'eyebrow'});eb.appendChild(el('span',null,I.tag+' \u00B7 '+I.year));ih.appendChild(eb);
ih.appendChild(bi('h1',I.t[0],I.t[1]));
ih.appendChild(bi('p',I.sum[0],I.sum[1]));
if(I.meta){var m=el('div',{'class':'box',style:'margin:18px 0;display:flex;gap:22px;flex-wrap:wrap;font:13px ui-monospace,Menlo,Consolas,monospace'});
 [['ID',I.meta[0]],['Severity',I.meta[1]],['Published',I.meta[2]]].forEach(function(x){if(!x[1])return;var d=el('div');d.appendChild(el('div',{style:'opacity:.65;letter-spacing:.12em;text-transform:uppercase;font-size:11px'},x[0]));d.appendChild(el('div',{dir:'ltr'},x[1]));m.appendChild(d)});ih.appendChild(m)}
[['What it is','إيه هو','what'],['How it works','إزاي بيشتغل','how'],['Why it matters','ليه مهم','imp'],['Takeaways','الخلاصة','less']].forEach(function(s,n){
 var b=el('div',{'class':'box',style:'margin:0 0 14px'});var h=bi('h3',s[0],s[1]);b.appendChild(h);var p=bi('p',I[s[2]][0],I[s[2]][1]);b.appendChild(p);ib.appendChild(b)});
var sb=el('div',{'class':'box',style:'margin:0 0 14px'});sb.appendChild(bi('h3','Sources','المصادر'));
var ul=el('ul',{style:'margin:8px 0 0;padding-inline-start:18px'});
I.src.forEach(function(s){var li=el('li');var a=el('a',{href:s[2],target:'_blank',rel:'noopener noreferrer'},s[0]);a.dataset.en=s[0];a.dataset.ar=s[1]||s[0];li.appendChild(a);ul.appendChild(li)});sb.appendChild(ul);ib.appendChild(sb);
ib.appendChild(bi('p','Educational summary written in our own words from the source above. All credit belongs to the original authors and publishers. It has no exploit code and no step by step attack instructions. Read the original for full details.','ملخص تعليمي مكتوب بكلماتنا من المصدر اللي فوق. كل الفضل للمؤلفين والناشرين الأصليين. مفيش كود استغلال ولا خطوات هجوم. ارجع للأصل للتفاصيل الكاملة.',{style:'opacity:.7;font-size:13px'}));
})();
