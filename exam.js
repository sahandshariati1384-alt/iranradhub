// =========================================================
// موتور آزمون‌ساز تکنسین‌های رادیولوژی
// =========================================================

const CATEGORY_LABELS = {
  radiography: 'رادیوگرافی عمومی',
  ct: 'سی‌تی اسکن',
  mri: 'ام‌آرآی',
  contrast: 'رادیوگرافی رنگی',
  safety: 'ایمنی و فیزیک پرتو'
};
const DIFFICULTY_LABELS = {
  basic: 'پایه', intermediate: 'متوسط', advanced: 'پیشرفته', expert: 'تخصصی'
};
const LETTERS = ['الف', 'ب', 'ج', 'د'];

let selectedCategories = new Set(Object.keys(CATEGORY_LABELS));
let selectedDifficulties = new Set(Object.keys(DIFFICULTY_LABELS));
let selectedCount = 20;
let timerEnabled = true;

let examQuestions = [];
let currentIndex = 0;
let answers = {};   // { questionId: selectedOptionIndex }
let flagged = new Set();
let timerInterval = null;
let secondsElapsed = 0;

/* ---------------------------------------------------------
   صفحه‌ی تنظیمات آزمون
   --------------------------------------------------------- */
function renderBankStats(){
  const el = document.getElementById('bankStats');
  const total = EXAM_BANK.length;
  const byCat = {};
  EXAM_BANK.forEach(q => byCat[q.category] = (byCat[q.category] || 0) + 1);
  let html = `<div class="stat-box"><b>${total}</b><span>کل سوالات بانک</span></div>`;
  Object.keys(CATEGORY_LABELS).forEach(cat => {
    html += `<div class="stat-box"><b>${byCat[cat] || 0}</b><span>${CATEGORY_LABELS[cat]}</span></div>`;
  });
  el.innerHTML = html;
}

function renderChips(){
  const catWrap = document.getElementById('categoryChips');
  catWrap.innerHTML = `<button class="chip active" data-cat="all">همه‌ی دسته‌ها</button>` +
    Object.entries(CATEGORY_LABELS).map(([key, label]) =>
      `<button class="chip active" data-cat="${key}">${label}</button>`).join('');

  const diffWrap = document.getElementById('difficultyChips');
  diffWrap.innerHTML = `<button class="chip active" data-diff="all">همه‌ی سطوح</button>` +
    Object.entries(DIFFICULTY_LABELS).map(([key, label]) =>
      `<button class="chip active" data-diff="${key}">${label}</button>`).join('');

  const countWrap = document.getElementById('countChips');
  [10, 20, 30, 50, 'all'].forEach(n => {
    const label = n === 'all' ? 'همه‌ی سوالات موجود' : `${n} سوال`;
    countWrap.innerHTML += `<button class="chip ${n === 20 ? 'active' : ''}" data-count="${n}">${label}</button>`;
  });

  const timerWrap = document.getElementById('timerChips');
  timerWrap.innerHTML = `
    <button class="chip active" data-timer="on">با زمان‌سنج (۹۰ ثانیه/سوال)</button>
    <button class="chip" data-timer="off">بدون محدودیت زمانی</button>`;

  catWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip'); if (!btn) return;
    const cat = btn.dataset.cat;
    if (cat === 'all'){
      selectedCategories = new Set(Object.keys(CATEGORY_LABELS));
      catWrap.querySelectorAll('.chip').forEach(c => c.classList.add('active'));
    } else {
      btn.classList.toggle('active');
      if (btn.classList.contains('active')) selectedCategories.add(cat);
      else selectedCategories.delete(cat);
      catWrap.querySelector('[data-cat="all"]').classList.toggle('active', selectedCategories.size === Object.keys(CATEGORY_LABELS).length);
    }
    updateSummary();
  });

  diffWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip'); if (!btn) return;
    const diff = btn.dataset.diff;
    if (diff === 'all'){
      selectedDifficulties = new Set(Object.keys(DIFFICULTY_LABELS));
      diffWrap.querySelectorAll('.chip').forEach(c => c.classList.add('active'));
    } else {
      btn.classList.toggle('active');
      if (btn.classList.contains('active')) selectedDifficulties.add(diff);
      else selectedDifficulties.delete(diff);
      diffWrap.querySelector('[data-diff="all"]').classList.toggle('active', selectedDifficulties.size === Object.keys(DIFFICULTY_LABELS).length);
    }
    updateSummary();
  });

  countWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip'); if (!btn) return;
    countWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    selectedCount = btn.dataset.count === 'all' ? 'all' : parseInt(btn.dataset.count, 10);
    updateSummary();
  });

  timerWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip'); if (!btn) return;
    timerWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    timerEnabled = btn.dataset.timer === 'on';
    updateSummary();
  });
}

