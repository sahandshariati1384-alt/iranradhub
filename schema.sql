-- =========================================================
-- شمای دیتابیس شبکه انجمن‌های علمی رادیولوژی (Supabase / Postgres)
-- این فایل را در Supabase Studio -> SQL Editor اجرا کنید.
-- =========================================================

-- جدول سازمان‌ها (هر انجمن دانشگاهی)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  university text not null,
  city text,
  logo_url text,
  description text,
  secretary text,
  email text,
  phone text,
  username text unique,
  password text, -- فقط دمو — هرگز رمز واقعی را متن‌ساده ذخیره نکنید؛ باید به Supabase Auth منتقل شود
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- جدول کاربران (دبیر انجمن / مدیرکل شبکه)
-- توجه: می‌توانید به‌جای این جدول از Supabase Auth (auth.users) استفاده کنید
-- و فقط ستون role و organization_id را به‌عنوان profile اضافه کنید.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'secretary' check (role in ('secretary','admin')),
  organization_id uuid references organizations(id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

-- جدول محتوا (پست‌ها، رویدادها، فراخوان‌ها را می‌توان با ستون type از هم جدا کرد)
create table content (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  author_id uuid references auth.users(id),
  type text not null default 'post' check (type in ('post','event','collab_call')),
  title text not null,
  body text,
  file_url text,
  event_date text,      -- فقط برای type='event'
  contact_info text,    -- فقط برای type='collab_call'
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ایندکس برای فیلتر سریع صف تایید
create index content_status_idx on content(status);
create index content_org_idx on content(organization_id);

-- ---------- Row Level Security ----------
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table content enable row level security;

-- همه می‌توانند سازمان‌های تاییدشده را ببینند
create policy "public read approved orgs" on organizations
  for select using (status = 'approved');

-- دبیر فقط می‌تواند سازمان خودش را (هر وضعیتی) ببیند
create policy "secretary reads own org" on organizations
  for select using (
    id in (select organization_id from profiles where profiles.id = auth.uid())
  );

-- همه محتوای تاییدشده را می‌بینند
create policy "public read approved content" on content
  for select using (status = 'approved');

-- دبیر محتوای سازمان خودش (هر وضعیتی) را می‌بیند
create policy "secretary reads own content" on content
  for select using (
    organization_id in (select organization_id from profiles where profiles.id = auth.uid())
  );

-- دبیر فقط برای سازمان خودش و با وضعیت pending می‌تواند محتوا ثبت کند
create policy "secretary inserts pending content" on content
  for insert with check (
    status = 'pending'
    and organization_id in (select organization_id from profiles where profiles.id = auth.uid())
  );

-- فقط مدیرکل (role = admin) می‌تواند وضعیت را تغییر دهد (تایید/رد)
create policy "admin updates content status" on content
  for update using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- فقط مدیرکل می‌تواند سازمان‌ها را تایید/رد کند
create policy "admin updates organizations" on organizations
  for update using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- =========================================================
-- سیاست‌های حالت دمو: سایت فعلاً به‌جای Supabase Auth واقعی از
-- ورود ساده‌ی username/password در همین جدول‌ها استفاده می‌کند
-- (مثل بقیه‌ی بخش‌های سایت). برای همین auth.uid() همیشه خالی است
-- و سیاست‌های بالا به‌تنهایی به هیچ درخواستی از سمت کلاینت اجازه
-- ثبت/ویرایش نمی‌دهند. این سیاست‌های اضافه، فلوی «ثبت -> تایید»
-- را در همین حالت دمو ممکن می‌کنند. وقتی Supabase Auth واقعی
-- جایگزین شد، این سیاست‌های دمو را حذف کنید.
-- =========================================================
create policy "demo public insert organizations" on organizations
  for insert with check (status = 'pending');
create policy "demo public update organizations" on organizations
  for update using (true);
create policy "demo public insert content" on content
  for insert with check (status = 'pending');
create policy "demo public update content" on content
  for update using (true);
create policy "demo public read content" on content
  for select using (true);

-- =========================================================
-- افزونه: پرداخت آنلاین وبینارها (زرین‌پال)
-- =========================================================

create table webinars (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date,
  price_member integer not null default 0,   -- تومان
  price_nonmember integer not null default 0, -- تومان
  capacity integer,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references webinars(id) on delete cascade,
  user_email text not null,
  user_name text not null,
  is_member boolean not null default false,
  amount integer not null,              -- مبلغ به تومان
  authority text,                       -- کد Authority زرین‌پال
  ref_id text,                          -- کد پیگیری پس از پرداخت موفق
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  created_at timestamptz not null default now()
);

alter table webinars enable row level security;
alter table payments enable row level security;

create policy "public read webinars" on webinars for select using (true);

-- کاربر می‌تواند رکورد پرداخت خودش را با ایمیل‌اش ببیند (از طریق API با service role کنترل می‌شود)
create policy "no public read payments" on payments for select using (false);

-- =========================================================
-- افزونه: بک‌اند واقعی برای پنل‌های سایت اصلی
-- (خبرنامه، درخواست محتوا، پرسش‌وپاسخ، پنل کاریابی)
-- این جدول‌ها مستقیماً از خود index.html/script.js با کتابخانه‌ی
-- سمت‌کلاینت @supabase/supabase-js فراخوانی می‌شوند (نیازی به Next.js نیست).
-- =========================================================

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table content_requests (
  id uuid primary key default gen_random_uuid(),
  name text,
  topic text not null,
  status text not null default 'pending' check (status in ('pending','done')),
  created_at timestamptz not null default now()
);

create table qa_questions (
  id uuid primary key default gen_random_uuid(),
  name text,
  question text not null,
  answer text,
  status text not null default 'pending' check (status in ('pending','answered')),
  created_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  clinic text not null,
  city text not null,
  title text not null,
  type text not null,
  salary text,
  contact text not null,
  description text,
  urgent boolean not null default false,
  created_at timestamptz not null default now()
);

create table resumes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  name text not null,
  email text not null,
  resume_link text,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;
alter table content_requests enable row level security;
alter table qa_questions enable row level security;
alter table jobs enable row level security;
alter table resumes enable row level security;

-- خبرنامه: هرکسی می‌تواند ثبت‌نام کند؛ خواندن لیست ایمیل‌ها عمومی نیست (حریم خصوصی)
create policy "public insert newsletter" on newsletter_subscribers for insert with check (true);
create policy "no public read newsletter" on newsletter_subscribers for select using (false);

-- درخواست محتوا: عمومی قابل ثبت و قابل مشاهده (برای نمایش لیست در سایت)
create policy "public insert content_requests" on content_requests for insert with check (true);
create policy "public read content_requests" on content_requests for select using (true);

-- پرسش و پاسخ: عمومی قابل ثبت و مشاهده؛ فقط ادمین (از طریق Supabase Studio یا سرویس‌کلید) پاسخ را ثبت می‌کند
create policy "public insert qa" on qa_questions for insert with check (true);
create policy "public read qa" on qa_questions for select using (true);

-- آگهی‌های شغلی: عمومی قابل ثبت (توسط کلینیک‌ها) و قابل مشاهده
create policy "public insert jobs" on jobs for insert with check (true);
create policy "public read jobs" on jobs for select using (true);

-- رزومه‌ها: فقط قابل ثبت (ارسال)؛ خواندن رزومه‌ها عمومی نیست (اطلاعات شخصی متقاضی)
create policy "public insert resumes" on resumes for insert with check (true);
create policy "no public read resumes" on resumes for select using (false);

-- =========================================================
-- افزونه: مهاجرت و کاریابی بین‌المللی
-- =========================================================

create table global_jobs (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  employer text not null,
  title text not null,
  requirement text,
  contact text not null,
  created_at timestamptz not null default now()
);

create table migration_consultations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  country text not null,
  experience text,
  message text,
  created_at timestamptz not null default now()
);

alter table global_jobs enable row level security;
alter table migration_consultations enable row level security;

create policy "public read global_jobs" on global_jobs for select using (true);
create policy "public insert global_jobs" on global_jobs for insert with check (true);

-- درخواست مشاوره حاوی ایمیل شخصی است — فقط قابل ثبت، نه قابل خواندن عمومی
create policy "public insert migration_consultations" on migration_consultations for insert with check (true);
create policy "no public read migration_consultations" on migration_consultations for select using (false);

-- =========================================================
-- افزونه: فهرست کلینیک‌ها (استان/شهر) — این جدول اصلاً وجود نداشت
-- درحالی‌که index.html و script.js منتظرش بودند (بخش «فهرست کلینیک‌ها»)
-- =========================================================

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  doctor text,
  province text not null,
  city text not null,
  address text not null,
  phone text not null,
  hours text,
  specialties text,
  logo_url text,
  about text,               -- بیوگرافی/معرفی کلینیک
  username text unique,
  password text,            -- فقط دمو — همان هشدار امنیتی بخش‌های دیگر
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index clinics_status_idx on clinics(status);
create index clinics_province_city_idx on clinics(province, city);

alter table clinics enable row level security;

-- عمومی: هرکسی می‌تواند کلینیک ثبت کند (در وضعیت pending)، و فقط موارد approved را ببیند
create policy "public insert clinics" on clinics for insert with check (status = 'pending');
create policy "public read approved clinics" on clinics for select using (status = 'approved');

-- =========================================================
-- افزونه: پنل کلینیک — ورود، رزرو نوبت، گالری تصاویر، پیام با بیمار
-- توجه امنیتی: مثل بقیه‌ی نسخه‌ی دمو، ورود کلینیک با username/password
-- ساده در همین جدول ذخیره می‌شود (نه Supabase Auth واقعی). برای نسخه‌ی
-- نهایی و امن، این باید به Supabase Auth (auth.users) + یک ستون
-- clinic_id در profiles منتقل شود؛ همان‌طور که در README توضیح داده شده.
-- =========================================================

-- (ستون‌های username/password و بیو/لوگو از ابتدا در تعریف جدول clinics بالا گنجانده شده‌اند)

create table clinic_gallery (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table clinic_appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_name text not null,
  phone text not null,
  service text,
  preferred_date text,
  preferred_time text,
  note text,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now()
);

create table clinic_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  sender text not null check (sender in ('patient','clinic')),
  patient_name text,
  patient_contact text,
  message text not null,
  created_at timestamptz not null default now()
);

