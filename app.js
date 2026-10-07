let appData = { lessons: [], questions: [], grammars: [], vocabularies: [] };
let currentSentenceList = [], sentenceIdx = 0, availableCards = [], selectedCards = [], isSentenceCorrect = false;
let vocabQuizList = [], vocabQuizIdx = 0, vocabQuizScore = 0, currentVocabQuestion = null;
let filteredVocabList = [], vocabCardIdx = 0, isAnimating = false;
let isPronHidden = false; // 連音標記遮蔽狀態

// 定義教材資料檔案清單（未來新增 6~10 課只需在此清單加入檔名）
const DATA_FILES = [
  'data_1_5.json',
  'data_special.json'
];

async function initApp() {
  try {
    const responses = await Promise.all(DATA_FILES.map(file => fetch(file)));
    const dataList = await Promise.all(responses.map(res => res.json()));

    // 初始化重置資料容器
    appData = { lessons: [], questions: [], grammars: [], vocabularies: [] };

    // 自動合併所有模組內容
    dataList.forEach(data => {
      if (data.lessons) appData.lessons.push(...data.lessons);
      if (data.vocabularies) appData.vocabularies.push(...data.vocabularies);
      if (data.questions) appData.questions.push(...data.questions);
      if (data.grammars) appData.grammars.push(...data.grammars);
    });

    populateLessonDropdowns();
    initSentenceQuiz();
    startVocabQuiz();
    filterBankData();
  } catch (e) {
    console.error(e);
    document.getElementById('promptText').innerText = "載入教材資料失敗，請確認檔案格式！";
  }
}

function populateLessonDropdowns() {
  const normalLessons = appData.lessons.filter(l => l.id !== 'special');
  const opts = `<option value="all">🎲 綜合測驗 (全範圍)</option>` + 
               normalLessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('');
  
  document.getElementById('sentenceLessonSelect').innerHTML = opts;
  document.getElementById('vocabQuizLessonSelect').innerHTML = opts;
  
  document.getElementById('bankLessonSelect').innerHTML = `
    <option value="all">📚 全部課程內容</option>
    <option value="special">✨ 特殊變化 (動詞與形容詞語尾)</option>
    ${normalLessons.map(l => `<option value="${l.id}">${l.title}</option>`).join('')}
  `;
}

function switchMainView(view) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  if (view === 'quiz') {
    document.querySelectorAll('.nav-btn')[0].classList.add('active');
    document.getElementById('quizView').classList.add('active');
  } else if (view === 'vocabQuiz') {
    document.querySelectorAll('.nav-btn')[1].classList.add('active');
    document.getElementById('vocabQuizView').classList.add('active');
  } else {
    document.querySelectorAll('.nav-btn')[2].classList.add('active');
    document.getElementById('bankView').classList.add('active');
  }
}

/* 語音播放器（支援按鈕聲波漣漪動畫） */
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

  utter.onend = () => {
    if (btn) btn.classList.remove('playing');
    window._curUtter = null;
  };
  utter.onerror = () => {
    if (btn) btn.classList.remove('playing');
    window._curUtter = null;
  };

  window._curUtter = utter;
  window.speechSynthesis.speak(utter);
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

/* 1. 句子重組測驗 */
function initSentenceQuiz() {
  const val = document.getElementById('sentenceLessonSelect').value;
  const cnt = document.getElementById('sentenceCountSelect');
  let pool = (val === 'all') ? [...appData.questions] : appData.questions.filter(q => q.lessonId === val);
  cnt.style.display = (val === 'all') ? 'inline-block' : 'none';
  pool.sort(() => Math.random() - 0.5);
  if (val === 'all') pool = pool.slice(0, parseInt(cnt.value));
  currentSentenceList = pool;
  sentenceIdx = 0;
  loadSentenceQuestion();
}

function updateSentenceProgress() {
  const total = currentSentenceList.length;
  const pct = total > 0 ? ((sentenceIdx) / total) * 100 : 0;
  document.getElementById('sentenceProgressBar').style.width = `${pct}%`;
}

function loadSentenceQuestion() {
  updateSentenceProgress();
  if (currentSentenceList.length === 0) {
    document.getElementById('promptText').innerText = "本單元暫無題目。";
    document.getElementById('answerZone').innerHTML = '';
    document.getElementById('wordBank').innerHTML = '';
    return;
  }
  isSentenceCorrect = false;
  document.getElementById('submitBtn').innerText = '檢查答案';
  const q = currentSentenceList[sentenceIdx];
  document.getElementById('promptText').innerText = `(${sentenceIdx + 1}/${currentSentenceList.length}) ${q.translation}`;
  const shuffled = [...q.options].sort(() => Math.random() - 0.5);
  availableCards = shuffled.map((text, idx) => ({ id: idx, text }));
  selectedCards = [];
  renderSentenceQuiz();
}

