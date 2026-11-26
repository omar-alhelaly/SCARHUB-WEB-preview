-- 045: CHALLENGES (TryHackMe-style rooms solved inside the site). Phase 1 engine.
-- Sections > rooms > tasks. Answers are stored only as salted+peppered SHA-256 hashes; the pepper lives in ch_secret (no client access, never in the repo).
-- Everything is reached through SECURITY DEFINER RPCs; the tables have RLS on and no grants. Admins can edit content but cannot read anyone's progress except the leaderboard.
-- ROLLBACK: drop the functions ch_*, then drop tables ch_attempts, ch_solves, ch_tasks, ch_rooms, ch_sections, ch_secret.

create table if not exists public.ch_secret (id int primary key check (id = 1), pepper text not null);
insert into public.ch_secret(id, pepper) values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict (id) do nothing;

create table if not exists public.ch_sections (
  slug text primary key check (slug ~ '^[a-z][a-z0-9-]{1,20}$'),
  title_en text not null check (char_length(title_en) between 1 and 60),
  title_ar text not null check (char_length(title_ar) between 1 and 60),
  sort int not null default 0
);
create table if not exists public.ch_rooms (
  id bigint generated always as identity primary key,
  section text not null references public.ch_sections(slug) on update cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,40}$'),
  title_en text not null check (char_length(title_en) between 1 and 100),
  title_ar text not null check (char_length(title_ar) between 1 and 100),
  summary_en text not null default '' check (char_length(summary_en) <= 400),
  summary_ar text not null default '' check (char_length(summary_ar) <= 400),
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  body jsonb not null default '{}'::jsonb check (jsonb_typeof(body) = 'object' and octet_length(body::text) <= 250000),
  published boolean not null default false,
  sort int not null default 0,
  created_by uuid,
  updated_at timestamptz not null default now()
);
create table if not exists public.ch_tasks (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.ch_rooms(id) on delete cascade,
  sort int not null default 0,
  question_en text not null check (char_length(question_en) between 1 and 600),
  question_ar text not null check (char_length(question_ar) between 1 and 600),
  hint_en text not null default '' check (char_length(hint_en) <= 300),
  hint_ar text not null default '' check (char_length(hint_ar) <= 300),
  points int not null default 10 check (points between 1 and 100),
  salt text not null default replace(gen_random_uuid()::text, '-', ''),
  answer_hashes text[] not null default '{}'
);
create index if not exists ch_tasks_room on public.ch_tasks(room_id, sort, id);
create table if not exists public.ch_solves (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  task_id bigint references public.ch_tasks(id) on delete set null,   -- points and ranks survive when a task is later removed
  section text not null,
  points int not null,
  solved_at timestamptz not null default now()
);
create unique index if not exists ch_solves_once on public.ch_solves(user_id, task_id) where task_id is not null;
create index if not exists ch_solves_user on public.ch_solves(user_id, solved_at);
create index if not exists ch_solves_section on public.ch_solves(section);
create table if not exists public.ch_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null, task_id bigint not null, ok boolean not null, at timestamptz not null default now()
);
create index if not exists ch_attempts_user on public.ch_attempts(user_id, at);

alter table public.ch_secret enable row level security;
alter table public.ch_sections enable row level security;
alter table public.ch_rooms enable row level security;
alter table public.ch_tasks enable row level security;
alter table public.ch_solves enable row level security;
alter table public.ch_attempts enable row level security;
revoke all on public.ch_secret, public.ch_sections, public.ch_rooms, public.ch_tasks, public.ch_solves, public.ch_attempts from anon, authenticated;

-- ---------- internal helpers (no client access) ----------
create or replace function public.ch_hash(p_task bigint, p_ans text) returns text
language sql stable security definer set search_path = '' as $$
  select encode(sha256(convert_to((select pepper from public.ch_secret where id = 1) || ':' || t.salt || ':' || lower(btrim(regexp_replace(coalesce(p_ans, ''), '\s+', ' ', 'g'))), 'UTF8')), 'hex')
  from public.ch_tasks t where t.id = p_task
