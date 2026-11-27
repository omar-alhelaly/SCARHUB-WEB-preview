-- 062: Live classes. Scheduled sessions with time, host, registration, a join link and a recording list. Our own design; the join
-- link is any https meeting URL the owner or an admin pastes. No tables are exposed directly: everything goes through these functions.
create table if not exists public.ch_classes (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 3 and 120),
  host text not null check (char_length(host) between 2 and 80),
  topic text check (topic is null or char_length(topic) between 2 and 40),
  description text check (description is null or char_length(description) <= 1000),
  starts_at timestamptz not null,
  minutes int not null check (minutes between 15 and 480),
  capacity int check (capacity is null or capacity between 1 and 1000),
  join_url text check (join_url is null or join_url ~ '^https://[^\s<>"'']{4,300}$'),
  recording_url text check (recording_url is null or recording_url ~ '^https://[^\s<>"'']{4,300}$'),
  published boolean not null default true,
  created_by uuid, created_at timestamptz not null default now()
);
create table if not exists public.ch_class_regs (
  class_id bigint not null references public.ch_classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
alter table public.ch_classes enable row level security;
alter table public.ch_class_regs enable row level security;
revoke all on public.ch_classes, public.ch_class_regs from anon, authenticated;

-- list: everyone can read published sessions. The join link only shows to a registered member from 15 minutes before the start until the
-- session ends (staff always see both links so they can edit them). The recording link shows to everyone once the session has ended.
create or replace function public.ch_classes_list() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by (x ->> 'starts_at') desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', c.id, 'title', c.title, 'host', c.host, 'topic', c.topic, 'description', c.description,
      'starts_at', c.starts_at, 'minutes', c.minutes, 'capacity', c.capacity, 'published', c.published,
      'taken', (select count(*) from public.ch_class_regs g where g.class_id = c.id),
      'registered', exists (select 1 from public.ch_class_regs g where g.class_id = c.id and g.user_id = auth.uid()),
      'ended', now() >= c.starts_at + make_interval(mins => c.minutes),
      'join_url', case when public.is_staff(auth.uid()) then c.join_url
                       when exists (select 1 from public.ch_class_regs g where g.class_id = c.id and g.user_id = auth.uid())
                         and now() >= c.starts_at - interval '15 minutes' and now() < c.starts_at + make_interval(mins => c.minutes) then c.join_url end,
      'recording_url', case when public.is_staff(auth.uid()) or now() >= c.starts_at + make_interval(mins => c.minutes) then c.recording_url end
    ) x from public.ch_classes c where c.published or public.is_staff(auth.uid())
  ) q
$$;
revoke execute on function public.ch_classes_list() from public;
grant execute on function public.ch_classes_list() to anon, authenticated;

create or replace function public.ch_class_register(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.ch_classes;
begin
  if not public.is_active(auth.uid()) then raise exception 'forbidden'; end if;
  select * into c from public.ch_classes where id = p_id and published for update;
  if not found then raise exception 'not found'; end if;
  if now() >= c.starts_at + make_interval(mins => c.minutes) then raise exception 'ended'; end if;
  if exists (select 1 from public.ch_class_regs where class_id = p_id and user_id = auth.uid()) then return; end if;
  if c.capacity is not null and (select count(*) from public.ch_class_regs where class_id = p_id) >= c.capacity then raise exception 'full'; end if;
  insert into public.ch_class_regs(class_id, user_id) values (p_id, auth.uid());
end $$;
revoke execute on function public.ch_class_register(bigint) from public, anon;
grant execute on function public.ch_class_register(bigint) to authenticated;

create or replace function public.ch_class_unregister(p_id bigint) returns void
language sql security definer set search_path = '' as $$
  delete from public.ch_class_regs where class_id = p_id and user_id = auth.uid()
$$;
revoke execute on function public.ch_class_unregister(bigint) from public, anon;
grant execute on function public.ch_class_unregister(bigint) to authenticated;

-- staff: create or edit a session. Returns the id.
create or replace function public.ch_class_save(p jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare cid bigint := nullif(p ->> 'id', '')::bigint; t text := btrim(coalesce(p ->> 'title', '')); hs text := btrim(coalesce(p ->> 'host', ''));
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  if t ~ '[<>\u0000-\u001f]' or hs ~ '[<>\u0000-\u001f]' then raise exception 'invalid text'; end if;
  if cid is null then
    insert into public.ch_classes(title, host, topic, description, starts_at, minutes, capacity, join_url, recording_url, published, created_by)
    values (t, hs, nullif(btrim(p ->> 'topic'), ''), nullif(btrim(p ->> 'description'), ''), (p ->> 'starts_at')::timestamptz, (p ->> 'minutes')::int,
            nullif(p ->> 'capacity', '')::int, nullif(btrim(p ->> 'join_url'), ''), nullif(btrim(p ->> 'recording_url'), ''), coalesce((p ->> 'published')::boolean, true), auth.uid())
    returning id into cid;
  else
    update public.ch_classes set title = t, host = hs, topic = nullif(btrim(p ->> 'topic'), ''), description = nullif(btrim(p ->> 'description'), ''),
      starts_at = (p ->> 'starts_at')::timestamptz, minutes = (p ->> 'minutes')::int, capacity = nullif(p ->> 'capacity', '')::int,
      join_url = nullif(btrim(p ->> 'join_url'), ''), recording_url = nullif(btrim(p ->> 'recording_url'), ''), published = coalesce((p ->> 'published')::boolean, true)
    where id = cid;
    if not found then raise exception 'not found'; end if;
  end if;
  insert into public.audit_log(actor, action, meta) values (auth.uid(), 'ch_change', jsonb_build_object('kind', 'class', 'id', cid));
  return cid;
end $$;
revoke execute on function public.ch_class_save(jsonb) from public, anon;
grant execute on function public.ch_class_save(jsonb) to authenticated;

create or replace function public.ch_class_delete(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  delete from public.ch_classes where id = p_id;
  insert into public.audit_log(actor, action, meta) values (auth.uid(), 'ch_change', jsonb_build_object('kind', 'class_delete', 'id', p_id));
end $$;
revoke execute on function public.ch_class_delete(bigint) from public, anon;
grant execute on function public.ch_class_delete(bigint) to authenticated;
