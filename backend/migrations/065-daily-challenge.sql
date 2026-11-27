-- 065: DAILY CHALLENGE. One question per user per day. The user picks ONE field, answers once.
-- Wrong = final for that day (no retry). Correct = 10 points (counted in ch_solves, so ranks and streaks include it).
-- Enforced here, not in the UI: the primary key (user_id, day) allows one row per user per day, and the answer is checked in one locked step.
-- Answers are stored only as salted+peppered hashes. The pepper is its own secret (daily_secret), never in the repo. Day = Africa/Cairo date.
-- ROLLBACK: drop the functions daily_*, then drop tables daily_plays, daily_q, daily_secret.

create table if not exists public.daily_secret (id int primary key check (id = 1), pepper text not null);
insert into public.daily_secret(id, pepper) values (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict (id) do nothing;
create table if not exists public.daily_q (
  id bigint generated always as identity primary key,
  section text not null references public.ch_sections(slug) on update cascade on delete cascade,
  slot int not null,
  q_en text not null check (char_length(q_en) between 1 and 500),
  q_ar text not null check (char_length(q_ar) between 1 and 500),
  salt text not null default replace(gen_random_uuid()::text, '-', ''),
  answer_hashes text[] not null default '{}',
  unique (section, slot)
);
create table if not exists public.daily_plays (
  user_id uuid not null,
  day date not null,
  section text not null,
  q_id bigint,
  ok boolean,                       -- null = picked, not answered yet; true/false = final
  points int not null default 0,
  picked_at timestamptz not null default now(),
  answered_at timestamptz,
  primary key (user_id, day)
);
alter table public.daily_secret enable row level security;
alter table public.daily_q enable row level security;
alter table public.daily_plays enable row level security;
revoke all on public.daily_secret, public.daily_q, public.daily_plays from anon, authenticated;

create or replace function public.daily_day() returns date language sql stable set search_path = '' as $$ select (now() at time zone 'Africa/Cairo')::date $$;
create or replace function public.daily_hash(p_q bigint, p_ans text) returns text
language sql stable security definer set search_path = '' as $$
  select encode(sha256(convert_to((select pepper from public.daily_secret where id = 1) || ':' || q.salt || ':' || lower(btrim(regexp_replace(coalesce(p_ans, ''), '\s+', ' ', 'g'))), 'UTF8')), 'hex')
  from public.daily_q q where q.id = p_q
$$;
-- content loading (run from the SQL editor only): the plain answers never live in the repo or in a table
create or replace function public.daily_add(p_section text, p_slot int, p_q_en text, p_q_ar text, p_answers text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare qid bigint;
begin
  insert into public.daily_q(section, slot, q_en, q_ar) values (p_section, p_slot, p_q_en, p_q_ar)
    on conflict (section, slot) do update set q_en = excluded.q_en, q_ar = excluded.q_ar returning id into qid;
  update public.daily_q set answer_hashes = coalesce((select array_agg(distinct public.daily_hash(qid, a)) from unnest(p_answers) a where btrim(coalesce(a, '')) <> ''), '{}') where id = qid;
end $$;
revoke execute on function public.daily_hash(bigint, text), public.daily_add(text, int, text, text, text[]) from public, anon, authenticated;

-- today's question for a field: rotates by date over the field's questions
create or replace function public.daily_qid(p_section text) returns bigint
language sql stable security definer set search_path = '' as $$
  select id from public.daily_q where section = p_section
  order by slot offset (((public.daily_day() - date '2026-01-01') % greatest((select count(*) from public.daily_q where section = p_section), 1))::int) limit 1
$$;
revoke execute on function public.daily_qid(text) from public, anon, authenticated;

-- state: fields with a ready question, and what this user did today
create or replace function public.daily_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pl record; d date := public.daily_day(); qe text; qa text; has boolean;
begin
  if uid is null or not public.is_active(uid) then return jsonb_build_object('status', 'login'); end if;
  select * into pl from public.daily_plays where user_id = uid and day = d;
  has := found;
  if has and pl.ok is null then select q_en, q_ar into qe, qa from public.daily_q where id = pl.q_id; end if;
  return jsonb_build_object('status', 'ok', 'day', d,
    'fields', coalesce((select jsonb_agg(jsonb_build_object('slug', s.slug, 'title_en', s.title_en, 'title_ar', s.title_ar) order by s.sort, s.slug)
                        from public.ch_sections s where exists (select 1 from public.daily_q x where x.section = s.slug)), '[]'::jsonb),
    'played', case when has then jsonb_build_object('section', pl.section, 'ok', pl.ok, 'points', pl.points,
                    'q_en', qe, 'q_ar', qa) else null end);
end $$;

-- pick ONE field for today. Final: a second call (other field, other tab, refresh) returns the first choice.
create or replace function public.daily_pick(p_section text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); d date := public.daily_day(); qid bigint; n int;
begin
  if uid is null or not public.is_active(uid) then return jsonb_build_object('status', 'login'); end if;
  qid := public.daily_qid(coalesce(p_section, ''));
  if qid is null then return jsonb_build_object('status', 'missing'); end if;
  insert into public.daily_plays(user_id, day, section, q_id) values (uid, d, p_section, qid) on conflict (user_id, day) do nothing;
  get diagnostics n = row_count;
  return jsonb_build_object('status', case when n = 1 then 'picked' else 'already_picked' end) || public.daily_state();
end $$;

-- answer once. The row is locked, checked and closed in one step: wrong is final, correct is paid once.
create or replace function public.daily_answer(p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); d date := public.daily_day(); pl record; a text := left(coalesce(p_answer, ''), 200); good boolean; h text; hs text[];
begin
  if uid is null or not public.is_active(uid) then return jsonb_build_object('status', 'login'); end if;
  select * into pl from public.daily_plays where user_id = uid and day = d for update;
  if not found then return jsonb_build_object('status', 'nopick'); end if;
  if pl.ok is not null then return jsonb_build_object('status', 'done', 'ok', pl.ok, 'points', pl.points); end if;
  if btrim(a) = '' then return jsonb_build_object('status', 'empty'); end if;
  select answer_hashes into hs from public.daily_q where id = pl.q_id;
  h := public.daily_hash(pl.q_id, a);
  good := h = any (coalesce(hs, '{}'));
  update public.daily_plays set ok = good, points = case when good then 10 else 0 end, answered_at = now() where user_id = uid and day = d;
  if good then insert into public.ch_solves(user_id, task_id, section, points) values (uid, null, pl.section, 10); end if;
  return jsonb_build_object('status', case when good then 'correct' else 'wrong' end, 'points', case when good then 10 else 0 end,
    'total', (select coalesce(sum(points), 0) from public.ch_solves where user_id = uid));
end $$;
revoke execute on function public.daily_state(), public.daily_pick(text), public.daily_answer(text) from public, anon;
grant execute on function public.daily_state(), public.daily_pick(text), public.daily_answer(text) to authenticated;
