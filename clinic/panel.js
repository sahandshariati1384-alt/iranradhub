// =========================================================
// پنل مدیریت کلینیک — ورود + نوبت‌ها + گالری + پیام‌ها + تنظیمات
// =========================================================

const gstore = {
  get(key, fallback){ try{ const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch(e){ return fallback; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};
const guid = () => Math.random().toString(36).slice(2, 10);

const backendReady = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
  !String(SUPABASE_URL).includes('YOUR_SUPABASE') && typeof supabase !== 'undefined';
const sb = backendReady ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentClinic = null; // { id, name, ... }

/* ---------------------------------------------------------
   داده‌ی دمو (وقتی Supabase وصل نیست)
   --------------------------------------------------------- */
function seedDemoClinic(){
  if (backendReady) return;
  if (gstore.get('rn_clinics', null)) return;
  gstore.set('rn_clinics', [
    { id: 'demo-clinic-1', name:'مرکز تصویربرداری پرتونگار', doctor:'دکتر مهدی احمدی', province:'تهران', city:'تهران', address:'خیابان ولیعصر، بالاتر از پارک وی', phone:'021-88112233', hours:'۸ تا ۲۰', specialties:'سی‌تی‌اسکن، MRI، سونوگرافی', status:'approved', username:'demo', password:'demo123' }
  ]);
}
seedDemoClinic();

/* ---------------------------------------------------------
   ورود / خروج
   --------------------------------------------------------- */
async function findClinicByLogin(username, password){
  if (backendReady){
    const { data, error } = await sb.from('clinics').select('*').eq('username', username).eq('password', password).maybeSingle();
    if (error || !data) return null;
    return data;
  }
  const list = gstore.get('rn_clinics', []);
  return list.find(c => c.username === username && c.password === password) || null;
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const clinic = await findClinicByLogin(f.username.value.trim(), f.password.value);
  if (!clinic){
    document.getElementById('loginNote').textContent = 'نام کاربری یا رمز عبور اشتباه است.';
    return;
  }
  currentClinic = clinic;
  sessionStorage.setItem('rn_clinic_session', JSON.stringify({ id: clinic.id, name: clinic.name }));
  enterDashboard();
});

function enterDashboard(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashScreen').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'inline-block';
  document.getElementById('clinicNameHeading').textContent = currentClinic.name;
  document.getElementById('openRoomLink').href = `room.html?id=${currentClinic.id}`;
  loadSettingsForm();
  loadBioForm();
  renderAppointments();
  renderGallery();
  renderMessages();
  renderReviews();
  renderDocs();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('rn_clinic_session');
  currentClinic = null;
  document.getElementById('dashScreen').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'block';
});

(async function restoreSession(){
  const saved = sessionStorage.getItem('rn_clinic_session');
  if (!saved) return;
  const { id } = JSON.parse(saved);
  if (backendReady){
    const { data } = await sb.from('clinics').select('*').eq('id', id).maybeSingle();
    if (data){ currentClinic = data; enterDashboard(); }
  } else {
    const list = gstore.get('rn_clinics', []);
    const found = list.find(c => c.id === id);
    if (found){ currentClinic = found; enterDashboard(); }
  }
})();

/* ---------------------------------------------------------
   تب‌ها
   --------------------------------------------------------- */
document.getElementById('pnlTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.pnl-tab'); if (!btn) return;
  document.querySelectorAll('.pnl-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.pnl-tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
});

/* ---------------------------------------------------------
   نوبت‌ها
   --------------------------------------------------------- */
let apptStatusFilter = 'all';

async function fetchAppointments(){
  if (backendReady){
    const { data, error } = await sb.from('clinic_appointments').select('*').eq('clinic_id', currentClinic.id).order('created_at', { ascending:false });
    return (data || []).map(a => ({ ...a, createdAt: new Date(a.created_at).getTime() }));
  }
  return gstore.get('rn_appts_' + currentClinic.id, []).slice().sort((a,b) => b.createdAt - a.createdAt);
}

async function updateAppointmentStatus(id, status){
  if (backendReady){
    await sb.from('clinic_appointments').update({ status }).eq('id', id);
  } else {
    const list = gstore.get('rn_appts_' + currentClinic.id, []);
    const item = list.find(a => a.id === id);
    if (item) item.status = status;
    gstore.set('rn_appts_' + currentClinic.id, list);
  }
  renderAppointments();
}