function renderSentenceQuiz() {
  const zone = document.getElementById('answerZone');
  const bank = document.getElementById('wordBank');
  if (!isSentenceCorrect) {
    zone.className = 'answer-zone';
    document.getElementById('message').innerText = '';
  }
  zone.innerHTML = '';
  selectedCards.forEach(c => zone.appendChild(createCard(c.text, () => {
    if (isSentenceCorrect) return;
    selectedCards = selectedCards.filter(x => x.id !== c.id);
    availableCards.push(c);
    renderSentenceQuiz();
  })));
  bank.innerHTML = '';
  availableCards.forEach(c => bank.appendChild(createCard(c.text, () => {
    if (isSentenceCorrect) return;
    availableCards = availableCards.filter(x => x.id !== c.id);
    selectedCards.push(c);
    renderSentenceQuiz();
  })));
}

function createCard(txt, fn) {
  const d = document.createElement('div');
  d.className = 'card';
  d.innerText = txt;
  d.onclick = fn;
  return d;
}

function resetSentenceQuiz() { if (!isSentenceCorrect) loadSentenceQuestion(); }

function handleSentenceSubmit() {
  if (isSentenceCorrect) {
    sentenceIdx++;
    if (sentenceIdx < currentSentenceList.length) {
      loadSentenceQuestion();
    } else {
      document.getElementById('sentenceProgressBar').style.width = '100%';
      alert("🎉 恭喜完成本次所有句子測驗！");
      initSentenceQuiz();
    }
    return;
  }
  const q = currentSentenceList[sentenceIdx];
  const userAns = selectedCards.map(c => c.text);
  const ok = userAns.length === q.correctOrder.length && userAns.every((v, i) => v === q.correctOrder[i]);
  const zone = document.getElementById('answerZone');
  const msg = document.getElementById('message');
  if (ok) {
    zone.classList.remove('incorrect', 'shake');
    zone.classList.add('correct', 'bounce-success');
    msg.style.color = 'var(--success)';
    msg.innerText = '🎉 答對了！點擊繼續下一題。';
    document.getElementById('submitBtn').innerText = '下一題 ➔';
    isSentenceCorrect = true;
    playCurrentSentenceAudio();
  } else {
    zone.classList.remove('shake', 'bounce-success');
    void zone.offsetWidth;
    zone.classList.add('incorrect', 'shake');
    msg.style.color = 'var(--error)';
    msg.innerText = '❌ 順序不正確，請再試一次。';
  }
}

function playCurrentSentenceAudio() {
  if (currentSentenceList[sentenceIdx]) {
    speakKorean(currentSentenceList[sentenceIdx].correctOrder.join(' '), 'sentenceAudioBtn');
  }
}

/* 2. 單字選擇測驗 */
function startVocabQuiz() {
  const val = document.getElementById('vocabQuizLessonSelect').value;
  const cnt = parseInt(document.getElementById('vocabQuizCountSelect').value);
  let pool = (val === 'all') ? [...appData.vocabularies] : appData.vocabularies.filter(v => v.lessonId === val);
  if (pool.length < 4) {
    document.getElementById('vocabQuizWord').innerText = "單字不足以組成選擇題";
    document.getElementById('vocabQuizOptions').innerHTML = '';
    return;
  }
  pool.sort(() => Math.random() - 0.5);
  vocabQuizList = pool.slice(0, Math.min(cnt, pool.length));
  vocabQuizIdx = 0;
  vocabQuizScore = 0;
  loadVocabQuizQuestion();
}

function updateVocabProgress() {
  const total = vocabQuizList.length;
  const pct = total > 0 ? ((vocabQuizIdx) / total) * 100 : 0;
  document.getElementById('vocabQuizProgressBar').style.width = `${pct}%`;
}

