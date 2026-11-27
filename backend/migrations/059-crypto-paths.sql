-- 059: three Crypto paths (Easy, Medium, Hard). Our own wording; defensive.
insert into public.ch_paths(slug,title_en,title_ar,summary_en,summary_ar,prepares_en,prepares_ar,rooms,sort) values
('crypto-basics','Crypto Basics','أساسيات التشفير',
 'Tell encoding from encryption, then learn shared keys, key pairs and signatures.',
 'فرّق بين الـ encoding والتشفير، وبعدين اتعلم المفاتيح المشتركة وأزواج المفاتيح والتوقيعات.',
 'Prepares you for: security fundamentals and any role that touches data protection.',
 'بتجهزك لـ: أساسيات الأمن وأي دور بيلمس حماية البيانات.',
 array['crypto-encode-or-encrypt','crypto-symmetric-and-asymmetric'],14),
('crypto-in-practice','Crypto in Practice','التشفير عملياً',
 'Hashing and password storage, then how HTTPS and certificates work and how to read a warning.',
 'الـ hashing وتخزين الباسوردات، وبعدين HTTPS والشهادات بتشتغل إزاي وإزاي تقرا تحذير.',
 'Prepares you for: web security, SOC and system administration work.',
 'بتجهزك لـ: أمن الويب وشغل SOC وإدارة الأنظمة.',
 array['crypto-hashing-and-passwords','crypto-tls-and-certificates'],15),
('crypto-applied-security','Applied Crypto Security','التشفير في الأمن التطبيقي',
 'Key and secret management, then made-up cases where you pick the right tool.',
 'إدارة المفاتيح والأسرار، وبعدين حالات متألفة تختار فيها الأداة الصح.',
 'Prepares you for: secure design reviews and incident handling of leaked secrets.',
 'بتجهزك لـ: مراجعات التصميم الآمن والتعامل مع الأسرار المسربة.',
 array['crypto-key-management','crypto-capstone-review'],16)
on conflict (slug) do update set title_en=excluded.title_en,title_ar=excluded.title_ar,summary_en=excluded.summary_en,summary_ar=excluded.summary_ar,prepares_en=excluded.prepares_en,prepares_ar=excluded.prepares_ar,rooms=excluded.rooms,sort=excluded.sort;
