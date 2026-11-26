-- 015: owner/admin RPCs require a verified 2-step (aal2) session, but only for users who have a verified TOTP factor (others unchanged).
-- ROLLBACK: restore the original is_owner/is_staff bodies from backend/schema.sql lines 47-54 (no mfa_ok), then: drop function public.mfa_ok(uuid);
create or replace function public.mfa_ok(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select uid is distinct from auth.uid() or coalesce(auth.jwt() ->> 'aal', '') = 'aal2' or not exists (select 1 from auth.mfa_factors f where f.user_id = uid and f.status = 'verified')
$$;
create or replace function public.is_staff(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.status = 'active' and p.role in ('owner', 'admin')) and public.mfa_ok(uid)
$$;
create or replace function public.is_owner(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.status = 'active' and p.role = 'owner') and public.mfa_ok(uid)
$$;
