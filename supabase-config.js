// =========================================================
// تنظیمات اتصال به Supabase
// =========================================================
// ۱. یک پروژه‌ی رایگان در https://supabase.com بسازید.
// ۲. جدول‌های موردنیاز را از فایل supabase-starter/schema.sql
//    (بخش "افزونه: بک‌اند واقعی برای پنل‌های سایت اصلی") در
//    Supabase Studio -> SQL Editor اجرا کنید.
// ۳. مقادیر زیر را از Project Settings -> API در Supabase کپی کنید.
// ۴. تا وقتی این دو مقدار را پر نکرده‌اید، سایت به‌صورت خودکار
//    از حافظه‌ی مرورگر (localStorage) به‌عنوان جایگزین دمو استفاده می‌کند
//    و هیچ خطایی رخ نمی‌دهد.
// =========================================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';       // مثال: https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // کلید anon public (نه service role!)
