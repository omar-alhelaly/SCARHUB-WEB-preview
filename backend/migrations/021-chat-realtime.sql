-- 021: community chat is live. chat_messages joins the Realtime publication (same RLS as normal reads); the client also polls every 4 s as a fallback.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
