-- 018: live updates. Inbox and pending payments appear without a page refresh (Supabase Realtime respects the same RLS as normal reads).
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.payment_requests;
