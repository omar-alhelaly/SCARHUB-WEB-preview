-- 030: contact details editable by the OWNER only. Public read, no write grants at all: the only way to change a row is set_contact(),
-- which checks is_owner(), validates the format (trigger) and writes the change to the audit log (shown in Admin > Logs).
create table if not exists public.site_contact (
  key text primary key check (key in ('email', 'whatsapp', 'linkedin', 'github', 'tiktok', 'facebook', 'instagram')),
  value text not null check (char_length(value) between 3 and 400),
  label text not null check (char_length(label) between 1 and 60),
  updated_at timestamptz not null default now(), updated_by uuid
);
alter table public.site_contact enable row level security;
drop policy if exists sc_read on public.site_contact;
create policy sc_read on public.site_contact for select to anon, authenticated using (true);
revoke all on public.site_contact from anon, authenticated;
grant select on public.site_contact to anon, authenticated;

create or replace function public.site_contact_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  new.value := btrim(new.value); new.label := btrim(new.label);
  if new.label !~ '^[^<>\u0001-\u001f]+$' then raise exception 'invalid label'; end if;
  if new.key = 'email' then
    if new.value !~ '^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$' then raise exception 'invalid email'; end if;
  elsif new.key = 'whatsapp' then
    if regexp_replace(new.value, '[\s()-]', '', 'g') !~ '^\+?[0-9]{8,15}$' then raise exception 'invalid phone number (digits with country code)'; end if;
  elsif new.key = 'linkedin' then if new.value !~ '^https://([a-z]{2,3}\.)?linkedin\.com/[^\s<>"'']{1,255}$' then raise exception 'invalid linkedin link'; end if;
  elsif new.key = 'github' then if new.value !~ '^https://github\.com/[^\s<>"'']{1,255}$' then raise exception 'invalid github link'; end if;
  elsif new.key = 'tiktok' then if new.value !~ '^https://(www\.)?tiktok\.com/[^\s<>"'']{1,255}$' then raise exception 'invalid tiktok link'; end if;
  elsif new.key = 'facebook' then if new.value !~ '^https://(www\.|m\.)?(facebook\.com|fb\.com|fb\.me)/[^\s<>"'']{1,255}$' then raise exception 'invalid facebook link'; end if;
  elsif new.key = 'instagram' then if new.value !~ '^https://(www\.)?instagram\.com/[^\s<>"'']{1,255}$' then raise exception 'invalid instagram link'; end if;
  end if;
  return new;
end $$;
drop trigger if exists site_contact_guard on public.site_contact;
create trigger site_contact_guard before insert or update on public.site_contact for each row execute function public.site_contact_guard();

insert into public.site_contact (key, value, label) values
  ('email', 'mrb9330@gmail.com', 'mrb9330@gmail.com'),
  ('whatsapp', '+20 109 665 1019', '+20 109 665 1019'),
  ('linkedin', 'https://www.linkedin.com/in/omar-abdulaziz-a092b8373', 'omar-abdulaziz'),
  ('github', 'https://github.com/omar-alhelaly', 'omar-alhelaly'),
  ('tiktok', 'https://www.tiktok.com/@omar_zezo3', '@omar_zezo3'),
  ('facebook', 'https://www.facebook.com/share/1GMnnrvuFQ/', 'Omar'),
  ('instagram', 'https://www.instagram.com/moctaep', '@moctaep')
on conflict (key) do nothing;

create or replace function public.set_contact(p_key text, p_value text, p_label text) returns void
language plpgsql security definer set search_path = '' as $$
declare old text;
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  select value into old from public.site_contact where key = p_key;
  if not found then raise exception 'unknown channel'; end if;
  update public.site_contact set value = p_value, label = p_label, updated_at = now(), updated_by = auth.uid() where key = p_key;
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'contact_change', auth.uid(), jsonb_build_object('users', p_key, 'old', old, 'new', btrim(p_value)));
end $$;
revoke execute on function public.set_contact(text, text, text) from public, anon;
grant execute on function public.set_contact(text, text, text) to authenticated;