$$;
create or replace function public.ch_set_answers(p_task bigint, p_answers text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.ch_tasks set answer_hashes = coalesce((select array_agg(distinct public.ch_hash(p_task, a)) from unnest(p_answers) a where btrim(coalesce(a, '')) <> ''), '{}') where id = p_task;
end $$;
revoke execute on function public.ch_hash(bigint, text), public.ch_set_answers(bigint, text[]) from public, anon, authenticated;

-- ---------- public reads ----------
create or replace function public.ch_catalog() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('sections', coalesce((
    select jsonb_agg(jsonb_build_object('slug', s.slug, 'title_en', s.title_en, 'title_ar', s.title_ar, 'rooms', coalesce((
      select jsonb_agg(jsonb_build_object('slug', r.slug, 'title_en', r.title_en, 'title_ar', r.title_ar, 'summary_en', r.summary_en, 'summary_ar', r.summary_ar,
        'difficulty', r.difficulty, 'published', r.published,
        'tasks', (select count(*) from public.ch_tasks t where t.room_id = r.id),
        'points', (select coalesce(sum(t.points), 0) from public.ch_tasks t where t.room_id = r.id),
        'solved', (select count(*) from public.ch_solves v join public.ch_tasks t on t.id = v.task_id where t.room_id = r.id and v.user_id = auth.uid())
      ) order by r.sort, r.id) from public.ch_rooms r where r.section = s.slug and (r.published or public.is_staff(auth.uid()))), '[]'::jsonb)
    ) order by s.sort, s.slug) from public.ch_sections s), '[]'::jsonb))
$$;
create or replace function public.ch_room(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r record; uid uuid := auth.uid();
begin
  select * into r from public.ch_rooms where slug = p_slug and (published or public.is_staff(uid));
  if not found then return null; end if;
  return jsonb_build_object('id', r.id, 'section', r.section, 'slug', r.slug, 'title_en', r.title_en, 'title_ar', r.title_ar,
    'summary_en', r.summary_en, 'summary_ar', r.summary_ar, 'difficulty', r.difficulty, 'published', r.published, 'body', r.body,
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'question_en', t.question_en, 'question_ar', t.question_ar,
        'hint_en', t.hint_en, 'hint_ar', t.hint_ar, 'points', t.points,
        'solved', exists (select 1 from public.ch_solves v where v.user_id = uid and v.task_id = t.id)) order by t.sort, t.id)
      from public.ch_tasks t where t.room_id = r.id), '[]'::jsonb));
end $$;

-- ---------- answer check: server side only, rate limited, each task is solved once ----------
create or replace function public.ch_check(p_task bigint, p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t record; a text := left(coalesce(p_answer, ''), 200); ok boolean; tot bigint;
begin
  if uid is null or not public.is_active(uid) then return jsonb_build_object('status', 'login'); end if;
  select t0.id, t0.points, t0.answer_hashes, r.section into t from public.ch_tasks t0 join public.ch_rooms r on r.id = t0.room_id where t0.id = p_task and r.published;
  if not found then return jsonb_build_object('status', 'missing'); end if;
  if exists (select 1 from public.ch_solves where user_id = uid and task_id = p_task) then return jsonb_build_object('status', 'already'); end if;
  if btrim(a) = '' then return jsonb_build_object('status', 'empty'); end if;
  if (select count(*) from public.ch_attempts where user_id = uid and task_id = p_task and at > now() - interval '1 minute') >= 5
     or (select count(*) from public.ch_attempts where user_id = uid and at > now() - interval '1 hour') >= 120 then
    return jsonb_build_object('status', 'rate');
  end if;
  ok := public.ch_hash(p_task, a) = any (t.answer_hashes);
  delete from public.ch_attempts where user_id = uid and at < now() - interval '2 days';
  insert into public.ch_attempts(user_id, task_id, ok) values (uid, p_task, ok);
  if not ok then return jsonb_build_object('status', 'wrong'); end if;
  insert into public.ch_solves(user_id, task_id, section, points) values (uid, p_task, t.section, t.points) on conflict do nothing;
  select coalesce(sum(points), 0) into tot from public.ch_solves where user_id = uid;
  return jsonb_build_object('status', 'correct', 'points', t.points, 'total', tot);
end $$;

-- ---------- ranks ----------
create or replace function public.ch_leaderboard(p_section text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  with tot as (
    select v.user_id, sum(v.points)::int pts, count(*)::int solves, max(v.solved_at) last_at
    from public.ch_solves v join public.profiles p on p.id = v.user_id and p.status = 'active'
    where p_section is null or v.section = p_section group by v.user_id
  ), rk as (
    select tot.*, rank() over (order by pts desc, last_at asc) rnk from tot
  )
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('rank', rk.rnk, 'username', p.username, 'avatar', p.avatar, 'points', rk.pts, 'solves', rk.solves, 'me', rk.user_id = auth.uid()) order by rk.rnk, p.username)
                     from (select * from rk order by rnk limit 50) rk join public.profiles p on p.id = rk.user_id), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rnk, 'points', pts, 'solves', solves) from rk where user_id = auth.uid()),
    'players', (select count(*) from rk))
