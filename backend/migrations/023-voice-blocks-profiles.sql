-- 023: voice messages in chat, timed blocks (chat only or whole site), staff cannot act on the owner, role + join date in public_profiles, get_profile (public view + staff extras).
create table if not exists public.blocks (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  scope text not null check (scope in ('chat','site')),
  reason text not null check (char_length(reason) between 3 and 200),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  lifted_at timestamptz,
  lifted_by uuid
);
create index if not exists blocks_user_active on public.blocks (user_id, scope) where lifted_at is null;
alter table public.blocks enable row level security;
drop policy if exists blocks_read on public.blocks;
create policy blocks_read on public.blocks for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
revoke all on public.blocks from anon, authenticated;
grant select on public.blocks to authenticated;

create or replace function public.is_blocked(uid uuid, sc text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks b where b.user_id = uid and b.lifted_at is null and (b.expires_at is null or b.expires_at > now()) and (b.scope = sc or (sc = 'chat' and b.scope = 'site')))
$$;

create or replace function public.is_active(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.status = 'active') and not public.is_blocked(uid, 'site')
$$;
create or replace function public.is_staff(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.status = 'active' and p.role in ('owner', 'admin')) and public.mfa_ok(uid) and not public.is_blocked(uid, 'site')
$$;

create or replace function public.admin_block_user(target uuid, p_scope text, p_reason text, p_hours int) returns void
language plpgsql security definer set search_path = '' as $$
declare trole public.app_role; exp timestamptz; rs text := left(btrim(coalesce(p_reason, '')), 200);
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  if p_scope not in ('chat', 'site') then raise exception 'scope'; end if;
  if char_length(rs) < 3 then raise exception 'reason required'; end if;
  if target = auth.uid() then raise exception 'cannot block yourself'; end if;
  select role into trole from public.profiles where id = target and status = 'active';
  if not found then raise exception 'not found'; end if;
  if trole = 'owner' then raise exception 'owner cannot be blocked'; end if;
  if trole = 'admin' and not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if p_hours is not null then
    if p_hours < 1 or p_hours > 8760 then raise exception 'duration'; end if;
    exp := now() + make_interval(hours => p_hours);
  end if;
  update public.blocks set lifted_at = now(), lifted_by = auth.uid() where user_id = target and scope = p_scope and lifted_at is null;
  insert into public.blocks(user_id, scope, reason, created_by, expires_at) values (target, p_scope, rs, auth.uid(), exp);
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'block_user', target, jsonb_build_object('scope', p_scope, 'reason', rs, 'until', exp));
end $$;

create or replace function public.admin_unblock_user(target uuid, p_scope text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  update public.blocks set lifted_at = now(), lifted_by = auth.uid()
    where user_id = target and scope = p_scope and lifted_at is null and (expires_at is null or expires_at > now()) and (public.is_owner(auth.uid()) or created_by = auth.uid());
  if not found then raise exception 'no active block you may lift'; end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'unblock_user', target, jsonb_build_object('scope', p_scope));
end $$;

create or replace function public.my_blocks() returns table (scope text, reason text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.scope, b.reason, b.expires_at from public.blocks b where b.user_id = auth.uid() and b.lifted_at is null and (b.expires_at is null or b.expires_at > now()) order by (b.scope = 'site') desc
$$;

-- chat: voice columns, blocked users cannot post, voice messages are validated
alter table public.chat_messages add column if not exists audio_path text;
alter table public.chat_messages add column if not exists audio_secs int;
alter table public.chat_messages drop constraint if exists chat_messages_body_check;
alter table public.chat_messages add constraint chat_body_or_voice check ((char_length(body) between 1 and 1000) or (audio_path is not null and body = ''));

drop policy if exists chat_insert on public.chat_messages;
create policy chat_insert on public.chat_messages for insert to authenticated with check (
  user_id = auth.uid() and not public.is_blocked(auth.uid(), 'chat') and ((channel = 'general' and public.is_active(auth.uid())) or (channel = 'admins' and public.is_staff(auth.uid()))));

create or replace function public.chat_rate_limit() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.chat_messages where user_id = new.user_id and created_at > now() - interval '10 seconds') >= 5 then raise exception 'slow down'; end if;
  if new.audio_path is not null then
    if new.body <> '' or new.audio_path !~ ('^' || new.user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webm|ogg|m4a)$') or new.audio_secs is null or new.audio_secs not between 1 and 120 then raise exception 'voice'; end if;
    if not exists (select 1 from storage.objects where bucket_id = 'chat-voice' and name = new.audio_path) then raise exception 'voice missing'; end if;
    if (select count(*) from public.chat_messages where user_id = new.user_id and audio_path is not null and created_at > now() - interval '1 hour') >= 20 then raise exception 'voice rate'; end if;
  else
    new.body := btrim(new.body);
  end if;
  return new;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('chat-voice', 'chat-voice', false, 1572864, array['audio/webm','audio/ogg','audio/mp4'])
  on conflict (id) do update set public = false, file_size_limit = 1572864, allowed_mime_types = array['audio/webm','audio/ogg','audio/mp4'];
