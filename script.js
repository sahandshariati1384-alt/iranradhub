// =========================================================
// انجمن علمی رادیولوژی — رفتارهای تعاملی
// =========================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- منوی موبایل ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  mainNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- برجسته کردن لینک فعال هنگام اسکرول ---------- */
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const sections = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const activateLink = (id) => {
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });
  };

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activateLink(entry.target.id);
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  sections.forEach(section => navObserver.observe(section));

  /* ---------- انیمیشن ظاهر شدن هنگام اسکرول ---------- */
  const revealSelectors = [
    '.section-head', '.board-card', '.film-frame', '.book-card',
    '.edu-card', '.article-row', '.link-card', '.video-card', '.stat'
  ];
  const revealEls = document.querySelectorAll(revealSelectors.join(','));
  revealEls.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => revealObserver.observe(el));

  /* ---------- فرم تماس (نمایشی) ---------- */
  const contactForm = document.getElementById('contactForm');
  const formNote = document.getElementById('formNote');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    formNote.textContent = 'پیام شما ثبت شد. متشکریم — به‌زودی پاسخ داده می‌شود.';
    contactForm.reset();
  });

});

/* =========================================================
   فاز ۲ — پنل‌های تعاملی صفحه اصلی (ذخیره‌سازی محلی مرورگر)
   نکته: این بخش‌ها برای نسخه دمو با localStorage کار می‌کنند.
   برای عملکرد واقعی چندکاربره (اشتراک بین همه بازدیدکننده‌ها)
   نیاز به اتصال به یک دیتابیس واقعی (مثل Supabase) است.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  const store = {
    get(key, fallback){
      try{ const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
      catch(e){ return fallback; }
    },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const faNum = (n) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

  /* ---------- تشخیص بک‌اند واقعی Supabase (در صورت تنظیم supabase-config.js) ---------- */
  const backendReady = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
    !String(SUPABASE_URL).includes('YOUR_SUPABASE') && typeof supabase !== 'undefined';
  const sb = backendReady ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
  if (!backendReady){
    console.info('[رادیولوژی] Supabase تنظیم نشده — پنل‌های خبرنامه/درخواست‌محتوا/پرسش‌وپاسخ/کاریابی با localStorage (دمو) کار می‌کنند. برای بک‌اند واقعی، supabase-config.js را پر کنید.');
  }

  /* ---------- خبرنامه ---------- */
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm){
    const note = document.getElementById('newsletterNote');
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input[type="email"]').value.trim();
      if (!email) return;
      if (backendReady){
        const { error } = await sb.from('newsletter_subscribers').insert({ email });
        if (error && error.code !== '23505'){ // 23505 = duplicate email، آن را هم موفق در نظر می‌گیریم
          note.textContent = 'خطا در ثبت — لطفاً دوباره تلاش کنید.';
          return;
        }
      } else {
        const list = store.get('rn_newsletter', []);
        if (!list.includes(email)) list.push(email);
        store.set('rn_newsletter', list);
      }
      note.textContent = 'ثبت شد! لینک دانلود «چک‌لیست آمادگی آزمون رادیولوژی» به‌زودی برایتان ارسال می‌شود.';
      newsletterForm.reset();
    });
  }

  /* ---------- درخواست محتوا ---------- */
  const contentReqForm = document.getElementById('contentRequestForm');
  if (contentReqForm){
    const note = document.getElementById('contentRequestNote');
    const listEl = document.getElementById('contentRequestList');
    const render = async () => {
      if (!listEl) return;
      let items;
      if (backendReady){
        const { data, error } = await sb.from('content_requests').select('*').order('created_at', { ascending: false }).limit(6);
        items = error ? [] : data;
      } else {
        items = store.get('rn_content_requests', []).slice(-6).reverse();
      }
      listEl.innerHTML = items.length ? items.map(i =>
        `<div class="table-row"><div class="row-main"><strong>${i.topic}</strong><span>درخواست‌دهنده: ${i.name || 'ناشناس'}</span></div><span class="chip chip-pending">در صف بررسی</span></div>`
      ).join('') : '<p class="empty-state">هنوز درخواستی ثبت نشده — اولین نفر باش!</p>';
    };
    contentReqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const topic = contentReqForm.topic.value.trim();
      const name = contentReqForm.name.value.trim();
      if (!topic) return;
      if (backendReady){
        await sb.from('content_requests').insert({ topic, name: name || null });
      } else {
        const list = store.get('rn_content_requests', []);
        list.push({ id: uid(), topic, name, createdAt: Date.now() });
        store.set('rn_content_requests', list);
      }
      note.textContent = 'درخواست شما ثبت شد و در برنامه تولید محتوا قرار می‌گیرد.';
      contentReqForm.reset();
      render();
    });
    render();
  }

  /* ---------- پرسش از متخصص ---------- */
  const qaForm = document.getElementById('qaForm');
  const qaList = document.getElementById('qaList');
  const seedQA = () => {
    if (backendReady) return; // در حالت بک‌اند واقعی، داده‌ی نمونه از قبل در دیتابیس شماست
    const existing = store.get('rn_qa', null);
    if (existing) return;
    store.set('rn_qa', [
      { id: uid(), name:'دانشجوی سال سوم', question:'تفاوت پروتکل MRI با و بدون کنتراست در ضایعات کبدی چیست؟', answer:'کنتراست (گادولینیوم) الگوی خون‌رسانی ضایعه را در فازهای مختلف نشان می‌دهد و برای افتراق ضایعات خوش‌خیم از بدخیم کلیدی است؛ در بسیاری پروتکل‌های کبدی فاز شریانی، وریدی و تأخیری به‌صورت اختصاصی تصویربرداری می‌شود.', status:'answered', createdAt: Date.now()-90000000 },
      { id: uid(), name:'کارآموز رادیولوژی', question:'برای کاهش دز در تصویربرداری اطفال چه اصولی رعایت می‌شود؟', answer:'اصل ALARA (کمترین دز ممکن)، تنظیم پارامترها بر اساس وزن/سن کودک، استفاده از شیلد سربی و ترجیح روش‌های بدون تشعشع مثل سونوگرافی و MRI در صورت امکان.', status:'answered', createdAt: Date.now()-40000000 }
    ]);
  };
  const renderQA = async () => {
    if (!qaList) return;
    let items;
    if (backendReady){
      const { data, error } = await sb.from('qa_questions').select('*').order('created_at', { ascending: false });
      items = error ? [] : data;
    } else {
      items = store.get('rn_qa', []).slice().reverse();
    }
    qaList.innerHTML = items.length ? items.map(q => `
      <div class="qa-item">
        <p class="qa-q">${q.question} <span class="qa-meta">— ${q.name || 'کاربر'}</span></p>
        ${q.status === 'answered'
          ? `<p class="qa-a">${q.answer}</p>`
          : `<span class="chip chip-pending">در انتظار پاسخ اساتید/هیئت مدیره</span>`}
      </div>
    `).join('') : '<p class="empty-state">هنوز سوالی ثبت نشده است.</p>';
  };
  if (qaForm){
    const note = document.getElementById('qaNote');
    qaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = qaForm.question.value.trim();
      const name = qaForm.name.value.trim();
      if (!question) return;
      if (backendReady){
        await sb.from('qa_questions').insert({ question, name: name || null });
      } else {
        const list = store.get('rn_qa', []);
        list.push({ id: uid(), name, question, answer:'', status:'pending', createdAt: Date.now() });
        store.set('rn_qa', list);
      }
      note.textContent = 'سوال شما ثبت شد؛ به محض پاسخ اساتید/هیئت مدیره اینجا نمایش داده می‌شود.';
      qaForm.reset();
      renderQA();
    });
  }
  seedQA();
  renderQA();

  /* ---------- ثبت‌نام کارگاه/وبینار ---------- */
  document.querySelectorAll('.event-register-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.event-card');
      const title = card?.dataset?.title || 'رویداد';
      const name = prompt(`ثبت‌نام در «${title}»\nنام و نام خانوادگی:`);
      if (!name) return;
      const email = prompt('ایمیل برای ارسال لینک ورود:');
      if (!email) return;
      const list = store.get('rn_webinar_regs', []);
      list.push({ id: uid(), title, name, email, createdAt: Date.now() });
      store.set('rn_webinar_regs', list);
      btn.textContent = 'ثبت‌نام شد ✓';
      btn.disabled = true;
    });
  });

  /* ---------- منابع ویژه اعضا (دمو قفل) ---------- */
  const unlockForm = document.getElementById('unlockForm');
  if (unlockForm){
    const note = document.getElementById('unlockNote');
    const DEMO_CODE = 'RADIO-EXAM-1404';
    if (store.get('rn_premium_unlocked', false)){
      document.querySelectorAll('.premium-card.locked').forEach(c => c.classList.remove('locked'));
    }
    unlockForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = unlockForm.code.value.trim();
      if (code === DEMO_CODE){
        store.set('rn_premium_unlocked', true);
        document.querySelectorAll('.premium-card.locked').forEach(c => c.classList.remove('locked'));
        note.textContent = 'کد صحیح بود — منابع ویژه باز شد.';
      } else {
        note.textContent = `کد نامعتبر است. (برای تست از کد نمونه ${DEMO_CODE} استفاده کنید)`;
      }
    });
  }

  /* ---------- همکاری پژوهشی ---------- */
  const researchForm = document.getElementById('researchForm');
  const researchList = document.getElementById('researchList');
  const seedResearch = () => {
    if (store.get('rn_research', null)) return;
    store.set('rn_research', [
      { id: uid(), title:'ارزیابی هوش مصنوعی در تشخیص میکروکلسیفیکاسیون ماموگرافی', name:'دانشجوی سال چهارم', field:'AI در تصویربرداری پستان', desc:'به دنبال همکار برای جمع‌آوری دیتاست و نگارش مقاله.', contact:'research1@example.com', createdAt: Date.now() }
    ]);
  };
  const renderResearch = () => {
    if (!researchList) return;
    const items = store.get('rn_research', []).slice().reverse();
    researchList.innerHTML = items.length ? items.map(r => `
      <article class="research-card">
        <span class="research-meta">${r.field}</span>
        <h3>${r.title}</h3>
        <p>${r.desc}</p>
        <p style="font-size:.8rem;color:var(--text-muted)">ثبت‌کننده: ${r.name} · تماس: ${r.contact}</p>
      </article>
    `).join('') : '<p class="empty-state">هنوز پروژه‌ای ثبت نشده است.</p>';
  };
  if (researchForm){
    const note = document.getElementById('researchNote');
    researchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = researchForm.title.value.trim();
      if (!title) return;
      const list = store.get('rn_research', []);
      list.push({
        id: uid(), title,
        name: researchForm.name.value.trim(),
        field: researchForm.field.value.trim() || 'عمومی',
        desc: researchForm.desc.value.trim(),
        contact: researchForm.contact.value.trim(),
        createdAt: Date.now()
      });
      store.set('rn_research', list);
      note.textContent = 'پروژه شما در بانک پژوهشگران ثبت شد.';
      researchForm.reset();
      renderResearch();
    });
  }
  seedResearch();
  renderResearch();

});


