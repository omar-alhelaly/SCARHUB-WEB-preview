-- 056: weekly leaderboard. Same shape as ch_leaderboard, counting only solves since Monday 00:00 Cairo time.
-- Read-only, public like ch_leaderboard, active players only, top 50, no private data (username, avatar, points, solves).
create or replace function public.ch_weekly_leaderboard(p_section text default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  with wk as (
    select (date_trunc('week', now() at time zone 'Africa/Cairo')) at time zone 'Africa/Cairo' as s
  ), tot as (
    select v.user_id, sum(v.points)::int pts, count(*)::int solves, max(v.solved_at) last_at
    from public.ch_solves v join public.profiles p on p.id = v.user_id and p.status = 'active', wk
    where v.solved_at >= wk.s and (p_section is null or v.section = p_section) group by v.user_id
  ), rk as (
    select tot.*, rank() over (order by pts desc, last_at asc) rnk from tot
  )
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('uid', rk.user_id, 'rank', rk.rnk, 'username', p.username, 'avatar', p.avatar, 'points', rk.pts, 'solves', rk.solves, 'me', rk.user_id = auth.uid()) order by rk.rnk, p.username)
                     from (select * from rk order by rnk limit 50) rk join public.profiles p on p.id = rk.user_id), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rnk, 'points', pts, 'solves', solves) from rk where user_id = auth.uid()),
    'players', (select count(*) from rk),
    'ends_at', (select s + interval '7 days' from wk))
$$;
revoke execute on function public.ch_weekly_leaderboard(text) from public;
grant execute on function public.ch_weekly_leaderboard(text) to anon, authenticated;
