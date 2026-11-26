-- 027: chat activity in a profile (message counts and recent posts) is visible to staff only, enforced inside get_profile.
CREATE OR REPLACE FUNCTION public.get_profile(target uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
declare p public.profiles; st boolean := public.is_staff(auth.uid()); ow boolean := public.is_owner(auth.uid()); r jsonb;
begin
  if not public.is_active(auth.uid()) then raise exception 'forbidden'; end if;
  select * into p from public.profiles where id = target;
  if not found or p.status = 'deleted' or (p.status <> 'active' and not st) then raise exception 'not found'; end if;
  r := jsonb_build_object('id', p.id,
    'name', case when p.role <> 'user' then p.alias::text else p.username::text end,
    'avatar', case when p.avatar = 'custom' and p.role = 'user' then 'b1' else p.avatar end,
    'role', p.role, 'joined', p.created_at, 'subscribed', public.has_any_sub(p.id),
    'plans', (select coalesce(jsonb_agg(pl.name), '[]'::jsonb) from public.user_plan_access a join public.plans pl on pl.id = a.plan_id where a.user_id = p.id and a.current_period_end > now()),
    'all_access', public.has_active_sub(p.id));
  if st then
    r := r || jsonb_build_object(
      'messages', (select count(*) from public.chat_messages m where m.user_id = p.id and m.channel = 'general'),
      'voice', (select count(*) from public.chat_messages m where m.user_id = p.id and m.channel = 'general' and m.audio_path is not null),
      'last_post', (select max(m.created_at) from public.chat_messages m where m.user_id = p.id and m.channel = 'general'),
      'posts', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select m.body, m.audio_secs, m.created_at from public.chat_messages m where m.user_id = p.id and m.channel = 'general' order by m.created_at desc limit 5) x));
    r := r || jsonb_build_object('staff', jsonb_build_object(
      'email', case when p.role = 'owner' and not ow then null else p.email::text end,
      'username', case when ow or p.role = 'user' then p.username::text else null end,
      'status', p.status,
      'payments', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select pl.name as plan, q.amount_minor, q.currency, q.status, q.method, q.created_at from public.payment_requests q left join public.plans pl on pl.id = q.plan_id where q.user_id = p.id order by q.created_at desc limit 10) x),
      'blocks', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select b.scope, b.reason, b.created_at, b.expires_at, b.lifted_at, coalesce(c.alias::text, c.username::text) as by from public.blocks b left join public.profiles c on c.id = b.created_by where b.user_id = p.id order by b.created_at desc limit 20) x),
      'logs', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select l.action, l.at from public.audit_log l where l.target = p.id and l.action <> 'login' order by l.at desc limit 15) x)));
  end if;
  return r;
end $function$;
