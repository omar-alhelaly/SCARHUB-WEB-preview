-- 034: "coming soon" tools. Listed and described in the catalog, but no files yet, so the UI shows "Guide coming soon" instead of Lock / Subscribe / Download.
-- The flag clears itself when the first real asset (video, repo or file) is saved for the tool.
alter table public.tools add column if not exists coming_soon boolean not null default false;

create or replace function public.tool_assets_clear_soon() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.video_url is not null or new.repo_url is not null or new.file_path is not null then
    update public.tools set coming_soon = false where id = new.tool_id and coming_soon;
  end if;
  return new;
end $$;
revoke execute on function public.tool_assets_clear_soon() from public, anon, authenticated;
drop trigger if exists tool_assets_clear_soon on public.tool_assets;
create trigger tool_assets_clear_soon after insert or update on public.tool_assets for each row execute function public.tool_assets_clear_soon();

update public.tools t set coming_soon = true
where t.slug in ('scarwatch','scarharden','scarpatch','scarthreat','scarsecret','scarphish','scarmap','scarcert','scardns','scarbackup','scarcloud','scarweb','scartriage','scarlab','scarpolicy')
  and not exists (select 1 from public.tool_assets a where a.tool_id = t.id and (a.video_url is not null or a.repo_url is not null or a.file_path is not null));

-- fuller conceptual descriptions (authorized-lab, defensive, no payloads)
update public.tools set description_en = v.en, description_ar = v.ar from (values
 ('scarwatch','File integrity baselines, explained. What to snapshot on systems you own, how to compare snapshots over time, and how to tell normal change from drift. Concepts and checklists only.','خطوط أساس سلامة الملفات بشكل مبسط. إيه اللي تاخد منه لقطة على أنظمتك، وإزاي تقارن اللقطات مع الوقت، وإزاي تفرّق بين التغيير العادي والانحراف. مفاهيم وقوائم فحص بس.'),
 ('scarharden','Build hardening checklists for the operating systems and services you administer. Based on common secure-baseline ideas, with a review step so you know what changed and why.','ابني قوائم تقوية للأنظمة والخدمات اللي إنت مديرها. مبنية على أفكار خطوط الأساس الآمنة، مع خطوة مراجعة عشان تعرف إيه اللي اتغيّر وليه.'),
 ('scarpatch','Keep track of what is installed, which advisories apply, and when updates are planned in your own environment. A simple way to stay on top of patching without a heavy platform.','تابع إيه المثبت، وأي نشرات أمنية بتنطبق، ومتى التحديثات مخططة في بيئتك. طريقة بسيطة تفضل فيها ماسك التحديثات من غير منصة تقيلة.'),
 ('scarthreat','A threat modeling worksheet for your own applications: list assets, draw trust boundaries, rank risks and write mitigations. Planning and review only, no exploit content.','ورقة نمذجة تهديدات لتطبيقاتك: اكتب الأصول، وارسم حدود الثقة، ورتّب المخاطر، واكتب الحلول. تخطيط ومراجعة بس، من غير أي محتوى استغلال.'),
 ('scarsecret','A secrets hygiene guide: where keys and tokens tend to leak in your own repos and configs, how to rotate them, and where to store them safely.','دليل نظافة الأسرار: فين المفاتيح والتوكنز بتتسرب عادة في مشاريعك وإعداداتك، وإزاي تغيّرها، وفين تخزنها بأمان.'),
 ('scarphish','Phishing awareness and report triage for teams: common warning signs, a simple triage routine for reported emails, and training notes. For defense and training use only.','توعية بالتصيّد وفرز البلاغات للفرق: علامات التحذير الشائعة، وروتين بسيط لفرز الإيميلات المبلّغ عنها، وملاحظات تدريب. للدفاع والتدريب فقط.'),
 ('scarmap','An asset inventory notebook for infrastructure you own or are authorized to review: hosts, owners, exposure notes and review dates, kept in one place.','دفتر جرد أصول للبنية اللي تملكها أو مصرّح لك تراجعها: الأجهزة والمسؤولين وملاحظات التعرض وتواريخ المراجعة في مكان واحد.'),
 ('scarcert','Certificate lifecycle guide for your own domains: track expiry dates, understand chain basics and follow a renewal checklist so nothing lapses by surprise.','دليل دورة حياة الشهادات لدومينتك: تابع تواريخ الانتهاء، وافهم أساسيات السلسلة، واتبع قائمة تجديد عشان مفيش حاجة تنتهي فجأة.'),
 ('scardns','DNS hygiene review for domains you control: find stale records, check email authentication records and confirm ownership of every name you still pay for.','مراجعة نظافة الـDNS لدومينات تتحكم فيها: اكتشف السجلات القديمة، وراجع سجلات توثيق الإيميل، وتأكد إنك مالك كل اسم لسه بتدفع عليه.'),
 ('scarbackup','Backup verification guide: schedules, restore drills and integrity checks, so you know your own backups work before you need them.','دليل التحقق من النسخ الاحتياطي: الجداول وتجارب الاسترجاع وفحوصات السلامة، عشان تتأكد إن نسخك شغالة قبل ما تحتاجها.'),
 ('scarcloud','Cloud posture checklist for accounts you own: identity and access, storage exposure, logging and network basics, organized as a review you can repeat.','قائمة فحص وضع السحابة لحساباتك: الهوية والصلاحيات وتعرض التخزين والسجلات وأساسيات الشبكة، منظمة كمراجعة تقدر تكررها.'),
 ('scarweb','Web application security review checklist aligned with common risk categories. For your own apps and authorized practice labs only, with concepts and fixes instead of payloads.','قائمة مراجعة أمان تطبيقات الويب حسب فئات المخاطر الشائعة. لتطبيقاتك ومعامل التدريب المصرّح بيها بس، مفاهيم وحلول بدل الحمولات.'),
 ('scartriage','Incident triage playbook: the first questions to ask, how to handle evidence and how to keep clear notes while you work on incidents in your own systems.','دليل فرز الحوادث: الأسئلة الأولى، وإزاي تتعامل مع الأدلة، وإزاي تكتب ملاحظات واضحة وإنت شغال على حوادث في أنظمتك.'),
 ('scarlab','A planner for an isolated, authorized practice lab: scope, rules of engagement and safe reset routines. Planning and safety notes only, no payloads.','مخطط لمعمل تدريب معزول ومصرّح: النطاق وقواعد الاشتباك وروتين إعادة الضبط الآمن. تخطيط وملاحظات أمان بس، من غير حمولات.'),
 ('scarpolicy','A security policy template pack covering access, passwords, incident response and acceptable use. Ready to adapt for your team or lab.','حزمة قوالب سياسات أمنية تغطي الوصول وكلمات المرور والاستجابة للحوادث والاستخدام المقبول. جاهزة تعدلها لفريقك أو معملك.')
) as v(slug,en,ar) where tools.slug = v.slug and char_length(v.en) <= 600;

select 'SOON '||count(*)||' of '||(select count(*) from public.tools where slug in ('scarwatch','scarharden','scarpatch','scarthreat','scarsecret','scarphish','scarmap','scarcert','scardns','scarbackup','scarcloud','scarweb','scartriage','scarlab','scarpolicy')) from public.tools where coming_soon;
