-- 049: certificate holder must be a full real name in English letters
begin;
create or replace function public.ch_issue_cert(p_path text, p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pp record; nm text := btrim(coalesce(p_name, '')); open_n int; cid text;
begin
  if uid is null then raise exception 'sign in required'; end if;
  nm := regexp_replace(nm, '\s+', ' ', 'g');
  if char_length(nm) < 5 or char_length(nm) > 60 or nm !~ '^[A-Za-z][A-Za-z.''-]*( [A-Za-z][A-Za-z.''-]*)+$' then raise exception 'enter your full name in English letters'; end if;
  select * into pp from public.ch_paths where slug = p_path and published;
  if not found then raise exception 'unknown path'; end if;
  select count(*) into open_n from unnest(pp.rooms) s(slug)
    join public.ch_rooms r on r.slug = s.slug
    where not exists (select 1 from public.ch_tasks t where t.room_id = r.id) or exists (
      select 1 from public.ch_tasks t where t.room_id = r.id and not exists (select 1 from public.ch_solves v where v.task_id = t.id and v.user_id = uid));
  if open_n > 0 or (select count(*) from unnest(pp.rooms) s(slug) join public.ch_rooms r on r.slug = s.slug) < array_length(pp.rooms, 1) then raise exception 'path not completed'; end if;
  select id into cid from public.ch_certs where user_id = uid and path = p_path;
  if cid is not null then return cid; end if;
  cid := 'SCAR-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
  insert into public.ch_certs(id, user_id, path, holder) values (cid, uid, p_path, nm);
  return cid;
end $$;

revoke execute on function public.ch_issue_cert(text, text) from public, anon, authenticated;
grant execute on function public.ch_issue_cert(text, text) to authenticated;
commit;
select 'CERT NAME RULE OK';