$$;
create or replace function public.ch_my_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'forbidden'; end if;
  return (
    with mine as (select section, points, solved_at from public.ch_solves where user_id = uid),
    tot as (select v.user_id, v.section, sum(v.points) pts, max(v.solved_at) last_at from public.ch_solves v join public.profiles p on p.id = v.user_id and p.status = 'active' group by v.user_id, v.section),
    sec as (select section, user_id, pts, rank() over (partition by section order by pts desc, last_at asc) rnk from tot),
    allr as (select user_id, sum(pts) pts, max(last_at) last_at from tot group by user_id),
    allk as (select user_id, pts, rank() over (order by pts desc, last_at asc) rnk from allr)
    select jsonb_build_object(
      'points', coalesce((select sum(points) from mine), 0), 'solves', (select count(*) from mine),
      'rank', (select rnk from allk where user_id = uid),
      'sections', coalesce((select jsonb_agg(jsonb_build_object('section', section, 'points', pts, 'rank', rnk)) from sec where user_id = uid), '[]'::jsonb),
      'times', coalesce((select jsonb_agg(solved_at order by solved_at) from mine where solved_at > now() - interval '400 days'), '[]'::jsonb))
  );
end $$;

-- ---------- staff editing (owner/admin; every change is written to the audit log, answers never are) ----------
create or replace function public.ch_admin_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'sections', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'title_en', title_en, 'title_ar', title_ar, 'sort', sort) order by sort, slug) from public.ch_sections), '[]'::jsonb),
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'section', r.section, 'slug', r.slug, 'title_en', r.title_en, 'title_ar', r.title_ar,
        'summary_en', r.summary_en, 'summary_ar', r.summary_ar, 'difficulty', r.difficulty, 'published', r.published, 'sort', r.sort, 'body', r.body,
        'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'sort', t.sort, 'question_en', t.question_en, 'question_ar', t.question_ar, 'hint_en', t.hint_en, 'hint_ar', t.hint_ar,
            'points', t.points, 'answers_set', cardinality(t.answer_hashes)) order by t.sort, t.id) from public.ch_tasks t where t.room_id = r.id), '[]'::jsonb)
      ) order by r.section, r.sort, r.id) from public.ch_rooms r), '[]'::jsonb));