async function renderAppointments(){
  const all = await fetchAppointments();
  document.getElementById('apptStats').innerHTML = `
    <div class="stat-box"><b>${all.length}</b><span>کل نوبت‌ها</span></div>
    <div class="stat-box"><b>${all.filter(a=>a.status==='pending').length}</b><span>در انتظار تایید</span></div>
    <div class="stat-box"><b>${all.filter(a=>a.status==='confirmed').length}</b><span>تاییدشده</span></div>
  `;
  const filtered = apptStatusFilter === 'all' ? all : all.filter(a => a.status === apptStatusFilter);
  const wrap = document.getElementById('apptList');
  wrap.innerHTML = filtered.length ? filtered.map(a => `
    <div class="appt-card">
      <div class="appt-info">
        <b>${a.patient_name}</b>
        <span>📞 ${a.phone}</span>
        <span>🩻 ${a.service || 'نامشخص'} — 📅 ${a.preferred_date || '—'} ${a.preferred_time || ''}</span>
        ${a.note ? `<span>📝 ${a.note}</span>` : ''}
      </div>
      <span class="appt-status ${a.status}">${a.status === 'pending' ? 'در انتظار' : a.status === 'confirmed' ? 'تاییدشده' : 'لغوشده'}</span>
      <div class="appt-actions">
        <button class="confirm" data-id="${a.id}" data-act="confirmed">✅ تایید</button>
        <button class="cancel" data-id="${a.id}" data-act="cancelled">❌ لغو</button>
      </div>
    </div>
  `).join('') : '<p class="pnl-hint">نوبتی در این دسته ثبت نشده است.</p>';
  wrap.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => updateAppointmentStatus(btn.dataset.id, btn.dataset.act));
  });
}

document.getElementById('apptFilter').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip'); if (!btn) return;
  document.querySelectorAll('#apptFilter .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  apptStatusFilter = btn.dataset.status;
  renderAppointments();
});

/* ---------------------------------------------------------
   گالری تصاویر
   --------------------------------------------------------- */
async function fetchGallery(){
  if (backendReady){
    const { data } = await sb.from('clinic_gallery').select('*').eq('clinic_id', currentClinic.id).order('created_at', { ascending:false });
    return data || [];
  }
  return gstore.get('rn_gallery_' + currentClinic.id, []);
}

async function renderGallery(){
  const items = await fetchGallery();
  const wrap = document.getElementById('galleryGrid');
  wrap.innerHTML = items.length ? items.map(g => `
    <div class="gallery-item">
      <button class="del" data-id="${g.id}">✕</button>
      <img src="${g.image_url}" alt="${g.caption || ''}" loading="lazy">
      ${g.caption ? `<div class="cap">${g.caption}</div>` : ''}
    </div>
  `).join('') : '<p class="pnl-hint">هنوز تصویری اضافه نشده است.</p>';
  wrap.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (backendReady){
        await sb.from('clinic_gallery').delete().eq('id', btn.dataset.id);
      } else {
        const list = gstore.get('rn_gallery_' + currentClinic.id, []).filter(g => g.id !== btn.dataset.id);
        gstore.set('rn_gallery_' + currentClinic.id, list);
      }
      renderGallery();
    });
  });
}

document.getElementById('galleryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const payload = { clinic_id: currentClinic.id, image_url: f.image_url.value.trim(), caption: f.caption.value.trim() };
  if (backendReady){
    await sb.from('clinic_gallery').insert(payload);
  } else {
    const list = gstore.get('rn_gallery_' + currentClinic.id, []);
    list.unshift({ id: guid(), ...payload, createdAt: Date.now() });
    gstore.set('rn_gallery_' + currentClinic.id, list);
  }
  f.reset();
  renderGallery();
});

/* ---------------------------------------------------------
   پیام‌ها با بیمار
   --------------------------------------------------------- */
async function fetchMessages(){
  if (backendReady){
    const { data } = await sb.from('clinic_messages').select('*').eq('clinic_id', currentClinic.id).order('created_at', { ascending:true });
    return data || [];
  }
  return gstore.get('rn_msgs_' + currentClinic.id, []).slice().sort((a,b) => a.createdAt - b.createdAt);
}

