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

function populateLessonDropdowns() {
  const normalLessons = appData.lessons.filter(l => l.id !== 'special');

  // 1. 全範圍選項
  let quizOpts = `<option value="all">🎲 綜合測驗 (全範圍 1~10 課)</option>`;

  // 2. 累積進度範圍選項 (第 1~2 課 ... 第 1~9 課)
  quizOpts += `<optgroup label="── 📚 進度累積測驗 ──">`;
  for (let i = 2; i < normalLessons.length; i++) {
    quizOpts += `<option value="range_1_${i}">📖 第 1 ～ ${i} 課 綜合測驗</option>`;
  }
  quizOpts += `</optgroup>`;

  // 3. 單課專屬選項
  quizOpts += `<optgroup label="── 🎯 單課專屬測驗 ──">`;
  quizOpts += normalLessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('');
  quizOpts += `</optgroup>`;

  const sentenceSelect = document.getElementById('sentenceLessonSelect');
  const vocabSelect = document.getElementById('vocabQuizLessonSelect');
  if (sentenceSelect) sentenceSelect.innerHTML = quizOpts;
  if (vocabSelect) vocabSelect.innerHTML = quizOpts;

  const bankSelect = document.getElementById('bankLessonSelect');
  if (bankSelect) {
    bankSelect.innerHTML = `
      <option value="all">📚 全部課程內容</option>
      <option value="special">✨ 特殊變化 (動詞與形容詞語尾)</option>
      ${normalLessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
    `;
  }
}

function switchMainView(view) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  if (view === 'quiz') {
    if (document.querySelectorAll('.nav-btn')[0]) document.querySelectorAll('.nav-btn')[0].classList.add('active');
    if (document.getElementById('quizView')) document.getElementById('quizView').classList.add('active');
  } else if (view === 'vocabQuiz') {
    if (document.querySelectorAll('.nav-btn')[1]) document.querySelectorAll('.nav-btn')[1].classList.add('active');
    if (document.getElementById('vocabQuizView')) document.getElementById('vocabQuizView').classList.add('active');
  } else if (view === 'bank') {
    if (document.querySelectorAll('.nav-btn')[2]) document.querySelectorAll('.nav-btn')[2].classList.add('active');
    if (document.getElementById('bankView')) document.getElementById('bankView').classList.add('active');
  } else if (view === 'numbers') {
    if (document.querySelectorAll('.nav-btn')[3]) document.querySelectorAll('.nav-btn')[3].classList.add('active');
    if (document.getElementById('numbersView')) document.getElementById('numbersView').classList.add('active');
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

// 頁面載入完成後啟動 App
document.addEventListener('DOMContentLoaded', initApp);
