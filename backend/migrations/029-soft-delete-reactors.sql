-- 029: soft delete of chat messages + "who reacted" list.
-- Users delete only their OWN messages (General chat and private chats, voice included) through delete_message(). Nothing is erased:
-- the row stays with deleted_at / deleted_by. Reads are enforced by RLS: regular users never see deleted rows; owner/admins still see
-- deleted General/Admins messages (marked deleted); deleted private messages are visible only to the owner through owner_view_dm.
alter table public.chat_messages add column if not exists deleted_at timestamptz, add column if not exists deleted_by uuid;
alter table public.dm_messages add column if not exists deleted_at timestamptz, add column if not exists deleted_by uuid;

drop policy if exists chat_read on public.chat_messages;
create policy chat_read on public.chat_messages for select to authenticated using (
  (deleted_at is null or public.is_staff(auth.uid())) and
  ((channel = 'general' and public.is_active(auth.uid())) or (channel = 'admins' and public.is_staff(auth.uid()))));
drop policy if exists dmm_read on public.dm_messages;
create policy dmm_read on public.dm_messages for select to authenticated using (
  deleted_at is null and public.is_active(auth.uid()) and exists (select 1 from public.dm_threads t where t.id = thread_id and auth.uid() in (t.user_a, t.user_b)));

create or replace function public.delete_message(p_scope text, p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare au uuid; ch text; mine boolean;
begin
  if not public.is_active(auth.uid()) then raise exception 'forbidden'; end if;
  if p_scope = 'chat' then
    select user_id, channel into au, ch from public.chat_messages where id = p_id and deleted_at is null;
    if not found then raise exception 'not found'; end if;
    mine := au = auth.uid();
    if not mine and not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
    if mine and not public.is_staff(auth.uid()) and ch <> 'general' then raise exception 'forbidden'; end if;
    update public.chat_messages set deleted_at = now(), deleted_by = auth.uid() where id = p_id;
  elsif p_scope = 'dm' then
    select sender into au from public.dm_messages where id = p_id and deleted_at is null;
    if not found then raise exception 'not found'; end if;
    mine := au = auth.uid();
    if not mine and not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
    if mine and not exists (select 1 from public.dm_messages m join public.dm_threads t on t.id = m.thread_id where m.id = p_id and auth.uid() in (t.user_a, t.user_b)) then raise exception 'forbidden'; end if;
    update public.dm_messages set deleted_at = now(), deleted_by = auth.uid() where id = p_id;
  else raise exception 'bad scope'; end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'delete_message', au, jsonb_build_object('scope', p_scope, 'message', p_id, 'self', mine, 'channel', ch));
end $$;
revoke execute on function public.delete_message(text, bigint) from public, anon;
grant execute on function public.delete_message(text, bigint) to authenticated;

-- reactions on deleted messages stay hidden from people who cannot see the message
create or replace function public.can_see_reaction_target(p_scope text, p_msg bigint, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when uid is null or not public.is_active(uid) then false
    when p_scope = 'chat' then exists (select 1 from public.chat_messages m where m.id = p_msg and (m.deleted_at is null or public.is_staff(uid)) and ((m.channel = 'general') or (m.channel = 'admins' and public.is_staff(uid))))
    when p_scope = 'dm' then exists (select 1 from public.dm_messages m join public.dm_threads t on t.id = m.thread_id where m.id = p_msg and m.deleted_at is null and uid in (t.user_a, t.user_b))
    else false end
$$;

-- who reacted with what (only for messages the caller can read)
create or replace function public.reaction_users(p_scope text, p_id bigint) returns table (emoji text, user_id uuid, display_name text, avatar text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_see_reaction_target(p_scope, p_id, auth.uid()) then return; end if;
  return query select r.emoji, r.user_id, coalesce(p.display_name::text, '?'), coalesce(p.avatar::text, 'b1')
    from public.chat_reactions r left join public.public_profiles p on p.id = r.user_id
    where r.scope = p_scope and r.message_id = p_id order by r.created_at limit 300;
end $$;
revoke execute on function public.reaction_users(text, bigint) from public, anon;
grant execute on function public.reaction_users(text, bigint) to authenticated;

-- owner view of private chats now shows the deletion marker
drop function if exists public.owner_view_dm(uuid);
create or replace function public.owner_view_dm(p_thread uuid) returns table (sender_name text, body text, created_at timestamptz, deleted_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare t public.dm_threads; na text; nb text;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  select * into t from public.dm_threads where id = p_thread;
  if not found then raise exception 'not found'; end if;
  select username::text into na from public.profiles where id = t.user_a; select username::text into nb from public.profiles where id = t.user_b;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'view_dm', t.user_a, jsonb_build_object('thread', p_thread, 'users', na || ' & ' || nb));
  return query select coalesce(p.username::text, '?'), m.body, m.created_at, m.deleted_at from public.dm_messages m left join public.profiles p on p.id = m.sender where m.thread_id = p_thread order by m.created_at asc limit 500;
end $$;
revoke execute on function public.owner_view_dm(uuid) from public, anon;
grant execute on function public.owner_view_dm(uuid) to authenticated;
