// 測驗專用變數
let currentSentenceList = [], sentenceIdx = 0, availableCards = [], selectedCards = [], isSentenceCorrect = false;
let vocabQuizList = [], vocabQuizIdx = 0, vocabQuizScore = 0, currentVocabQuestion = null;

/* =========================================
   1. 句子重組測驗 (Sentence Quiz)
========================================= */
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

/* =========================================
   2. 單字選擇測驗 (Vocab Quiz)
========================================= */
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