async function renderMessages(){
  const msgs = await fetchMessages();
  const wrap = document.getElementById('msgList');
  wrap.innerHTML = msgs.length ? msgs.map(m => `
    <div class="msg-bubble ${m.sender === 'clinic' ? 'from-clinic' : 'from-patient'}">
      <div class="who">${m.sender === 'clinic' ? 'شما (کلینیک)' : (m.patient_name || 'بیمار')}</div>
      ${m.message}
    </div>
  `).join('') : '<p class="pnl-hint">هنوز پیامی از بیماران دریافت نشده است.</p>';

  // لیست بیماران یکتا برای انتخاب مخاطب پاسخ
  const patients = Array.from(new Set(msgs.filter(m => m.sender === 'patient').map(m => m.patient_name || 'بیمار')));
  const sel = document.getElementById('replyTarget');
  sel.innerHTML = patients.length
    ? patients.map(p => `<option value="${p}">${p}</option>`).join('')
    : '<option value="">هنوز بیماری پیام نداده</option>';
}

document.getElementById('replyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (!f.target.value) return;
  const payload = { clinic_id: currentClinic.id, sender: 'clinic', patient_name: f.target.value, message: f.message.value.trim() };
  if (backendReady){
    await sb.from('clinic_messages').insert(payload);
  } else {
    const list = gstore.get('rn_msgs_' + currentClinic.id, []);
    list.push({ id: guid(), ...payload, createdAt: Date.now() });
    gstore.set('rn_msgs_' + currentClinic.id, list);
  }
  f.message.value = '';
  renderMessages();
});

/* ---------------------------------------------------------
   تنظیمات کلینیک
   --------------------------------------------------------- */
function loadSettingsForm(){
  const f = document.getElementById('settingsForm');
  f.name.value = currentClinic.name || '';
  f.doctor.value = currentClinic.doctor || '';
  f.address.value = currentClinic.address || '';
  f.phone.value = currentClinic.phone || '';
  f.hours.value = currentClinic.hours || '';
  f.specialties.value = currentClinic.specialties || '';
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const payload = {
    name: f.name.value.trim(), doctor: f.doctor.value.trim(), address: f.address.value.trim(),
    phone: f.phone.value.trim(), hours: f.hours.value.trim(), specialties: f.specialties.value.trim()
  };
  if (backendReady){
    await sb.from('clinics').update(payload).eq('id', currentClinic.id);
  } else {
    const list = gstore.get('rn_clinics', []);
    const item = list.find(c => c.id === currentClinic.id);
    Object.assign(item, payload);
    gstore.set('rn_clinics', list);
  }
  Object.assign(currentClinic, payload);
  document.getElementById('clinicNameHeading').textContent = currentClinic.name;
  document.getElementById('settingsNote').textContent = 'تغییرات ذخیره شد ✅';
  setTimeout(() => { document.getElementById('settingsNote').textContent = ''; }, 2500);
});

/* ---------------------------------------------------------
   آپلود فایل (Supabase Storage یا دمو base64) — مشترک بین بیو و مدارک
   --------------------------------------------------------- */
async function uploadClinicFile(file, folder){
  if (!file) return null;
  if (backendReady){
    const path = `clinic-${currentClinic.id}/${folder}/${Date.now()}-${file.name}`;
    const { error } = await sb.storage.from('room-uploads').upload(path, file);
    if (error) return null;
    const { data } = sb.storage.from('room-uploads').getPublicUrl(path);
    return data.publicUrl;
  }
  if (file.size > 800 * 1024){
    alert('در حالت دمو (بدون Supabase)، حجم فایل باید کمتر از ۸۰۰ کیلوبایت باشد.');
    return null;
  }
  return await new Promise((res) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.readAsDataURL(file);
  });
}

/* ---------------------------------------------------------
   نظرات و رضایت بیماران
   --------------------------------------------------------- */
async function fetchReviews(){
  if (backendReady){
    const { data } = await sb.from('clinic_reviews').select('*').eq('clinic_id', currentClinic.id).order('created_at', { ascending:false });
    return data || [];
  }
  return gstore.get('rn_reviews_' + currentClinic.id, []).slice().sort((a,b) => b.createdAt - a.createdAt);
}

async function renderReviews(){
  const items = await fetchReviews();
  const avg = items.length ? (items.reduce((s,r) => s + r.rating, 0) / items.length).toFixed(1) : '—';
  document.getElementById('reviewStats').innerHTML = `
    <div class="stat-box"><b>${avg}</b><span>میانگین امتیاز</span></div>
    <div class="stat-box"><b>${items.length}</b><span>تعداد نظرات</span></div>
    <div class="stat-box"><b>${items.filter(r=>r.rating>=4).length}</b><span>راضی (۴ یا ۵ ستاره)</span></div>
  `;
  const wrap = document.getElementById('reviewsList');
  wrap.innerHTML = items.length ? items.map(r => `
    <div class="review-card">
      <div class="stars">${'⭐'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <div class="who">${r.patient_name} · ${new Date(r.created_at || r.createdAt).toLocaleDateString('fa-IR')}</div>
      ${r.comment ? `<p>${r.comment}</p>` : ''}
    </div>
  `).join('') : '<p class="pnl-hint">هنوز نظری از بیماران ثبت نشده است.</p>';
}