end $$;
create or replace function public.ch_admin_save_section(p jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare s text := p ->> 'slug';
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  insert into public.ch_sections(slug, title_en, title_ar, sort) values (s, btrim(p ->> 'title_en'), btrim(p ->> 'title_ar'), coalesce((p ->> 'sort')::int, 0))
  on conflict (slug) do update set title_en = excluded.title_en, title_ar = excluded.title_ar, sort = excluded.sort;
  insert into public.audit_log(actor, action, meta) values (auth.uid(), 'ch_change', jsonb_build_object('kind', 'section', 'slug', s));
  return s;
end $$;
create or replace function public.ch_admin_save_room(p jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare rid bigint := nullif(p ->> 'id', '')::bigint; op text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  if rid is null then
    insert into public.ch_rooms(section, slug, title_en, title_ar, summary_en, summary_ar, difficulty, body, published, sort, created_by)
    values (p ->> 'section', p ->> 'slug', btrim(p ->> 'title_en'), btrim(p ->> 'title_ar'), coalesce(p ->> 'summary_en', ''), coalesce(p ->> 'summary_ar', ''),
      coalesce(p ->> 'difficulty', 'easy'), coalesce(p -> 'body', '{}'::jsonb), coalesce((p ->> 'published')::boolean, false), coalesce((p ->> 'sort')::int, 0), auth.uid())
    returning id into rid;
    op := 'added';
  else
    update public.ch_rooms set section = p ->> 'section', slug = p ->> 'slug', title_en = btrim(p ->> 'title_en'), title_ar = btrim(p ->> 'title_ar'),
      summary_en = coalesce(p ->> 'summary_en', ''), summary_ar = coalesce(p ->> 'summary_ar', ''), difficulty = coalesce(p ->> 'difficulty', 'easy'),
      body = coalesce(p -> 'body', '{}'::jsonb), published = coalesce((p ->> 'published')::boolean, false), sort = coalesce((p ->> 'sort')::int, 0), updated_at = now()
    where id = rid;
    if not found then raise exception 'not found'; end if;
    op := 'edited';
  end if;
  insert into public.audit_log(actor, action, meta) values (auth.uid(), 'ch_change', jsonb_build_object('kind', 'room', 'op', op, 'room_id', rid, 'slug', p ->> 'slug', 'published', coalesce((p ->> 'published')::boolean, false)));
  return rid;
end $$;
create or replace function public.ch_admin_save_task(p jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare tid bigint := nullif(p ->> 'id', '')::bigint; op text; ans text[]; changed boolean := false;
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  if tid is null then
    insert into public.ch_tasks(room_id, sort, question_en, question_ar, hint_en, hint_ar, points)
    values ((p ->> 'room_id')::bigint, coalesce((p ->> 'sort')::int, 0), btrim(p ->> 'question_en'), btrim(p ->> 'question_ar'), coalesce(p ->> 'hint_en', ''), coalesce(p ->> 'hint_ar', ''), coalesce((p ->> 'points')::int, 10))
    returning id into tid;
    op := 'added';
  else
    update public.ch_tasks set sort = coalesce((p ->> 'sort')::int, 0), question_en = btrim(p ->> 'question_en'), question_ar = btrim(p ->> 'question_ar'),
      hint_en = coalesce(p ->> 'hint_en', ''), hint_ar = coalesce(p ->> 'hint_ar', ''), points = coalesce((p ->> 'points')::int, 10) where id = tid;
    if not found then raise exception 'not found'; end if;
    op := 'edited';
  end if;
  if jsonb_typeof(p -> 'answers') = 'array' then
    select coalesce(array_agg(x), '{}') into ans from jsonb_array_elements_text(p -> 'answers') x;
    perform public.ch_set_answers(tid, ans); changed := true;
  end if;
  insert into public.audit_log(actor, action, meta) values (auth.uid(), 'ch_change', jsonb_build_object('kind', 'task', 'op', op, 'task_id', tid, 'room_id', (select room_id from public.ch_tasks where id = tid), 'answers_changed', changed));
  return tid;
end $$;
create or replace function public.ch_admin_delete(p_kind text, p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if p_kind = 'task' then delete from public.ch_tasks where id = p_id;
  elsif p_kind = 'room' then delete from public.ch_rooms where id = p_id;
  else raise exception 'kind'; end if;
  insert into public.audit_log(actor, action, meta) values (auth.uid(), 'ch_change', jsonb_build_object('kind', p_kind, 'op', 'deleted', 'id', p_id));
end $$;

revoke execute on function public.ch_catalog(), public.ch_room(text), public.ch_check(bigint, text), public.ch_leaderboard(text), public.ch_my_stats(),
  public.ch_admin_list(), public.ch_admin_save_section(jsonb), public.ch_admin_save_room(jsonb), public.ch_admin_save_task(jsonb), public.ch_admin_delete(text, bigint) from public, anon, authenticated;
grant execute on function public.ch_catalog(), public.ch_room(text), public.ch_leaderboard(text) to anon, authenticated;
grant execute on function public.ch_check(bigint, text), public.ch_my_stats(), public.ch_admin_list(), public.ch_admin_save_section(jsonb), public.ch_admin_save_room(jsonb),
  public.ch_admin_save_task(jsonb), public.ch_admin_delete(text, bigint) to authenticated;

insert into public.ch_sections(slug, title_en, title_ar, sort) values
  ('web', 'Web', 'الويب', 1), ('pentest', 'Pentest Labs', 'معامل الاختبار', 2), ('soc', 'SOC / Logs', 'تحليل السجلات', 3),
  ('forensics', 'Digital Forensics', 'التحقيق الرقمي', 4), ('crypto', 'Crypto', 'التشفير', 5)
on conflict (slug) do nothing;
select 'CH TABLES ' || count(*) from information_schema.tables where table_schema = 'public' and table_name like 'ch\_%';
