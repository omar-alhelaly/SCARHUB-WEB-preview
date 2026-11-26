-- 022: payment proof upload hardening. Only a re-encoded JPEG/WebP (max 3 MB) at uid/<uuid>.jpg|webp, max 6 uploads per user per hour; submit_manual_payment checks the stored object (type, size, path) and limits submissions per hour.
update storage.buckets set file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/webp'] where id = 'payment-proofs';

drop policy if exists proofs_insert on storage.objects;
create policy proofs_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'payment-proofs' and public.is_active(auth.uid())
  and name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|webp)$')
  and (select count(*) from storage.objects o where o.bucket_id = 'payment-proofs' and (storage.foldername(o.name))[1] = auth.uid()::text and o.created_at > now() - interval '1 hour') < 6
);

create or replace function public.submit_manual_payment(p_plan uuid, p_reference text, p_proof text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare pl public.plans; rid uuid; uname text; m jsonb; ob record;
begin
  if not public.is_active(auth.uid()) then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.payment_providers where provider = 'manual' and enabled) then raise exception 'method off'; end if;
  select * into pl from public.plans where id = p_plan and active;
  if not found then raise exception 'plan'; end if;
  if p_proof is null or p_proof !~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|webp)$') then raise exception 'proof'; end if;
  select name, metadata into ob from storage.objects where bucket_id = 'payment-proofs' and name = p_proof;
  if not found then raise exception 'proof missing'; end if;
  if (ob.metadata->>'mimetype') not in ('image/jpeg','image/webp') or coalesce((ob.metadata->>'size')::bigint, 0) not between 1 and 3145728 then raise exception 'proof type'; end if;
  if exists (select 1 from public.payment_requests where proof_path = p_proof) then raise exception 'proof reused'; end if;
  if (select count(*) from public.payment_requests where user_id = auth.uid() and method = 'manual' and created_at > now() - interval '1 hour') >= 5 then raise exception 'rate limit'; end if;
  insert into public.payment_requests(user_id, plan_id, method, amount_minor, currency, period, reference, proof_path)
    values (auth.uid(), pl.id, 'manual', pl.price_minor, pl.currency, pl.period, p_reference, p_proof) returning id into rid;
  select username::text into uname from public.profiles where id = auth.uid();
  m := jsonb_build_object('request', rid, 'plan', pl.name, 'amount', pl.price_minor, 'currency', pl.currency, 'period', pl.period, 'user', uname);
  insert into public.notifications(user_id, kind, meta) values (auth.uid(), 'payment_pending', m);
  insert into public.notifications(user_id, kind, meta) select p.id, 'payment_submitted', m from public.profiles p where p.status = 'active' and p.role in ('owner','admin');
  return rid;
end $$;
