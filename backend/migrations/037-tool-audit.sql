-- 037: readable audit log for tools. Who, which tool (name and slug), what changed (old to new for price), plus tool added and tool deleted.
-- Actions: tool_added, tool_change, tool_deleted. meta = {tool_id, name, slug, changes:[{f, old, new, ...}]}.
-- Only signed-in changes are logged (SQL editor / service role have no auth.uid()). The old tool_price entry is no longer written (tool_change replaces it).

create or replace function public.tools_price_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o boolean;
begin
  if auth.uid() is null then return new; end if;
  o := public.is_owner(auth.uid());
  if not o then
    if tg_op = 'INSERT' then
      if new.discount_percent <> 0 or new.discount_until is not null then raise exception 'only the owner can set discounts'; end if;
    else
      if new.created_by is distinct from old.created_by then raise exception 'forbidden'; end if;
      if new.discount_percent <> old.discount_percent or new.discount_until is distinct from old.discount_until then raise exception 'only the owner can set discounts'; end if;
      if (new.price_minor is distinct from old.price_minor or new.currency is distinct from old.currency) and old.created_by <> auth.uid() then
        raise exception 'you can only price your own tools'; end if;
    end if;
  end if;
  return new;
end $$;

create or replace function public.tools_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ch jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    insert into public.audit_log(actor, action, meta) values (auth.uid(), 'tool_added',
      jsonb_build_object('tool_id', new.id, 'name', new.name, 'slug', new.slug, 'class', new.class, 'visibility', new.visibility, 'status', new.status,
        'price', new.price_minor, 'currency', new.currency));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log(actor, action, meta) values (auth.uid(), 'tool_deleted',
      jsonb_build_object('tool_id', old.id, 'name', old.name, 'slug', old.slug));
    return old;
  end if;
  if new.price_minor is distinct from old.price_minor or new.currency is distinct from old.currency then
    ch := ch || jsonb_build_array(jsonb_build_object('f', 'price', 'old', old.price_minor, 'new', new.price_minor, 'cur_old', old.currency, 'cur', new.currency)); end if;
  if new.discount_percent is distinct from old.discount_percent or new.discount_until is distinct from old.discount_until then
    ch := ch || jsonb_build_array(jsonb_build_object('f', 'discount', 'old', old.discount_percent, 'new', new.discount_percent, 'until', new.discount_until)); end if;
  if new.visibility is distinct from old.visibility then ch := ch || jsonb_build_array(jsonb_build_object('f', 'visibility', 'old', old.visibility, 'new', new.visibility)); end if;
  if new.status is distinct from old.status then ch := ch || jsonb_build_array(jsonb_build_object('f', 'status', 'old', old.status, 'new', new.status)); end if;
  if new.name is distinct from old.name then ch := ch || jsonb_build_array(jsonb_build_object('f', 'name', 'old', old.name, 'new', new.name)); end if;
  if new.slug is distinct from old.slug then ch := ch || jsonb_build_array(jsonb_build_object('f', 'slug', 'old', old.slug, 'new', new.slug)); end if;
  if new.class is distinct from old.class then ch := ch || jsonb_build_array(jsonb_build_object('f', 'class', 'old', old.class, 'new', new.class)); end if;
  if new.description_en is distinct from old.description_en or new.description_ar is distinct from old.description_ar then ch := ch || jsonb_build_array(jsonb_build_object('f', 'description')); end if;
  if new.commands is distinct from old.commands then ch := ch || jsonb_build_array(jsonb_build_object('f', 'commands')); end if;
  if new.coming_soon is distinct from old.coming_soon then ch := ch || jsonb_build_array(jsonb_build_object('f', 'coming_soon', 'old', old.coming_soon, 'new', new.coming_soon)); end if;
  if new.orig_creator is distinct from old.orig_creator or new.orig_license is distinct from old.orig_license or new.orig_repo is distinct from old.orig_repo then ch := ch || jsonb_build_array(jsonb_build_object('f', 'credit')); end if;
  if jsonb_array_length(ch) > 0 then
    insert into public.audit_log(actor, action, meta) values (auth.uid(), 'tool_change',
      jsonb_build_object('tool_id', new.id, 'name', new.name, 'slug', new.slug, 'changes', ch));
  end if;
  return new;
end $$;
revoke execute on function public.tools_audit() from public, anon, authenticated;
drop trigger if exists tools_audit on public.tools;
create trigger tools_audit after insert or update or delete on public.tools for each row execute function public.tools_audit();

-- files, videos and repos (tool_assets)
create or replace function public.tool_assets_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ch jsonb := '[]'::jsonb; tid uuid := coalesce(new.tool_id, old.tool_id); t record; o public.tool_assets; n public.tool_assets;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  select name, slug into t from public.tools where id = tid;
  if not found then return coalesce(new, old); end if;   -- the tool itself was deleted (cascade); the tool_deleted entry covers it
  if tg_op <> 'INSERT' then o := old; end if;
  if tg_op <> 'DELETE' then n := new; end if;
  if o.video_url is distinct from n.video_url then ch := ch || jsonb_build_array(jsonb_build_object('f', 'video', 'old', o.video_url, 'new', n.video_url)); end if;
  if o.repo_url is distinct from n.repo_url then ch := ch || jsonb_build_array(jsonb_build_object('f', 'repo', 'old', o.repo_url, 'new', n.repo_url)); end if;
  if o.file_path is distinct from n.file_path then ch := ch || jsonb_build_array(jsonb_build_object('f', 'file', 'old', o.file_path, 'new', n.file_path)); end if;
  if jsonb_array_length(ch) > 0 then
    insert into public.audit_log(actor, action, meta) values (auth.uid(), 'tool_change',
      jsonb_build_object('tool_id', tid, 'name', t.name, 'slug', t.slug, 'changes', ch));
  end if;
  return coalesce(new, old);
end $$;
revoke execute on function public.tool_assets_audit() from public, anon, authenticated;
drop trigger if exists tool_assets_audit on public.tool_assets;
create trigger tool_assets_audit after insert or update or delete on public.tool_assets for each row execute function public.tool_assets_audit();
