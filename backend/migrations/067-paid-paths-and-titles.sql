-- 067: paid path rooms (unlocked through the existing plan + Vodafone Cash flow) and owner-granted titles.
-- No answers and no room content here. Run once in the SQL editor.
begin;
alter table public.ch_certs add column if not exists hidden boolean not null default false;

-- ---------- paid rooms ----------
alter table public.ch_rooms add column if not exists paid boolean not null default false;

-- a plan can unlock the paid rooms of one or more paths. The plan itself stays a normal plan (scope 'tools' with no tools), so
-- payment, owner approval, free grants, expiry and the inbox notices all use the code that already exists.
create table if not exists public.plan_paths (
  plan_id uuid not null references public.plans(id) on delete cascade,
  path_slug text not null references public.ch_paths(slug) on update cascade on delete cascade,
  primary key (plan_id, path_slug)
);
alter table public.plan_paths enable row level security;
drop policy if exists plan_paths_read on public.plan_paths;
create policy plan_paths_read on public.plan_paths for select to anon, authenticated
  using (public.is_owner(auth.uid()) or exists (select 1 from public.plans p where p.id = plan_id and p.active));
drop policy if exists plan_paths_write on public.plan_paths;
create policy plan_paths_write on public.plan_paths for all to authenticated using (public.is_owner(auth.uid())) with check (public.is_owner(auth.uid()));
revoke all on public.plan_paths from anon, authenticated;
grant select on public.plan_paths to anon, authenticated;
grant insert, update, delete on public.plan_paths to authenticated;

-- may this user open this room? free rooms: everyone. paid rooms: staff, or a current plan that covers a path containing the room.
create or replace function public.ch_can_open(uid uuid, p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not coalesce((select r.paid from public.ch_rooms r where r.slug = p_slug), false)
    or public.is_staff(uid)
    or exists (select 1 from public.user_plan_access a
               join public.plan_paths pp on pp.plan_id = a.plan_id
               join public.ch_paths cp on cp.slug = pp.path_slug
               where a.user_id = uid and a.current_period_end > now() and p_slug = any (cp.rooms))
$$;
-- what it costs: the cheapest active plan that unlocks the paths containing this room
create or replace function public.ch_unlock_info(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select (select jsonb_build_object('plan_id', pl.id, 'name', pl.name, 'price_minor', pl.price_minor, 'currency', pl.currency, 'period', pl.period,
            'description', pl.description, 'path', cp.slug)
          from public.plans pl join public.plan_paths pp on pp.plan_id = pl.id join public.ch_paths cp on cp.slug = pp.path_slug
          where pl.active and p_slug = any (cp.rooms) order by pl.price_minor limit 1)
$$;
revoke execute on function public.ch_can_open(uuid, text), public.ch_unlock_info(text) from public, anon, authenticated;
grant execute on function public.ch_can_open(uuid, text), public.ch_unlock_info(text) to anon, authenticated;

create or replace function public.ch_catalog() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('sections', coalesce((
    select jsonb_agg(jsonb_build_object('slug', s.slug, 'title_en', s.title_en, 'title_ar', s.title_ar, 'rooms', coalesce((
      select jsonb_agg(jsonb_build_object('slug', r.slug, 'title_en', r.title_en, 'title_ar', r.title_ar, 'summary_en', r.summary_en, 'summary_ar', r.summary_ar,
        'difficulty', r.difficulty, 'published', r.published, 'paid', r.paid, 'locked', (r.paid and not public.ch_can_open(auth.uid(), r.slug)),
        'tasks', (select count(*) from public.ch_tasks t where t.room_id = r.id),
        'points', (select coalesce(sum(t.points), 0) from public.ch_tasks t where t.room_id = r.id),
        'solved', (select count(*) from public.ch_solves v join public.ch_tasks t on t.id = v.task_id where t.room_id = r.id and v.user_id = auth.uid())
      ) order by r.sort, r.id) from public.ch_rooms r where r.section = s.slug and (r.published or public.is_staff(auth.uid()))), '[]'::jsonb)
    ) order by s.sort, s.slug) from public.ch_sections s), '[]'::jsonb))
$$;

create or replace function public.ch_room(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r record; uid uuid := auth.uid(); lk boolean;
begin
  select * into r from public.ch_rooms where slug = p_slug and (published or public.is_staff(uid));
  if not found then return null; end if;
  lk := r.paid and not public.ch_can_open(uid, r.slug);
  if lk then
    return jsonb_build_object('id', r.id, 'section', r.section, 'slug', r.slug, 'title_en', r.title_en, 'title_ar', r.title_ar,
      'summary_en', r.summary_en, 'summary_ar', r.summary_ar, 'difficulty', r.difficulty, 'published', r.published, 'paid', true, 'locked', true,
      'body', '{}'::jsonb, 'tasks', '[]'::jsonb,
      'task_count', (select count(*) from public.ch_tasks t where t.room_id = r.id),
      'points', (select coalesce(sum(t.points), 0) from public.ch_tasks t where t.room_id = r.id),
      'unlock', public.ch_unlock_info(r.slug));
  end if;
  return jsonb_build_object('id', r.id, 'section', r.section, 'slug', r.slug, 'title_en', r.title_en, 'title_ar', r.title_ar,
    'summary_en', r.summary_en, 'summary_ar', r.summary_ar, 'difficulty', r.difficulty, 'published', r.published, 'paid', r.paid, 'locked', false, 'body', r.body,
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'question_en', t.question_en, 'question_ar', t.question_ar,
        'hint_en', t.hint_en, 'hint_ar', t.hint_ar, 'points', t.points, 'mask', t.answer_mask,
        'solved', exists (select 1 from public.ch_solves v where v.user_id = uid and v.task_id = t.id)) order by t.sort, t.id)
      from public.ch_tasks t where t.room_id = r.id), '[]'::jsonb));
