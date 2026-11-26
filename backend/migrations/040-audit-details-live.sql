-- 040: richer audit details + realtime logs.
-- Old/new values are now stored for role changes, bans, alias and wallet changes; names are kept for deleted accounts.
-- admin_logs adds readable extras (_id, plan name, payment amount/method, tool name) so the Logs page can show every detail without clicking.

create or replace function public.set_role(target uuid, new_role app_role, new_alias text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare old_role text; old_alias text;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if target = auth.uid() or new_role = 'owner' then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.profiles where id = target and status = 'active' and role <> 'owner') then raise exception 'not found'; end if;
  if new_role = 'admin' and (new_alias is null or new_alias !~ '^[A-Za-z][A-Za-z0-9_ ]{2,24}$') then raise exception 'alias required'; end if;
  select role::text, alias::text into old_role, old_alias from public.profiles where id = target;
  update public.profiles set role = new_role, alias = case when new_role = 'admin' then new_alias else null end where id = target;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'set_role', target,
    jsonb_strip_nulls(jsonb_build_object('role', new_role, 'old', old_role, 'alias', case when new_role = 'admin' then new_alias end, 'old_alias', old_alias)));
end $$;

create or replace function public.admin_set_ban(target uuid, ban boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare old_status text;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if target = auth.uid() then raise exception 'cannot change your own account'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'owner') then raise exception 'owner cannot be blocked'; end if;
  if not exists (select 1 from public.profiles where id = target and status in ('active', 'banned')) then raise exception 'not found'; end if;
  select status::text into old_status from public.profiles where id = target;
  update public.profiles set status = case when ban then 'banned' else 'active' end where id = target;
  update auth.users set banned_until = case when ban then 'infinity'::timestamptz else null end where id = target;
  if ban then
    delete from auth.refresh_tokens where user_id = target::text;
    delete from auth.sessions where user_id = target;
  end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), case when ban then 'ban_user' else 'unban_user' end, target,
    jsonb_build_object('old', old_status, 'new', case when ban then 'banned' else 'active' end));
end $$;

create or replace function public.update_my_alias(new_alias text) returns void
language plpgsql security definer set search_path = '' as $$
declare old_alias text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  select alias::text into old_alias from public.profiles where id = auth.uid();
  update public.profiles set alias = new_alias where id = auth.uid();
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'set_alias', auth.uid(), jsonb_strip_nulls(jsonb_build_object('alias', new_alias, 'old', old_alias)));
end $$;

create or replace function public.set_manual_instructions(w text, holder text, n text) returns void
language plpgsql security definer set search_path = '' as $$
declare ow text; oh text; onote text;
begin
 if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
 select wallet_number, holder_name, note into ow, oh, onote from public.manual_settings where id = 1;
 update public.manual_settings set wallet_number = w, holder_name = holder, note = nullif(n, ''), updated_at = now() where id = 1;
 insert into public.audit_log(actor, action, meta) values (auth.uid(), 'set_manual_instructions',
   jsonb_strip_nulls(jsonb_build_object('wallet_old', ow, 'wallet_new', w, 'holder_old', oh, 'holder_new', holder, 'note_changed', coalesce(onote, '') <> coalesce(nullif(n, ''), ''))));
end $$;

create or replace function public.admin_delete_user(target uuid, p_reason text default null, p_notify boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare r text := public.clean_reason(p_reason); qid bigint; ns text; nm text;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if target = auth.uid() then raise exception 'cannot change your own account'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'owner') then raise exception 'owner cannot be deleted'; end if;
  if not exists (select 1 from public.profiles where id = target and status <> 'deleted') then raise exception 'not found'; end if;
  if p_notify and r is not null and char_length(r) >= 3 then
    qid := public.queue_notice('account_deleted', target, r);   -- address captured here, before the account is removed
    ns := case when qid is null then 'skipped' else 'queued' end;
  end if;
  select coalesce(username::text, alias::text) into nm from public.profiles where id = target;
  update public.profiles set status = 'deleted', deleted_at = now() where id = target;
  delete from auth.users where id = target;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'admin_delete_user', target, jsonb_strip_nulls(jsonb_build_object('name', nm, 'reason', r, 'notice', ns)));
end $$;
revoke execute on function public.admin_delete_user(uuid, text, boolean) from public, anon;
grant execute on function public.admin_delete_user(uuid, text, boolean) to authenticated;

create or replace function public.admin_logs(p_limit integer default 200)
returns table(at timestamptz, action text, actor_name text, target_name text, meta jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  return query
    select l.at, l.action,
      case when a.role <> 'user' then a.alias::text else a.username::text end,
      case when t.role <> 'user' then t.alias::text else t.username::text end,
      coalesce(l.meta, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        '_id', l.id,
        '_plan', coalesce(pl.name, pl2.name),
        '_amount', pr.amount_minor, '_cur', pr.currency, '_method', pr.method, '_period', pr.period, '_rej', pr.reject_reason,
        '_tool', tl.name, '_role', t.role::text))
    from public.audit_log l
    left join public.profiles a on a.id = l.actor
    left join public.profiles t on t.id = l.target
    left join public.plans pl on pl.id = case when (l.meta->>'plan') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (l.meta->>'plan')::uuid end
    left join public.payment_requests pr on pr.id = case when (l.meta->>'request') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (l.meta->>'request')::uuid end
    left join public.plans pl2 on pl2.id = pr.plan_id
    left join public.tools tl on tl.id = case when (l.meta->>'tool') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (l.meta->>'tool')::uuid end
    order by l.at desc, l.id desc limit least(greatest(p_limit, 1), 500);
end $$;

do $$ begin
  begin alter publication supabase_realtime add table public.audit_log; exception when duplicate_object then null; end;
end $$;

-- backfill the previous role on old role-change entries (previous change for the same user, or "user" for the first one)
update public.audit_log l set meta = l.meta || jsonb_build_object('old', x.prev)
from (select id, coalesce(lag(meta->>'role') over (partition by target order by at, id), 'user') as prev from public.audit_log where action = 'set_role') x
where l.id = x.id and l.action = 'set_role' and not (l.meta ? 'old');
