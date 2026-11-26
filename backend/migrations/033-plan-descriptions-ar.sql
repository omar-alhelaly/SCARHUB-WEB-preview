-- 033: bilingual plan descriptions (English / Arabic, max 300 chars)
update public.plans set description = case name
 when 'Starter' then '5 everyday tools. Individually 500 EGP/month, here 400 (20% off). / ٥ أدوات يومية. منفردة ٥٠٠ جنيه شهريا، هنا ٤٠٠ (خصم ٢٠٪).'
 when 'Plus' then '12 tools. Individually 1400 EGP/month, here 840 (40% off). / ١٢ أداة. منفردة ١٤٠٠ جنيه شهريا، هنا ٨٤٠ (خصم ٤٠٪).'
 when 'Pro' then 'Every tool except the 3 flagships (37 tools). Individually 4750 EGP/month, here 1800 (62% off). / كل الأدوات ماعدا الـ٣ الرئيسية (٣٧ أداة). منفردة ٤٧٥٠ جنيه شهريا، هنا ١٨٠٠ (خصم ٦٢٪).'
 when 'Ultimate' then 'Everything, including the flagships and all future tools. Individually 5950 EGP/month, here 2300 (61% off). / كل حاجة بما فيها الأدوات الرئيسية وكل الأدوات الجاية. منفردة ٥٩٥٠ جنيه شهريا، هنا ٢٣٠٠ (خصم ٦١٪).'
 end where active and name in ('Starter','Plus','Pro','Ultimate');
select 'DONE '||count(*) from public.plans where description like '% / %' and active;
