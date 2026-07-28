// =========================================================
// مجله آموزشی — منطق نمایش دسته‌بندی، کارت‌ها و مقاله‌خوان
// =========================================================

const CATEGORY_LABELS = {
  physics: 'فیزیک پایه',
  radiography: 'رادیوگرافی',
  ct: 'سی‌تی اسکن',
  mri: 'ام‌آرآی',
  contrast: 'گرافی رنگی / کنتراست',
  safety: 'ایمنی و کیفیت'
};
const CATEGORY_ICONS = {
  physics: '⚛️', radiography: '🦴', ct: '🌀', mri: '🧲', contrast: '🖍️', safety: '🛡️'
};

let activeCategory = 'all';

function renderTabs(){
  const wrap = document.getElementById('magTabs');
  const cats = ['all', ...Object.keys(CATEGORY_LABELS)];
  wrap.innerHTML = cats.map(c =>
    `<button class="mag-tab ${c === activeCategory ? 'active' : ''}" data-cat="${c}">${c === 'all' ? 'همه مقالات' : CATEGORY_LABELS[c]}</button>`
  ).join('');
  wrap.querySelectorAll('.mag-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderTabs();
      renderFeatured();
      renderGrid();
    });
  });
}

function renderFeatured(){
  const wrap = document.getElementById('magFeatured');
  const pool = activeCategory === 'all' ? MAGAZINE_ARTICLES : MAGAZINE_ARTICLES.filter(a => a.category === activeCategory);
  if (!pool.length){ wrap.innerHTML = ''; return; }
  const featured = pool[0];
  wrap.innerHTML = `
    <div class="mag-featured-card" data-id="${featured.id}">
      <div class="mag-featured-text">
        <span class="mag-tag">${CATEGORY_LABELS[featured.category]}</span>
        <h2>${featured.title}</h2>
        <p>${featured.excerpt}</p>
        <div class="mag-meta-row"><span>⏱ ${featured.readTime}</span><span>📊 ${featured.level}</span></div>
      </div>
      <div class="mag-featured-visual">${CATEGORY_ICONS[featured.category] || '📖'}</div>
    </div>
  `;
  wrap.querySelector('.mag-featured-card').addEventListener('click', () => openReader(featured.id));
}

function renderGrid(){
  const wrap = document.getElementById('magGrid');
  let pool = activeCategory === 'all' ? MAGAZINE_ARTICLES : MAGAZINE_ARTICLES.filter(a => a.category === activeCategory);
  pool = pool.slice(1); // فیچرد از گرید حذف می‌شود چون بالا نمایش داده شده
  if (!pool.length){
    wrap.innerHTML = '<p class="mag-empty">مقاله‌ی دیگری در این دسته موجود نیست.</p>';
    return;
  }
  wrap.innerHTML = pool.map(a => `
    <article class="mag-card" data-id="${a.id}">
      <span class="mag-tag">${CATEGORY_LABELS[a.category]}</span>
      <h3>${a.title}</h3>
      <p>${a.excerpt}</p>
      <div class="mag-meta-row"><span>⏱ ${a.readTime}</span><span>📊 ${a.level}</span></div>
    </article>
  `).join('');
  wrap.querySelectorAll('.mag-card').forEach(card => {
    card.addEventListener('click', () => openReader(card.dataset.id));
  });
}

function openReader(id){
  const article = MAGAZINE_ARTICLES.find(a => a.id === id);
  if (!article) return;
  document.getElementById('readerTag').textContent = CATEGORY_LABELS[article.category];
  document.getElementById('readerTitle').textContent = article.title;
  document.getElementById('readerMeta').innerHTML = `<span>⏱ ${article.readTime}</span><span>📊 ${article.level}</span>`;
  document.getElementById('readerContent').innerHTML = article.content;
  const reader = document.getElementById('magReader');
  reader.classList.add('open');
  reader.setAttribute('aria-hidden', 'false');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function closeReader(){
  const reader = document.getElementById('magReader');
  reader.classList.remove('open');
  reader.setAttribute('aria-hidden', 'true');
}

document.getElementById('magReaderClose').addEventListener('click', closeReader);
document.getElementById('magReader').addEventListener('click', (e) => {
  if (e.target.id === 'magReader') closeReader();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeReader();
});

renderTabs();
renderFeatured();
renderGrid();
