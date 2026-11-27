-- 058: three Forensics paths (Easy, Medium, Hard). Our own wording; defensive; made-up data only.
insert into public.ch_paths(slug,title_en,title_ar,summary_en,summary_ar,prepares_en,prepares_ar,rooms,sort) values
('forensics-basics','Forensics Basics','أساسيات التحليل الجنائي',
 'Keep evidence trustworthy, then learn how to tell what a file really is and what its metadata can show.',
 'حافظ على الدليل موثوق، وبعدين اتعلم إزاي تعرف الملف فعلاً إيه وإيه اللي الـ metadata بتاعته ممكن تبينه.',
 'Prepares you for: first-responder and junior forensic analyst tasks.',
 'بتجهزك لـ: مهام أول مستجيب ومحلل فورنسك مبتدئ.',
 array['forensics-evidence-handling','forensics-file-types-and-metadata'],11),
('forensics-timeline-analysis','Forensics Timeline Analysis','تحليل الـ timeline في الفورنسك',
 'Read a file timeline, then merge logs from different sources into one story with times converted to UTC.',
 'اقرا timeline ملفات، وبعدين ادمج لوجات من مصادر مختلفة في قصة واحدة بأوقات متحولة لـ UTC.',
 'Prepares you for: DFIR analyst work that rebuilds what happened.',
 'بتجهزك لـ: شغل محلل DFIR اللي بيعيد بناء اللي حصل.',
 array['forensics-first-artifacts','forensics-logs-and-timelines'],12),
('forensics-casework','Forensics Casework','شغل قضايا الفورنسك',
 'Order of volatility, write blockers, authority and report writing, then a made-up case from the device to the report.',
 'ترتيب التطاير، الـ write blockers، الصلاحية وكتابة التقرير، وبعدين قضية متألفة من الجهاز للتقرير.',
 'Prepares you for: handling a full examination and writing a clear report.',
 'بتجهزك لـ: التعامل مع فحص كامل وكتابة تقرير واضح.',
 array['forensics-memory-and-incident-report','forensics-case-capstone'],13)
on conflict (slug) do update set title_en=excluded.title_en,title_ar=excluded.title_ar,summary_en=excluded.summary_en,summary_ar=excluded.summary_ar,prepares_en=excluded.prepares_en,prepares_ar=excluded.prepares_ar,rooms=excluded.rooms,sort=excluded.sort;
