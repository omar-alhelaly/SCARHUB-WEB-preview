-- 020: regular users keep English-only usernames; owner/admin may use Arabic or English usernames and display names (alias). Staff can change their own display name.
alter table public.profiles drop constraint profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (
  (role = 'user' and username ~ '^[A-Za-z][A-Za-z0-9_]{2,19}$'::citext)
  or (role <> 'user' and username ~ '^[A-Za-zء-ي][A-Za-z0-9_ء-ي ]{2,19}$'::citext));
alter table public.profiles drop constraint profiles_alias_check;
alter table public.profiles add constraint profiles_alias_check check (alias is null or alias ~ '^[A-Za-zء-ي][A-Za-z0-9_ء-ي ]{2,24}$'::citext);

create or replace function public.update_my_alias(new_alias text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  update public.profiles set alias = new_alias where id = auth.uid();
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'set_alias', auth.uid(), jsonb_build_object('alias', new_alias));
end $$;
revoke execute on function public.update_my_alias(text) from public, anon;
grant execute on function public.update_my_alias(text) to authenticated;
