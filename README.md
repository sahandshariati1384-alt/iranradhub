# راه‌اندازی بک‌اند واقعی (Next.js + Supabase)

این پوشه نسخه‌ی **واقعی و چندکاربره** پنل شبکه انجمن‌هاست (برخلاف نسخه‌ی دموی
`network.html` که فقط روی حافظه‌ی مرورگر شما کار می‌کند).

## مراحل راه‌اندازی

1. **ساخت پروژه Supabase** (رایگان): در https://supabase.com یک پروژه جدید بسازید.
2. **اجرای schema**: محتوای `schema.sql` را در Supabase Studio → SQL Editor کپی و اجرا کنید.
3. **فعال‌سازی Storage**: در بخش Storage یک باکت به نام `content-files` بسازید (Public).
4. **ساخت پروژه Next.js**:
   ```bash
   npx create-next-app@latest radiology-network
   cd radiology-network
   npm install @supabase/supabase-js
   ```
5. **فایل اتصال** `lib/supabaseClient.js` بسازید:
   ```js
   import { createClient } from '@supabase/supabase-js';
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   );
   ```
6. **متغیرهای محیطی** در `.env.local` (از Project Settings → API در Supabase کپی کنید):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
   ```
7. فایل‌های `SecretaryDashboard.jsx` و `AdminApprovals.jsx` را در `pages/` پروژه‌تان
   کپی کنید (مثلاً `pages/panel.jsx` و `pages/admin.jsx`).
8. **ساخت کاربر مدیرکل**: در Supabase Studio → Authentication یک کاربر بسازید،
   سپس در جدول `profiles` یک ردیف برای همان کاربر با `role = 'admin'` بسازید.
9. **ساخت کاربر دبیر انجمن**: مشابه بالا، اما `role = 'secretary'` و
   `organization_id` را به رکورد سازمان مربوطه در جدول `organizations` وصل کنید.

## نکته امنیتی مهم
در نسخه‌ی دمو (`network.js`)، رمز مدیرکل مستقیم داخل کد جاوااسکریپت نوشته شده
و **اصلاً امن نیست** — هر کسی با «View Source» می‌تواند آن را ببیند. این نسخه‌ی
Supabase با احراز هویت واقعی (Supabase Auth) و Row Level Security این مشکل را
حل می‌کند.

## گام بعدی برای پرداخت آنلاین وبینارها
برای اتصال به درگاه پرداخت ایرانی (مثل زرین‌پال)، یک جدول `payments` اضافه کنید
و یک Next.js API Route (`pages/api/create-payment.js`) بسازید که کاربر را به
درگاه هدایت کند و پس از بازگشت، وضعیت ثبت‌نام وبینار را در جدول به‌روزرسانی کند.
این بخش چون نیازمند حساب تجاری واقعی در درگاه پرداخت است، در این نسخه پیاده‌سازی
نشده — اگر بخواهید، در گفتگوی بعدی برایتان کدش را می‌نویسم.

## بک‌اند واقعی برای پنل‌های سایت اصلی (خبرنامه / درخواست محتوا / پرسش‌وپاسخ / کاریابی)

برخلاف شبکه‌ی دانشگاه‌ها و پرداخت وبینار (که نیازمند یک پروژه‌ی Next.js جداگانه‌اند)،
این چهار پنل مستقیماً **داخل خود سایت اصلی** (`index.html` / `script.js`) با
کتابخانه‌ی سمت‌کلاینت `@supabase/supabase-js` پیاده‌سازی شده‌اند — نیازی به
Next.js یا هیچ سرور اضافه‌ای ندارید.

### راه‌اندازی
1. جدول‌های `newsletter_subscribers`, `content_requests`, `qa_questions`,
   `jobs`, `resumes` را از انتهای `schema.sql` (بخش "افزونه: بک‌اند واقعی برای
   پنل‌های سایت اصلی") در Supabase Studio → SQL Editor اجرا کنید.
2. فایل `supabase-config.js` (کنار `index.html` در ریشه‌ی سایت) را باز کنید و
   `SUPABASE_URL` و `SUPABASE_ANON_KEY` را از Project Settings → API پر کنید.
3. همین! به محض پر کردن این دو مقدار، سایت خودکار از حالت دموی localStorage
   به بک‌اند واقعی سوییچ می‌کند — هیچ تغییر دیگری در کد لازم نیست.

### محدودیت فعلی: پاسخ‌دهی به پرسش‌وپاسخ
در حال حاضر پاسخ دادن به سوالات بخش «پرسش از متخصص» باید مستقیماً از
Supabase Studio → Table Editor → جدول `qa_questions` انجام شود (ستون‌های
`answer` و `status` را به `answered` تغییر دهید). اگر بخواهید یک پنل ادمین
ساده (با ورود رمزدار) برای پاسخ‌دهی مستقیم از داخل سایت بسازیم، در گفتگوی
بعدی می‌توانیم آن را اضافه کنیم.

### حریم خصوصی
ایمیل‌های خبرنامه و رزومه‌های ارسالی عمومی قابل‌خواندن نیستند (طبق تنظیمات
RLS در `schema.sql`) — فقط شما از طریق Supabase Studio یا سرویس‌کلید به آن‌ها
دسترسی دارید.
