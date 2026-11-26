-- 026: fix chat send + voice/proof uploads.
-- (1) policies call is_blocked() as the signed-in role: allow execute (returns only true/false).
grant execute on function public.is_blocked(uuid, text) to authenticated;
-- (2) the upload policies counted rows of storage.objects inside a storage.objects policy = infinite recursion (every upload failed). Count via a security definer function instead.
create or replace function public.recent_uploads(b text, u uuid) returns int
language sql stable security definer set search_path = public, storage as $$
  select count(*)::int from storage.objects o
  where o.bucket_id = b and (storage.foldername(o.name))[1] = u::text and o.created_at > now() - interval '1 hour' $$;
revoke all on function public.recent_uploads(text, uuid) from public;
grant execute on function public.recent_uploads(text, uuid) to authenticated;
drop policy if exists voice_insert on storage.objects;
create policy voice_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'chat-voice' and is_active(auth.uid()) and not is_blocked(auth.uid(),'chat')
  and name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webm|ogg|m4a)$')
  and public.recent_uploads('chat-voice', auth.uid()) < 20);
drop policy if exists proofs_insert on storage.objects;
create policy proofs_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'payment-proofs' and is_active(auth.uid())
  and name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|webp)$')
  and public.recent_uploads('payment-proofs', auth.uid()) < 6);