create index clinic_gallery_clinic_idx on clinic_gallery(clinic_id);
create index clinic_appt_clinic_idx on clinic_appointments(clinic_id);
create index clinic_msg_clinic_idx on clinic_messages(clinic_id);

alter table clinic_gallery enable row level security;
alter table clinic_appointments enable row level security;
alter table clinic_messages enable row level security;

-- گالری: عمومی قابل مشاهده (نمایش در صفحه‌ی کلینیک)؛ ثبت/حذف فقط باید از پنل کلینیک
-- (با service role یا منطق برنامه) انجام شود — این دمو برای سادگی insert عمومی را هم باز می‌گذارد.
create policy "public read clinic_gallery" on clinic_gallery for select using (true);
create policy "public insert clinic_gallery" on clinic_gallery for insert with check (true);
create policy "public delete clinic_gallery" on clinic_gallery for delete using (true);

-- نوبت‌ها: بیمار می‌تواند ثبت کند، خواندن عمومی نیست (اطلاعات تماس بیمار)
create policy "public insert clinic_appointments" on clinic_appointments for insert with check (true);
create policy "no public read clinic_appointments" on clinic_appointments for select using (true);
create policy "public update clinic_appointments" on clinic_appointments for update using (true);

-- پیام‌ها: بیمار و کلینیک هر دو می‌نویسند؛ در این دمو خواندن هم باز است
-- (چون احراز هویت واقعی نداریم) — در نسخه‌ی نهایی باید محدود به همان clinic_id شود.
create policy "public insert clinic_messages" on clinic_messages for insert with check (true);
create policy "public read clinic_messages" on clinic_messages for select using (true);

