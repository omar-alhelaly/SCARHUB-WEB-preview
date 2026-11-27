-- 060: two more public community channels, Help and Lab talk. Same rules as General: signed-in active members read and write;
-- members can delete their own messages; staff moderate. Admins-only stays admins-only. Reactions and read receipts stay on General.
drop policy if exists chat_insert on public.chat_messages;
create policy chat_insert on public.chat_messages for insert to authenticated with check (
  user_id = auth.uid() and not public.is_blocked(auth.uid(), 'chat') and ((channel in ('general','help','labs') and public.is_active(auth.uid())) or (channel = 'admins' and public.is_staff(auth.uid()))));
drop policy if exists chat_read on public.chat_messages;
create policy chat_read on public.chat_messages for select to authenticated using (
  (deleted_at is null or public.is_staff(auth.uid())) and
  ((channel in ('general','help','labs') and public.is_active(auth.uid())) or (channel = 'admins' and public.is_staff(auth.uid()))));

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
  if not mine and p_notify and r is not null and char_length(r) >= 3 then
    qid := public.queue_notice('message_deleted', au, r);
    ns := case when qid is null then 'skipped' else 'queued' end;
  end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'delete_message', au,
    jsonb_strip_nulls(jsonb_build_object('scope', p_scope, 'message', p_id, 'self', mine, 'channel', ch, 'reason', case when mine then null else r end, 'notice', ns)));
end $$;
revoke execute on function public.delete_message(text, bigint, text, boolean) from public, anon;
grant execute on function public.delete_message(text, bigint, text, boolean) to authenticated;