/* =========================================================
   شبکه انجمن‌های علمی دانشگاه‌ها
   نسخه‌ی قبلی این بخش فقط localStorage بود و هرگز به Supabase
   وصل نمی‌شد — حتی اگر SUPABASE_URL را پر می‌کردید، باز هم چیزی
   ذخیره نمی‌شد چون organizations/content اصلاً از این ماژول صدا
   زده نمی‌شدند. الان مثل بقیه‌ی بخش‌های سایت: اگر Supabase وصل
   باشد از آن استفاده می‌کند، وگرنه به‌صورت دمو با localStorage کار می‌کند.
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
(function(){

const ADMIN_PASSWORD = 'admin1404'; // فقط برای دمو — هرگز رمز واقعی را این‌طور در کد قرار ندهید

const db = {
  get(key, fallback){
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
    catch(e){ return fallback; }
  },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};
const uid = () => Math.random().toString(36).slice(2, 10);

const assocDirectoryEl = document.getElementById('assocDirectory');
if (!assocDirectoryEl) return; // این صفحه بخش شبکه انجمن‌ها را ندارد

const backendReady = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
  !String(SUPABASE_URL).includes('YOUR_SUPABASE') && typeof supabase !== 'undefined';
const sb = backendReady ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ---------- بذرپاشی داده نمونه (فقط حالت دمو، اولین بار) ---------- */
function seed(){
  if (backendReady) return; // در حالت واقعی، داده از Supabase می‌آید
  if (db.get('rn_associations', null)) return;
  db.set('rn_associations', [
    { id: uid(), name:'انجمن علمی رادیولوژی', university:'دانشگاه علوم پزشکی همدان', city:'همدان', secretary:'دبیر کل', email:'radio@example.com', phone:'', description:'انجمن میزبان شبکه.', status:'approved', username:'hamedan', password:'demo123', createdAt: Date.now()-500000 },
    { id: uid(), name:'انجمن علمی رادیولوژی', university:'دانشگاه علوم پزشکی تهران', city:'تهران', secretary:'—', email:'tehran@example.com', phone:'', description:'عضو نمونه شبکه برای نمایش دایرکتوری.', status:'approved', username:'tehran', password:'demo123', createdAt: Date.now()-400000 }
  ]);
  const assocs = db.get('rn_associations', []);
  db.set('rn_content', [
    { id: uid(), organization_id: assocs[0].id, type:'event', title:'کارگاه تفسیر پیشرفته CT', event_date:'۱۵ مرداد', body:'ویژه اعضای شبکه.', status:'approved', createdAt: Date.now()-300000 },
    { id: uid(), organization_id: assocs[1].id, type:'event', title:'وبینار ایمنی تشعشع', event_date:'۲۲ مرداد', body:'با همکاری کمیته پژوهشی تهران.', status:'approved', createdAt: Date.now()-250000 },
    { id: uid(), organization_id: assocs[1].id, type:'post', title:'اسلاید آناتومی مقطعی مغز', body:'مجموعه اسلاید آموزشی ترم دوم.', file_url:'#', status:'approved', createdAt: Date.now()-200000 },
    { id: uid(), organization_id: assocs[1].id, type:'collab_call', title:'نیاز به همکار برای متاآنالیز MRI پروستات', body:'به دنبال دانشجوی علاقه‌مند به آمار پزشکی.', contact_info:'tehran@example.com', status:'approved', createdAt: Date.now()-100000 }
  ]);
}
seed();

/* ---------- لایه‌ی داده: Supabase یا localStorage ---------- */
async function fetchOrgs(filter){
  if (backendReady){
    let q = sb.from('organizations').select('*');
    if (filter === 'approved') q = q.eq('status', 'approved');
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data, error } = await q.order('created_at', { ascending:false });
    if (error || !data) return [];
    return data.map(o => ({ ...o, createdAt: new Date(o.created_at).getTime() }));
  }
  const all = db.get('rn_associations', []);
  return filter ? all.filter(a => a.status === filter) : all;
}

async function fetchContent(filter){
  if (backendReady){
    let q = sb.from('content').select('*');
    if (filter === 'approved') q = q.eq('status', 'approved');
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data, error } = await q.order('created_at', { ascending:false });
    if (error || !data) return [];
    return data.map(c => ({ ...c, createdAt: new Date(c.created_at).getTime() }));
  }
  const all = db.get('rn_content', []);
  return filter ? all.filter(c => c.status === filter) : all;
}

async function insertOrg(payload){
  if (backendReady){ await sb.from('organizations').insert(payload); return; }
  const list = db.get('rn_associations', []);
  list.push({ id: uid(), ...payload, createdAt: Date.now() });
  db.set('rn_associations', list);
}
async function updateOrg(id, patch){
  if (backendReady){ await sb.from('organizations').update(patch).eq('id', id); return; }
  const list = db.get('rn_associations', []);
  const item = list.find(a => a.id === id);
  if (item) Object.assign(item, patch);
  db.set('rn_associations', list);
}
async function insertContent(payload){
  if (backendReady){ await sb.from('content').insert(payload); return; }
  const list = db.get('rn_content', []);
  list.push({ id: uid(), ...payload, createdAt: Date.now() });
  db.set('rn_content', list);
}
async function updateContent(id, patch){
  if (backendReady){ await sb.from('content').update(patch).eq('id', id); return; }
  const list = db.get('rn_content', []);
  const item = list.find(c => c.id === id);
  if (item) Object.assign(item, patch);
  db.set('rn_content', list);
}
async function findOrgByLogin(username, password){
  if (backendReady){
    const { data } = await sb.from('organizations').select('*').eq('username', username).eq('password', password).eq('status','approved').maybeSingle();
    return data || null;
  }
  const list = db.get('rn_associations', []);
  return list.find(a => a.username === username && a.password === password && a.status === 'approved') || null;
}
async function findOrgById(id){
  if (backendReady){
    const { data } = await sb.from('organizations').select('*').eq('id', id).maybeSingle();
    return data || null;
  }
  return db.get('rn_associations', []).find(a => a.id === id) || null;
}

/* ---------- کمکی ---------- */
function statusChip(status){
  if (status === 'approved') return '<span class="chip chip-approved">تاییدشده</span>';
  return '<span class="chip chip-pending">در انتظار تایید</span>';
}
let orgCache = [];
function assocName(id){
  const a = orgCache.find(x => x.id === id);
  return a ? `${a.name} · ${a.university}` : 'انجمن ناشناس';
}

/* ---------- رندر بخش‌های عمومی ---------- */
async function renderDirectory(){
  const items = await fetchOrgs('approved');
  orgCache = items;
  assocDirectoryEl.innerHTML = items.length ? items.map(a => `
    <div class="assoc-card">
      <div class="assoc-logo">🏛️</div>
      <h3>${a.name}</h3>
      <p>${a.university} — ${a.city}</p>
      <a href="network/room.html?id=${a.id}" class="btn-tiny" style="display:inline-flex;margin-top:10px">💬 کانال و چت انجمن</a>
    </div>
  `).join('') : '<p class="empty-state">هنوز انجمنی تایید نشده است.</p>';
}

