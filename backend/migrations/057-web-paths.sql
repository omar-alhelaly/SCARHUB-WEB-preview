-- 057: three Web paths (Easy, Medium, Hard). Rooms are our own wording; defensive only; nothing here touches a real system.
insert into public.ch_paths(slug,title_en,title_ar,summary_en,summary_ar,prepares_en,prepares_ar,rooms,sort) values
('web-basics','Web Basics','أساسيات الويب',
 'How requests, responses, cookies and forms work, then a first guided look at a practice app. Theory first, practice that eases in.',
 'إزاي الـ requests والـ responses والـ cookies والفورمز بيشتغلوا، وبعدين أول جولة موجهة في تطبيق تدريب. نظري الأول وتطبيق بيدخل بالتدريج.',
 'Prepares you for: understanding how a web app works before you assess or build one.',
 'بتجهزك لـ: فهم إزاي تطبيق الويب بيشتغل قبل ما تقيّمه أو تبنيه.',
 array['web-how-the-web-works','web-html-forms-and-inputs','web-first-login'],8),
('web-app-security','Web App Security Essentials','أساسيات أمن تطبيقات الويب',
 'Sessions and safe logins, injection and cross-site scripting, and access control. Each room explains how the weakness happens and how it is fixed.',
 'الـ sessions والدخول الآمن، الحقن والـ XSS، والتحكم في الوصول. كل غرفة بتشرح الثغرة بتحصل إزاي واتصلح إزاي.',
 'Prepares you for: junior web security tester and secure developer tasks.',
 'بتجهزك لـ: مهام مختبر أمن ويب مبتدئ ومطور آمن.',
 array['web-sessions-and-authentication','web-input-handling-injection-xss','web-access-control-and-idor'],9),
('web-secure-review','Secure Web Review','مراجعة ويب آمنة',
 'Weakness concepts, hardening with headers and updates, and a scenario capstone where you name the weakness and the fix.',
 'مفاهيم الثغرات، التقوية بالهيدرز والتحديثات، وكابستون بسيناريوهات تسمّي فيها الضعف والحل.',
 'Prepares you for: web application review work and writing clear findings.',
 'بتجهزك لـ: شغل مراجعة تطبيقات الويب وكتابة نتائج واضحة.',
 array['web-vulnerability-concepts','web-security-headers-and-hardening','web-secure-review-capstone'],10)
on conflict (slug) do update set title_en=excluded.title_en,title_ar=excluded.title_ar,summary_en=excluded.summary_en,summary_ar=excluded.summary_ar,prepares_en=excluded.prepares_en,prepares_ar=excluded.prepares_ar,rooms=excluded.rooms,sort=excluded.sort;
