-- 031: message info (delivered / seen). Nobody touches the table directly (RLS on, no policies, no grants): writes go through
-- mark_receipts() and reads through message_info(). Owner and admins are invisible readers in General chat: their reads are never recorded
-- and they are never listed as recipients. In private chats only the two participants are recorded; the owner reading through owner_view_dm records nothing.
-- Only the sender sees the info of a message (staff can read any; for private chats only the owner).
create table if not exists public.chat_receipts (
  scope text not null check (scope in ('chat', 'dm')),
  message_id bigint not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (scope, message_id, user_id)
);
alter table public.chat_receipts enable row level security;
revoke all on public.chat_receipts from anon, authenticated;

create or replace function public.mark_receipts(p_scope text, p_ids bigint[], p_seen boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.is_active(uid) or p_ids is null then return; end if;
  if p_scope = 'chat' then
    if public.is_staff(uid) then return; end if;   -- invisible readers
    insert into public.chat_receipts (scope, message_id, user_id, delivered_at, seen_at)
      select 'chat', m.id, uid, now(), case when p_seen then now() end from public.chat_messages m
      where m.id = any (p_ids[1:100]) and m.channel = 'general' and m.deleted_at is null and m.user_id <> uid
    on conflict (scope, message_id, user_id) do update set seen_at = coalesce(public.chat_receipts.seen_at, excluded.seen_at);
  elsif p_scope = 'dm' then
    insert into public.chat_receipts (scope, message_id, user_id, delivered_at, seen_at)
      select 'dm', m.id, uid, now(), case when p_seen then now() end from public.dm_messages m join public.dm_threads t on t.id = m.thread_id
      where m.id = any (p_ids[1:100]) and uid in (t.user_a, t.user_b) and m.sender <> uid and m.deleted_at is null
    on conflict (scope, message_id, user_id) do update set seen_at = coalesce(public.chat_receipts.seen_at, excluded.seen_at);
  end if;
end $$;

create or replace function public.message_info(p_scope text, p_id bigint) returns table (user_id uuid, display_name text, avatar text, delivered_at timestamptz, seen_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare au uuid; ts timestamptz; tid uuid;
begin
  if not public.is_active(auth.uid()) then raise exception 'forbidden'; end if;
  if p_scope = 'chat' then
    select m.user_id, m.created_at into au, ts from public.chat_messages m where m.id = p_id and m.channel = 'general' and (m.deleted_at is null or public.is_staff(auth.uid()));
    if not found then raise exception 'not found'; end if;
    if au <> auth.uid() and not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
    return query select p.id, p.display_name::text, p.avatar::text, r.delivered_at, r.seen_at
      from public.public_profiles p left join public.chat_receipts r on r.scope = 'chat' and r.message_id = p_id and r.user_id = p.id
      where p.role = 'user' and p.id <> au and p.joined <= ts order by r.seen_at nulls last, r.delivered_at nulls last, p.display_name limit 300;
  elsif p_scope = 'dm' then
    select m.sender, m.thread_id into au, tid from public.dm_messages m where m.id = p_id;
    if not found then raise exception 'not found'; end if;
    if au <> auth.uid() and not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
    return query select p.id, p.display_name::text, p.avatar::text, r.delivered_at, r.seen_at
      from public.dm_threads t join public.public_profiles p on p.id = case when t.user_a = au then t.user_b else t.user_a end
      left join public.chat_receipts r on r.scope = 'dm' and r.message_id = p_id and r.user_id = p.id where t.id = tid;
  else raise exception 'bad scope'; end if;
end $$;

create or replace function public.chat_receipt_cleanup() returns trigger language plpgsql security definer set search_path = '' as $$
begin delete from public.chat_receipts where scope = tg_argv[0] and message_id = old.id; return old; end $$;
drop trigger if exists chat_msg_rc_cleanup on public.chat_messages;
create trigger chat_msg_rc_cleanup after delete on public.chat_messages for each row execute function public.chat_receipt_cleanup('chat');
drop trigger if exists dm_msg_rc_cleanup on public.dm_messages;
create trigger dm_msg_rc_cleanup after delete on public.dm_messages for each row execute function public.chat_receipt_cleanup('dm');

revoke execute on function public.mark_receipts(text, bigint[], boolean), public.message_info(text, bigint), public.chat_receipt_cleanup() from public, anon;
grant execute on function public.mark_receipts(text, bigint[], boolean), public.message_info(text, bigint) to authenticated;
