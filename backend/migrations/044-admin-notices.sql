-- 044: admin notices enabled (owner approved). Emails go out from the site account with From name "<alias> via SCAR" and Reply-To the admin's own email.
-- Owner switch: notice_settings.admin_notices (default on). Rate limits, reason + explicit tick, and the audit trail stay as before.
create table if not exists public.notice_settings (id int primary key default 1 check (id = 1), admin_notices boolean not null default true);
insert into public.notice_settings(id) values (1) on conflict do nothing;
alter table public.notice_settings enable row level security;
revoke all on public.notice_settings from public, anon, authenticated;

alter table public.notice_outbox add column if not exists by_name text, add column if not exists by_email text, add column if not exists by_role text;

create or replace function public.notice_settings_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  return (select jsonb_build_object('admin_notices', admin_notices) from public.notice_settings where id = 1);
end $$;
revoke execute on function public.notice_settings_get() from public, anon;
grant execute on function public.notice_settings_get() to authenticated;

create or replace function public.set_admin_notices(p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare old boolean;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  select admin_notices into old from public.notice_settings where id = 1;
  update public.notice_settings set admin_notices = p_on where id = 1;
  insert into public.audit_log(actor, action, meta) values (auth.uid(), 'notice_setting', jsonb_build_object('old', old, 'new', p_on));
end $$;
revoke execute on function public.set_admin_notices(boolean) from public, anon;
grant execute on function public.set_admin_notices(boolean) to authenticated;

create or replace function public.queue_notice(p_kind text, p_to uuid, p_reason text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare em text; nm text; qid bigint; why text; me_role text; me_alias text; me_email text; on_ boolean;
begin
  select p.role::text, coalesce(p.alias::text, p.username::text), p.email into me_role, me_alias, me_email from public.profiles p where p.id = auth.uid() and p.status = 'active';
  select admin_notices into on_ from public.notice_settings where id = 1;
  select coalesce(nullif(p.email, ''), u.email), p.username into em, nm from public.profiles p left join auth.users u on u.id = p.id where p.id = p_to;
  if me_role is null or me_role not in ('owner', 'admin') or not public.is_staff(auth.uid()) then why := 'not_staff';
  elsif me_role = 'admin' and not coalesce(on_, true) then why := 'admin_notices_off';
  elsif em is null or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(em) > 254 then why := 'no_address';
  elsif (select count(*) from public.notice_outbox where requested_by = auth.uid() and created_at > now() - interval '1 hour') >= 10 then why := 'rate_limit_actor';
  elsif (select count(*) from public.notice_outbox where created_at > now() - interval '1 day') >= 100 then why := 'rate_limit_global';
  elsif exists (select 1 from public.notice_outbox where to_user = p_to and kind = p_kind and created_at > now() - interval '10 minutes') then why := 'duplicate';
  end if;
  if why is not null then
    insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'notice_skipped', p_to, jsonb_build_object('kind', p_kind, 'why', why));
    return null;
  end if;
  insert into public.notice_outbox(kind, to_user, to_name, to_email, reason, requested_by, by_name, by_email, by_role)
    values (p_kind, p_to, nm, em, p_reason, auth.uid(), me_alias, me_email, me_role) returning id into qid;
  return qid;
end $$;
revoke execute on function public.queue_notice(text, uuid, text) from public, anon, authenticated;

create or replace function public.claim_notices(p_actor uuid) returns setof public.notice_outbox
language sql security definer set search_path = '' as $$
  update public.notice_outbox set status = 'sending' where id in (
    select n.id from public.notice_outbox n where n.status = 'pending' and n.requested_by = p_actor and n.created_at > now() - interval '1 day'
      and exists (select 1 from public.profiles pr where pr.id = p_actor and pr.status = 'active' and (pr.role = 'owner' or (pr.role = 'admin' and (select admin_notices from public.notice_settings where id = 1))))
    order by n.id limit 5 for update skip locked)
  returning *
$$;
revoke execute on function public.claim_notices(uuid) from public, anon, authenticated;
grant execute on function public.claim_notices(uuid) to service_role;

create or replace function public.finish_notice(p_id bigint, p_ok boolean, p_err text) returns void
language plpgsql security definer set search_path = '' as $$
declare n public.notice_outbox;
begin
  update public.notice_outbox set status = case when p_ok then 'sent' else 'failed' end, error = left(p_err, 200), sent_at = case when p_ok then now() end
    where id = p_id and status = 'sending' returning * into n;
  if found then
    insert into public.audit_log(actor, action, target, meta) values (n.requested_by, case when p_ok then 'notice_sent' else 'notice_failed' end, n.to_user,
      jsonb_strip_nulls(jsonb_build_object('kind', n.kind, 'outbox', n.id, 'reason', n.reason, 'by_role', n.by_role, 'error', case when p_ok then null else left(p_err, 200) end)));
  end if;
end $$;
revoke execute on function public.finish_notice(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.finish_notice(bigint, boolean, text) to service_role;
