-- 011: the owner can block (ban) and unblock any user, and delete any user. Enforced in the database.
-- Banned users cannot log in or refresh a token (auth.users.banned_until = infinity) and lose every session.
-- The owner account and the caller's own account can never be blocked or deleted.
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check check (status in ('active', 'deleted', 'banned'));

create or replace function public.admin_set_ban(target uuid, ban boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if target = auth.uid() then raise exception 'cannot change your own account'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'owner') then raise exception 'owner cannot be blocked'; end if;
  if not exists (select 1 from public.profiles where id = target and status in ('active', 'banned')) then raise exception 'not found'; end if;
  update public.profiles set status = case when ban then 'banned' else 'active' end where id = target;
  update auth.users set banned_until = case when ban then 'infinity'::timestamptz else null end where id = target;
  if ban then
    delete from auth.refresh_tokens where user_id = target::text;
    delete from auth.sessions where user_id = target;
  end if;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), case when ban then 'ban_user' else 'unban_user' end, target, '{}'::jsonb);
end $$;

create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if target = auth.uid() then raise exception 'cannot change your own account'; end if;
  if exists (select 1 from public.profiles where id = target and role = 'owner') then raise exception 'owner cannot be deleted'; end if;
  if not exists (select 1 from public.profiles where id = target and status <> 'deleted') then raise exception 'not found'; end if;
  update public.profiles set status = 'deleted', deleted_at = now() where id = target;
  delete from auth.users where id = target;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'admin_delete_user', target, '{}'::jsonb);
end $$;

revoke execute on function public.admin_set_ban(uuid, boolean), public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_set_ban(uuid, boolean), public.admin_delete_user(uuid) to authenticated;