function loadVocabQuizQuestion() {
  updateVocabProgress();
  document.getElementById('vocabNextBtn').style.display = 'none';
  document.getElementById('vocabQuizMessage').innerText = '';
  currentVocabQuestion = vocabQuizList[vocabQuizIdx];
  document.getElementById('vocabQuizWord').innerText = currentVocabQuestion.kr;
  let opts = [currentVocabQuestion];
  let others = appData.vocabularies.filter(v => v.id !== currentVocabQuestion.id).sort(() => Math.random() - 0.5);
  opts.push(...others.slice(0, 3));
  opts.sort(() => Math.random() - 0.5);
  const box = document.getElementById('vocabQuizOptions');
  box.innerHTML = '';
  opts.forEach(o => {
    const b = document.createElement('button');
    b.className = 'opt-btn';
    b.innerText = o.zh;
    b.onclick = () => {
      document.querySelectorAll('.opt-btn').forEach(btn => btn.onclick = null);
      if (o.id === currentVocabQuestion.id) {
        b.classList.add('correct', 'bounce-success');
        document.getElementById('vocabQuizMessage').style.color = 'var(--success)';
        document.getElementById('vocabQuizMessage').innerText = '🎉 答對了！';
        vocabQuizScore++;
      } else {
        b.classList.add('wrong', 'shake');
        document.getElementById('vocabQuizMessage').style.color = 'var(--error)';
        document.getElementById('vocabQuizMessage').innerText = `❌ 答錯了！答案是：${currentVocabQuestion.zh}`;
      }
      document.getElementById('vocabNextBtn').style.display = 'block';
    };
    box.appendChild(b);
  });
}

function nextVocabQuizQuestion() {
  vocabQuizIdx++;
  if (vocabQuizIdx < vocabQuizList.length) {
    loadVocabQuizQuestion();
  } else {
    document.getElementById('vocabQuizProgressBar').style.width = '100%';
    alert(`🎉 單字測驗結束！得分：${vocabQuizScore} / ${vocabQuizList.length}`);
    startVocabQuiz();
  }
}

function playVocabQuizAudio() {
  if (currentVocabQuestion) speakKorean(currentVocabQuestion.kr, 'vocabQuizAudioBtn');
}

/* 3. 學習資料庫 (文法 & 單字預覽/翻牌) */
function switchBankSubView(sub) {
  document.getElementById('btnSubGrammar').classList.toggle('active', sub === 'grammar');
  document.getElementById('btnSubVocab').classList.toggle('active', sub === 'vocab');
  document.getElementById('grammarSubView').style.display = (sub === 'grammar') ? 'block' : 'none';
  document.getElementById('vocabSubView').style.display = (sub === 'vocab') ? 'block' : 'none';
  
  if (sub === 'vocab') {
    renderVocabList();
  }
}

function switchVocabMode(mode) {
  const isList = (mode === 'list');
  document.getElementById('btnVocabModeList').classList.toggle('active', isList);
  document.getElementById('btnVocabModeCard').classList.toggle('active', !isList);
  document.getElementById('vocabListView').style.display = isList ? 'block' : 'none';
  document.getElementById('vocabCardView').style.display = isList ? 'none' : 'block';
  
  if (isList) {
    renderVocabList();
  }
}

function filterBankData() {
  const val = document.getElementById('bankLessonSelect').value;
  let gList = (val === 'all') 
    ? appData.grammars 
    : appData.grammars.filter(g => g.lessonId === val);

  const gBox = document.getElementById('grammarList');
  if (!gList || gList.length === 0) {
    gBox.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">暫無文法內容</div>';
  } else {
    gBox.innerHTML = gList.map(g => {
      const formattedEx = g.exampleKr
        .replace(/【有尾音[^】]*】/g, '<span class="badge badge-has">有尾音</span>')
        .replace(/【無尾音[^】]*】/g, '<span class="badge badge-none">無尾音</span>');

      return `
        <div class="grammar-card">
          <div class="grammar-title">${g.title}</div>
          <div class="grammar-formula">${g.formula}</div>
          <div class="grammar-exp">${g.explanation}</div>
          <div class="grammar-ex"><b>例句與變化：</b><br>${formattedEx}</div>
        </div>
      `;
    }).join('');
  }

  filteredVocabList = (val === 'all' || val === 'special') 
    ? [...appData.vocabularies] 
    : appData.vocabularies.filter(v => v.lessonId === val);

  vocabCardIdx = 0;
  updateVocabCardUI();
  
  if (document.getElementById('vocabSubView').style.display !== 'none' && 
      document.getElementById('vocabListView').style.display !== 'none') {
    renderVocabList();
  }
}

