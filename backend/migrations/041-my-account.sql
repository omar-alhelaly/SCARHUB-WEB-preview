-- 041: private account details for the signed-in user only (reads only the caller's own rows).
create or replace function public.my_account() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u record; prev timestamptz; msgs bigint; mfa boolean;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select created_at, last_sign_in_at, email_confirmed_at into u from auth.users where id = auth.uid();
  select at into prev from public.audit_log where actor = auth.uid() and action = 'login' order by at desc offset 1 limit 1;
  select count(*) into msgs from public.chat_messages where user_id = auth.uid() and deleted_at is null;
  select exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified') into mfa;
  return jsonb_build_object('created_at', u.created_at, 'last_sign_in', u.last_sign_in_at, 'previous_login', prev, 'email_confirmed', u.email_confirmed_at, 'messages', msgs, 'mfa', mfa);
end $$;
revoke execute on function public.my_account() from public, anon;
grant execute on function public.my_account() to authenticated;