function getFilteredPool(){
  return EXAM_BANK.filter(q => selectedCategories.has(q.category) && selectedDifficulties.has(q.difficulty));
}

function updateSummary(){
  const pool = getFilteredPool();
  const n = selectedCount === 'all' ? pool.length : Math.min(selectedCount, pool.length);
  document.getElementById('setupSummary').textContent =
    `با این تنظیمات، ${pool.length} سوال مطابقت دارد و ${n} سوال از آن‌ها به‌صورت تصادفی انتخاب می‌شود.`;
}

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startExam(customPool){
  const pool = customPool || getFilteredPool();
  if (pool.length === 0){
    alert('با این فیلترها هیچ سوالی موجود نیست. لطفاً فیلترها را تغییر دهید.');
    return;
  }
  const n = selectedCount === 'all' ? pool.length : Math.min(selectedCount, pool.length);
  examQuestions = shuffle(pool).slice(0, n);
  currentIndex = 0;
  answers = {};
  flagged = new Set();
  secondsElapsed = 0;

  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('resultsScreen').style.display = 'none';
  document.getElementById('examScreen').style.display = 'block';

  if (timerEnabled){
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      secondsElapsed++;
      updateTimerDisplay();
    }, 1000);
  } else {
    document.getElementById('examTimer').style.display = 'none';
  }

  renderQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateTimerDisplay(){
  const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
  const s = String(secondsElapsed % 60).padStart(2, '0');
  document.getElementById('examTimer').textContent = `${m}:${s}`;
}

/* ---------------------------------------------------------
   صفحه‌ی آزمون
   --------------------------------------------------------- */
function renderQuestion(){
  const q = examQuestions[currentIndex];
  document.getElementById('progressLabel').textContent = `سوال ${currentIndex + 1} از ${examQuestions.length}`;
  document.getElementById('progressFill').style.width = `${((currentIndex + 1) / examQuestions.length) * 100}%`;
  document.getElementById('qCategoryTag').textContent = CATEGORY_LABELS[q.category] + (q.subcategory ? ` · ${q.subcategory}` : '');
  document.getElementById('qDifficultyTag').textContent = DIFFICULTY_LABELS[q.difficulty];
  document.getElementById('questionText').textContent = q.question;

  const optsEl = document.getElementById('optionsList');
  optsEl.innerHTML = q.options.map((opt, i) => `
    <div class="option-item ${answers[q.id] === i ? 'selected' : ''}" data-idx="${i}">
      <span class="option-letter">${LETTERS[i]}</span>
      <span>${opt}</span>
    </div>
  `).join('');
  optsEl.querySelectorAll('.option-item').forEach(el => {
    el.addEventListener('click', () => {
      answers[q.id] = parseInt(el.dataset.idx, 10);
      renderQuestion();
      renderJump();
    });
  });

  document.getElementById('flagBtn').classList.toggle('active', flagged.has(q.id));
  document.getElementById('prevBtn').disabled = currentIndex === 0;
  renderJump();
}

