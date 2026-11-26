-- 043: fix for notices never sending. The Edge Function read public.profiles with the service role key, which has no table
-- grants in this project, so every caller got 403. The function no longer reads tables; the database decides who may claim.
-- Per the owner's decision, only the owner's notices go out from the site mail account for now. Admin notices are skipped
-- and logged (notice_skipped / owner_only) until a sender option is chosen.
create or replace function public.claim_notices(p_actor uuid) returns setof public.notice_outbox
language sql security definer set search_path = '' as $$
  update public.notice_outbox set status = 'sending' where id in (
    select n.id from public.notice_outbox n where n.status = 'pending' and n.requested_by = p_actor and n.created_at > now() - interval '1 day'
      and exists (select 1 from public.profiles pr where pr.id = p_actor and pr.status = 'active' and pr.role = 'owner')
    order by n.id limit 5 for update skip locked)
  returning *
$$;
revoke execute on function public.claim_notices(uuid) from public, anon, authenticated;
grant execute on function public.claim_notices(uuid) to service_role;

create or replace function public.queue_notice(p_kind text, p_to uuid, p_reason text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare em text; nm text; qid bigint; why text;
begin
  select coalesce(nullif(p.email, ''), u.email), p.username into em, nm from public.profiles p left join auth.users u on u.id = p.id where p.id = p_to;
  if not public.is_owner(auth.uid()) then why := 'owner_only';
  elsif em is null or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(em) > 254 then why := 'no_address';
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

-- the pending row an admin queued before this fix will never be sent from the site account
update public.notice_outbox set status = 'failed', error = 'admin notices are not sent from the site account' where status = 'pending' and requested_by in (select id from public.profiles where role <> 'owner');
