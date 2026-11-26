-- 048: learning paths and SCAR completion certificates (not an official accreditation)
begin;
create table if not exists public.ch_paths (
  slug text primary key check (slug ~ '^[a-z][a-z0-9-]{2,40}$'),
  title_en text not null, title_ar text not null,
  summary_en text not null, summary_ar text not null,
  prepares_en text not null, prepares_ar text not null,
  rooms text[] not null, sort int not null default 0, published boolean not null default true
);
create table if not exists public.ch_certs (
  id text primary key,
  user_id uuid not null,
  path text not null references public.ch_paths(slug) on update cascade,
  holder text not null check (char_length(holder) between 2 and 60),
  issued_at timestamptz not null default now(),
  unique (user_id, path)
);
alter table public.ch_paths enable row level security;
alter table public.ch_certs enable row level security;

create or replace function public.ch_paths_list() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', p.slug, 'title_en', p.title_en, 'title_ar', p.title_ar, 'summary_en', p.summary_en, 'summary_ar', p.summary_ar,
    'prepares_en', p.prepares_en, 'prepares_ar', p.prepares_ar,
    'rooms', (select coalesce(jsonb_agg(jsonb_build_object('slug', r.slug, 'title_en', r.title_en, 'title_ar', r.title_ar, 'difficulty', r.difficulty,
        'tasks', (select count(*) from public.ch_tasks t where t.room_id = r.id),
        'points', (select coalesce(sum(t.points), 0) from public.ch_tasks t where t.room_id = r.id),
        'solved', (select count(*) from public.ch_solves v join public.ch_tasks t on t.id = v.task_id where t.room_id = r.id and v.user_id = auth.uid())
      ) order by x.ord), '[]'::jsonb) from unnest(p.rooms) with ordinality x(slug, ord) join public.ch_rooms r on r.slug = x.slug and r.published),
    'cert', (select c.id from public.ch_certs c where c.user_id = auth.uid() and c.path = p.slug)
  ) order by p.sort, p.slug), '[]'::jsonb) from public.ch_paths p where p.published
$$;

create or replace function public.ch_issue_cert(p_path text, p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pp record; nm text := btrim(coalesce(p_name, '')); open_n int; cid text;
begin
  if uid is null then raise exception 'sign in required'; end if;
  if char_length(nm) < 2 or char_length(nm) > 60 then raise exception 'name must be 2-60 characters'; end if;
  select * into pp from public.ch_paths where slug = p_path and published;
  if not found then raise exception 'unknown path'; end if;
  select count(*) into open_n from unnest(pp.rooms) s(slug)
    join public.ch_rooms r on r.slug = s.slug
    where not exists (select 1 from public.ch_tasks t where t.room_id = r.id) or exists (
      select 1 from public.ch_tasks t where t.room_id = r.id and not exists (select 1 from public.ch_solves v where v.task_id = t.id and v.user_id = uid));
  if open_n > 0 or (select count(*) from unnest(pp.rooms) s(slug) join public.ch_rooms r on r.slug = s.slug) < array_length(pp.rooms, 1) then raise exception 'path not completed'; end if;
  select id into cid from public.ch_certs where user_id = uid and path = p_path;
  if cid is not null then return cid; end if;
  cid := 'SCAR-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
  insert into public.ch_certs(id, user_id, path, holder) values (cid, uid, p_path, nm);
  return cid;
end $$;

create or replace function public.ch_verify_cert(p_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', c.id, 'holder', c.holder, 'issued_at', c.issued_at, 'title_en', p.title_en, 'title_ar', p.title_ar,
    'prepares_en', p.prepares_en, 'prepares_ar', p.prepares_ar, 'rooms', array_length(p.rooms, 1))
  from public.ch_certs c join public.ch_paths p on p.slug = c.path where c.id = upper(btrim(p_id))
$$;
revoke execute on function public.ch_paths_list(), public.ch_issue_cert(text, text), public.ch_verify_cert(text) from public, anon, authenticated;
grant execute on function public.ch_paths_list(), public.ch_verify_cert(text) to anon, authenticated;
grant execute on function public.ch_issue_cert(text, text) to authenticated;

insert into public.ch_paths(slug,title_en,title_ar,summary_en,summary_ar,prepares_en,prepares_ar,rooms,sort) values
('cyber-foundations','Cyber Security Foundations','أساسيات الأمن السيبراني',
 'Start from zero. Theory first (what the field is, how networks and operating systems work), then easy hands-on rooms that teach how to look at data.',
 'ابدأ من الصفر. النظري الأول (يعني إيه المجال وإزاي الشبكات وأنظمة التشغيل بتشتغل)، وبعدين غرف عملية سهلة بتعلمك إزاي تبص في البيانات.',
 'Prepares you for: security awareness roles, IT help desk with a security focus, and the next paths (SOC analyst, junior pentester).',
 'بتجهزك لـ: وظايف الوعي الأمني، دعم فني بتركيز أمني، والمسارات اللي بعدها (محلل SOC، مختبر اختراق مبتدئ).',
 array['start-cyber-security-101','start-how-networks-and-os-work','crypto-encode-or-encrypt','forensics-first-artifacts'],1),
('soc-analyst-start','SOC Analyst: first steps','محلل SOC: أول الخطوات',
 'Foundations, then reading logs, finding an attacker in an SSH brute-force and rebuilding what happened from digital artifacts.',
 'الأساسيات، وبعدين قراءة اللوجز، ولقاء المهاجم في هجوم SSH brute-force وإعادة بناء اللي حصل من الأدلة الرقمية.',
 'Prepares you for: junior SOC analyst (tier 1) and incident response trainee tasks such as triage, log searching and timelines.',
 'بتجهزك لـ: محلل SOC مبتدئ (tier 1) ومهام متدرب الاستجابة للحوادث زي الفرز والبحث في اللوجز وبناء الخط الزمني.',
 array['start-cyber-security-101','start-how-networks-and-os-work','crypto-encode-or-encrypt','soc-ssh-bruteforce','forensics-first-artifacts'],2),
('junior-pentester','Junior Penetration Tester','مختبر اختراق مبتدئ',
 'Foundations, then the workflow of a real engagement: web findings and access control, then scope, scanning and reporting.',
 'الأساسيات، وبعدين خطوات مشروع حقيقي: نتايج الويب والتحكم في الوصول، وبعدها النطاق والفحص والتقرير.',
 'Prepares you for: junior web application tester and penetration testing assistant tasks such as recon, simple web checks and report writing.',
 'بتجهزك لـ: مختبر تطبيقات ويب مبتدئ ومهام مساعد اختبار اختراق زي الاستطلاع وفحوص الويب البسيطة وكتابة التقرير.',
 array['start-cyber-security-101','start-how-networks-and-os-work','crypto-encode-or-encrypt','web-first-login','pentest-recon-lab'],3)
on conflict (slug) do update set title_en=excluded.title_en,title_ar=excluded.title_ar,summary_en=excluded.summary_en,summary_ar=excluded.summary_ar,prepares_en=excluded.prepares_en,prepares_ar=excluded.prepares_ar,rooms=excluded.rooms,sort=excluded.sort;
commit;
select 'PATHS ' || (select count(*) from public.ch_paths);
