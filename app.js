// 全域狀態庫 (Global State)
let appData = { lessons: [], questions: [], grammars: [], vocabularies: [] };

// 支援「教材資料」與「獨立題庫」分開載入
const DATA_FILES = [
  'data_1_2.json', 'quiz_1_2.json',
  'data_3_4.json', 'quiz_3_4.json',
  'data_5_6.json', 'quiz_5_6.json',
  'data_7_8.json', 'quiz_7_8.json',
  'data_9_10.json', 'quiz_9_10.json',
  'data_special.json'
];

async function initApp() {
  try {
    appData = { lessons: [], questions: [], grammars: [], vocabularies: [] };

    const fetchPromises = DATA_FILES.map(async (file) => {
      try {
        const res = await fetch(file);
        if (!res.ok) {
          console.warn(`⚠️ 檔案無法載入: ${file} (狀態碼: ${res.status})`);
          return null;
        }
        return await res.json();
      } catch (err) {
        console.error(`❌ JSON 格式錯誤或解析失敗 (${file}):`, err);
        return null;
      }
    });

    const dataList = await Promise.all(fetchPromises);

    dataList.forEach((data) => {
      if (!data) return;
      if (data.lessons) appData.lessons.push(...data.lessons);
      if (data.vocabularies) appData.vocabularies.push(...data.vocabularies);
      if (data.grammars) appData.grammars.push(...data.grammars);

      // 自動解析題庫
      if (data.questions) {
        const parsedQuestions = data.questions.map(q => {
          if (q.kr) {
            const correctOrder = q.kr.trim().split(/\s+/);
            const extra = q.extra || [];
            return {
              id: q.id,
              lessonId: q.lessonId,
              grammarId: q.grammarId,
              translation: q.zh || q.translation,
              correctOrder: correctOrder,
              options: [...correctOrder, ...extra]
            };
          }
          return q;
        });
        appData.questions.push(...parsedQuestions);
      }
    });

    if (appData.lessons.length === 0) {
      const promptEl = document.getElementById('promptText');
      if (promptEl) promptEl.innerText = "⚠️ 尚未讀取到教材資料，請確認 JSON 檔案是否存在！";
      return;
    }

    populateLessonDropdowns();
    if (typeof initSentenceQuiz === 'function') initSentenceQuiz();
    if (typeof startVocabQuiz === 'function') startVocabQuiz();
    if (typeof filterBankData === 'function') filterBankData();

  } catch (e) {
    console.error("App 初始化失敗:", e);
    const promptEl = document.getElementById('promptText');
    if (promptEl) promptEl.innerText = "載入教材資料發生錯誤，請確認檔案格式！";
  }
}

// 輔助函式：自動建立並置入「範圍選單」至主選單與題數選單之間
function setupRangeDropdown(targetSelectId, rangeSelectId, onChangeCallback) {
  let rangeEl = document.getElementById(rangeSelectId);
  const targetEl = document.getElementById(targetSelectId);

  if (!rangeEl && targetEl && targetEl.parentNode) {
    rangeEl = document.createElement('select');
    rangeEl.id = rangeSelectId;
    rangeEl.className = targetEl.className;
    rangeEl.style.marginLeft = '6px';
    rangeEl.style.marginRight = '6px';
    rangeEl.onchange = onChangeCallback;
    targetEl.insertAdjacentElement('afterend', rangeEl);
  }

  if (rangeEl) {
    const normalLessons = appData.lessons.filter(l => l.id !== 'special');
    let opts = `<option value="1-${normalLessons.length}">📖 全範圍 (1~${normalLessons.length} 課)</option>`;
    for (let i = 2; i <= normalLessons.length; i++) {
      opts += `<option value="1-${i}">📖 第 1 ～ ${i} 課</option>`;
    }
    rangeEl.innerHTML = opts;
  }
}

function populateLessonDropdowns() {
  const normalLessons = appData.lessons.filter(l => l.id !== 'special');

  // 主選單保持清爽：只有綜合測驗 + 各單課
  const quizOpts = `<option value="all">🎲 綜合測驗</option>` + 
                   normalLessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('');

  const sentenceSelect = document.getElementById('sentenceLessonSelect');
  const vocabSelect = document.getElementById('vocabQuizLessonSelect');
  if (sentenceSelect) sentenceSelect.innerHTML = quizOpts;
  if (vocabSelect) vocabSelect.innerHTML = quizOpts;

  // 動態建立插入在中間的「範圍選單」
  setupRangeDropdown('sentenceLessonSelect', 'sentenceRangeSelect', () => {
    if (typeof initSentenceQuiz === 'function') initSentenceQuiz();
  });
  setupRangeDropdown('vocabQuizLessonSelect', 'vocabRangeSelect', () => {
    if (typeof startVocabQuiz === 'function') startVocabQuiz();
  });

  const bankSelect = document.getElementById('bankLessonSelect');
  if (bankSelect) {
    bankSelect.innerHTML = `
      <option value="all">📚 全部課程內容</option>
      <option value="special">✨ 特殊變化 (動詞與形容詞語尾)</option>
      ${normalLessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
    `;
  }
}

// 修正後的 5 分頁精準切換邏輯
function switchMainView(view) {
  const navBtns = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.view-section');

  // 清除全部反白與顯示
  navBtns.forEach(b => b.classList.remove('active'));
  sections.forEach(s => s.classList.remove('active'));

  // 5 大分頁精準對照表 (不再發生索引錯位)
  const viewMap = {
    'quiz':      { index: 0, viewId: 'quizView' },
    'vocabQuiz': { index: 1, viewId: 'vocabQuizView' },
    'fillQuiz':  { index: 2, viewId: 'fillQuizView' },
    'bank':       { index: 3, viewId: 'bankView' },
    'numbers':    { index: 4, viewId: 'numbersView' }
  };

  const target = viewMap[view];
  if (target) {
    if (navBtns[target.index]) navBtns[target.index].classList.add('active');
    const targetEl = document.getElementById(target.viewId);
    if (targetEl) targetEl.classList.add('active');
  }

  // 切換到語法填充時，若尚未抽題則自動初始化
  if (view === 'fillQuiz' && typeof initFillQuiz === 'function') {
    if (typeof currentFillQuestions !== 'undefined' && currentFillQuestions.length === 0) {
      initFillQuiz();
    }
  }
}

function speakKorean(text, activeBtnId = null) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ko-KR';
  utter.rate = 0.85;

  const voices = window.speechSynthesis.getVoices();
  const koVoice = voices.find(v => v.lang && (v.lang.toLowerCase().includes('ko') || v.lang.toLowerCase().includes('kr')));
  if (koVoice) utter.voice = koVoice;

  let btn = activeBtnId ? document.getElementById(activeBtnId) : null;
  if (btn) btn.classList.add('playing');

  utter.onend = () => { if (btn) btn.classList.remove('playing'); window._curUtter = null; };
  utter.onerror = () => { if (btn) btn.classList.remove('playing'); window._curUtter = null; };

  window._curUtter = utter;
  window.speechSynthesis.speak(utter);
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

document.addEventListener('DOMContentLoaded', initApp);