/* ---------------------------------------------------------
   مدارک پزشک / کلینیک
   --------------------------------------------------------- */
let pendingDocFile = null;
document.getElementById('docFileInput').addEventListener('change', (e) => {
  pendingDocFile = e.target.files[0] || null;
  document.getElementById('docFileName').textContent = pendingDocFile ? pendingDocFile.name : '';
});

async function fetchDocs(){
  if (backendReady){
    const { data } = await sb.from('clinic_documents').select('*').eq('clinic_id', currentClinic.id).order('created_at', { ascending:false });
    return data || [];
  }
  return gstore.get('rn_docs_' + currentClinic.id, []);
}

async function renderDocs(){
  const items = await fetchDocs();
  const wrap = document.getElementById('docsList');
  wrap.innerHTML = items.length ? items.map(d => `
    <div class="doc-row">
      <a href="${d.file_url}" target="_blank" rel="noopener">📜 ${d.title}</a>
      <button class="del" data-doc="${d.id}">حذف</button>
    </div>
  `).join('') : '<p class="pnl-hint">هنوز مدرکی ثبت نشده است.</p>';
  wrap.querySelectorAll('.del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (backendReady){
        await sb.from('clinic_documents').delete().eq('id', btn.dataset.doc);
      } else {
        const list = gstore.get('rn_docs_' + currentClinic.id, []).filter(d => d.id !== btn.dataset.doc);
        gstore.set('rn_docs_' + currentClinic.id, list);
      }
      renderDocs();
    });
  });
}

document.getElementById('docsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pendingDocFile){ alert('لطفاً یک فایل انتخاب کنید.'); return; }
  const f = e.target;
  const url = await uploadClinicFile(pendingDocFile, 'docs');
  if (!url) return;
  const payload = { clinic_id: currentClinic.id, title: f.title.value.trim(), file_url: url };
  if (backendReady){
    await sb.from('clinic_documents').insert(payload);
  } else {
    const list = gstore.get('rn_docs_' + currentClinic.id, []);
    list.unshift({ id: guid(), ...payload, createdAt: Date.now(), created_at: new Date().toISOString() });
    gstore.set('rn_docs_' + currentClinic.id, list);
  }
  f.reset();
  pendingDocFile = null;
  document.getElementById('docFileName').textContent = '';
  renderDocs();
});

/* ---------------------------------------------------------
   بیو و پروفایل (عکس + معرفی)
   --------------------------------------------------------- */
let pendingBioLogoFile = null;
document.getElementById('bioLogoInput').addEventListener('change', (e) => {
  pendingBioLogoFile = e.target.files[0] || null;
  document.getElementById('bioLogoName').textContent = pendingBioLogoFile ? pendingBioLogoFile.name : '';
  if (pendingBioLogoFile){
    const preview = document.getElementById('bioLogoPreview');
    preview.src = URL.createObjectURL(pendingBioLogoFile);
    preview.style.display = 'block';
  }
});

function loadBioForm(){
  document.getElementById('bioAboutInput').value = currentClinic.about || '';
  const preview = document.getElementById('bioLogoPreview');
  if (currentClinic.logo_url){ preview.src = currentClinic.logo_url; preview.style.display = 'block'; }
}

document.getElementById('bioForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const patch = { about: document.getElementById('bioAboutInput').value.trim() };
  if (pendingBioLogoFile){
    const url = await uploadClinicFile(pendingBioLogoFile, 'logo');
    if (url) patch.logo_url = url;
  }
  if (backendReady){
    await sb.from('clinics').update(patch).eq('id', currentClinic.id);
  } else {
    const list = gstore.get('rn_clinics', []);
    const item = list.find(c => c.id === currentClinic.id);
    if (item) Object.assign(item, patch);
    gstore.set('rn_clinics', list);
  }
  Object.assign(currentClinic, patch);
  pendingBioLogoFile = null;
  document.getElementById('bioLogoName').textContent = '';
  document.getElementById('bioNote').textContent = 'بیو کلینیک ذخیره شد ✅';
  setTimeout(() => { document.getElementById('bioNote').textContent = ''; }, 2500);
});