end $$;

create or replace function public.ch_check(p_task bigint, p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t record; a text := left(coalesce(p_answer, ''), 200); ok boolean; tot bigint;
begin
  if uid is null or not public.is_active(uid) then return jsonb_build_object('status', 'login'); end if;
  select t0.id, t0.points, t0.answer_hashes, r.section, r.slug, r.paid into t from public.ch_tasks t0 join public.ch_rooms r on r.id = t0.room_id where t0.id = p_task and r.published;
  if not found then return jsonb_build_object('status', 'missing'); end if;
  if t.paid and not public.ch_can_open(uid, t.slug) then return jsonb_build_object('status', 'locked'); end if;
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


create or replace function public.ch_paths_list() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', p.slug, 'title_en', p.title_en, 'title_ar', p.title_ar, 'summary_en', p.summary_en, 'summary_ar', p.summary_ar,
    'prepares_en', p.prepares_en, 'prepares_ar', p.prepares_ar,
    'rooms', (select coalesce(jsonb_agg(jsonb_build_object('slug', r.slug, 'title_en', r.title_en, 'title_ar', r.title_ar, 'difficulty', r.difficulty,
        'summary_en', r.summary_en, 'summary_ar', r.summary_ar, 'paid', r.paid, 'locked', (r.paid and not public.ch_can_open(auth.uid(), r.slug)),
        'earned', (select coalesce(sum(t.points), 0) from public.ch_solves v join public.ch_tasks t on t.id = v.task_id where t.room_id = r.id and v.user_id = auth.uid()),
        'tasks', (select count(*) from public.ch_tasks t where t.room_id = r.id),
        'points', (select coalesce(sum(t.points), 0) from public.ch_tasks t where t.room_id = r.id),
        'solved', (select count(*) from public.ch_solves v join public.ch_tasks t on t.id = v.task_id where t.room_id = r.id and v.user_id = auth.uid())
      ) order by x.ord), '[]'::jsonb) from unnest(p.rooms) with ordinality x(slug, ord) join public.ch_rooms r on r.slug = x.slug and r.published),
    'unlock', (select public.ch_unlock_info(r2.slug) from unnest(p.rooms) s2(slug) join public.ch_rooms r2 on r2.slug = s2.slug and r2.paid and r2.published limit 1),
    'cert', (select c.id from public.ch_certs c where c.user_id = auth.uid() and c.path = p.slug),
    'cert_hidden', (select c.hidden from public.ch_certs c where c.user_id = auth.uid() and c.path = p.slug)
  ) order by p.sort, p.slug), '[]'::jsonb) from public.ch_paths p where p.published
