-- 066: chat admins (chat moderators). A separate, limited role. A chat admin stays a normal member of the site (role 'user'):
-- they can delete other members' messages in the community channels and ban a member from CHAT ONLY (never from the site), nothing else.
-- The owner assigns and removes chat admins. Everything is enforced here (RLS and security definer functions), not in the page.
-- A deleted message is not removed: its text and voice file are moved to chat_message_audit (readable by staff only) and the row is blanked,
-- so people see "Deleted by admin <name>" and the original is never sent to normal users.

create table if not exists public.chat_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  granted_by uuid, created_at timestamptz not null default now());
alter table public.chat_admins enable row level security;
revoke all on public.chat_admins from anon, authenticated;

create table if not exists public.chat_message_audit (
  msg_id bigint primary key, user_id uuid, channel text, body text, audio_path text, audio_secs int,
  created_at timestamptz, deleted_at timestamptz, deleted_by uuid);
alter table public.chat_message_audit enable row level security;
revoke all on public.chat_message_audit from anon, authenticated;

create or replace function public.is_chat_admin(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.chat_admins c join public.profiles p on p.id = c.user_id where c.user_id = uid and p.status = 'active' and p.role = 'user') and public.is_active(uid)
$$;
revoke execute on function public.is_chat_admin(uuid) from public, anon;
grant execute on function public.is_chat_admin(uuid) to authenticated;

-- a voice message may be blank once deleted
alter table public.chat_messages drop constraint if exists chat_body_or_voice;
alter table public.chat_messages add constraint chat_body_or_voice check (deleted_at is not null or (char_length(body) between 1 and 1000) or (audio_path is not null and body = ''));

-- every soft delete (any path) archives the original and blanks the row
create or replace function public.chat_archive_on_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.chat_message_audit(msg_id, user_id, channel, body, audio_path, audio_secs, created_at, deleted_at, deleted_by)
      values (old.id, old.user_id, old.channel, old.body, old.audio_path, old.audio_secs, old.created_at, new.deleted_at, new.deleted_by) on conflict (msg_id) do nothing;
    new.body := ''; new.audio_path := null; new.audio_secs := null;
  end if;
  return new;
end $$;
drop trigger if exists chat_archive_on_delete on public.chat_messages;
create trigger chat_archive_on_delete before update on public.chat_messages for each row execute function public.chat_archive_on_delete();

-- already deleted messages: archive and blank them too
insert into public.chat_message_audit(msg_id, user_id, channel, body, audio_path, audio_secs, created_at, deleted_at, deleted_by)
  select id, user_id, channel, body, audio_path, audio_secs, created_at, deleted_at, deleted_by from public.chat_messages where deleted_at is not null on conflict (msg_id) do nothing;
update public.chat_messages set body = '', audio_path = null, audio_secs = null where deleted_at is not null;

-- read: a message deleted by someone else stays visible (blank, shown as "Deleted by admin"); one a member deleted themselves stays hidden, as before
drop policy if exists chat_read on public.chat_messages;
create policy chat_read on public.chat_messages for select to authenticated using (
  (deleted_at is null or deleted_by is distinct from user_id or public.is_staff(auth.uid())) and
  ((channel in ('general','help','labs') and public.is_active(auth.uid())) or (channel = 'admins' and public.is_staff(auth.uid()))));

-- voice files: staff can still open the archived original
drop policy if exists voice_read on storage.objects;
create policy voice_read on storage.objects for select to authenticated using (
  bucket_id = 'chat-voice' and public.is_active(auth.uid()) and ((storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.chat_messages m where m.audio_path = storage.objects.name)
    or (public.is_staff(auth.uid()) and exists (select 1 from public.chat_message_audit a where a.audio_path = storage.objects.name))));

