-- 061: public contact form. Anyone can send one message through submit_contact(); only the OWNER can read or delete them.
-- The table has no direct grants. submit_contact validates length and format, ignores bot posts (hidden field) and rate limits.
-- Also: the contact list now keeps only email, LinkedIn and Instagram. WhatsApp, GitHub, TikTok and Facebook rows are removed.
create table if not exists public.contact_messages (
  id bigserial primary key,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) between 5 and 254),
  message text not null check (char_length(message) between 10 and 2000),
  created_at timestamptz not null default now(),
  is_read boolean not null default false
);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;

create or replace function public.submit_contact(p_name text, p_email text, p_message text, p_hp text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare n text := btrim(coalesce(p_name, '')); e text := lower(btrim(coalesce(p_email, ''))); m text := btrim(coalesce(p_message, ''));
begin
  if coalesce(p_hp, '') <> '' then return; end if;  -- bots fill the hidden field: pretend it worked, store nothing
  if char_length(n) not between 2 and 80 or n ~ '[\u0000-\u001f<>]' then raise exception 'invalid name'; end if;
  if char_length(e) > 254 or e !~ '^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$' then raise exception 'invalid email'; end if;
  if char_length(m) not between 10 and 2000 then raise exception 'invalid message'; end if;
  if (select count(*) from public.contact_messages where email = e and created_at > now() - interval '1 hour') >= 3 then raise exception 'slow down'; end if;
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 40 then raise exception 'slow down'; end if;
  insert into public.contact_messages(name, email, message) values (n, e, m);
end $$;
revoke execute on function public.submit_contact(text, text, text, text) from public;
grant execute on function public.submit_contact(text, text, text, text) to anon, authenticated;

create or replace function public.list_contact_messages() returns setof public.contact_messages
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  return query select * from public.contact_messages order by created_at desc limit 100;
end $$;
revoke execute on function public.list_contact_messages() from public, anon;
grant execute on function public.list_contact_messages() to authenticated;

create or replace function public.delete_contact_message(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  delete from public.contact_messages where id = p_id;
end $$;
revoke execute on function public.delete_contact_message(bigint) from public, anon;
grant execute on function public.delete_contact_message(bigint) to authenticated;

delete from public.site_contact where key in ('whatsapp', 'github', 'tiktok', 'facebook');
