-- 028: emoji reactions on General/Admins chat messages and private (DM) messages.
-- Any single emoji is allowed (checked by a trigger), max 5 different emojis per user per message, max 10 reactions per 10 s per user.
-- Read access follows message access (checked in a SECURITY DEFINER helper so the policy never queries a table with its own policy: no recursion).
create table if not exists public.chat_reactions (
  id bigint generated always as identity primary key,
  scope text not null check (scope in ('chat', 'dm')),
  message_id bigint not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (scope, message_id, user_id, emoji)
);
create index if not exists chat_reactions_msg on public.chat_reactions (scope, message_id);
create index if not exists chat_reactions_user on public.chat_reactions (user_id, created_at desc);
alter table public.chat_reactions enable row level security;

create or replace function public.can_see_reaction_target(p_scope text, p_msg bigint, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when uid is null or not public.is_active(uid) then false
    when p_scope = 'chat' then exists (select 1 from public.chat_messages m where m.id = p_msg and ((m.channel = 'general') or (m.channel = 'admins' and public.is_staff(uid))))
    when p_scope = 'dm' then exists (select 1 from public.dm_messages m join public.dm_threads t on t.id = m.thread_id where m.id = p_msg and uid in (t.user_a, t.user_b))
    else false end
$$;

create policy cr_read on public.chat_reactions for select to authenticated using (public.can_see_reaction_target(scope, message_id, auth.uid()));
create policy cr_insert on public.chat_reactions for insert to authenticated with check (user_id = auth.uid() and public.is_active(auth.uid()) and not public.is_blocked(auth.uid(), 'chat') and public.can_see_reaction_target(scope, message_id, auth.uid()));
create policy cr_delete on public.chat_reactions for delete to authenticated using (user_id = auth.uid() and public.is_active(auth.uid()));
revoke all on public.chat_reactions from anon, authenticated;
grant select, insert, delete on public.chat_reactions to authenticated;

create or replace function public.chat_reaction_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.emoji := btrim(new.emoji);
  if new.emoji !~ '^[\U0001F000-\U0001FAFF\u2190-\u2BFF\u00A9\u00AE\u203C\u2049\u2122\u2139\u3030\u303D\u3297\u3299\uFE0F\u200D\u20E3]+$' then raise exception 'not an emoji'; end if;
  if (select count(*) from public.chat_reactions where user_id = new.user_id and created_at > now() - interval '10 seconds') >= 10 then raise exception 'slow down'; end if;
  if (select count(*) from public.chat_reactions where scope = new.scope and message_id = new.message_id and user_id = new.user_id) >= 5 then raise exception 'max 5 reactions per message'; end if;
  return new;
end $$;
drop trigger if exists chat_reaction_guard on public.chat_reactions;
create trigger chat_reaction_guard before insert on public.chat_reactions for each row execute function public.chat_reaction_guard();

create or replace function public.chat_reaction_cleanup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.chat_reactions where scope = tg_argv[0] and message_id = old.id;
  return old;
end $$;
drop trigger if exists chat_msg_rx_cleanup on public.chat_messages;
create trigger chat_msg_rx_cleanup after delete on public.chat_messages for each row execute function public.chat_reaction_cleanup('chat');
drop trigger if exists dm_msg_rx_cleanup on public.dm_messages;
create trigger dm_msg_rx_cleanup after delete on public.dm_messages for each row execute function public.chat_reaction_cleanup('dm');

create or replace function public.reaction_counts(p_scope text, p_ids bigint[]) returns table (message_id bigint, emoji text, n bigint, mine boolean)
language sql stable security definer set search_path = '' as $$
  select r.message_id, r.emoji, count(*), bool_or(r.user_id = auth.uid())
  from public.chat_reactions r
  where r.scope = p_scope and r.message_id = any (p_ids[1:200]) and public.can_see_reaction_target(r.scope, r.message_id, auth.uid())
  group by r.message_id, r.emoji
$$;

revoke execute on function public.can_see_reaction_target(text, bigint, uuid), public.reaction_counts(text, bigint[]) from public, anon;
grant execute on function public.can_see_reaction_target(text, bigint, uuid), public.reaction_counts(text, bigint[]) to authenticated;
revoke execute on function public.chat_reaction_guard(), public.chat_reaction_cleanup() from public, anon, authenticated;
alter publication supabase_realtime add table public.chat_reactions;
