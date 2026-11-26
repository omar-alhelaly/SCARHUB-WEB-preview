-- 039: optional reason + opt-in email when staff delete an account, delete someone else's message, or clear a user's chat.
-- Reason is optional. An email is queued ONLY when the staff member wrote a reason (3-500 chars) AND ticked "send to the user by email".
-- The recipient is always read from the affected account's own record here in the database (never from the client), captured BEFORE the deletion.
-- Sending happens in the send-notices Edge Function (Gmail SMTP); a send failure never undoes the deletion and is written to the log.

create table if not exists public.notice_outbox (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('account_deleted', 'message_deleted', 'chat_cleared')),
  to_user uuid, to_name text, to_email text not null,
  reason text not null check (char_length(reason) between 3 and 500),
  requested_by uuid not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  error text, created_at timestamptz not null default now(), sent_at timestamptz
);
alter table public.notice_outbox enable row level security;
revoke all on public.notice_outbox from anon, authenticated;
create index if not exists notice_outbox_actor_idx on public.notice_outbox(requested_by, created_at);

-- queue one notice. Returns the outbox id, or null when skipped (rate limit / no valid address). Skips are written to the log.
create or replace function public.queue_notice(p_kind text, p_to uuid, p_reason text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare em text; nm text; qid bigint; why text;
begin
  select coalesce(nullif(p.email, ''), u.email), p.username into em, nm from public.profiles p left join auth.users u on u.id = p.id where p.id = p_to;
  if em is null or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(em) > 254 then why := 'no_address';
  elsif (select count(*) from public.notice_outbox where requested_by = auth.uid() and created_at > now() - interval '1 hour') >= 10 then why := 'rate_limit_actor';
  elsif (select count(*) from public.notice_outbox where created_at > now() - interval '1 day') >= 100 then why := 'rate_limit_global';
  elsif exists (select 1 from public.notice_outbox where to_user = p_to and kind = p_kind and created_at > now() - interval '10 minutes') then why := 'duplicate';
  end if;
  if why is not null then
    insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'notice_skipped', p_to, jsonb_build_object('kind', p_kind, 'why', why));
    return null;
  end if;
  insert into public.notice_outbox(kind, to_user, to_name, to_email, reason, requested_by) values (p_kind, p_to, nm, em, p_reason, auth.uid()) returning id into qid;
  return qid;
end $$;
revoke execute on function public.queue_notice(text, uuid, text) from public, anon, authenticated;

-- reason helper: trimmed, max 500, null when empty
create or replace function public.clean_reason(p text) returns text language sql immutable set search_path = '' as $$
  select nullif(left(btrim(coalesce(p, '')), 500), '')
$$;
revoke execute on function public.clean_reason(text) from public, anon, authenticated;

-- send side: only the Edge Function (service role) claims and finishes notices
create or replace function public.claim_notices(p_actor uuid) returns setof public.notice_outbox
language sql security definer set search_path = '' as $$
  update public.notice_outbox set status = 'sending' where id in (
    select id from public.notice_outbox where status = 'pending' and requested_by = p_actor and created_at > now() - interval '1 day' order by id limit 5 for update skip locked)
  returning *
$$;
create or replace function public.finish_notice(p_id bigint, p_ok boolean, p_err text) returns void
language plpgsql security definer set search_path = '' as $$
declare n public.notice_outbox;
begin
  update public.notice_outbox set status = case when p_ok then 'sent' else 'failed' end, error = left(p_err, 200), sent_at = case when p_ok then now() end
    where id = p_id and status = 'sending' returning * into n;
  if found then
    insert into public.audit_log(actor, action, target, meta) values (n.requested_by, case when p_ok then 'notice_sent' else 'notice_failed' end, n.to_user,
      jsonb_build_object('kind', n.kind, 'outbox', n.id, 'error', case when p_ok then null else left(p_err, 200) end));
  end if;
end $$;
revoke execute on function public.claim_notices(uuid), public.finish_notice(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_notices(uuid), public.finish_notice(bigint, boolean, text) to service_role;

-- account deletion (owner only, as before). New optional params; the old 1-argument call still works.
drop function if exists public.admin_delete_user(uuid);
create or replace function public.admin_delete_user(target uuid, p_reason text default null, p_notify boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare r text := public.clean_reason(p_reason); qid bigint; ns text;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if target = auth.uid() then raise exception 'cannot change your own account'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'owner') then raise exception 'owner cannot be deleted'; end if;
  if not exists (select 1 from public.profiles where id = target and status <> 'deleted') then raise exception 'not found'; end if;
  if p_notify and r is not null and char_length(r) >= 3 then
    qid := public.queue_notice('account_deleted', target, r);   -- address captured here, before the account is removed
    ns := case when qid is null then 'skipped' else 'queued' end;
  end if;
  update public.profiles set status = 'deleted', deleted_at = now() where id = target;
  delete from auth.users where id = target;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'admin_delete_user', target, jsonb_strip_nulls(jsonb_build_object('reason', r, 'notice', ns)));
end $$;
revoke execute on function public.admin_delete_user(uuid, text, boolean) from public, anon;
grant execute on function public.admin_delete_user(uuid, text, boolean) to authenticated;

-- message deletion: same rules as before; moderation deletes (not your own) can carry a reason and an opt-in email to the author
drop function if exists public.delete_message(text, bigint);
create or replace function public.delete_message(p_scope text, p_id bigint, p_reason text default null, p_notify boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare au uuid; ch text; mine boolean; r text := public.clean_reason(p_reason); qid bigint; ns text;
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
  if not mine and p_notify and r is not null and char_length(r) >= 3 then
    qid := public.queue_notice('message_deleted', au, r);
    ns := case when qid is null then 'skipped' else 'queued' end;
  end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'delete_message', au,
    jsonb_strip_nulls(jsonb_build_object('scope', p_scope, 'message', p_id, 'self', mine, 'channel', ch, 'reason', case when mine then null else r end, 'notice', ns)));
end $$;
revoke execute on function public.delete_message(text, bigint, text, boolean) from public, anon;
grant execute on function public.delete_message(text, bigint, text, boolean) to authenticated;

-- clear all of a user's community chat messages (soft delete, same as single deletes). Staff only; the owner's chat cannot be cleared.
create or replace function public.admin_clear_user_chat(target uuid, p_reason text default null, p_notify boolean default false) returns integer
language plpgsql security definer set search_path = '' as $$
declare r text := public.clean_reason(p_reason); n integer; qid bigint; ns text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  if target = auth.uid() then raise exception 'cannot change your own account'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'owner') then raise exception 'owner chat cannot be cleared'; end if;
  if not exists (select 1 from public.profiles where id = target) then raise exception 'not found'; end if;
  update public.chat_messages set deleted_at = now(), deleted_by = auth.uid() where user_id = target and deleted_at is null;
  get diagnostics n = row_count;
  if n > 0 and p_notify and r is not null and char_length(r) >= 3 then
    qid := public.queue_notice('chat_cleared', target, r);
    ns := case when qid is null then 'skipped' else 'queued' end;
  end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'clear_user_chat', target, jsonb_strip_nulls(jsonb_build_object('count', n, 'reason', r, 'notice', ns)));
  return n;
end $$;
revoke execute on function public.admin_clear_user_chat(uuid, text, boolean) from public, anon;
grant execute on function public.admin_clear_user_chat(uuid, text, boolean) to authenticated;
