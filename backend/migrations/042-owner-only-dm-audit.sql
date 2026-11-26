-- 042: "owner opened a private chat" entries live in their own owner-only table. Admins cannot read, count, filter,
-- subscribe to (Realtime) or infer them: they are not in audit_log at all, and audit_log refuses to store them.
create table if not exists public.owner_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid, action text not null, target uuid, meta jsonb not null default '{}'::jsonb
);
alter table public.owner_audit enable row level security;
revoke all on public.owner_audit from public, anon, authenticated;
grant select on public.owner_audit to authenticated;
drop policy if exists owner_audit_read on public.owner_audit;
create policy owner_audit_read on public.owner_audit for select to authenticated using (public.is_owner(auth.uid()));

insert into public.owner_audit(at, actor, action, target, meta) select at, actor, action, target, meta from public.audit_log where action = 'view_dm' order by id;
delete from public.audit_log where action = 'view_dm';

create or replace function public.audit_no_view_dm() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.action = 'view_dm' then
    insert into public.owner_audit(at, actor, action, target, meta) values (new.at, new.actor, new.action, new.target, new.meta);
    return null;
  end if;
  return new;
end $$;
drop trigger if exists audit_no_view_dm on public.audit_log;
create trigger audit_no_view_dm before insert on public.audit_log for each row execute function public.audit_no_view_dm();

drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated using (public.is_staff(auth.uid()) and action <> 'view_dm');

create or replace function public.owner_view_dm(p_thread uuid)
returns table(sender_name text, body text, created_at timestamptz, deleted_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare t public.dm_threads; na text; nb text;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  select * into t from public.dm_threads where id = p_thread;
  if not found then raise exception 'not found'; end if;
  select username::text into na from public.profiles where id = t.user_a; select username::text into nb from public.profiles where id = t.user_b;
  insert into public.owner_audit(actor, action, target, meta) values (auth.uid(), 'view_dm', t.user_a, jsonb_build_object('thread', p_thread, 'users', na || ' & ' || nb));
  return query select coalesce(p.username::text, '?'), m.body, m.created_at, m.deleted_at from public.dm_messages m left join public.profiles p on p.id = m.sender where m.thread_id = p_thread order by m.created_at asc limit 500;
end $$;

create or replace function public.admin_logs(p_limit integer default 200)
returns table(at timestamptz, action text, actor_name text, target_name text, meta jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  return query
    with src as (
      select 'a' || l.id::text as k, l.id as rid, l.at, l.action, l.actor, l.target, l.meta from public.audit_log l where l.action <> 'view_dm'
      union all
      select 'o' || o.id::text, o.id, o.at, o.action, o.actor, o.target, o.meta from public.owner_audit o where public.is_owner(auth.uid())
    )
    select l.at, l.action,
      case when a.role <> 'user' then a.alias::text else a.username::text end,
      case when t.role <> 'user' then t.alias::text else t.username::text end,
      coalesce(l.meta, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        '_id', l.k,
        '_plan', coalesce(pl.name, pl2.name),
        '_amount', pr.amount_minor, '_cur', pr.currency, '_method', pr.method, '_period', pr.period, '_rej', pr.reject_reason,
        '_tool', tl.name, '_role', t.role::text))
    from src l
    left join public.profiles a on a.id = l.actor
    left join public.profiles t on t.id = l.target
    left join public.plans pl on pl.id = case when (l.meta->>'plan') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (l.meta->>'plan')::uuid end
    left join public.payment_requests pr on pr.id = case when (l.meta->>'request') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (l.meta->>'request')::uuid end
    left join public.plans pl2 on pl2.id = pr.plan_id
    left join public.tools tl on tl.id = case when (l.meta->>'tool') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (l.meta->>'tool')::uuid end
    order by l.at desc, l.rid desc limit least(greatest(p_limit, 1), 500);
end $$;

do $$ begin
  begin alter publication supabase_realtime add table public.owner_audit; exception when duplicate_object then null; end;
end $$;
