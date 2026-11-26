-- 032: coherent pricing. Individual tool prices are per month (EGP, minor units). Four bundle plans, each cheaper than buying the same tools one by one.
-- Open-source (third_party) tools stay free (no price). New tools are conceptual, defensive, authorized-lab only.
begin;

-- 1. new defensive catalog entries (owner-created, private, published)
insert into public.tools(slug, name, class, description_en, description_ar, commands, visibility, status, created_by)
select v.slug, v.name, v.class, v.den, v.dar, '{}', 'private', 'published', (select id from public.profiles where role = 'owner' limit 1)
from (values
 ('scarwatch','ScarWatch','defense','Concept guide for file integrity baselines: what to snapshot, how to compare, and how to read drift on systems you own.','دليل مفاهيمي لخط أساس سلامة الملفات: إيه اللي تاخد منه لقطة وإزاي تقارن وتقرا التغييرات على أنظمتك.'),
 ('scarharden','ScarHarden','defense','Hardening checklist builder for operating systems and services you administer, based on common secure-baseline ideas.','مولّد قوائم تقوية لأنظمة وخدمات إنت مديرها، مبني على أفكار خطوط الأساس الآمنة.'),
 ('scarpatch','ScarPatch','defense','Patch status tracker: inventory versions, note advisories, and plan update windows for your own environment.','متتبع حالة التحديثات: جرد الإصدارات وتسجيل النشرات وتخطيط مواعيد التحديث في بيئتك.'),
 ('scarthreat','ScarThreat','defense','Threat modeling worksheet for your own apps: assets, trust boundaries, risks and mitigations. No exploit content.','ورقة نمذجة التهديدات لتطبيقاتك: الأصول وحدود الثقة والمخاطر والحلول. من غير أي محتوى استغلال.'),
 ('scarsecret','ScarSecret','defense','Secrets hygiene guide: where keys leak in your own repos and configs, and how to rotate and store them safely.','دليل نظافة الأسرار: فين المفاتيح بتتسرب في مشاريعك وإزاي تغيرها وتخزنها بأمان.'),
 ('scarphish','ScarPhish','defense','Phishing awareness and report-triage guide for teams: spotting signs and handling reports. Training use only.','دليل التوعية بالتصيّد وفرز البلاغات للفرق: علامات الاكتشاف وطريقة التعامل. للتدريب فقط.'),
 ('scarmap','ScarMap','recon','Asset inventory notebook for infrastructure you own or are authorized to review: hosts, owners, exposure notes.','دفتر جرد الأصول للبنية اللي تملكها أو مصرّح لك تراجعها: الأجهزة والمسؤولين وملاحظات التعرض.'),
 ('scarcert','ScarCert','defense','Certificate lifecycle guide: expiry tracking, chain basics and renewal checklists for your own domains.','دليل دورة حياة الشهادات: تتبع الانتهاء وأساسيات السلسلة وقوائم التجديد لدومينتك.'),
 ('scardns','ScarDNS','defense','DNS hygiene review for domains you control: stale records, email authentication records and ownership checks.','مراجعة نظافة الـDNS لدومينات تملكها: سجلات قديمة وسجلات توثيق الإيميل وفحص الملكية.'),
 ('scarbackup','ScarBackup','defense','Backup verification guide: schedules, restore drills and integrity checks for your own data.','دليل التحقق من النسخ الاحتياطي: الجداول وتجارب الاسترجاع وفحوصات السلامة لبياناتك.'),
 ('scarcloud','ScarCloud','defense','Cloud posture checklist for accounts you own: identity, storage, logging and network basics.','قائمة فحص وضع السحابة لحساباتك: الهوية والتخزين والسجلات وأساسيات الشبكة.'),
 ('scarweb','ScarWeb','pentest','Web application security review checklist aligned with common risk categories, for authorized lab and own-app review only.','قائمة مراجعة أمان تطبيقات الويب حسب فئات المخاطر الشائعة، لمعامل مصرّح بها وتطبيقاتك فقط.'),
 ('scartriage','ScarTriage','forensics','Incident triage playbook: first questions, evidence handling and note-taking for incidents on your own systems.','دليل فرز الحوادث: الأسئلة الأولى والتعامل مع الأدلة وتدوين الملاحظات لحوادث أنظمتك.'),
 ('scarlab','ScarLab','pentest','Planner for an isolated, authorized practice lab: scope, rules of engagement and safe reset routines. No payloads.','مخطط لمعمل تدريب معزول ومصرّح: النطاق وقواعد الاشتباك وروتين إعادة الضبط الآمن. من غير حمولات.'),
 ('scarpolicy','ScarPolicy','platform','Security policy template pack: access, passwords, incident response and acceptable use, ready to adapt.','حزمة قوالب سياسات أمنية: الوصول وكلمات المرور والاستجابة للحوادث والاستخدام المقبول، جاهزة للتعديل.')
) as v(slug, name, class, den, dar)
on conflict (slug) do nothing;

