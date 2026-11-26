-- 035: the tools table uses column-level grants, so the new flag needs its own read grant (anon and signed-in readers).
grant select (coming_soon) on public.tools to anon, authenticated;
select 'GRANT '||string_agg(grantee||':'||privilege_type, ',') from information_schema.column_privileges where table_schema='public' and table_name='tools' and column_name='coming_soon' and grantee in ('anon','authenticated');
