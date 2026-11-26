-- 038: log usage-guide PDF uploads, replacements and removals (bucket tool-guides, object name = <slug>.pdf) as a tool_change with field 'guide'.
create or replace function public.tool_guides_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare b text := coalesce(new.bucket_id, old.bucket_id); nm text := coalesce(new.name, old.name); t record; act text;
begin
  if b <> 'tool-guides' or auth.uid() is null then return coalesce(new, old); end if;
  select id, name, slug into t from public.tools where slug || '.pdf' = nm;
  if found then
    act := case tg_op when 'INSERT' then 'added' when 'DELETE' then 'removed' else 'replaced' end;
    insert into public.audit_log(actor, action, meta) values (auth.uid(), 'tool_change',
      jsonb_build_object('tool_id', t.id, 'name', t.name, 'slug', t.slug, 'changes', jsonb_build_array(jsonb_build_object('f', 'guide', 'new', act))));
  end if;
  return coalesce(new, old);
end $$;
revoke execute on function public.tool_guides_audit() from public, anon, authenticated;
drop trigger if exists tool_guides_audit on storage.objects;
create trigger tool_guides_audit after insert or update or delete on storage.objects for each row execute function public.tool_guides_audit();
select 'GUIDE TRIGGER '||count(*) from pg_trigger where tgname='tool_guides_audit';
