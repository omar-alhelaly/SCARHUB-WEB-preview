-- 016: payment proof must be approved by staff. Upload = pending only; owner and admins get an inbox message; user is told it is waiting; approve/reject notifies the user.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('free_plan_granted','free_plan_revoked','payment_pending','payment_submitted','payment_approved','payment_rejected','new_user'));

drop policy pr_select on public.payment_requests;
create policy pr_select on public.payment_requests for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
drop policy proofs_read on storage.objects;
create policy proofs_read on storage.objects for select to authenticated using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));

create or replace function public.submit_manual_payment(p_plan uuid, p_reference text, p_proof text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare pl public.plans; rid uuid; uname text; m jsonb;
begin
  if not public.is_active(auth.uid()) then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.payment_providers where provider = 'manual' and enabled) then raise exception 'method off'; end if;
  select * into pl from public.plans where id = p_plan and active;
  if not found then raise exception 'plan'; end if;
  if p_proof is null or p_proof not like auth.uid()::text || '/%' then raise exception 'proof'; end if;
  insert into public.payment_requests(user_id, plan_id, method, amount_minor, currency, period, reference, proof_path)
    values (auth.uid(), pl.id, 'manual', pl.price_minor, pl.currency, pl.period, p_reference, p_proof) returning id into rid;
  select username::text into uname from public.profiles where id = auth.uid();
  m := jsonb_build_object('request', rid, 'plan', pl.name, 'amount', pl.price_minor, 'currency', pl.currency, 'period', pl.period, 'user', uname);
  insert into public.notifications(user_id, kind, meta) values (auth.uid(), 'payment_pending', m);
  insert into public.notifications(user_id, kind, meta) select p.id, 'payment_submitted', m from public.profiles p where p.status = 'active' and p.role in ('owner','admin');
  return rid;
end $$;

create or replace function public.review_manual_payment(p_id uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.payment_requests; pn text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  select * into r from public.payment_requests where id = p_id and method = 'manual' and status = 'pending' for update;
  if not found then raise exception 'not pending'; end if;
  update public.payment_requests set status = case when p_approve then 'approved' else 'rejected' end,
    reject_reason = case when p_approve then null else left(p_reason, 200) end, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  if p_approve then perform public.grant_period(r.user_id, r.period, 'manual', r.plan_id); end if;
  select name into pn from public.plans where id = r.plan_id;
  insert into public.notifications(user_id, kind, meta) values (r.user_id, case when p_approve then 'payment_approved' else 'payment_rejected' end,
    jsonb_build_object('request', p_id, 'plan', pn, 'reason', case when p_approve then null else left(p_reason, 200) end));
  insert into public.audit_log(actor, action, target, meta) values (auth.uid(), 'review_manual_payment', r.user_id, jsonb_build_object('approved', p_approve, 'request', p_id));
end $$;