async function renderNetworkEvents(){
  const el = document.getElementById('networkEventsList');
  const items = (await fetchContent('approved')).filter(c => c.type === 'event');
  el.innerHTML = items.length ? items.map(e => `
    <article class="event-card">
      <div class="event-top">
        <div><h3 style="margin:0">${e.title}</h3></div>
        <div class="event-date-badge">${e.event_date || '—'}</div>
      </div>
      <div class="event-body"><p>${e.body || ''}</p></div>
      <div class="event-foot"><span class="event-org">${assocName(e.organization_id)}</span></div>
    </article>
  `).join('') : '<p class="empty-state">هنوز رویدادی ثبت نشده است.</p>';
}

async function renderCollabs(){
  const el = document.getElementById('collabList');
  const items = (await fetchContent('approved')).filter(c => c.type === 'collab_call');
  el.innerHTML = items.length ? items.map(c => `
    <article class="research-card">
      <span class="research-meta">${assocName(c.organization_id)}</span>
      <h3>${c.title}</h3>
      <p>${c.body || ''}</p>
      <p style="font-size:.8rem;color:var(--text-muted)">تماس: ${c.contact_info || '—'}</p>
    </article>
  `).join('') : '<p class="empty-state">هنوز فراخوانی ثبت نشده است.</p>';
}

async function renderPublishedContent(){
  const el = document.getElementById('publishedContentList');
  const items = (await fetchContent('approved')).filter(c => c.type === 'post');
  el.innerHTML = items.length ? items.map(c => `
    <div class="table-row">
      <div class="row-main"><strong>${c.title}</strong><span>${assocName(c.organization_id)}</span></div>
      ${c.file_url ? `<a href="${c.file_url}" target="_blank" rel="noopener" class="btn-tiny">مشاهده</a>` : ''}
    </div>
  `).join('') : '<p class="empty-state">هنوز محتوایی منتشر نشده است.</p>';
}

async function renderPublicAll(){
  await renderDirectory();
  await renderNetworkEvents();
  await renderCollabs();
  await renderPublishedContent();
}
renderPublicAll();

/* ---------- فرم عضویت ---------- */
document.getElementById('joinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  await insertOrg({
    name: f.name.value.trim(),
    university: f.university.value.trim(),
    city: f.city.value.trim(),
    secretary: f.secretary.value.trim(),
    email: f.email.value.trim(),
    phone: f.phone.value.trim(),
    description: f.desc.value.trim(),
    status: 'pending',
    username: null, password: null
  });
  document.getElementById('joinNote').textContent = 'درخواست شما ثبت شد و پس از تایید مدیر کل شبکه، نام‌کاربری و رمز عبور به ایمیل‌تان اعلام می‌شود.';
  f.reset();
});

/* ---------- تب‌های ورود ---------- */
document.querySelectorAll('[data-login-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-login-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.login-box .tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`loginTab-${btn.dataset.loginTab}`).classList.add('active');
  });
});

/* ---------- ورود دبیر انجمن ---------- */
document.getElementById('assocLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const found = await findOrgByLogin(f.username.value.trim(), f.password.value);
  if (!found){
    document.getElementById('loginNote').textContent = 'نام کاربری یا رمز اشتباه است (برای تست دمو: hamedan / demo123 یا tehran / demo123).';
    return;
  }
  db.set('rn_session', { role:'assoc', assocId: found.id });
  openAssocDashboard(found);
});

/* ---------- ورود مدیر کل ---------- */
document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const password = e.target.password.value;
  if (password !== ADMIN_PASSWORD){
    document.getElementById('loginNote').textContent = 'رمز مدیر کل اشتباه است.';
    return;
  }
  db.set('rn_session', { role:'admin' });
  openAdminDashboard();
});

/* ---------- خروج ---------- */
document.getElementById('assocLogoutBtn').addEventListener('click', () => {
  localStorage.removeItem('rn_session');
  document.getElementById('assocDash').style.display = 'none';
});
document.getElementById('adminLogoutBtn').addEventListener('click', () => {
  localStorage.removeItem('rn_session');
  document.getElementById('adminDash').style.display = 'none';
});

/* ---------- پنل انجمن ---------- */
async function openAssocDashboard(assoc){
  document.getElementById('adminDash').style.display = 'none';
  document.getElementById('assocDash').style.display = 'block';
  document.getElementById('assocDashWelcome').textContent = `خوش آمدید، ${assoc.name} (${assoc.university})`;
  document.getElementById('dashTab-profile').innerHTML = `
    <div class="table-row"><div class="row-main"><strong>نام انجمن</strong><span>${assoc.name}</span></div></div>
    <div class="table-row"><div class="row-main"><strong>دانشگاه</strong><span>${assoc.university} — ${assoc.city}</span></div></div>
    <div class="table-row"><div class="row-main"><strong>دبیر</strong><span>${assoc.secretary}</span></div></div>
    <div class="table-row"><div class="row-main"><strong>ایمیل</strong><span>${assoc.email}</span></div></div>
    <div class="table-row"><div class="row-main"><strong>وضعیت</strong><span>${statusChip(assoc.status)}</span></div></div>
  `;
  await renderMyItems(assoc.id);
  document.getElementById('assocDash').scrollIntoView({ behavior:'smooth' });
}

document.querySelectorAll('.dash-tab-btn').forEach(btn => {
  if (btn.id === 'assocLogoutBtn') return;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.dash-tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`dashTab-${btn.dataset.dashTab}`).style.display = 'block';
  });
});

function currentAssocId(){
  const session = db.get('rn_session', null);
  if (!session || session.role !== 'assoc') return null;
  return session.assocId;
}

document.getElementById('contentSubmitForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const assocId = currentAssocId(); if (!assocId) return;
  const f = e.target;
  await insertContent({ organization_id: assocId, type:'post', title: f.title.value.trim(), body: f.body.value.trim(), file_url: f.link.value.trim(), status:'pending' });
  document.getElementById('contentSubmitNote').textContent = 'محتوا برای بررسی مدیر کل شبکه ارسال شد.';
  f.reset();
  await renderMyItems(assocId);
});

document.getElementById('eventSubmitForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const assocId = currentAssocId(); if (!assocId) return;
  const f = e.target;
  await insertContent({ organization_id: assocId, type:'event', title: f.title.value.trim(), event_date: f.date.value.trim(), body: f.desc.value.trim(), status:'pending' });
  document.getElementById('eventSubmitNote').textContent = 'رویداد برای بررسی مدیر کل شبکه ارسال شد.';
  f.reset();
  await renderMyItems(assocId);
});

document.getElementById('collabSubmitForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const assocId = currentAssocId(); if (!assocId) return;
  const f = e.target;
  await insertContent({ organization_id: assocId, type:'collab_call', title: f.title.value.trim(), body: f.desc.value.trim(), contact_info: f.contact.value.trim(), status:'pending' });
  document.getElementById('collabSubmitNote').textContent = 'فراخوان برای بررسی مدیر کل شبکه ارسال شد.';
  f.reset();
  await renderMyItems(assocId);
});

const KIND_LABEL = { post:'محتوا', event:'رویداد', collab_call:'فراخوان' };

async function renderMyItems(assocId){
  const el = document.getElementById('myItemsList');
  const all = (await fetchContent()).filter(c => c.organization_id === assocId);
  el.innerHTML = all.length ? all.map(i => `
    <div class="table-row">
      <div class="row-main"><strong>${i.title} <span class="qa-meta">(${KIND_LABEL[i.type] || i.type})</span></strong></div>
      ${statusChip(i.status)}
    </div>
  `).join('') : '<p class="empty-state">هنوز چیزی ارسال نکرده‌اید.</p>';
}

/* ---------- پنل مدیر کل ---------- */
async function openAdminDashboard(){
  document.getElementById('assocDash').style.display = 'none';
  document.getElementById('adminDash').style.display = 'block';
  await renderAdminQueues();
  document.getElementById('adminDash').scrollIntoView({ behavior:'smooth' });
}

document.querySelectorAll('[data-admin-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-admin-tab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('#adminDash .tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`adminTab-${btn.dataset.adminTab}`).classList.add('active');
  });
});

async function renderAdminQueues(){
  const pendingOrgs = await fetchOrgs('pending');
  document.getElementById('pendingAssocsList').innerHTML = pendingOrgs.length ? pendingOrgs.map(a => `
    <div class="table-row">
      <div class="row-main"><strong>${a.name}</strong><span>${a.university} — ${a.city} · دبیر: ${a.secretary || '—'} · ${a.email || '—'}</span></div>
      <div class="row-actions">
        <button class="btn-tiny approve" data-approve-assoc="${a.id}">تایید</button>
        <button class="btn-tiny reject" data-reject-assoc="${a.id}">رد</button>
      </div>
    </div>
  `).join('') : '<p class="empty-state">درخواست عضویت در صف نیست.</p>';

  // برای نمایش نام انجمنِ هر آیتم در صف تایید، به کل لیست انجمن‌ها نیاز داریم
  const allOrgs = await fetchOrgs();
  const nameOf = (id) => { const a = allOrgs.find(x => x.id === id); return a ? `${a.name} · ${a.university}` : 'انجمن ناشناس'; };

  const pendingContent = await fetchContent('pending');
  const renderQueue = (kind, containerId, approveAttr, rejectAttr) => {
    const items = pendingContent.filter(i => i.type === kind);
    document.getElementById(containerId).innerHTML = items.length ? items.map(i => `
      <div class="table-row">
        <div class="row-main"><strong>${i.title}</strong><span>${nameOf(i.organization_id)}</span></div>
        <div class="row-actions">
          <button class="btn-tiny approve" ${approveAttr}="${i.id}">تایید</button>
          <button class="btn-tiny reject" ${rejectAttr}="${i.id}">رد</button>
        </div>
      </div>
    `).join('') : '<p class="empty-state">موردی در صف نیست.</p>';
  };
  renderQueue('post', 'pendingContentList', 'data-approve-content', 'data-reject-content');
  renderQueue('event', 'pendingEventsList', 'data-approve-event', 'data-reject-event');
  renderQueue('collab_call', 'pendingCollabsList', 'data-approve-collab', 'data-reject-collab');

  const pendingClinics = await fetchPendingClinics();
  document.getElementById('pendingClinicsList').innerHTML = pendingClinics.length ? pendingClinics.map(c => `
    <div class="table-row">
      <div class="row-main"><strong>${c.name}</strong><span>${c.city} — ${c.address} · دکتر: ${c.doctor || '—'} · ${c.phone || '—'}</span></div>
      <div class="row-actions">
        <button class="btn-tiny approve" data-approve-clinic="${c.id}">تایید</button>
        <button class="btn-tiny reject" data-reject-clinic="${c.id}">رد</button>
      </div>
    </div>
  `).join('') : '<p class="empty-state">کلینیکی در صف تایید نیست.</p>';
}

