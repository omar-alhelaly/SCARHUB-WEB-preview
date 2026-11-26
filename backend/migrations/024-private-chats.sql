-- 024: private 1:1 chats. Only the two participants can read or write. The OWNER (not admins) can review them read-only through owner_view_dm, and every view is written to the audit log.
create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null, user_b uuid not null,
  created_at timestamptz not null default now(), last_at timestamptz not null default now(),
  check (user_a < user_b), unique (user_a, user_b)
);
create table if not exists public.dm_messages (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender uuid not null, body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists dm_msg_thread on public.dm_messages (thread_id, created_at desc);
alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;
create policy dmt_read on public.dm_threads for select to authenticated using (auth.uid() in (user_a, user_b) and public.is_active(auth.uid()));
create policy dmm_read on public.dm_messages for select to authenticated using (public.is_active(auth.uid()) and exists (select 1 from public.dm_threads t where t.id = thread_id and auth.uid() in (t.user_a, t.user_b)));
create policy dmm_insert on public.dm_messages for insert to authenticated with check (sender = auth.uid() and public.is_active(auth.uid()) and not public.is_blocked(auth.uid(), 'chat') and exists (select 1 from public.dm_threads t where t.id = thread_id and auth.uid() in (t.user_a, t.user_b)));
revoke all on public.dm_threads, public.dm_messages from anon, authenticated;
grant select on public.dm_threads to authenticated;
grant select, insert on public.dm_messages to authenticated;

create or replace function public.dm_before_insert() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.dm_messages where sender = new.sender and created_at > now() - interval '10 seconds') >= 5 then raise exception 'slow down'; end if;
  new.body := btrim(new.body);
  if char_length(new.body) < 1 then raise exception 'empty'; end if;
  update public.dm_threads set last_at = now() where id = new.thread_id;
  return new;
end $$;
create trigger dm_rate before insert on public.dm_messages for each row execute function public.dm_before_insert();

create or replace function public.dm_open(target uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare a uuid; b uuid; tid uuid;
begin
  if not public.is_active(auth.uid()) or public.is_blocked(auth.uid(), 'chat') then raise exception 'forbidden'; end if;
  if target = auth.uid() or not public.is_active(target) then raise exception 'not found'; end if;
  a := least(auth.uid(), target); b := greatest(auth.uid(), target);
  insert into public.dm_threads(user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
  select id into tid from public.dm_threads where user_a = a and user_b = b;
  return tid;
end $$;

create or replace function public.owner_list_dms() returns table (thread_id uuid, a_name text, b_name text, last_at timestamptz, msgs bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  return query select t.id, pa.username::text, pb.username::text, t.last_at, (select count(*) from public.dm_messages m where m.thread_id = t.id)
    from public.dm_threads t join public.profiles pa on pa.id = t.user_a join public.profiles pb on pb.id = t.user_b order by t.last_at desc limit 200;
end $$;

create or replace function public.owner_view_dm(p_thread uuid) returns table (sender_name text, body text, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare t public.dm_threads; na text; nb text;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  select * into t from public.dm_threads where id = p_thread;
  if not found then raise exception 'not found'; end if;
  select username::text into na from public.profiles where id = t.user_a; select username::text into nb from public.profiles where id = t.user_b;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'view_dm', t.user_a, jsonb_build_object('thread', p_thread, 'users', na || ' & ' || nb));
  return query select coalesce(p.username::text, '?'), m.body, m.created_at from public.dm_messages m left join public.profiles p on p.id = m.sender where m.thread_id = p_thread order by m.created_at asc limit 500;
end $$;

revoke execute on function public.dm_open(uuid), public.owner_list_dms(), public.owner_view_dm(uuid) from public, anon;
grant execute on function public.dm_open(uuid), public.owner_list_dms(), public.owner_view_dm(uuid) to authenticated;
alter publication supabase_realtime add table public.dm_messages;