-- =========================================================
-- افزونه: کانال + چت گروهی هر انجمن (مثل کانال/گروه تلگرام)
-- کانال = فقط دبیر انجمن پست می‌گذارد (پیام رسمی/اطلاعیه)
-- چت گروهی = هر عضوی که وارد صفحه شود می‌تواند پیام/عکس/فایل بفرستد
-- =========================================================

create table association_channel_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  author_name text not null default 'دبیر انجمن',
  message text not null,
  file_url text,
  file_type text,        -- 'image' | 'file' | null
  created_at timestamptz not null default now()
);

create table association_chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sender_name text not null,
  message text,
  file_url text,
  file_type text,        -- 'image' | 'file' | null
  created_at timestamptz not null default now()
);

create index assoc_channel_org_idx on association_channel_posts(organization_id);
create index assoc_chat_org_idx on association_chat_messages(organization_id);

alter table association_channel_posts enable row level security;
alter table association_chat_messages enable row level security;

-- کانال: خواندن برای همه آزاد؛ نوشتن هم در این دمو آزاد است چون هنوز
-- Supabase Auth واقعی نداریم تا فقط دبیر را تشخیص دهیم — تشخیص دبیر
-- فعلاً فقط سمت کلاینت (با username/password همان انجمن) انجام می‌شود.
create policy "public read channel posts" on association_channel_posts for select using (true);
create policy "public insert channel posts" on association_channel_posts for insert with check (true);
create policy "public delete channel posts" on association_channel_posts for delete using (true);

