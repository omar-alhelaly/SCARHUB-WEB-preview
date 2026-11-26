-- 046: forgiving answer matching. Answers are compared after: lower case, collapsed spaces, and trimming spaces and . , ; : ! ? " ' ` from both ends.
-- Run ch_set_answers again for every task after changing this function (the stored hashes depend on it).
create or replace function public.ch_hash(p_task bigint, p_ans text) returns text
language sql stable security definer set search_path = '' as $$
  select encode(sha256(convert_to((select pepper from public.ch_secret where id = 1) || ':' || t.salt || ':' || btrim(lower(btrim(regexp_replace(coalesce(p_ans, ''), '\s+', ' ', 'g'))), ' .,;:!?"''`'), 'UTF8')), 'hex')
  from public.ch_tasks t where t.id = p_task
$$;
revoke execute on function public.ch_hash(bigint, text) from public, anon, authenticated;