/* ---------- کمکی‌های صف تایید کلینیک‌ها (جدول clinics در ماژول دیگری تعریف شده) ---------- */
async function fetchPendingClinics(){
  if (backendReady){
    const { data } = await sb.from('clinics').select('*').eq('status', 'pending').order('created_at', { ascending:false });
    return data || [];
  }
  return db.get('rn_clinics', []).filter(c => c.status === 'pending');
}
async function approveClinic(id){
  const username = 'clinic' + Math.random().toString(36).slice(2, 7);
  const password = Math.random().toString(36).slice(2, 9);
  if (backendReady){
    await sb.from('clinics').update({ status:'approved', username, password }).eq('id', id);
  } else {
    const list = db.get('rn_clinics', []);
    const item = list.find(c => c.id === id);
    if (item) Object.assign(item, { status:'approved', username, password });
    db.set('rn_clinics', list);
  }
  return { username, password };
}
async function rejectClinic(id){
  if (backendReady){
    await sb.from('clinics').update({ status:'rejected' }).eq('id', id);
  } else {
    const list = db.get('rn_clinics', []);
    const item = list.find(c => c.id === id);
    if (item) item.status = 'rejected';
    db.set('rn_clinics', list);
  }
}

document.getElementById('adminDash').addEventListener('click', async (e) => {
  const t = e.target;
  if (t.dataset.approveAssoc){
    const org = await findOrgById(t.dataset.approveAssoc);
    if (org){
      const username = (org.university || '').replace(/\s+/g,'').slice(0,10).toLowerCase() || uid();
      const password = Math.random().toString(36).slice(2, 9);
      await updateOrg(org.id, { status:'approved', username, password });
      alert(`انجمن تایید شد.\nنام کاربری: ${username}\nرمز عبور: ${password}\n(این اطلاعات را به ایمیل ${org.email || ''} ارسال کنید)`);
    }
    await renderAdminQueues(); await renderPublicAll();
  }
  if (t.dataset.rejectAssoc){ await updateOrg(t.dataset.rejectAssoc, { status:'rejected' }); await renderAdminQueues(); await renderPublicAll(); }
  if (t.dataset.approveContent){ await updateContent(t.dataset.approveContent, { status:'approved' }); await renderAdminQueues(); await renderPublicAll(); }
  if (t.dataset.rejectContent){ await updateContent(t.dataset.rejectContent, { status:'rejected' }); await renderAdminQueues(); await renderPublicAll(); }
  if (t.dataset.approveEvent){ await updateContent(t.dataset.approveEvent, { status:'approved' }); await renderAdminQueues(); await renderPublicAll(); }
  if (t.dataset.rejectEvent){ await updateContent(t.dataset.rejectEvent, { status:'rejected' }); await renderAdminQueues(); await renderPublicAll(); }
  if (t.dataset.approveCollab){ await updateContent(t.dataset.approveCollab, { status:'approved' }); await renderAdminQueues(); await renderPublicAll(); }
  if (t.dataset.rejectCollab){ await updateContent(t.dataset.rejectCollab, { status:'rejected' }); await renderAdminQueues(); await renderPublicAll(); }
  if (t.dataset.approveClinic){
    const { username, password } = await approveClinic(t.dataset.approveClinic);
    alert(`کلینیک تایید شد.\nنام کاربری: ${username}\nرمز عبور: ${password}\n(این اطلاعات را برای صاحب کلینیک ارسال کنید تا وارد پنل مدیریت کلینیک شود)`);
    await renderAdminQueues();
  }
  if (t.dataset.rejectClinic){ await rejectClinic(t.dataset.rejectClinic); await renderAdminQueues(); }
});

/* ---------- بازیابی نشست فعال هنگام رفرش صفحه ---------- */
(async function restoreSession(){
  const session = db.get('rn_session', null);
  if (!session) return;
  if (session.role === 'admin') openAdminDashboard();
  if (session.role === 'assoc'){
    const assoc = await findOrgById(session.assocId);
    if (assoc) openAssocDashboard(assoc);
  }
})();

})();
});