$$;
revoke execute on function public.ch_catalog(), public.ch_room(text), public.ch_check(bigint, text), public.ch_paths_list() from public, anon, authenticated;
grant execute on function public.ch_catalog(), public.ch_room(text), public.ch_paths_list() to anon, authenticated;
grant execute on function public.ch_check(bigint, text) to authenticated;

-- ---------- titles ("لقب") given by the owner ----------
alter table public.profiles add column if not exists title text;
alter table public.profiles drop constraint if exists profiles_title_check;
alter table public.profiles add constraint profiles_title_check check (title is null or (char_length(title) between 2 and 30 and title !~ '[<>&"\\]|[[:cntrl:]]'));

create or replace view public.public_profiles with (security_invoker = false) as
  select id, case when role in ('owner', 'admin') then alias else username end::text as display_name,
         case when avatar = 'custom' and role not in ('owner', 'admin') then 'b1' else avatar end as avatar,
         (role in ('owner', 'admin')) as is_staff, public.has_any_sub(id) as subscribed, role::text as role, created_at as joined,
         case when not public.has_any_sub(id) then null else coalesce(
           (select string_agg(pl.name, ', ' order by pl.name) from public.user_plan_access a join public.plans pl on pl.id = a.plan_id where a.user_id = profiles.id and a.current_period_end > now()),
           (select pl.name from public.payment_requests q join public.plans pl on pl.id = q.plan_id where q.user_id = profiles.id and q.status = 'approved' and pl.scope <> 'tools' order by q.created_at desc limit 1),
           'All tools') end as plan_name,
         title
  from public.profiles where status = 'active';

CREATE OR REPLACE FUNCTION public.get_profile(target uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
declare p public.profiles; st boolean := public.is_staff(auth.uid()); ow boolean := public.is_owner(auth.uid()); r jsonb;
begin
  if not public.is_active(auth.uid()) then raise exception 'forbidden'; end if;
  select * into p from public.profiles where id = target;
  if not found or p.status = 'deleted' or (p.status <> 'active' and not st) then raise exception 'not found'; end if;
  r := jsonb_build_object('id', p.id,
    'name', case when p.role <> 'user' then p.alias::text else p.username::text end,
    'avatar', case when p.avatar = 'custom' and p.role = 'user' then 'b1' else p.avatar end,
    'role', p.role, 'joined', p.created_at, 'subscribed', public.has_any_sub(p.id),
    'plans', (select coalesce(jsonb_agg(pl.name), '[]'::jsonb) from public.user_plan_access a join public.plans pl on pl.id = a.plan_id where a.user_id = p.id and a.current_period_end > now()),
    'all_access', public.has_active_sub(p.id), 'title', p.title,
    'paths', (select coalesce(jsonb_agg(x order by x.issued_at), '[]'::jsonb) from (select c.id as cert, c.path, pp.title_en, pp.title_ar, c.issued_at from public.ch_certs c join public.ch_paths pp on pp.slug = c.path where c.user_id = p.id and not c.hidden) x));
  if st then
    r := r || jsonb_build_object(
      'messages', (select count(*) from public.chat_messages m where m.user_id = p.id and m.channel = 'general'),
      'voice', (select count(*) from public.chat_messages m where m.user_id = p.id and m.channel = 'general' and m.audio_path is not null),
      'last_post', (select max(m.created_at) from public.chat_messages m where m.user_id = p.id and m.channel = 'general'),
      'posts', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select m.body, m.audio_secs, m.created_at from public.chat_messages m where m.user_id = p.id and m.channel = 'general' order by m.created_at desc limit 5) x));
    r := r || jsonb_build_object('staff', jsonb_build_object(
      'email', case when p.role = 'owner' and not ow then null else p.email::text end,
      'username', case when ow or p.role = 'user' then p.username::text else null end,
      'status', p.status,
      'payments', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select pl.name as plan, q.amount_minor, q.currency, q.status, q.method, q.created_at from public.payment_requests q left join public.plans pl on pl.id = q.plan_id where q.user_id = p.id order by q.created_at desc limit 10) x),
      'blocks', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select b.scope, b.reason, b.created_at, b.expires_at, b.lifted_at, coalesce(c.alias::text, c.username::text) as by from public.blocks b left join public.profiles c on c.id = b.created_by where b.user_id = p.id order by b.created_at desc limit 20) x),
      'logs', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select l.action, l.at from public.audit_log l where l.target = p.id and l.action <> 'login' order by l.at desc limit 15) x)));
  end if;
  return r;
