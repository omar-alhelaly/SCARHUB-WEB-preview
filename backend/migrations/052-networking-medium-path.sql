-- 052: Medium networking path "Network Access and IP Connectivity" (our own wording, aligned with the CCNA topic outline domains 2 and 3; not affiliated with Cisco)
insert into public.ch_paths(slug,title_en,title_ar,summary_en,summary_ar,prepares_en,prepares_ar,rooms,sort)
values ('network-access-ip-connectivity','Network Access and IP Connectivity','وصول الشبكة وتوصيل الـ IP',
 'Split networks with VLANs and trunks, understand loops, spanning tree and EtherChannel, then connect networks with static and default routes. Hands-on in our own simulator. Aligned with the CCNA topic outline (domains 2 and 3); not affiliated with Cisco.',
 'قسّم الشبكات بالـ VLANs والـ trunks، وافهم اللوبات والـ spanning tree والـ EtherChannel، وبعدين وصّل الشبكات بـ static routes وdefault routes. تطبيق عملي في المحاكي بتاعنا. متوافق مع مخطط مواضيع CCNA (المجالين الثاني والثالث) وملوش علاقة بسيسكو.',
 'Prepares you for: junior network administrator tasks, and the next path (IP Services and Security).',
 'بتجهزك لـ: مهام مدير شبكات مبتدئ، والمسار اللي بعده (IP Services وSecurity).',
 array['net-vlans-and-trunks','net-stp-and-etherchannel','net-static-routing','net-default-route-and-prefix'],6)
on conflict (slug) do update set title_en=excluded.title_en,title_ar=excluded.title_ar,summary_en=excluded.summary_en,summary_ar=excluded.summary_ar,prepares_en=excluded.prepares_en,prepares_ar=excluded.prepares_ar,rooms=excluded.rooms,sort=excluded.sort;