/* =========================================================
   فاز ۳ — پنل کاریابی رادیولوژی
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const jstore = {
    get(key, fallback){ try{ const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch(e){ return fallback; } },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  };
  const juid = () => Math.random().toString(36).slice(2, 10);

  const jobList = document.getElementById('jobList');
  const jobFilters = document.getElementById('jobFilters');
  const jobPostForm = document.getElementById('jobPostForm');
  if (!jobList) return; // این صفحه پنل کاریابی ندارد

  const backendReady = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
    !String(SUPABASE_URL).includes('YOUR_SUPABASE') && typeof supabase !== 'undefined';
  const sb = backendReady ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  const seedJobs = () => {
    if (backendReady) return; // در حالت بک‌اند واقعی، آگهی‌ها از جدول jobs در Supabase می‌آیند
    if (jstore.get('rn_jobs', null)) return;
    jstore.set('rn_jobs', [
      { id: juid(), clinic:'کلینیک تصویربرداری پارسیان', city:'همدان', title:'تکنسین رادیولوژی رنگی (گرافی رنگی)', type:'تمام‌وقت', salary:'توافقی + بیمه', contact:'0912xxxxxxx', desc:'نیاز فوری به تکنسین با حداقل یک سال سابقه کار در بخش گرافی رنگی.', urgent:true, createdAt: Date.now()-500000 },
      { id: juid(), clinic:'مرکز MRI و CT سلامت', city:'تهران', title:'تکنسین MRI', type:'شیفت شب', salary:'', contact:'mri.salamat@example.com', desc:'آشنایی با پروتکل‌های نورو و اسکلتی-عضلانی الزامی است.', urgent:false, createdAt: Date.now()-300000 },
      { id: juid(), clinic:'کلینیک رادیولوژی نور', city:'اصفهان', title:'کارورز رادیولوژی', type:'کارورزی', salary:'', contact:'noor.clinic@example.com', desc:'فرصت کارورزی برای فارغ‌التحصیلان جدید، همراه با آموزش.', urgent:false, createdAt: Date.now()-100000 }
    ]);
  };
  seedJobs();

  let activeCity = 'all';
  let activeJobIndex = 0;

  function layoutFan(count){
    const items = Array.from(jobList.querySelectorAll('.fanflow-item'));
    if (activeJobIndex >= count) activeJobIndex = 0;
    items.forEach((item, i) => {
      const offset = i - activeJobIndex;
      const angle = offset * 12;
      const tx = offset * 76;
      const ty = Math.min(Math.abs(offset) * 14, 60);
      const scale = i === activeJobIndex ? 1.06 : Math.max(0.72, 1 - Math.abs(offset) * 0.12);
      const opacity = Math.max(0.15, 1 - Math.abs(offset) * 0.28);
      item.style.transform = `translateX(${tx}px) translateY(${ty}px) rotate(${angle}deg) scale(${scale})`;
      item.style.opacity = String(opacity);
      item.style.zIndex = String(100 - Math.abs(offset));
      item.classList.toggle('is-active', i === activeJobIndex);
      item.onclick = (e) => {
        if (e.target.closest('.job-apply-btn')) return;
        activeJobIndex = i;
        layoutFan(count);
      };
    });
  }

  // واکشی آگهی‌ها از Supabase (در صورت اتصال) یا localStorage، با نگاشت یکسان فیلدها
  async function fetchJobs(){
    if (backendReady){
      const { data, error } = await sb.from('jobs').select('*').order('created_at', { ascending: false });
      if (error || !data) return [];
      return data.map(j => ({
        id: j.id, clinic: j.clinic, city: j.city, title: j.title, type: j.type,
        salary: j.salary, contact: j.contact, desc: j.description, urgent: j.urgent,
        createdAt: new Date(j.created_at).getTime()
      }));
    }
    return jstore.get('rn_jobs', []).slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  const renderJobFilters = async () => {
    const jobs = await fetchJobs();
    const cities = Array.from(new Set(jobs.map(j => j.city)));
    jobFilters.innerHTML = `<button class="filter-chip ${activeCity==='all'?'active':''}" data-job-filter="all">همه شهرها</button>` +
      cities.map(c => `<button class="filter-chip ${activeCity===c?'active':''}" data-job-filter="${c}">${c}</button>`).join('');
    jobFilters.querySelectorAll('[data-job-filter]').forEach(btn => {
      btn.addEventListener('click', () => { activeCity = btn.dataset.jobFilter; renderJobFilters(); renderJobs(); });
    });
  };

  const renderJobs = async () => {
    const jobs = await fetchJobs();
    const filtered = activeCity === 'all' ? jobs : jobs.filter(j => j.city === activeCity);
    document.getElementById('jobsStatCount') && (document.getElementById('jobsStatCount').textContent = `+${jobs.length}`);
    jobList.innerHTML = filtered.length ? filtered.map((j, idx) => `
      <article class="job-card fanflow-item" data-idx="${idx}">
        ${j.urgent ? '<span class="corner-ribbon urgent">استخدام فوری</span>' : '<span class="corner-ribbon new">جدید</span>'}
        <div class="job-head">
          <div>
            <span class="job-clinic">${j.clinic} · ${j.city}</span>
            <h3 class="job-title">${j.title}</h3>
          </div>
        </div>
        <div class="job-meta"><span>${j.type}</span>${j.salary ? `<span>${j.salary}</span>` : ''}</div>
        <p class="job-desc">${j.desc || ''}</p>
        <div class="job-foot">
          <span class="job-salary">${j.salary || 'حقوق توافقی'}</span>
          <button class="btn btn-primary btn-small job-apply-btn" data-job-id="${j.id}">ارسال رزومه</button>
        </div>
      </article>
    `).join('') : '<p class="empty-state">آگهی‌ای در این شهر ثبت نشده است.</p>';

    layoutFan(filtered.length);

    jobList.querySelectorAll('.job-apply-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const job = filtered.find(j => j.id === btn.dataset.jobId);
        if (!job) return;
        const name = prompt(`ارسال رزومه برای «${job.title}» — ${job.clinic}\nنام و نام خانوادگی:`);
        if (!name) return;
        const email = prompt('ایمیل یا شماره تماس شما:');
        if (!email) return;
        const resumeLink = prompt('لینک رزومه (گوگل‌درایو/لینکدین) — اختیاری:') || '';
        if (backendReady){
          await sb.from('resumes').insert({ job_id: job.id, name, email, resume_link: resumeLink || null });
        } else {
          const resumes = jstore.get('rn_resumes', []);
          resumes.push({ id: juid(), jobId: job.id, name, email, resumeLink, createdAt: Date.now() });
          jstore.set('rn_resumes', resumes);
        }
        btn.textContent = 'رزومه ارسال شد ✓';
        btn.disabled = true;
      });
    });
  };

  if (jobPostForm){
    jobPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const newJob = {
        clinic: f.clinic.value.trim(),
        city: f.city.value.trim(),
        title: f.title.value.trim(),
        type: f.type.value,
        salary: f.salary.value.trim(),
        contact: f.contact.value.trim(),
        desc: f.desc.value.trim(),
        urgent: false
      };
      if (backendReady){
        await sb.from('jobs').insert({
          clinic: newJob.clinic, city: newJob.city, title: newJob.title, type: newJob.type,
          salary: newJob.salary, contact: newJob.contact, description: newJob.desc, urgent: false
        });
      } else {
        const jobs = jstore.get('rn_jobs', []);
        jobs.push({ id: juid(), ...newJob, createdAt: Date.now() });
        jstore.set('rn_jobs', jobs);
      }
      document.getElementById('jobPostNote').textContent = 'آگهی شما ثبت شد و در فهرست بالا نمایش داده می‌شود.';
      f.reset();
      renderJobFilters();
      renderJobs();
    });
  }

  renderJobFilters();
  renderJobs();
});

/* =========================================================
   فاز ۴ — جلوه‌های انیمیشنی (بدون تغییر در منطق پنل‌ها)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- ردیاب رتیکل در هیرو ---------- */
  const hero = document.querySelector('.hero');
  const reticle = document.getElementById('heroReticle');
  if (hero && reticle){
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      reticle.style.left = `${e.clientX - rect.left}px`;
      reticle.style.top = `${e.clientY - rect.top}px`;
    });
  }

  /* ---------- خط زیر عنوان بخش‌ها هنگام ورود به دید ---------- */
  const headObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add('in-view');
        headObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.section-head').forEach(el => headObserver.observe(el));

  /* ---------- شمارشگر آمار متحرک ---------- */
  const faToEn = (s) => s.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  const enToFa = (n) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const item = entry.target;
      const b = item.querySelector('b');
      if (!b || item.classList.contains('counted')) return;
      const raw = b.textContent.trim();
      const hasPlus = raw.includes('+');
      const target = parseInt(faToEn(raw.replace(/[^۰-۹0-9]/g, '')), 10) || 0;
      let current = 0;
      const step = Math.max(1, Math.round(target / 40));
      const tick = () => {
        current = Math.min(target, current + step);
        b.textContent = `${hasPlus ? '+' : ''}${enToFa(current)}`;
        if (current < target) requestAnimationFrame(tick);
        else item.classList.add('counted');
      };
      tick();
      statObserver.unobserve(item);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-ticker-item').forEach(el => statObserver.observe(el));

});

