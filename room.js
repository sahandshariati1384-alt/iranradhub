// =========================================================
// اتاق کلینیک — کانال + چت گروهی
// =========================================================

const params = new URLSearchParams(location.search);
const clinicId = params.get('id');

const gstore = {
  get(key, fallback){ try{ const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch(e){ return fallback; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};
const guid = () => Math.random().toString(36).slice(2, 10);

const backendReady = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
  !String(SUPABASE_URL).includes('YOUR_SUPABASE') && typeof supabase !== 'undefined';
const sb = backendReady ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let clinic = null;
let displayName = null;
let isSecretary = false;

if (!clinicId){
  document.getElementById('orgNameTag').textContent = 'لینک نامعتبر است — از فهرست کلینیک‌ها وارد شوید.';
} else {
  init();
}

async function fetchOrg(id){
  if (backendReady){
    const { data } = await sb.from('clinics').select('*').eq('id', id).maybeSingle();
    return data || null;
  }
  return gstore.get('rn_clinics', []).find(a => a.id === id) || null;
}

async function init(){
  clinic = await fetchOrg(clinicId);
  if (!clinic){
    document.getElementById('orgNameTag').textContent = 'کلینیک یافت نشد.';
    return;
  }
  document.getElementById('orgNameTag').textContent = `${clinic.name} — ${clinic.city}`;

  displayName = gstore.get('rn_clinic_display_name_' + clinicId, null);
  if (!displayName){
    document.getElementById('nameGateModal').classList.add('open');
  } else {
    enterRoom();
  }

  const sessSecretary = sessionStorage.getItem('rn_room_clinicowner_' + clinicId);
  if (sessSecretary === '1') isSecretary = true;
}

document.getElementById('nameGateForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('displayNameInput').value.trim();
  if (!name) return;
  displayName = name;
  gstore.set('rn_clinic_display_name_' + clinicId, name);
  document.getElementById('nameGateModal').classList.remove('open');
  enterRoom();
});

function renderBio(){
  const photoEl = document.getElementById('rmBioPhoto');
  const placeholderEl = document.getElementById('rmBioPhotoPlaceholder');
  if (clinic.logo_url){
    photoEl.src = clinic.logo_url; photoEl.style.display = 'block';
    placeholderEl.style.display = 'none';
  } else {
    photoEl.style.display = 'none'; placeholderEl.style.display = 'flex';
  }
  document.getElementById('rmBioName').textContent = `${clinic.name} — ${clinic.city}`;
  document.getElementById('rmBioAbout').textContent = clinic.about || 'این کلینیک هنوز بیوگرافی‌ای ثبت نکرده است.';
  document.getElementById('editBioBtn').style.display = isSecretary ? 'inline-block' : 'none';
}

function enterRoom(){
  document.getElementById('roomMain').style.display = 'block';
  if (isSecretary) document.getElementById('channelComposer').style.display = 'block';
  renderBio();
  renderChannel();
  renderChat();
  startAutoRefresh();
}

/* ---------- تب‌ها ---------- */
document.querySelectorAll('.rm-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rm-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.rm-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

/* ---------- ورود دبیر ---------- */
document.getElementById('secretaryLoginBtn').addEventListener('click', () => {
  document.getElementById('secretaryLoginModal').classList.add('open');
});
document.getElementById('secretaryLoginClose').addEventListener('click', () => {
  document.getElementById('secretaryLoginModal').classList.remove('open');
});
document.getElementById('secretaryLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const u = f.username.value.trim(), p = f.password.value;
  if (clinic.username === u && clinic.password === p){
    isSecretary = true;
    sessionStorage.setItem('rn_room_clinicowner_' + clinicId, '1');
    document.getElementById('secretaryLoginModal').classList.remove('open');
    document.getElementById('channelComposer').style.display = 'block';
    renderBio();
  } else {
    document.getElementById('secretaryLoginNote').textContent = 'نام کاربری یا رمز اشتباه است.';
  }
});

/* ---------- آپلود فایل (Supabase Storage یا دمو base64) ---------- */
async function uploadFile(file){
  if (!file) return null;
  const type = file.type.startsWith('image/') ? 'image' : 'file';
  if (backendReady){
    const path = `clinic-${clinicId}/${Date.now()}-${file.name}`;
    const { error } = await sb.storage.from('room-uploads').upload(path, file);
    if (error) return null;
    const { data } = sb.storage.from('room-uploads').getPublicUrl(path);
    return { url: data.publicUrl, type, name: file.name };
  }
  // حالت دمو: فایل کوچک را به base64 تبدیل و در localStorage نگه می‌داریم
  if (file.size > 800 * 1024){
    alert('در حالت دمو (بدون Supabase)، حجم فایل باید کمتر از ۸۰۰ کیلوبایت باشد.');
    return null;
  }
  const dataUrl = await new Promise((res) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.readAsDataURL(file);
  });
  return { url: dataUrl, type, name: file.name };
}

function renderAttachment(file_url, file_type){
  if (!file_url) return '';
  if (file_type === 'image') return `<img src="${file_url}" alt="" loading="lazy">`;
  return `<a href="${file_url}" target="_blank" rel="noopener" class="file-chip">📎 دانلود فایل ضمیمه</a>`;
}

/* ---------- کانال ---------- */
let channelFile = null;
document.getElementById('channelFileInput').addEventListener('change', (e) => {
  channelFile = e.target.files[0] || null;
  document.getElementById('channelFileName').textContent = channelFile ? channelFile.name : '';
});

async function fetchChannelPosts(){
  if (backendReady){
    const { data } = await sb.from('clinic_channel_posts').select('*').eq('clinic_id', clinicId).order('created_at', { ascending:false });
    return data || [];
  }
  return gstore.get('rn_clinic_channel_' + clinicId, []).slice().sort((a,b) => b.createdAt - a.createdAt);
}

async function renderChannel(){
  const posts = await fetchChannelPosts();
  const el = document.getElementById('channelList');
  el.innerHTML = posts.length ? posts.map(p => `
    <div class="channel-post">
      <div class="who">${p.author_name || 'مدیر کلینیک'} · ${new Date(p.created_at || p.createdAt).toLocaleString('fa-IR')}</div>
      <div class="msg">${p.message}</div>
      ${renderAttachment(p.file_url, p.file_type)}
    </div>
  `).join('') : '<p class="empty-state">هنوز اطلاعیه‌ای در کانال این کلینیک ثبت نشده.</p>';
}

document.getElementById('channelComposer').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isSecretary) return;
  const f = e.target;
  let att = { url: null, type: null };
  if (channelFile) att = await uploadFile(channelFile) || att;
  const payload = { clinic_id: clinicId, author_name: clinic.doctor || clinic.name, message: f.message.value.trim(), file_url: att.url, file_type: att.type };
  if (backendReady){
    await sb.from('clinic_channel_posts').insert(payload);
  } else {
    const list = gstore.get('rn_clinic_channel_' + clinicId, []);
    list.push({ id: guid(), ...payload, createdAt: Date.now(), created_at: new Date().toISOString() });
    gstore.set('rn_clinic_channel_' + clinicId, list);
  }
  f.reset();
  channelFile = null;
  document.getElementById('channelFileName').textContent = '';
  renderChannel();
});

