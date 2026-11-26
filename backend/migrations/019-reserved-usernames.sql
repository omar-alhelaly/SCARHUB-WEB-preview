-- 019: nobody may take a username that contains "zenoth" (case-insensitive, leetspeak, separators, repeated letters, Arabic). Existing owner row is untouched: only inserts and username changes are checked, and staff are exempt on update.
create or replace function public.is_reserved_name(u text) returns boolean
language sql immutable set search_path = '' as $$
  with n as (select regexp_replace(regexp_replace(translate(lower(coalesce(u, '')), '301!|4@5$7', 'eoiiiaasst'), '[^a-zء-ي]', '', 'g'), '(.)\1+', '\1', 'g') as s)
  select s like '%zenoth%' or s like '%زينوس%' or s like '%زينوث%' from n
$$;

create or replace function public.profiles_reserved_check() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'user' and (public.is_reserved_name(new.username::text) or public.is_reserved_name(new.alias::text)) then raise exception 'username not allowed'; end if;
  elsif new.username is distinct from old.username or new.alias is distinct from old.alias then
    if new.role = 'user' and (public.is_reserved_name(new.username::text) or public.is_reserved_name(new.alias::text)) then raise exception 'username not allowed'; end if;
  end if;
  return new;
end $$;
create trigger profiles_reserved_name before insert or update on public.profiles for each row execute function public.profiles_reserved_check();