/* =========================================================
   فاز ۵ — تجربه سه‌بعدی: اسکلت واقعی WebGL + تیلت کارت‌ها + کاروسل سه‌بعدی
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     ۱) اسکلت سه‌بعدی واقعی با Three.js
     --------------------------------------------------------- */
  function initSkeleton3D(){
    const canvas = document.getElementById('skeletonCanvas');
    if (!canvas || typeof THREE === 'undefined' || reduceMotion) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const cyan = 0x4cd6e8, amber = 0xe8a94f;
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xEDE6D6, emissive: 0x123138, emissiveIntensity: 0.22, metalness: 0.08, roughness: 0.55, transparent: true, opacity: 0.86 });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0xD8CBA8, emissive: 0x3a2410, emissiveIntensity: 0.18, metalness: 0.05, roughness: 0.5, transparent: true, opacity: 0.86 });

    scene.add(new THREE.AmbientLight(0xaab4c2, 1.4));
    const soft = new THREE.DirectionalLight(0xffffff, 0.9); soft.position.set(2, 6, 4); scene.add(soft);
    const key = new THREE.PointLight(cyan, 1.6, 30); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.PointLight(amber, 1.1, 30); rim.position.set(-4, -2, -3); scene.add(rim);

    const skeleton = new THREE.Group();

    const bone = (radius, length, x, y, z, rotZ = 0, rotX = 0) => {
      const geo = new THREE.CylinderGeometry(radius, radius, length, 16);
      const m = new THREE.Mesh(geo, boneMat);
      m.position.set(x, y, z);
      m.rotation.z = rotZ; m.rotation.x = rotX;
      skeleton.add(m);
      return m;
    };
    const joint = (radius, x, y, z) => {
      const geo = new THREE.SphereGeometry(radius, 16, 16);
      const m = new THREE.Mesh(geo, jointMat);
      m.position.set(x, y, z);
      skeleton.add(m);
      return m;
    };

    // جمجمه — بالاترین نقطه‌ی اسکلت (اول صفحه)
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 20), boneMat);
    skull.position.set(0, 2.55, 0);
    skull.scale.set(0.9, 1.05, 1);
    skeleton.add(skull);
    joint(0.16, -0.22, 2.5, 0.5); joint(0.16, 0.22, 2.5, 0.5); // حدقه‌ی چشم

    const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.4, 16), boneMat);
    jaw.position.set(0, 1.98, 0.12); jaw.rotation.x = Math.PI;
    skeleton.add(jaw);

    // ستون فقرات
    for (let i = 0; i < 12; i++){ joint(0.11, 0, 1.95 - i * 0.16, 0); }

    // ترقوه (استخوان چنبر)
    bone(0.055, 0.85, -0.55, 1.92, 0.15, Math.PI / 2 - 0.25);
    bone(0.055, 0.85, 0.55, 1.92, 0.15, -(Math.PI / 2 - 0.25));

    // قفسه سینه — دنده‌های متراکم‌تر برای جزئیات بیشتر
    for (let i = 0; i < 8; i++){
      const y = 1.8 - i * 0.185;
      const curveL = new THREE.Mesh(new THREE.TorusGeometry(0.82 - i * 0.015, 0.038, 8, 24, Math.PI * 0.85), boneMat);
      curveL.position.set(0, y, 0); curveL.rotation.z = Math.PI / 2 + 0.15; curveL.rotation.y = 0.15;
      skeleton.add(curveL);
    }

    // لگن
    const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.16, 10, 20, Math.PI), boneMat);
    pelvis.position.set(0, -0.35, 0); pelvis.rotation.z = Math.PI;
    skeleton.add(pelvis);

    // بازوها
    bone(0.08, 1.1, -1.05, 1.1, 0, Math.PI / 2.3);
    bone(0.07, 1.0, -1.75, 0.15, 0, Math.PI / 2.6);
    bone(0.08, 1.1, 1.05, 1.1, 0, -Math.PI / 2.3);
    bone(0.07, 1.0, 1.75, 0.15, 0, -Math.PI / 2.6);
    joint(0.12, -1.45, 0.65, 0); joint(0.12, 1.45, 0.65, 0);

    // دست‌ها (کف دست ساده)
    joint(0.09, -1.95, -0.55, 0); joint(0.09, 1.95, -0.55, 0);
    for (let f = -1; f <= 1; f++){ joint(0.045, -1.95 + f * 0.11, -0.78, 0.05); joint(0.045, 1.95 + f * 0.11, -0.78, 0.05); }

    // ران و ساق — پایین‌ترین نقطه (انتهای صفحه)
    bone(0.14, 1.6, -0.32, -1.35, 0, 0.05);
    bone(0.11, 1.5, -0.4, -2.9, 0, 0.05);
    bone(0.14, 1.6, 0.32, -1.35, 0, -0.05);
    bone(0.11, 1.5, 0.4, -2.9, 0, -0.05);
    joint(0.15, -0.32, -2.15, 0); joint(0.15, 0.32, -2.15, 0);
    // کشکک زانو
    const patellaL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), jointMat);
    patellaL.position.set(-0.32, -2.1, 0.16); patellaL.scale.set(1, 1.2, 0.6);
    skeleton.add(patellaL);
    const patellaR = patellaL.clone(); patellaR.position.x = 0.32; skeleton.add(patellaR);
    joint(0.12, -0.42, -3.68, 0); joint(0.12, 0.42, -3.68, 0); // پا / مچ پا
    for (let f = -1; f <= 1; f++){ joint(0.05, -0.42 + f * 0.1, -3.85, 0.32); joint(0.05, 0.42 + f * 0.1, -3.85, 0.32); }

    scene.add(skeleton);

    // محدوده‌ی عمودی اسکلت که دوربین هنگام اسکرول از سر تا پا طی می‌کند
    const TOP_Y = 3.1;     // بالای جمجمه
    const BOTTOM_Y = -3.9; // نوک پا

    let dragRotY = 0, dragRotX = 0;
    let dragging = false, lastX = 0, lastY = 0, velX = 0.0009;

    canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      dragRotY += dx * 0.007;
      dragRotX = Math.max(-0.5, Math.min(0.5, dragRotX + dy * 0.005));
      velX = dx * 0.0004;
      lastX = e.clientX; lastY = e.clientY;
    });

    function getScrollProgress(){
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / max));
    }

    function resize(){
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    let t = 0;
    function animate(){
      requestAnimationFrame(animate);
      t += 0.01;

      const progress = getScrollProgress();
      const camY = TOP_Y + (BOTTOM_Y - TOP_Y) * progress;
      camera.position.set(Math.sin(t * 0.15) * 0.4, camY, 6.4);
      camera.lookAt(0, camY - 0.25, 0);

      if (!dragging){ dragRotY += velX; velX *= 0.94; }
      skeleton.rotation.y = dragRotY + Math.sin(t * 0.12) * 0.12;
      skeleton.rotation.x = dragRotX;

      renderer.render(scene, camera);
    }
    animate();
    canvas.classList.add('ready');
    document.body.classList.add('has-3d-skeleton');
  }
  try { initSkeleton3D(); } catch(e) { /* اگر WebGL در دسترس نبود، پس‌زمینه ساده بدون اسکلت باقی می‌ماند */ }


  /* ---------------------------------------------------------
     ۲) تیلت سه‌بعدی کارت‌ها با موس
     --------------------------------------------------------- */
  if (!reduceMotion){
    const tiltSelector = '.board-card, .event-card, .premium-card, .research-card, .job-card, .edu-card, .book-card, .assoc-card';
    document.querySelectorAll(tiltSelector).forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * 12}deg) rotateX(${-py * 12}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     ۳) کاروسل سه‌بعدی اساتید
     --------------------------------------------------------- */
  function initCarousel3D(){
    const ring = document.querySelector('#profCarousel .carousel-3d-ring');
    if (!ring || reduceMotion) return;
    const items = Array.from(ring.querySelectorAll('.carousel-3d-item'));
    const count = items.length;
    const radius = 300;
    items.forEach((item, i) => {
      const angle = (360 / count) * i;
      item.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
      item.dataset.angle = angle;
    });

    let rotation = 0;
    let paused = false;
    const viewport = document.getElementById('profCarousel');
    viewport.addEventListener('mouseenter', () => paused = true);
    viewport.addEventListener('mouseleave', () => paused = false);

    function updateFacing(){
      items.forEach(item => {
        const angle = parseFloat(item.dataset.angle);
        let diff = ((angle + rotation) % 360 + 360) % 360;
        if (diff > 180) diff -= 360;
        const facing = Math.max(0, 1 - Math.abs(diff) / 110);
        item.style.opacity = String(0.25 + facing * 0.75);
        item.style.filter = facing < 0.6 ? 'blur(1.5px)' : 'none';
      });
    }
    updateFacing();

    function tick(){
      requestAnimationFrame(tick);
      if (paused) return;
      rotation += 0.06;
      ring.style.transform = `rotateY(${rotation}deg)`;
      updateFacing();
    }
    tick();

    const hint = document.createElement('div');
    hint.className = 'carousel-hint';
    hint.textContent = 'اشاره‌گر را روی کارت‌ها نگه دارید تا بچرخش بایستد';
    viewport.appendChild(hint);
  }
  try { initCarousel3D(); } catch(e) {}

});

/* =========================================================
   فاز ۶ — منطق کاروسل‌های متفاوت (کاورفلوی هیئت‌مدیره / استک وبینارها)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------- کاورفلوی سبک PS4 برای هیئت مدیره ---------- */
  function initBoardCoverflow(){
    const track = document.getElementById('boardTrack');
    const dotsWrap = document.getElementById('boardDots');
    const prevBtn = document.getElementById('boardPrev');
    const nextBtn = document.getElementById('boardNext');
    if (!track) return;

    const items = Array.from(track.querySelectorAll('.coverflow-item'));
    const n = items.length;
    let active = 0;

    if (dotsWrap){
      dotsWrap.innerHTML = items.map((_, i) => `<span data-dot="${i}"></span>`).join('');
    }

    function classify(){
      items.forEach((item, i) => {
        let diff = i - active;
        if (diff > n / 2) diff -= n;
        if (diff < -n / 2) diff += n;
        item.classList.remove('is-center','is-near-l','is-near-r','is-far-l','is-far-r','is-hidden');
        if (diff === 0) item.classList.add('is-center');
        else if (diff === -1) item.classList.add('is-near-l');
        else if (diff === 1) item.classList.add('is-near-r');
        else if (diff === -2) item.classList.add('is-far-l');
        else if (diff === 2) item.classList.add('is-far-r');
        else item.classList.add('is-hidden');
      });
      if (dotsWrap){
        dotsWrap.querySelectorAll('span').forEach((d, i) => d.classList.toggle('active', i === active));
      }
    }

    items.forEach((item, i) => {
      item.addEventListener('click', () => {
        if (i === active) return;
        active = i;
        classify();
      });
    });
    if (dotsWrap){
      dotsWrap.querySelectorAll('span').forEach(d => {
        d.addEventListener('click', () => { active = parseInt(d.dataset.dot, 10); classify(); });
      });
    }
    prevBtn && prevBtn.addEventListener('click', () => { active = (active - 1 + n) % n; classify(); });
    nextBtn && nextBtn.addEventListener('click', () => { active = (active + 1) % n; classify(); });

    classify();
  }
  try { initBoardCoverflow(); } catch(e) {}

  /* ---------- استک سوایپ‌شونده وبینارها ---------- */
  function initWebinarStack(){
    const stack = document.getElementById('webinarStack');
    const nextBtn = document.getElementById('webinarNext');
    const prevBtn = document.getElementById('webinarPrev');
    if (!stack) return;

    const cards = Array.from(stack.querySelectorAll('.stackflow-card'));
    let order = cards.map((_, i) => i); // ترتیب فعلی، اولین عنصر = روی استک

    function layout(){
      cards.forEach(c => c.classList.remove('pos-0','pos-1','pos-2','pos-hidden'));
      order.forEach((cardIndex, pos) => {
        const cls = pos === 0 ? 'pos-0' : pos === 1 ? 'pos-1' : pos === 2 ? 'pos-2' : 'pos-hidden';
        cards[cardIndex].classList.add(cls);
      });
    }
    nextBtn && nextBtn.addEventListener('click', () => {
      order.push(order.shift());
      layout();
    });
    prevBtn && prevBtn.addEventListener('click', () => {
      order.unshift(order.pop());
      layout();
    });
    layout();
  }
  try { initWebinarStack(); } catch(e) {}

});