end $function$;


alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('free_plan_granted','free_plan_revoked','payment_pending','payment_submitted','payment_approved','payment_rejected','new_user','title_set','title_cleared'));

-- owner only. An empty title clears it. The user gets an inbox notice and the change is written to the audit log.
create or replace function public.set_user_title(target uuid, p_title text) returns void
language plpgsql security definer set search_path = '' as $$
declare t text := nullif(regexp_replace(btrim(coalesce(p_title, '')), '\s+', ' ', 'g'), ''); old text;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  select title into old from public.profiles where id = target and status = 'active';
  if not found then raise exception 'not found'; end if;
  if t is not null and (char_length(t) < 2 or char_length(t) > 30 or t ~ '[<>&"\\]|[[:cntrl:]]') then raise exception 'title: 2 to 30 characters, no < > & or quotes'; end if;
  update public.profiles set title = t where id = target;
  insert into public.notifications(user_id, kind, meta) values (target, case when t is null then 'title_cleared' else 'title_set' end, jsonb_build_object('title', t, 'old', old));
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'set_title', target, jsonb_strip_nulls(jsonb_build_object('title', t, 'old', old)));
end $$;
revoke execute on function public.set_user_title(uuid, text) from public, anon, authenticated;
grant execute on function public.set_user_title(uuid, text) to authenticated;

-- completed paths on the public profile: one row per issued certificate, visible by default, the certificate owner can hide it
alter table public.ch_certs add column if not exists hidden boolean not null default false;
create or replace function public.ch_set_cert_hidden(p_path text, p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  update public.ch_certs set hidden = coalesce(p_hidden, false) where user_id = auth.uid() and path = p_path;
  if not found then raise exception 'not found'; end if;
end $$;
revoke execute on function public.ch_set_cert_hidden(text, boolean) from public, anon, authenticated;
grant execute on function public.ch_set_cert_hidden(text, boolean) to authenticated;

-- public profile for guests and members: name, avatar, role, join date, title, completed (non-hidden) paths. No email, plans or payments.
create or replace function public.public_profile(target uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id,
    'name', case when p.role <> 'user' then p.alias::text else p.username::text end,
    'avatar', case when p.avatar = 'custom' and p.role = 'user' then 'b1' else p.avatar end,
    'role', p.role, 'joined', p.created_at, 'title', p.title,
    'paths', (select coalesce(jsonb_agg(x order by x.issued_at), '[]'::jsonb) from (select c.id as cert, c.path, pp.title_en, pp.title_ar, c.issued_at from public.ch_certs c join public.ch_paths pp on pp.slug = c.path where c.user_id = p.id and not c.hidden) x))
  from public.profiles p where p.id = target and p.status = 'active'
$$;
revoke execute on function public.public_profile(uuid) from public, anon, authenticated;
grant execute on function public.public_profile(uuid) to anon, authenticated;

commit;
select 'PAID PATHS AND TITLES OK';