-- staff only: the original of a deleted message
create or replace function public.chat_original(p_id bigint) returns table (body text, audio_path text, audio_secs int, author uuid, deleted_by uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  return query select a.body, a.audio_path, a.audio_secs, a.user_id, a.deleted_by from public.chat_message_audit a where a.msg_id = p_id;
end $$;
revoke execute on function public.chat_original(bigint) from public, anon;
grant execute on function public.chat_original(bigint) to authenticated;

-- owner assigns / removes chat admins
create or replace function public.set_chat_admin(target uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare trole public.app_role;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  select role into trole from public.profiles where id = target and status = 'active';
  if not found then raise exception 'not found'; end if;
  if p_on then
    if trole <> 'user' then raise exception 'staff already moderate'; end if;
    insert into public.chat_admins(user_id, granted_by) values (target, auth.uid()) on conflict (user_id) do nothing;
  else
    delete from public.chat_admins where user_id = target;
  end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'set_chat_admin', target, jsonb_build_object('on', p_on));
end $$;
revoke execute on function public.set_chat_admin(uuid, boolean) from public, anon;
grant execute on function public.set_chat_admin(uuid, boolean) to authenticated;

-- ids of chat admins (for the badge)
create or replace function public.chat_admin_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select c.user_id from public.chat_admins c join public.profiles p on p.id = c.user_id where p.status = 'active' and p.role = 'user' and public.is_active(auth.uid())
$$;
revoke execute on function public.chat_admin_ids() from public, anon;
grant execute on function public.chat_admin_ids() to authenticated;

-- delete: own message, staff (any), or a chat admin (members' messages in the community channels only, not staff, not other chat admins)
create or replace function public.delete_message(p_scope text, p_id bigint, p_reason text default null, p_notify boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare au uuid; ch text; mine boolean; r text := public.clean_reason(p_reason); qid bigint; ns text; byca boolean := false; arole public.app_role;
begin
  if not public.is_active(auth.uid()) then raise exception 'forbidden'; end if;
  if p_scope = 'chat' then
    select user_id, channel into au, ch from public.chat_messages where id = p_id and deleted_at is null;
    if not found then raise exception 'not found'; end if;
    mine := au = auth.uid();
    if not mine and not public.is_staff(auth.uid()) then
      select role into arole from public.profiles where id = au;
      if not (public.is_chat_admin(auth.uid()) and ch in ('general','help','labs') and arole = 'user' and not exists (select 1 from public.chat_admins where user_id = au)) then raise exception 'forbidden'; end if;
      byca := true;
    end if;
    if mine and not public.is_staff(auth.uid()) and ch not in ('general','help','labs') then raise exception 'forbidden'; end if;
    update public.chat_messages set deleted_at = now(), deleted_by = auth.uid() where id = p_id;
  elsif p_scope = 'dm' then
    select sender into au from public.dm_messages where id = p_id and deleted_at is null;
    if not found then raise exception 'not found'; end if;
    mine := au = auth.uid();
    if not mine and not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
    if mine and not exists (select 1 from public.dm_messages m join public.dm_threads t on t.id = m.thread_id where m.id = p_id and auth.uid() in (t.user_a, t.user_b)) then raise exception 'forbidden'; end if;
    update public.dm_messages set deleted_at = now(), deleted_by = auth.uid() where id = p_id;
  else raise exception 'bad scope'; end if;
  if not mine and not byca and p_notify and r is not null and char_length(r) >= 3 then
    qid := public.queue_notice('message_deleted', au, r);
    ns := case when qid is null then 'skipped' else 'queued' end;
  end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'delete_message', au,
    jsonb_strip_nulls(jsonb_build_object('scope', p_scope, 'message', p_id, 'self', mine, 'channel', ch, 'chat_admin', case when byca then true else null end, 'reason', case when mine then null else r end, 'notice', ns)));
end $$;
revoke execute on function public.delete_message(text, bigint, text, boolean) from public, anon;
grant execute on function public.delete_message(text, bigint, text, boolean) to authenticated;

-- chat admin: ban from CHAT only (1 hour to 30 days, reason required). Never the site, never staff or other chat admins.
create or replace function public.chat_ban_user(target uuid, p_reason text, p_hours int) returns void
language plpgsql security definer set search_path = '' as $$
declare trole public.app_role; rs text := left(btrim(coalesce(p_reason, '')), 200); exp timestamptz;
begin
  if not public.is_chat_admin(auth.uid()) then raise exception 'forbidden'; end if;
  if char_length(rs) < 3 then raise exception 'reason required'; end if;
  if p_hours is null or p_hours < 1 or p_hours > 720 then raise exception 'duration'; end if;
  if target = auth.uid() then raise exception 'cannot block yourself'; end if;
  select role into trole from public.profiles where id = target and status = 'active';
  if not found then raise exception 'not found'; end if;
  if trole <> 'user' or exists (select 1 from public.chat_admins where user_id = target) then raise exception 'forbidden'; end if;
  exp := now() + make_interval(hours => p_hours);
  update public.blocks set lifted_at = now(), lifted_by = auth.uid() where user_id = target and scope = 'chat' and lifted_at is null;
  insert into public.blocks(user_id, scope, reason, created_by, expires_at) values (target, 'chat', rs, auth.uid(), exp);
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'block_user', target, jsonb_build_object('scope', 'chat', 'reason', rs, 'until', exp, 'chat_admin', true));
end $$;
revoke execute on function public.chat_ban_user(uuid, text, int) from public, anon;
grant execute on function public.chat_ban_user(uuid, text, int) to authenticated;

-- chat admin: lift a chat ban that a chat admin set
create or replace function public.chat_unban_user(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_chat_admin(auth.uid()) then raise exception 'forbidden'; end if;
  update public.blocks b set lifted_at = now(), lifted_by = auth.uid()
    where b.user_id = target and b.scope = 'chat' and b.lifted_at is null and (b.expires_at is null or b.expires_at > now())
      and (b.created_by = auth.uid() or exists (select 1 from public.chat_admins c where c.user_id = b.created_by));
  if not found then raise exception 'no active ban you may lift'; end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'unblock_user', target, jsonb_build_object('scope', 'chat', 'chat_admin', true));
end $$;
revoke execute on function public.chat_unban_user(uuid) from public, anon;
grant execute on function public.chat_unban_user(uuid) to authenticated;

create or replace function public.chat_bans_list() returns table (user_id uuid, name text, reason text, expires_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_chat_admin(auth.uid()) then raise exception 'forbidden'; end if;
  return query select b.user_id, p.username::text, b.reason, b.expires_at from public.blocks b join public.profiles p on p.id = b.user_id
    where b.scope = 'chat' and b.lifted_at is null and (b.expires_at is null or b.expires_at > now())
      and (b.created_by = auth.uid() or exists (select 1 from public.chat_admins c where c.user_id = b.created_by)) order by b.created_at desc limit 100;
end $$;
revoke execute on function public.chat_bans_list() from public, anon;
grant execute on function public.chat_bans_list() to authenticated;