/* =========================================================
   فاز ۸ — مهاجرت و کاریابی بین‌المللی
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const gstore = {
    get(key, fallback){ try{ const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch(e){ return fallback; } },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  };
  const guid = () => Math.random().toString(36).slice(2, 10);

  const globalJobList = document.getElementById('globalJobList');
  const globalJobFilters = document.getElementById('globalJobFilters');
  const migrationForm = document.getElementById('migrationForm');
  if (!globalJobList) return; // این صفحه بخش مهاجرت ندارد

  const backendReady = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
    !String(SUPABASE_URL).includes('YOUR_SUPABASE') && typeof supabase !== 'undefined';
  const sb = backendReady ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  const seedGlobalJobs = () => {
    if (backendReady) return;
    if (gstore.get('rn_global_jobs', null)) return;
    gstore.set('rn_global_jobs', [
      { id: guid(), country:'کانادا', employer:'یک مرکز تصویربرداری در تورنتو', title:'تکنسین رادیولوژی (دارای مجوز CAMRT)', requirement:'ثبت‌نام نزد نهاد استانی + IELTS 7', contact:'careers@example-ca.com', createdAt: Date.now()-400000 },
      { id: guid(), country:'آلمان', employer:'یک بیمارستان در مونیخ', title:'MTRA (تکنسین رادیولوژی)', requirement:'Anerkennung تاییدشده + زبان آلمانی B2', contact:'jobs@example-de.com', createdAt: Date.now()-200000 },
      { id: guid(), country:'بریتانیا', employer:'یک کلینیک خصوصی در لندن', title:'Diagnostic Radiographer', requirement:'ثبت‌نام HCPC + IELTS 7 (هر بخش ۶.۵+)', contact:'hr@example-uk.com', createdAt: Date.now()-100000 }
    ]);
  };
  seedGlobalJobs();

  let activeCountry = 'all';

  async function fetchGlobalJobs(){
    if (backendReady){
      const { data, error } = await sb.from('global_jobs').select('*').order('created_at', { ascending: false });
      if (error || !data) return [];
      return data.map(j => ({ ...j, createdAt: new Date(j.created_at).getTime() }));
    }
    return gstore.get('rn_global_jobs', []).slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  const renderGlobalFilters = async () => {
    const jobs = await fetchGlobalJobs();
    const countries = Array.from(new Set(jobs.map(j => j.country)));
    globalJobFilters.innerHTML = `<button class="filter-chip ${activeCountry==='all'?'active':''}" data-global-filter="all">همه کشورها</button>` +
      countries.map(c => `<button class="filter-chip ${activeCountry===c?'active':''}" data-global-filter="${c}">${c}</button>`).join('');
    globalJobFilters.querySelectorAll('[data-global-filter]').forEach(btn => {
      btn.addEventListener('click', () => { activeCountry = btn.dataset.globalFilter; renderGlobalFilters(); renderGlobalJobs(); });
    });
  };

  const renderGlobalJobs = async () => {
    const jobs = await fetchGlobalJobs();
    const filtered = activeCountry === 'all' ? jobs : jobs.filter(j => j.country === activeCountry);
    globalJobList.innerHTML = filtered.length ? filtered.map(j => `
      <article class="event-card">
        <div class="event-top">
          <div><span class="edu-tag">${j.country}</span><h3 style="margin-top:8px">${j.title}</h3></div>
        </div>
        <div class="event-body">
          <p>${j.employer}</p>
          <p style="font-size:.82rem;color:var(--text-muted)">📋 ${j.requirement}</p>
        </div>
        <div class="event-foot"><span class="event-org">تماس: ${j.contact}</span></div>
      </article>
    `).join('') : '<p class="empty-state">فعلاً آگهی‌ای برای این کشور ثبت نشده است.</p>';
  };

  if (migrationForm){
    migrationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const payload = {
        name: f.name.value.trim(),
        email: f.email.value.trim(),
        country: f.country.value.trim(),
        experience: f.experience.value.trim(),
        message: f.message.value.trim()
      };
      if (backendReady){
        await sb.from('migration_consultations').insert(payload);
      } else {
        const list = gstore.get('rn_migration_consultations', []);
        list.push({ id: guid(), ...payload, createdAt: Date.now() });
        gstore.set('rn_migration_consultations', list);
      }
      document.getElementById('migrationNote').textContent = 'درخواست شما ثبت شد؛ به‌زودی از طریق ایمیل با شما تماس گرفته می‌شود.';
      f.reset();
    });
  }

  renderGlobalFilters();
  renderGlobalJobs();
});

/* =========================================================
   ابزار عمومی: مودال ساده برای رزرو نوبت / پیام به کلینیک
   ========================================================= */
function rnOpenModal({ title, desc, formHtml, onSubmit }){
  let modal = document.getElementById('rnModal');
  if (!modal){
    modal = document.createElement('div');
    modal.className = 'rn-modal';
    modal.id = 'rnModal';
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  }
  modal.innerHTML = `
    <div class="rn-modal-inner">
      <button class="rn-modal-close" id="rnModalClose">✕ بستن</button>
      <h3>${title}</h3>
      ${desc ? `<p class="rn-modal-desc">${desc}</p>` : ''}
      <form class="rn-modal-form" id="rnModalForm">${formHtml}<button type="submit" class="btn btn-primary btn-small">ارسال</button><p class="rn-modal-note" id="rnModalNote"></p></form>
    </div>`;
  modal.classList.add('open');
  document.getElementById('rnModalClose').addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('rnModalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await onSubmit(e.target, (msg) => { document.getElementById('rnModalNote').textContent = msg; });
  });
}

