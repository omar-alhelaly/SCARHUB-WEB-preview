-- 047: answer placeholder shape. Stores only the length of each word of the first accepted answer (for example "5" or "3 7"), never the answer.
alter table public.ch_tasks add column if not exists answer_mask text not null default '' check (answer_mask ~ '^([0-9]{1,3}( [0-9]{1,3}){0,7})?$');
create or replace function public.ch_set_answers(p_task bigint, p_answers text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare first_a text; mk text;
begin
  select a into first_a from unnest(p_answers) with ordinality as u(a, n) where btrim(coalesce(a, '')) <> '' order by n limit 1;
  select string_agg(char_length(w)::text, ' ' order by ord) into mk from regexp_split_to_table(btrim(regexp_replace(coalesce(first_a, ''), '\s+', ' ', 'g'), ' .,;:!?"''`'), ' ') with ordinality as s(w, ord) where w <> '';
  if mk is not null and (select count(*) from regexp_split_to_table(mk, ' ')) > 8 then mk := null; end if;
  update public.ch_tasks set answer_hashes = coalesce((select array_agg(distinct public.ch_hash(p_task, a)) from unnest(p_answers) a where btrim(coalesce(a, '')) <> ''), '{}'), answer_mask = coalesce(mk, '') where id = p_task;
end $$;
revoke execute on function public.ch_set_answers(bigint, text[]) from public, anon, authenticated;
create or replace function public.ch_room(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r record; uid uuid := auth.uid();
begin
  select * into r from public.ch_rooms where slug = p_slug and (published or public.is_staff(uid));
  if not found then return null; end if;
  return jsonb_build_object('id', r.id, 'section', r.section, 'slug', r.slug, 'title_en', r.title_en, 'title_ar', r.title_ar,
    'summary_en', r.summary_en, 'summary_ar', r.summary_ar, 'difficulty', r.difficulty, 'published', r.published, 'body', r.body,
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'question_en', t.question_en, 'question_ar', t.question_ar,
        'hint_en', t.hint_en, 'hint_ar', t.hint_ar, 'points', t.points, 'mask', t.answer_mask,
        'solved', exists (select 1 from public.ch_solves v where v.user_id = uid and v.task_id = t.id)) order by t.sort, t.id)
      from public.ch_tasks t where t.room_id = r.id), '[]'::jsonb));
end $$;