function renderVocabList() {
  const container = document.getElementById('vocabListContainer');
  if (!filteredVocabList || filteredVocabList.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">暫無單字內容</div>';
    return;
  }

  container.innerHTML = filteredVocabList.map((v, idx) => {
    const matchedQ = appData.questions.find(q => q.correctOrder.some(word => word.includes(v.kr)));
    let exampleHtml = '';
    if (matchedQ) {
      exampleHtml = `<div class="vocab-item-example"><b>實戰例句：</b> ${matchedQ.correctOrder.join(' ')} <span style="color:var(--text-sub);">(${matchedQ.translation})</span></div>`;
    } else {
      exampleHtml = `<div class="vocab-item-example" style="color:var(--text-sub); font-style:italic;">核心單字，可透過 3D 翻牌進行測驗複習。</div>`;
    }

    const pronText = v.pron ? `[ ${v.pron} ]` : '';
    const pronClass = isPronHidden ? 'vocab-item-pron hidden' : 'vocab-item-pron';

    return `
      <div class="vocab-item-card">
        <div class="vocab-item-header">
          <div class="vocab-item-kr-group">
            <span class="vocab-item-kr">${v.kr}</span>
            <span class="${pronClass}" id="listPron_${idx}">${pronText}</span>
          </div>
          <button class="btn-audio" style="padding: 4px 10px; font-size:0.8rem;" onclick="speakKorean('${v.kr}')">🔊 播放</button>
        </div>
        <div class="vocab-item-meta">
          <span class="badge badge-has">${v.category || '通用'}</span>
          <span class="vocab-item-zh">${v.zh}</span>
        </div>
        ${exampleHtml}
      </div>
    `;
  }).join('');
}

function updateVocabCardUI() {
  if (filteredVocabList.length === 0) {
    document.getElementById('vocabKrDisplay').innerText = '無單字';
    document.getElementById('vocabPronDisplay').innerText = '';
    document.getElementById('vocabZhDisplay').innerText = '-';
    document.getElementById('vocabProgress').innerText = '0 / 0';
    return;
  }
  const v = filteredVocabList[vocabCardIdx];
  document.getElementById('vocabKrDisplay').innerText = v.kr;
  
  const pronEl = document.getElementById('vocabPronDisplay');
  pronEl.innerText = v.pron ? `[ ${v.pron} ]` : '';
  if (isPronHidden) pronEl.classList.add('hidden');
  else pronEl.classList.remove('hidden');

  document.getElementById('vocabZhDisplay').innerText = v.zh;
  document.getElementById('vocabCategoryDisplay').innerText = `分類：${v.category || '通用'}`;
  document.getElementById('vocabProgress').innerText = `${vocabCardIdx + 1} / ${filteredVocabList.length}`;
}

function togglePronVisibility() {
  isPronHidden = !isPronHidden;
  const pronEl = document.getElementById('vocabPronDisplay');
  if (isPronHidden) {
    if (pronEl) pronEl.classList.add('hidden');
  } else {
    if (pronEl) pronEl.classList.remove('hidden');
  }
  
  document.querySelectorAll('[id^="listPron_"]').forEach(el => {
    if (isPronHidden) el.classList.add('hidden');
    else el.classList.remove('hidden');
  });
}

function toggleCardFlip() {
  document.getElementById('vocabCardWrapper').classList.toggle('flipped');
}

function playCurrentVocabCardAudio() {
  if (filteredVocabList.length > 0) {
    speakKorean(filteredVocabList[vocabCardIdx].kr, 'vocabCardAudioBtn');
  }
}

function animateCardSlide(dir, fn) {
  if (isAnimating || filteredVocabList.length === 0) return;
  isAnimating = true;
  const el = document.getElementById('vocabCardWrapper');
  el.classList.remove('flipped');
  el.className = `flip-card-wrapper ${(dir === 'next') ? 'slide-out-left' : 'slide-out-right'}`;
  setTimeout(() => {
    fn();
    updateVocabCardUI();
    el.className = `flip-card-wrapper ${(dir === 'next') ? 'slide-in-right' : 'slide-in-left'}`;
    el.offsetWidth;
    el.className = 'flip-card-wrapper slide-center';
    setTimeout(() => isAnimating = false, 350);
  }, 300);
}

function nextVocabCard() {
  if (vocabCardIdx < filteredVocabList.length - 1) animateCardSlide('next', () => vocabCardIdx++);
}

function prevVocabCard() {
  if (vocabCardIdx > 0) animateCardSlide('prev', () => vocabCardIdx--);
}

function shuffleVocabCards() {
  filteredVocabList.sort(() => Math.random() - 0.5);
  vocabCardIdx = 0;
  updateVocabCardUI();
}

let startX = 0;
const vp = document.querySelector('.slider-viewport');
if (vp) {
  vp.addEventListener('touchstart', e => { startX = e.changedTouches[0].screenX; }, false);
  vp.addEventListener('touchend', e => {
    const endX = e.changedTouches[0].screenX;
    if (endX < startX - 40) nextVocabCard();
    if (endX > startX + 40) prevVocabCard();
  }, false);
}

initApp();
