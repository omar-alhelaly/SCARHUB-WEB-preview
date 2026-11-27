-- 053: Hard networking path "IP Services and Security" (our own wording, aligned with the CCNA topic outline domains 4 and 5; not affiliated with Cisco)
insert into public.ch_paths(slug,title_en,title_ar,summary_en,summary_ar,prepares_en,prepares_ar,rooms,sort)
values ('network-services-security','IP Services and Security','خدمات الـ IP والأمان',
 'Filter traffic with access lists, understand NAT, DNS, NTP and syslog, and harden switches and remote access. Hands-on access list lab in our own simulator. Aligned with the CCNA topic outline (domains 4 and 5); not affiliated with Cisco.',
 'فلتر الترافيك بقوايم الوصول، وافهم الـ NAT والـ DNS والـ NTP والـ syslog، وقوّي السويتشات والوصول عن بُعد. لاب عملي لقوايم الوصول في المحاكي بتاعنا. متوافق مع مخطط مواضيع CCNA (المجالين الرابع والخامس) وملوش علاقة بسيسكو.',
 'Prepares you for: network administrator and junior network security tasks.',
 'بتجهزك لـ: مهام مدير شبكات وأمن شبكات مبتدئ.',
 array['net-acl-filtering','net-ip-services','net-switch-and-remote-security'],7)
on conflict (slug) do update set title_en=excluded.title_en,title_ar=excluded.title_ar,summary_en=excluded.summary_en,summary_ar=excluded.summary_ar,prepares_en=excluded.prepares_en,prepares_ar=excluded.prepares_ar,rooms=excluded.rooms,sort=excluded.sort;
