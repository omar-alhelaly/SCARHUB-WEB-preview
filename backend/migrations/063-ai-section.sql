-- 063: a new "AI Upskilling" section for rooms (the rooms themselves are added from the staff editor and start as drafts).
insert into public.ch_sections(slug, title_en, title_ar, sort) values ('ai', 'AI Upskilling', 'تطوير مهارات الذكاء الاصطناعي', 6)
on conflict (slug) do nothing;
