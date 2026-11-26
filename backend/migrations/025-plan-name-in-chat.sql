-- 025: plan name next to the username in chat (public_profiles.plan_name). Role label (Owner/Admin) comes from role.
create or replace view public.public_profiles with (security_invoker = false) as
  select id, case when role in ('owner', 'admin') then alias else username end::text as display_name,
         case when avatar = 'custom' and role not in ('owner', 'admin') then 'b1' else avatar end as avatar,
         (role in ('owner', 'admin')) as is_staff, public.has_any_sub(id) as subscribed, role::text as role, created_at as joined,
         case when not public.has_any_sub(id) then null else coalesce(
           (select string_agg(pl.name, ', ' order by pl.name) from public.user_plan_access a join public.plans pl on pl.id = a.plan_id where a.user_id = profiles.id and a.current_period_end > now()),
           (select pl.name from public.payment_requests q join public.plans pl on pl.id = q.plan_id where q.user_id = profiles.id and q.status = 'approved' and pl.scope <> 'tools' order by q.created_at desc limit 1),
           'All tools') end as plan_name
  from public.profiles where status = 'active';
