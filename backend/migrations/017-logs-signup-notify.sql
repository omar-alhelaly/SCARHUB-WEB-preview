-- 017: Logs for staff + signup notification for the owner. Signups, logins, bans, deletes, grants, payments, role changes all land in audit_log.
create or replace function public.on_profile_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    insert into public.audit_log(actor, action, target, meta) values (new.id, 'signup', new.id, jsonb_build_object('user', new.username::text));
    insert into public.notifications(user_id, kind, meta) select p.id, 'new_user', jsonb_build_object('user', new.username::text) from public.profiles p where p.role = 'owner' and p.status = 'active' and p.id <> new.id;
  exception when others then null;   -- never block a signup because of logging
  end;
  return new;
end $$;
create trigger profiles_created_log after insert on public.profiles for each row execute function public.on_profile_created();

create or replace function public.log_login() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_active(auth.uid()) then return; end if;
  if exists (select 1 from public.audit_log where actor = auth.uid() and action = 'login' and at > now() - interval '10 minutes') then return; end if;
  insert into public.audit_log(actor, action, target) values (auth.uid(), 'login', auth.uid());
end $$;

create or replace function public.admin_logs(p_limit int default 200) returns table (at timestamptz, action text, actor_name text, target_name text, meta jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  return query select l.at, l.action, case when a.role <> 'user' then a.alias::text else a.username::text end, case when t.role <> 'user' then t.alias::text else t.username::text end, coalesce(l.meta, '{}'::jsonb)
    from public.audit_log l left join public.profiles a on a.id = l.actor left join public.profiles t on t.id = l.target
    order by l.at desc limit least(greatest(p_limit, 1), 500);
end $$;

revoke execute on function public.log_login(), public.admin_logs(int), public.on_profile_created() from public, anon;
grant execute on function public.log_login(), public.admin_logs(int) to authenticated;