-- 2. one price per tool, per month, EGP. No leftover discounts. Open-source tools stay without price.
update public.tools t set price_minor = p.egp * 100, currency = 'EGP', discount_percent = 0, discount_until = null
from (values
 ('scarhub',450),('scarosint',400),('scardrone',350),
 ('scarbase',250),('scarengage',250),
 ('scarlan',200),('scarports',200),('scarcvss',200),('scardecode',200),('scarcustody',200),
 ('scarpass',150),('scarreport',150),('scarlog',150),('scarlist',150),('scarheaders',150),('scarhash',150),('scarcipher',150),
 ('scarnote',100),('scartime',100),('scarmeta',100),('scarjwt',100),('scarperm',100),('scardiff',100),('scargrab',100),('scarioc',100),
 ('scarweb',120),('scarcloud',120),('scarthreat',120),('scarharden',120),('scartriage',120),
 ('scarwatch',80),('scarpatch',80),('scarsecret',80),('scarphish',80),('scarmap',80),('scarcert',80),('scardns',80),('scarbackup',80),('scarlab',80),('scarpolicy',80)
) as p(slug, egp) where t.slug = p.slug and not t.third_party;

-- 3. retire the old single plan for new buyers (existing subscribers keep access until their period ends)
update public.plans set active = false where scope = 'all' and active and name not in ('Ultimate');

-- 4. four plans
insert into public.plans(name, price_minor, currency, period, provider, active, scope, description)
select v.n, v.p * 100, 'EGP', 'month', 'manual', true, v.sc, v.d from (values
 ('Starter', 400, 'tools', '5 everyday tools. Individually 500 EGP/month, here 400 (20% off).'),
 ('Plus', 840, 'tools', '12 tools. Individually 1400 EGP/month, here 840 (40% off).'),
 ('Pro', 1800, 'tools', 'Every tool except the 3 flagships (37 tools). Individually 4750 EGP/month, here 1800 (62% off).'),
 ('Ultimate', 2300, 'all', 'Everything, including the flagships and all future tools. Individually 5950 EGP/month, here 2300 (61% off).')
) as v(n, p, sc, d) where not exists (select 1 from public.plans x where x.name = v.n);

insert into public.plan_tools(plan_id, tool_id)
select p.id, t.id from public.plans p join public.tools t on t.slug = any(
  case p.name
   when 'Starter' then array['scarnote','scartime','scarmeta','scarjwt','scarioc']
   when 'Plus' then array['scarnote','scartime','scarmeta','scarjwt','scarioc','scarperm','scardiff','scargrab','scarpass','scarlog','scarhash','scarcipher']
   when 'Pro' then (select array_agg(slug) from public.tools where price_minor is not null and not third_party and slug not in ('scarhub','scarosint','scardrone'))
   else array[]::text[] end)
where p.name in ('Starter','Plus','Pro') and p.active
on conflict do nothing;

commit;

select 'PLAN '||p.name||' '||p.price_minor/100||' scope '||p.scope||' tools '||(select count(*) from public.plan_tools x where x.plan_id=p.id)||' sum '||coalesce((select sum(t.price_minor)/100 from public.plan_tools x join public.tools t on t.id=x.tool_id where x.plan_id=p.id),0) from public.plans p where p.active
union all select 'PRICED '||count(*)||' sum '||sum(price_minor)/100 from public.tools where price_minor is not null
union all select 'THIRDPARTY priced='||count(*) filter (where price_minor is not null)||' total='||count(*) from public.tools where third_party;