/* ---------- چت گروهی ---------- */
let chatFile = null;
document.getElementById('chatFileInput').addEventListener('change', (e) => {
  chatFile = e.target.files[0] || null;
  document.getElementById('chatFileName').textContent = chatFile ? chatFile.name : '';
});

async function fetchChatMessages(){
  if (backendReady){
    const { data } = await sb.from('clinic_chat_messages').select('*').eq('clinic_id', clinicId).order('created_at', { ascending:true });
    return data || [];
  }
  return gstore.get('rn_clinic_chat_' + clinicId, []).slice().sort((a,b) => a.createdAt - b.createdAt);
}

async function renderChat(){
  const msgs = await fetchChatMessages();
  const el = document.getElementById('chatMessages');
  const wasAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
  el.innerHTML = msgs.length ? msgs.map(m => `
    <div class="chat-msg ${m.sender_name === displayName ? 'mine' : ''}">
      <div class="who">${m.sender_name}</div>
      ${m.message ? `<div class="txt">${m.message}</div>` : ''}
      ${renderAttachment(m.file_url, m.file_type)}
    </div>
  `).join('') : '<p class="empty-state">هنوز پیامی در چت گروهی نیست — اولین نفر باش!</p>';
  if (wasAtBottom || msgs.length <= 1) el.scrollTop = el.scrollHeight;
}

document.getElementById('chatComposer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const text = document.getElementById('chatMessageInput').value.trim();
  if (!text && !chatFile) return;
  let att = { url: null, type: null };
  if (chatFile) att = await uploadFile(chatFile) || att;
  const payload = { clinic_id: clinicId, sender_name: displayName, message: text, file_url: att.url, file_type: att.type };
  if (backendReady){
    await sb.from('clinic_chat_messages').insert(payload);
  } else {
    const list = gstore.get('rn_clinic_chat_' + clinicId, []);
    list.push({ id: guid(), ...payload, createdAt: Date.now(), created_at: new Date().toISOString() });
    gstore.set('rn_clinic_chat_' + clinicId, list);
  }
  document.getElementById('chatMessageInput').value = '';
  chatFile = null;
  document.getElementById('chatFileName').textContent = '';
  renderChat();
});

/* ---------- به‌روزرسانی زنده ---------- */
function startAutoRefresh(){
  if (backendReady){
    sb.channel('room-' + clinicId)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'clinic_chat_messages', filter:`clinic_id=eq.${clinicId}` }, renderChat)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'clinic_channel_posts', filter:`clinic_id=eq.${clinicId}` }, renderChannel)
      .subscribe();
  } else {
    // حالت دمو: هر ۴ ثانیه رفرش (برای هماهنگی بین تب‌های مختلف مرورگر)
    setInterval(() => { renderChannel(); renderChat(); }, 4000);
  }
}

/* ---------- ویرایش بیو انجمن ---------- */
let bioPhotoFile = null;
document.getElementById('editBioBtn').addEventListener('click', () => {
  document.getElementById('bioAboutInput').value = clinic.about || '';
  document.getElementById('editBioModal').classList.add('open');
});
document.getElementById('editBioClose').addEventListener('click', () => {
  document.getElementById('editBioModal').classList.remove('open');
});
document.getElementById('bioPhotoInput').addEventListener('change', (e) => {
  bioPhotoFile = e.target.files[0] || null;
  document.getElementById('bioPhotoName').textContent = bioPhotoFile ? bioPhotoFile.name : '';
});
document.getElementById('editBioForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isSecretary) return;
  const patch = { about: document.getElementById('bioAboutInput').value.trim() };
  if (bioPhotoFile){
    const att = await uploadFile(bioPhotoFile);
    if (att) patch.logo_url = att.url;
  }
  if (backendReady){
    await sb.from('clinics').update(patch).eq('id', clinicId);
  } else {
    const list = gstore.get('rn_clinics', []);
    const item = list.find(c => c.id === clinicId);
    if (item) Object.assign(item, patch);
    gstore.set('rn_clinics', list);
  }
  Object.assign(clinic, patch);
  renderBio();
  document.getElementById('editBioModal').classList.remove('open');
  bioPhotoFile = null;
  document.getElementById('bioPhotoName').textContent = '';
});
