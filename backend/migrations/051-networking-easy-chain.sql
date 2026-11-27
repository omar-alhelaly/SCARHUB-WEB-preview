-- Networking Easy path: Network Fundamentals (aligned with the public CCNA topic outline, domain 1). Own content.
update public.ch_paths set
 title_en='Networking Fundamentals', title_ar='أساسيات الشبكات',
 summary_en='Network Fundamentals, step by step: what each device does, cables, IPv4 and subnetting, TCP and UDP, DHCP and how a switch forwards frames. Hands-on in our own simulator. Aligned with the CCNA topic outline (domain 1); not affiliated with Cisco.',
 summary_ar='أساسيات الشبكات خطوة خطوة: كل جهاز بيعمل إيه، الكابلات، IPv4 والـ subnetting، TCP وUDP، الـ DHCP والسويتش بيبعت الفريمات إزاي. تطبيق عملي في المحاكي بتاعنا. متوافق مع مخطط مواضيع CCNA (المجال الأول) وملوش علاقة بسيسكو.',
 prepares_en='Prepares you for: help desk and junior network technician tasks, and the next path (Network Access and IP Connectivity).',
 prepares_ar='بتجهزك لـ: مهام الدعم الفني وفني الشبكات المبتدئ، والمسار اللي بعده (Network Access وIP Connectivity).',
 rooms=array['start-how-networks-and-os-work','net-fundamentals','net-components-and-cables','net-ipv4-subnetting','net-tcp-udp-and-dhcp','net-switching-and-mac','net-lab-first-network']
where slug='networking-basics';
