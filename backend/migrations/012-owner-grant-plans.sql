-- 012: the owner can give any user a plan without payment, with an optional expiry, and take it back.
-- Enforced in the database: only the owner can call these. Access then works through has_tool_access like a paid plan.
-- Owner grants are marked (subscriptions.provider = 'owner_grant', user_plan_access.source = 'owner_grant'),
-- so revoking never touches a plan the user paid for.
alter table public.user_plan_access add column source text not null default 'payment' check (source in ('payment', 'owner_grant'));

create or replace function public.grant_period(uid uuid, per text, prov text, p_plan uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare sc text := 'all'; iv interval := case when per = 'year' then interval '1 year' else interval '1 month' end;
begin
  if p_plan is not null then select scope into sc from public.plans where id = p_plan; end if;
  if sc = 'tools' then
    insert into public.user_plan_access(user_id, plan_id, current_period_end) values (uid, p_plan, now() + iv)
    on conflict (user_id, plan_id) do update set updated_at = now(), source = 'payment',
      current_period_end = greatest(case when public.user_plan_access.current_period_end = 'infinity' then now() else public.user_plan_access.current_period_end end, now()) + iv;
  else
    insert into public.subscriptions(user_id, status, current_period_end, provider, updated_at) values (uid, 'active', now() + iv, prov, now())
    on conflict (user_id) do update set status = 'active', provider = excluded.provider, updated_at = now(),
      current_period_end = greatest(case when public.subscriptions.current_period_end = 'infinity' then now() else coalesce(public.subscriptions.current_period_end, now()) end, now()) + iv;
  end if;
end $$;
revoke execute on function public.grant_period(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.grant_period(uuid, text, text, uuid) to service_role;

-- p_plan null = access to all tools. p_until null = no expiry.
create or replace function public.admin_grant_plan(target uuid, p_plan uuid default null, p_until timestamptz default null) returns void
language plpgsql security definer set search_path = '' as $$
declare sc text := 'all'; e timestamptz := coalesce(p_until, 'infinity'::timestamptz);
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.profiles where id = target and status = 'active') then raise exception 'not found'; end if;
  if p_until is not null and p_until <= now() then raise exception 'expiry must be in the future'; end if;
  if p_plan is not null then
    select scope into sc from public.plans where id = p_plan;
    if not found then raise exception 'plan not found'; end if;
  end if;
  if sc = 'tools' then
    if exists (select 1 from public.user_plan_access where user_id = target and plan_id = p_plan and source = 'payment' and current_period_end > now()) then
      raise exception 'user already paid for this plan'; end if;
    insert into public.user_plan_access(user_id, plan_id, current_period_end, source) values (target, p_plan, e, 'owner_grant')
    on conflict (user_id, plan_id) do update set current_period_end = e, source = 'owner_grant', updated_at = now();
  else
    if exists (select 1 from public.subscriptions where user_id = target and provider <> 'owner_grant' and status in ('active', 'trialing') and current_period_end > now()) then
      raise exception 'user already has a paid subscription'; end if;
    insert into public.subscriptions(user_id, status, current_period_end, provider, updated_at) values (target, 'active', e, 'owner_grant', now())
    on conflict (user_id) do update set status = 'active', current_period_end = e, provider = 'owner_grant', updated_at = now();
  end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'grant_plan', target, jsonb_build_object('plan', p_plan, 'until', p_until));
end $$;

-- takes back an owner grant only; paid plans are never touched
create or replace function public.admin_revoke_plan(target uuid, p_plan uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare sc text := 'all'; n int;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if p_plan is not null then select scope into sc from public.plans where id = p_plan; end if;
  if sc = 'tools' then
    delete from public.user_plan_access where user_id = target and plan_id = p_plan and source = 'owner_grant';
  else
    update public.subscriptions set status = 'canceled', current_period_end = now(), updated_at = now() where user_id = target and provider = 'owner_grant';
  end if;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'no owner grant to revoke'; end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'revoke_plan', target, jsonb_build_object('plan', p_plan));
end $$;

-- every owner grant, for Admin > Accounts
create or replace function public.admin_list_grants() returns table(user_id uuid, plan_id uuid, plan_name text, ends timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  return query
    select s.user_id, null::uuid, null::text, s.current_period_end from public.subscriptions s where s.provider = 'owner_grant' and s.status = 'active' and s.current_period_end > now()
    union all
    select a.user_id, a.plan_id, p.name, a.current_period_end from public.user_plan_access a join public.plans p on p.id = a.plan_id where a.source = 'owner_grant' and a.current_period_end > now();
end $$;

revoke execute on function public.admin_grant_plan(uuid, uuid, timestamptz), public.admin_revoke_plan(uuid, uuid), public.admin_list_grants() from public, anon;
grant execute on function public.admin_grant_plan(uuid, uuid, timestamptz), public.admin_revoke_plan(uuid, uuid), public.admin_list_grants() to authenticated;