function renderJump(){
  const wrap = document.getElementById('questionJump');
  wrap.innerHTML = examQuestions.map((q, i) => {
    let cls = 'jump-dot';
    if (i === currentIndex) cls += ' current';
    if (answers[q.id] !== undefined) cls += ' answered';
    if (flagged.has(q.id)) cls += ' flagged';
    return `<div class="${cls}" data-jump="${i}">${i + 1}</div>`;
  }).join('');
  wrap.querySelectorAll('.jump-dot').forEach(d => {
    d.addEventListener('click', () => { currentIndex = parseInt(d.dataset.jump, 10); renderQuestion(); });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderBankStats();
  renderChips();
  updateSummary();

  document.getElementById('startExamBtn').addEventListener('click', () => startExam());
  document.getElementById('startContrastBtn').addEventListener('click', () => {
    startExam(EXAM_BANK.filter(q => q.category === 'contrast'));
  });

  document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentIndex > 0){ currentIndex--; renderQuestion(); }
  });
  document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentIndex < examQuestions.length - 1){ currentIndex++; renderQuestion(); }
    else finishExam();
  });
  document.getElementById('flagBtn').addEventListener('click', () => {
    const q = examQuestions[currentIndex];
    if (flagged.has(q.id)) flagged.delete(q.id); else flagged.add(q.id);
    renderQuestion();
  });
  document.getElementById('submitExamBtn').addEventListener('click', () => {
    const unanswered = examQuestions.length - Object.keys(answers).length;
    if (unanswered > 0){
      if (!confirm(`${unanswered} سوال بی‌پاسخ مانده است. مطمئنید می‌خواهید آزمون را پایان دهید؟`)) return;
    }
    finishExam();
  });
  document.getElementById('retryBtn').addEventListener('click', () => {
    document.getElementById('resultsScreen').style.display = 'none';
    document.getElementById('setupScreen').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

/* ---------------------------------------------------------
   صفحه‌ی نتیجه و پاسخ‌نامه‌ی آموزشی
   --------------------------------------------------------- */
function finishExam(){
  clearInterval(timerInterval);
  document.getElementById('examScreen').style.display = 'none';
  document.getElementById('resultsScreen').style.display = 'block';

  let correctCount = 0;
  const catStats = {};
  examQuestions.forEach(q => {
    const picked = answers[q.id];
    const isCorrect = picked === q.correct;
    if (isCorrect) correctCount++;
    if (!catStats[q.category]) catStats[q.category] = { correct: 0, total: 0 };
    catStats[q.category].total++;
    if (isCorrect) catStats[q.category].correct++;
  });

  const pct = Math.round((correctCount / examQuestions.length) * 100);
  const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
  const s = String(secondsElapsed % 60).padStart(2, '0');

  document.getElementById('resultSummary').innerHTML = `
    <div class="big-score">${correctCount} / ${examQuestions.length}</div>
    <p>${pct}% پاسخ صحیح ${timerEnabled ? `· زمان صرف‌شده: ${m}:${s}` : ''}</p>
  `;

  document.getElementById('resultBreakdown').innerHTML = Object.entries(catStats).map(([cat, s]) => `
    <div class="cat-box">
      <b>${s.correct}/${s.total}</b>
      <span>${CATEGORY_LABELS[cat]}</span>
    </div>
  `).join('');

  document.getElementById('answerKeyList').innerHTML = examQuestions.map((q, i) => {
    const picked = answers[q.id];
    const isCorrect = picked === q.correct;
    const rows = q.options.map((opt, oi) => {
      let rowClass = 'is-wrong';
      let mark = '○';
      if (oi === q.correct){ rowClass = 'is-correct'; mark = '✓'; }
      if (picked === oi && oi !== q.correct){ rowClass = 'was-picked-wrong'; mark = '✗'; }
      const pickedTag = picked === oi ? '<span class="picked-tag">(انتخاب شما)</span>' : '';
      return `
        <div class="explain-row ${rowClass}">
          <span class="explain-mark">${mark}</span>
          <span class="explain-text"><b>${LETTERS[oi]}) ${opt}</b> ${pickedTag}<br>${q.explain[oi]}</span>
        </div>`;
    }).join('');

    return `
      <div class="answer-key-item ${isCorrect ? 'correct' : 'incorrect'}">
        <div class="q-num">سوال ${i + 1} · ${CATEGORY_LABELS[q.category]} · سطح ${DIFFICULTY_LABELS[q.difficulty]} ${isCorrect ? '· ✅ صحیح' : (picked === undefined ? '· ⏺ بی‌پاسخ' : '· ❌ نادرست')}</div>
        <h3>${q.question}</h3>
        ${rows}
      </div>
    `;
  }).join('');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
