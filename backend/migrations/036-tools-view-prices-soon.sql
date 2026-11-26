-- 036: tools_view now (a) shows prices and discounts to everyone, so locked tools can show what they cost, and (b) exposes coming_soon.
-- Commands and credits stay masked for people without access. Columns keep their order; coming_soon is added last.
create or replace view public.tools_view with (security_invoker = false) as
SELECT id, slug, name, class, description_en, description_ar,
  CASE WHEN visibility = 'public' OR is_staff(auth.uid()) OR has_tool_access(auth.uid(), id) THEN commands ELSE NULL::text[] END AS commands,
  visibility, status, created_by, created_at,
  price_minor, currency, discount_percent, discount_until,
  third_party,
  CASE WHEN visibility = 'public' OR is_staff(auth.uid()) OR has_tool_access(auth.uid(), id) THEN orig_creator ELSE NULL::text END AS orig_creator,
  CASE WHEN visibility = 'public' OR is_staff(auth.uid()) OR has_tool_access(auth.uid(), id) THEN orig_license ELSE NULL::text END AS orig_license,
  CASE WHEN visibility = 'public' OR is_staff(auth.uid()) OR has_tool_access(auth.uid(), id) THEN orig_repo ELSE NULL::text END AS orig_repo,
  coming_soon
FROM public.tools t WHERE status = 'published' OR is_staff(auth.uid());
grant select on public.tools_view to anon, authenticated;
select 'VIEWCOLS '||count(*) from information_schema.columns where table_schema='public' and table_name='tools_view';