drop policy if exists voice_insert on storage.objects;
create policy voice_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'chat-voice' and public.is_active(auth.uid()) and not public.is_blocked(auth.uid(), 'chat')
  and name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webm|ogg|m4a)$')
  and (select count(*) from storage.objects o where o.bucket_id = 'chat-voice' and (storage.foldername(o.name))[1] = auth.uid()::text and o.created_at > now() - interval '1 hour') < 20);
drop policy if exists voice_read on storage.objects;
create policy voice_read on storage.objects for select to authenticated using (
  bucket_id = 'chat-voice' and public.is_active(auth.uid()) and ((storage.foldername(name))[1] = auth.uid()::text or exists (select 1 from public.chat_messages m where m.audio_path = storage.objects.name)));

-- badges: role and join date are safe to show
create or replace view public.public_profiles with (security_invoker = false) as
  select id, case when role in ('owner', 'admin') then alias else username end::text as display_name,
         case when avatar = 'custom' and role not in ('owner', 'admin') then 'b1' else avatar end as avatar,
         (role in ('owner', 'admin')) as is_staff, public.has_any_sub(id) as subscribed, role::text as role, created_at as joined
  from public.profiles where status = 'active';

create or replace function public.get_profile(target uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles; st boolean := public.is_staff(auth.uid()); ow boolean := public.is_owner(auth.uid()); r jsonb;
begin
  if not public.is_active(auth.uid()) then raise exception 'forbidden'; end if;
  select * into p from public.profiles where id = target;
  if not found or p.status = 'deleted' or (p.status <> 'active' and not st) then raise exception 'not found'; end if;
  r := jsonb_build_object('id', p.id, 'name', case when p.role <> 'user' then p.alias::text else p.username::text end,
    'avatar', case when p.avatar = 'custom' and p.role = 'user' then 'b1' else p.avatar end, 'role', p.role, 'joined', p.created_at,
    'subscribed', public.has_any_sub(p.id),
    'plans', (select coalesce(jsonb_agg(pl.name), '[]'::jsonb) from public.user_plan_access a join public.plans pl on pl.id = a.plan_id where a.user_id = p.id and a.current_period_end > now()),
    'all_access', public.has_active_sub(p.id),
    'messages', (select count(*) from public.chat_messages m where m.user_id = p.id and m.channel = 'general'),
    'voice', (select count(*) from public.chat_messages m where m.user_id = p.id and m.channel = 'general' and m.audio_path is not null),
    'last_post', (select max(m.created_at) from public.chat_messages m where m.user_id = p.id and m.channel = 'general'),
    'posts', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select m.body, m.audio_secs, m.created_at from public.chat_messages m where m.user_id = p.id and m.channel = 'general' order by m.created_at desc limit 5) x));
  if st then
    r := r || jsonb_build_object('staff', jsonb_build_object(
      'email', case when p.role = 'owner' and not ow then null else p.email::text end,
      'username', case when ow or p.role = 'user' then p.username::text else null end,
      'status', p.status,
      'payments', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select pl.name as plan, q.amount_minor, q.currency, q.status, q.method, q.created_at from public.payment_requests q left join public.plans pl on pl.id = q.plan_id where q.user_id = p.id order by q.created_at desc limit 10) x),
      'blocks', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select b.scope, b.reason, b.created_at, b.expires_at, b.lifted_at, coalesce(c.alias::text, c.username::text) as by from public.blocks b left join public.profiles c on c.id = b.created_by where b.user_id = p.id order by b.created_at desc limit 20) x),
      'logs', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select l.action, l.at from public.audit_log l where l.target = p.id and l.action <> 'login' order by l.at desc limit 15) x)));
  end if;
  return r;
end $$;

revoke execute on function public.admin_block_user(uuid, text, text, int), public.admin_unblock_user(uuid, text), public.my_blocks(), public.get_profile(uuid), public.is_blocked(uuid, text) from public, anon;
grant execute on function public.admin_block_user(uuid, text, text, int), public.admin_unblock_user(uuid, text), public.my_blocks(), public.get_profile(uuid) to authenticated;
