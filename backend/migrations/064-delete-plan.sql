-- 064: owner-only delete_plan(). A plain DELETE fails when the plan has payment history (foreign keys), and the page showed
-- nothing useful. This function says why instead:
--   'paid'    the plan has an approved or paid payment      -> cannot be deleted (money record), use Disable
--   'holders' someone still has access through the plan     -> cannot be deleted, use Disable
--   'pending' a payment is waiting for review               -> cannot be deleted yet
--   'ok'      deleted. Only rejected or failed requests are removed with it (nobody paid, nobody waits).
create or replace function public.delete_plan(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner(auth.uid()) then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.plans where id = p_id) then return 'missing'; end if;
  if exists (select 1 from public.payment_requests where plan_id = p_id and status in ('approved', 'paid')) then return 'paid'; end if;
  if exists (select 1 from public.user_plan_access where plan_id = p_id and current_period_end > now()) then return 'holders'; end if;
  if exists (select 1 from public.payment_requests where plan_id = p_id and status = 'pending') then return 'pending'; end if;
  delete from public.user_plan_access where plan_id = p_id;
  delete from public.payment_requests where plan_id = p_id and status in ('rejected', 'failed');
  delete from public.plans where id = p_id;
  return 'ok';
end $$;
revoke execute on function public.delete_plan(uuid) from public, anon;
grant execute on function public.delete_plan(uuid) to authenticated;