/* =========================================================
   فاز ۹ — فهرست کلینیک‌ها (استان/شهر) — قبلاً هیچ منطقی نداشت
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const clinicResults = document.getElementById('clinicResults');
  if (!clinicResults) return; // این صفحه بخش فهرست کلینیک‌ها را ندارد

  const gstore = {
    get(key, fallback){ try{ const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch(e){ return fallback; } },
    set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
  };
  const guid = () => Math.random().toString(36).slice(2, 10);

  const backendReady = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
    !String(SUPABASE_URL).includes('YOUR_SUPABASE') && typeof supabase !== 'undefined';
  const sb = backendReady ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  const provinceSelect = document.getElementById('provinceSelect');
  const citySelect = document.getElementById('citySelect');
  const submitProvinceSelect = document.getElementById('submitProvinceSelect');
  const submitCitySelect = document.getElementById('submitCitySelect');
  const clinicSubmitForm = document.getElementById('clinicSubmitForm');

  function fillProvinces(select){
    if (!select || typeof IRAN_PROVINCES === 'undefined') return;
    Object.keys(IRAN_PROVINCES).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      select.appendChild(opt);
    });
  }
  function wireProvinceCity(provinceEl, cityEl, onChange){
    if (!provinceEl || !cityEl) return;
    provinceEl.addEventListener('change', () => {
      cityEl.innerHTML = '<option value="">انتخاب شهر...</option>';
      const cities = IRAN_PROVINCES[provinceEl.value] || [];
      cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        cityEl.appendChild(opt);
      });
      if (onChange) onChange();
    });
    cityEl.addEventListener('change', () => { if (onChange) onChange(); });
  }

  fillProvinces(provinceSelect);
  fillProvinces(submitProvinceSelect);
  wireProvinceCity(provinceSelect, citySelect, () => renderClinics());
  wireProvinceCity(submitProvinceSelect, submitCitySelect);

  const seedClinics = () => {
    if (backendReady) return;
    if (gstore.get('rn_clinics', null)) return;
    gstore.set('rn_clinics', [
      { id: guid(), name:'مرکز تصویربرداری پرتونگار', doctor:'دکتر مهدی احمدی', province:'تهران', city:'تهران', address:'خیابان ولیعصر، بالاتر از پارک وی', phone:'021-88112233', hours:'۸ تا ۲۰', specialties:'سی‌تی‌اسکن، MRI، سونوگرافی', status:'approved', createdAt: Date.now()-300000 },
      { id: guid(), name:'کلینیک تصویربرداری سپهر', doctor:'دکتر سارا رضایی', province:'اصفهان', city:'اصفهان', address:'خیابان چهارباغ بالا', phone:'031-36601122', hours:'۹ تا ۲۱', specialties:'رادیوگرافی، ماموگرافی، سونوگرافی', status:'approved', createdAt: Date.now()-100000 }
    ]);
  };
  seedClinics();

  async function fetchClinics(){
    if (backendReady){
      const { data, error } = await sb.from('clinics').select('*').eq('status','approved').order('created_at', { ascending:false });
      if (error || !data) return [];
      return data.map(c => ({ ...c, createdAt: new Date(c.created_at).getTime() }));
    }
    return gstore.get('rn_clinics', []).filter(c => c.status === 'approved').slice().sort((a,b) => b.createdAt - a.createdAt);
  }

  async function fetchClinicGallery(clinicId){
    if (backendReady){
      const { data } = await sb.from('clinic_gallery').select('*').eq('clinic_id', clinicId).order('created_at', { ascending:false }).limit(6);
      return data || [];
    }
    return gstore.get('rn_gallery_' + clinicId, []).slice(0, 6);
  }

  function openBookingModal(clinic){
    rnOpenModal({
      title: `رزرو نوبت — ${clinic.name}`,
      desc: 'اطلاعات زیر را پر کنید؛ کلینیک پس از بررسی، نوبت شما را تایید یا هماهنگ می‌کند.',
      formHtml: `
        <input type="text" name="patient_name" placeholder="نام و نام خانوادگی" required>
        <input type="text" name="phone" placeholder="شماره تماس" required>
        <input type="text" name="service" placeholder="نوع خدمت (مثلاً MRI زانو)">
        <div class="row2">
          <input type="text" name="preferred_date" placeholder="تاریخ پیشنهادی (مثلاً ۱۴۰۴/۰۵/۰۱)">
          <input type="text" name="preferred_time" placeholder="ساعت پیشنهادی">
        </div>
        <textarea name="note" placeholder="توضیح یا نسخه‌ی پزشک (اختیاری)"></textarea>`,
      onSubmit: async (f, setNote) => {
        const payload = {
          clinic_id: clinic.id, patient_name: f.patient_name.value.trim(), phone: f.phone.value.trim(),
          service: f.service.value.trim(), preferred_date: f.preferred_date.value.trim(),
          preferred_time: f.preferred_time.value.trim(), note: f.note.value.trim(), status: 'pending'
        };
        if (backendReady){
          await sb.from('clinic_appointments').insert(payload);
        } else {
          const list = gstore.get('rn_appts_' + clinic.id, []);
          list.push({ id: guid(), ...payload, createdAt: Date.now() });
          gstore.set('rn_appts_' + clinic.id, list);
        }
        setNote('درخواست نوبت شما ثبت شد؛ کلینیک به‌زودی با شما تماس می‌گیرد. ✅');
        f.reset();
      }
    });
  }

  function openMessageModal(clinic){
    rnOpenModal({
      title: `پیام به ${clinic.name}`,
      desc: 'سوال بالینی یا اداری‌ات را بنویس؛ کلینیک از طریق پنل خودش پاسخ می‌دهد.',
      formHtml: `
        <input type="text" name="patient_name" placeholder="نام شما" required>
        <input type="text" name="patient_contact" placeholder="شماره تماس یا ایمیل (اختیاری)">
        <textarea name="message" placeholder="پیام شما..." required></textarea>`,
      onSubmit: async (f, setNote) => {
        const payload = {
          clinic_id: clinic.id, sender: 'patient', patient_name: f.patient_name.value.trim(),
          patient_contact: f.patient_contact.value.trim(), message: f.message.value.trim()
        };
        if (backendReady){
          await sb.from('clinic_messages').insert(payload);
        } else {
          const list = gstore.get('rn_msgs_' + clinic.id, []);
          list.push({ id: guid(), ...payload, createdAt: Date.now() });
          gstore.set('rn_msgs_' + clinic.id, list);
        }
        setNote('پیام شما ارسال شد. ✅');
        f.reset();
      }
    });
  }

  async function fetchClinicReviews(clinicId){
    if (backendReady){
      const { data } = await sb.from('clinic_reviews').select('*').eq('clinic_id', clinicId).order('created_at', { ascending:false });
      return data || [];
    }
    return gstore.get('rn_reviews_' + clinicId, []);
  }

  async function fetchClinicDocs(clinicId){
    if (backendReady){
      const { data } = await sb.from('clinic_documents').select('*').eq('clinic_id', clinicId).limit(4);
      return data || [];
    }
    return gstore.get('rn_docs_' + clinicId, []).slice(0, 4);
  }

  function openReviewModal(clinic){
    rnOpenModal({
      title: `ثبت نظر برای ${clinic.name}`,
      desc: 'تجربه‌ی خودت از این کلینیک رو با بقیه بیماران به اشتراک بذار.',
      formHtml: `
        <select name="rating" required>
          <option value="">امتیاز شما...</option>
          <option value="5">⭐⭐⭐⭐⭐ عالی</option>
          <option value="4">⭐⭐⭐⭐ خوب</option>
          <option value="3">⭐⭐⭐ متوسط</option>
          <option value="2">⭐⭐ ضعیف</option>
          <option value="1">⭐ خیلی ضعیف</option>
        </select>
        <input type="text" name="patient_name" placeholder="نام شما" required>
        <textarea name="comment" placeholder="نظر شما (اختیاری)"></textarea>`,
      onSubmit: async (f, setNote) => {
        const payload = { clinic_id: clinic.id, patient_name: f.patient_name.value.trim(), rating: parseInt(f.rating.value, 10), comment: f.comment.value.trim() };
        if (backendReady){
          await sb.from('clinic_reviews').insert(payload);
        } else {
          const list = gstore.get('rn_reviews_' + clinic.id, []);
          list.unshift({ id: guid(), ...payload, createdAt: Date.now(), created_at: new Date().toISOString() });
          gstore.set('rn_reviews_' + clinic.id, list);
        }
        setNote('ممنون از نظرت! ✅');
        f.reset();
        renderClinics();
      }
    });
  }

  async function renderClinics(){
    const all = await fetchClinics();
    const province = provinceSelect ? provinceSelect.value : '';
    const city = citySelect ? citySelect.value : '';
    let filtered = all;
    if (province) filtered = filtered.filter(c => c.province === province);
    if (city) filtered = filtered.filter(c => c.city === city);

    if (!province){
      clinicResults.innerHTML = '<p class="empty-state">برای مشاهده‌ی کلینیک‌ها، ابتدا استان را انتخاب کنید.</p>';
      return;
    }
    if (!filtered.length){
      clinicResults.innerHTML = '<p class="empty-state">در این شهر/استان هنوز کلینیکی ثبت نشده است.</p>';
      return;
    }

    clinicResults.innerHTML = filtered.map((c, i) => `
      <article class="assoc-card" data-clinic-idx="${i}">
        ${c.logo_url ? `<img src="${c.logo_url}" alt="${c.name}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;margin-bottom:8px">` : ''}
        <h3>${c.name}</h3>
        <p style="font-size:.85rem;color:var(--text-muted)">👨‍⚕️ ${c.doctor || 'نامشخص'}</p>
        <p style="font-size:.85rem">📍 ${c.city} — ${c.address}</p>
        <p style="font-size:.85rem">📞 ${c.phone} ${c.hours ? '· ⏰ ' + c.hours : ''}</p>
        ${c.specialties ? `<p style="font-size:.8rem;color:var(--accent-cyan)">🩻 ${c.specialties}</p>` : ''}
        ${c.about ? `<p style="font-size:.78rem;color:var(--text-muted)">${c.about}</p>` : ''}
        <p class="clinic-rating" data-rating-for="${i}" style="font-size:.8rem;color:var(--accent-amber)"></p>
        <div class="clinic-docs-row" data-docs-for="${i}"></div>
        <div class="clinic-gallery-row" data-gallery-for="${i}"></div>
        <div class="clinic-card-actions">
          <button data-book="${i}">📅 رزرو نوبت</button>
          <button data-msg="${i}">💬 پیام به کلینیک</button>
          <button data-review="${i}">⭐ ثبت نظر</button>
          <a href="clinic/room.html?id=${c.id}" class="btn-tiny" target="_blank">💬 چت عمومی</a>
        </div>
      </article>
    `).join('');

    clinicResults.querySelectorAll('[data-book]').forEach(btn => {
      btn.addEventListener('click', () => openBookingModal(filtered[btn.dataset.book]));
    });
    clinicResults.querySelectorAll('[data-msg]').forEach(btn => {
      btn.addEventListener('click', () => openMessageModal(filtered[btn.dataset.msg]));
    });
    clinicResults.querySelectorAll('[data-review]').forEach(btn => {
      btn.addEventListener('click', () => openReviewModal(filtered[btn.dataset.review]));
    });
    filtered.forEach(async (c, i) => {
      const imgs = await fetchClinicGallery(c.id);
      const row = clinicResults.querySelector(`[data-gallery-for="${i}"]`);
      if (row && imgs.length) row.innerHTML = imgs.map(g => `<img src="${g.image_url}" alt="${g.caption||''}" loading="lazy">`).join('');

      const reviews = await fetchClinicReviews(c.id);
      const ratingEl = clinicResults.querySelector(`[data-rating-for="${i}"]`);
      if (ratingEl){
        if (reviews.length){
          const avg = (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1);
          ratingEl.textContent = `⭐ ${avg} از ۵ (${reviews.length} نظر)`;
        } else {
          ratingEl.textContent = 'هنوز نظری ثبت نشده — اولین نفر باش!';
        }
      }

      const docs = await fetchClinicDocs(c.id);
      const docsRow = clinicResults.querySelector(`[data-docs-for="${i}"]`);
      if (docsRow && docs.length){
        docsRow.innerHTML = docs.map(d => `<a href="${d.file_url}" target="_blank" rel="noopener" class="btn-tiny">📜 ${d.title}</a>`).join(' ');
      }
    });
  }

  if (clinicSubmitForm){
    clinicSubmitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const payload = {
        name: f.name.value.trim(),
        doctor: f.doctor.value.trim(),
        province: f.province.value.trim(),
        city: f.city.value.trim(),
        address: f.address.value.trim(),
        phone: f.phone.value.trim(),
        hours: f.hours.value.trim(),
        specialties: f.specialties.value.trim(),
        status: 'pending'
      };
      if (backendReady){
        await sb.from('clinics').insert(payload);
      } else {
        const list = gstore.get('rn_clinics', []);
        list.push({ id: guid(), ...payload, createdAt: Date.now() });
        gstore.set('rn_clinics', list);
      }
      document.getElementById('clinicSubmitNote').textContent = 'درخواست شما ثبت شد؛ پس از تایید مدیر سایت، در فهرست نمایش داده می‌شود.';
      f.reset();
    });
  }

  renderClinics();
});