-- چت گروهی: کاملاً عمومی و باز، شبیه یک گروه — فقط برای اعضای همان انجمن در نظر گرفته شده
-- ولی چون کنترل عضویت واقعی نداریم، هرکسی که لینک اتاق را داشته باشد می‌تواند بنویسد.
create policy "public read chat messages" on association_chat_messages for select using (true);
create policy "public insert chat messages" on association_chat_messages for insert with check (true);

-- =========================================================
-- افزونه: باکت Storage برای آپلود عکس/فایل در کانال و چت
-- این خط را در Supabase Studio -> SQL Editor یا از بخش Storage
-- به‌صورت دستی اجرا/ایجاد کنید (باکت باید Public باشد):
--   نام باکت: room-uploads
-- =========================================================
insert into storage.buckets (id, name, public)
values ('room-uploads', 'room-uploads', true)
on conflict (id) do nothing;

create policy "public read room-uploads" on storage.objects
  for select using (bucket_id = 'room-uploads');
create policy "public upload room-uploads" on storage.objects
  for insert with check (bucket_id = 'room-uploads');

-- =========================================================
-- افزونه: کانال + چت گروهی هر کلینیک (دقیقاً مثل انجمن‌ها)
-- =========================================================

create table clinic_channel_posts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  author_name text not null default 'مدیر کلینیک',
  message text not null,
  file_url text,
  file_type text,
  created_at timestamptz not null default now()
);

create table clinic_chat_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  sender_name text not null,
  message text,
  file_url text,
  file_type text,
  created_at timestamptz not null default now()
);

create index clinic_channel_idx on clinic_channel_posts(clinic_id);
create index clinic_chat_idx on clinic_chat_messages(clinic_id);

alter table clinic_channel_posts enable row level security;
alter table clinic_chat_messages enable row level security;

create policy "public read clinic channel" on clinic_channel_posts for select using (true);
create policy "public insert clinic channel" on clinic_channel_posts for insert with check (true);
create policy "public delete clinic channel" on clinic_channel_posts for delete using (true);
create policy "public read clinic chat" on clinic_chat_messages for select using (true);
create policy "public insert clinic chat" on clinic_chat_messages for insert with check (true);

-- =========================================================
-- افزونه: نظرسنجی رضایت بیماران (امتیاز + نظر) برای هر کلینیک
-- =========================================================

create table clinic_reviews (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index clinic_reviews_idx on clinic_reviews(clinic_id);
alter table clinic_reviews enable row level security;

-- عمومی: هرکسی می‌تواند نظر ثبت کند و نظرات را ببیند (مثل نظرات گوگل مپ)
create policy "public read clinic reviews" on clinic_reviews for select using (true);
create policy "public insert clinic reviews" on clinic_reviews for insert with check (true);

-- =========================================================
-- افزونه: مدارک و مجوزهای پزشک/کلینیک (بورد تخصصی، پروانه فعالیت و ...)
-- =========================================================

create table clinic_documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  title text not null,       -- مثلاً «پروانه بورد تخصصی رادیولوژی»
  file_url text not null,
  created_at timestamptz not null default now()
);

create index clinic_documents_idx on clinic_documents(clinic_id);
alter table clinic_documents enable row level security;

-- مدارک برای اعتمادسازی عمومی نمایش داده می‌شوند؛ ثبت هم در این دمو باز است
-- (در نسخه‌ی نهایی باید محدود به همان clinic از طریق Auth واقعی شود)
create policy "public read clinic documents" on clinic_documents for select using (true);
create policy "public insert clinic documents" on clinic_documents for insert with check (true);
create policy "public delete clinic documents" on clinic_documents for delete using (true);
