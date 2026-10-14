// 測驗專用變數
let currentSentenceList = [], sentenceIdx = 0, initialShuffledCards = [], selectedCards = [], isSentenceCorrect = false;
let vocabQuizList = [], vocabQuizIdx = 0, vocabQuizScore = 0, currentVocabQuestion = null;

/* =========================================
   1. 句子重組測驗 (Sentence Quiz)
========================================= */
function initSentenceQuiz() {
  const lessonSelect = document.getElementById('sentenceLessonSelect');
  const rangeSelect = document.getElementById('sentenceRangeSelect');
  const cntSelect = document.getElementById('sentenceCountSelect');
  const val = lessonSelect ? lessonSelect.value : 'all';

  let pool = [];

  if (val === 'all') {
    // 進入綜合測驗：顯示中間的「範圍選單」與右邊的「題數選單」
    if (rangeSelect) rangeSelect.style.display = 'inline-block';
    if (cntSelect) cntSelect.style.display = 'inline-block';

    const rangeVal = rangeSelect ? rangeSelect.value : '1-10';
    const [startNum, endNum] = rangeVal.split('-').map(Number);

    pool = appData.questions.filter(q => {
      const num = parseInt((q.lessonId || '').replace('lesson-', ''), 10);
      return num >= startNum && num <= endNum;
    });

    pool.sort(() => Math.random() - 0.5);

    if (cntSelect) {
      const limit = parseInt(cntSelect.value, 10);
      if (!isNaN(limit) && limit > 0) pool = pool.slice(0, limit);
    }
  } else {
    // 單課測驗：隱藏「範圍選單」與「題數選單」
    if (rangeSelect) rangeSelect.style.display = 'none';
    if (cntSelect) cntSelect.style.display = 'none';

    pool = appData.questions.filter(q => q.lessonId === val);
    pool.sort(() => Math.random() - 0.5);
  }

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
  
  const oldGrammar = document.getElementById('grammarExplain');
  if (oldGrammar) oldGrammar.remove();

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
  initialShuffledCards = shuffled.map((text, idx) => ({ id: idx, text }));
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
  selectedCards.forEach(c => {
    zone.appendChild(createCard(c.text, () => {
      if (isSentenceCorrect) return;
      selectedCards = selectedCards.filter(x => x.id !== c.id);
      renderSentenceQuiz();
    }));
  });
  
  bank.innerHTML = '';
  initialShuffledCards.forEach(c => {
    const isSelected = selectedCards.some(x => x.id === c.id);
    if (isSelected) {
      const placeholder = document.createElement('div');
      placeholder.className = 'card placeholder';
      placeholder.innerText = c.text;
      bank.appendChild(placeholder);
    } else {
      bank.appendChild(createCard(c.text, () => {
        if (isSentenceCorrect) return;
        selectedCards.push(c);
        renderSentenceQuiz();
      }));
    }
  });
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

    showGrammarExplanation(q.grammarId);
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

function showGrammarExplanation(grammarId) {
  if (!grammarId) return;

  const ids = Array.isArray(grammarId) ? grammarId : [grammarId];
  const targetGrammars = appData.grammars.filter(g => ids.includes(g.id));
  if (targetGrammars.length === 0) return;

  let grammarHtml = `<div id="grammarExplain" style="margin-top: 24px; text-align: left; background: #F8FAFC; padding: 16px; border-radius: 12px; border: 1px solid #CBD5E1; animation: fadeIn 0.5s ease;">
      <h4 style="color: #334155; margin-top:0; margin-bottom: 12px; display:flex; align-items:center; gap:6px;">
        💡 <span>本題文法解析</span>
      </h4>`;
  
  targetGrammars.forEach(g => {
    const formattedEx = (g.exampleKr || '')
      .replace(/【有尾音[^】]*】/g, '<span class="badge badge-has">有尾音</span>')
      .replace(/【無尾音[^】]*】/g, '<span class="badge badge-none">無尾音</span>');
      
    grammarHtml += `
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #E2E8F0;">
          <strong style="color: #2563EB; font-size: 1.05rem;">${g.title}</strong>
          <div style="font-size: 0.9rem; color: #475569; margin-top: 4px;">${g.explanation}</div>
          <div style="font-size: 0.9rem; color: #1E293B; margin-top: 6px; background: #FFFFFF; padding: 8px; border-radius: 6px; border: 1px solid #E2E8F0;">
              ${formattedEx}
          </div>
      </div>`;
  });
  grammarHtml += `</div>`;

  const msgEl = document.getElementById('message');
  if (msgEl) msgEl.insertAdjacentHTML('afterend', grammarHtml);
}


/* =========================================
   2. 單字選擇測驗 (Vocab Quiz)
========================================= */
function startVocabQuiz() {
  const lessonSelect = document.getElementById('vocabQuizLessonSelect');
  const rangeSelect = document.getElementById('vocabRangeSelect');
  const cntSelect = document.getElementById('vocabQuizCountSelect');
  const val = lessonSelect ? lessonSelect.value : 'all';

  let pool = [];

  if (val === 'all') {
    if (rangeSelect) rangeSelect.style.display = 'inline-block';
    if (cntSelect) cntSelect.style.display = 'inline-block';

    const rangeVal = rangeSelect ? rangeSelect.value : '1-10';
    const [startNum, endNum] = rangeVal.split('-').map(Number);

    pool = appData.vocabularies.filter(v => {
      const num = parseInt((v.lessonId || '').replace('lesson-', ''), 10);
      return num >= startNum && num <= endNum;
    });

    pool.sort(() => Math.random() - 0.5);

    if (cntSelect) {
      const cnt = parseInt(cntSelect.value, 10);
      if (!isNaN(cnt) && cnt > 0) pool = pool.slice(0, Math.min(cnt, pool.length));
    }
  } else {
    if (rangeSelect) rangeSelect.style.display = 'none';
    if (cntSelect) cntSelect.style.display = 'none';

    pool = appData.vocabularies.filter(v => v.lessonId === val);
    pool.sort(() => Math.random() - 0.5);
  }

  if (pool.length < 4) {
    document.getElementById('vocabQuizWord').innerText = "單字不足以組成選擇題";
    document.getElementById('vocabQuizOptions').innerHTML = '';
    return;
  }

  vocabQuizList = pool;
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
