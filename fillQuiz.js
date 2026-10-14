/**
 * 填充測驗核心邏輯 (支援多空格依序作答)
 */
let fillDataCache = {
  basic: null,        // fill_quiz_1_4.json
  intermediate: null, // fill_quiz_5_7.json
  advanced: null      // fill_quiz_8_10.json
};

let currentFillQuestions = [];
let currentFillIndex = 0;
let currentQuestionObj = null;
let currentBlankSlot = 0; // 當前正在作答第幾格 (0, 1, 2...)
let isCurrentQuestionDone = false;

// 頁面主切換支援
function switchMainView(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
  const target = document.getElementById(viewId);
  if (target) target.style.display = 'block';

  if (viewId === 'fillQuizView' && currentFillQuestions.length === 0) {
    initFillQuiz();
  }
}

// 根據難度階段載入題庫
async function loadFillQuizData(difficulty) {
  let pool = [];

  // 1~4 課資料
  if (!fillDataCache.basic) {
    const res = await fetch('data/fill_quiz_1_4.json');
    fillDataCache.basic = (await res.json()).questions;
  }
  pool = pool.concat(fillDataCache.basic);

  // 5~7 課資料
  if (difficulty === 'intermediate' || difficulty === 'advanced') {
    if (!fillDataCache.intermediate) {
      const res = await fetch('data/fill_quiz_5_7.json');
      fillDataCache.intermediate = (await res.json()).questions;
    }
    pool = pool.concat(fillDataCache.intermediate);
  }

  // 8~10 課資料
  if (difficulty === 'advanced') {
    if (!fillDataCache.advanced) {
      const res = await fetch('data/fill_quiz_8_10.json');
      fillDataCache.advanced = (await res.json()).questions;
    }
    pool = pool.concat(fillDataCache.advanced);
  }

  return pool;
}

// 初始化填充測驗
async function initFillQuiz() {
  const diffSelect = document.getElementById('fillDifficultySelect');
  const countSelect = document.getElementById('fillCountSelect');
  const difficulty = diffSelect ? diffSelect.value : 'intermediate';
  const targetCount = countSelect ? parseInt(countSelect.value, 10) : 10;

  document.getElementById('fillPromptText').innerText = '題庫載入中...';
  document.getElementById('fillSentenceBox').innerHTML = '';
  document.getElementById('fillOptionsBox').innerHTML = '';
  document.getElementById('fillStageHint').innerText = '';
  document.getElementById('fillFeedback').innerText = '';
  document.getElementById('fillNextBtn').style.display = 'none';

  try {
    const rawPool = await loadFillQuizData(difficulty);
    // 隨機抽題
    const shuffled = [...rawPool].sort(() => Math.random() - 0.5);
    currentFillQuestions = shuffled.slice(0, targetCount);
    currentFillIndex = 0;

    renderFillQuestion();
  } catch (err) {
    console.error('無法載入填充題庫：', err);
    document.getElementById('fillPromptText').innerText = '載入題庫時發生錯誤，請確認 JSON 檔案是否存在。';
  }
}

// 渲染單道題目
function renderFillQuestion() {
  isCurrentQuestionDone = false;
  currentBlankSlot = 0;

  // 清除先前的文法卡片與反饋
  const grammarBox = document.getElementById('fillGrammarCardContainer');
  grammarBox.innerHTML = '';
  document.getElementById('fillFeedback').innerText = '';
  document.getElementById('fillNextBtn').style.display = 'none';

  currentQuestionObj = currentFillQuestions[currentFillIndex];

  // 更新進度條與提示文字
  const total = currentFillQuestions.length;
  const progressPercent = ((currentFillIndex) / total) * 100;
  document.getElementById('fillProgressBar').style.width = `${progressPercent}%`;
  document.getElementById('fillPromptText').innerText = `(${currentFillIndex + 1}/${total}) ${currentQuestionObj.zh}`;

  // 渲染句子碎塊與空格
  const sentenceBox = document.getElementById('fillSentenceBox');
  sentenceBox.innerHTML = '';

  currentQuestionObj.sentenceParts.forEach((part, idx) => {
    if (part) {
      const partSpan = document.createElement('span');
      partSpan.className = 'sentence-part';
      partSpan.innerText = part;
      sentenceBox.appendChild(partSpan);
    }

    // 在碎片間插入對應空格（最後一段不插空格）
    if (idx < currentQuestionObj.blanks.length) {
      const slotSpan = document.createElement('span');
      slotSpan.id = `fillSlot_${idx}`;
      slotSpan.className = 'fill-slot';
      slotSpan.innerText = `[ ${idx + 1} ]`;
      sentenceBox.appendChild(slotSpan);
    }
  });

  // 啟用第一個空格並渲染選項
  activateBlankSlot(0);
}

// 聚焦啟動特定空格
function activateBlankSlot(slotIndex) {
  currentBlankSlot = slotIndex;
  const totalSlots = currentQuestionObj.blanks.length;

  // 更新空格外觀狀態
  for (let i = 0; i < totalSlots; i++) {
    const slotEl = document.getElementById(`fillSlot_${i}`);
    if (!slotEl) continue;

    if (i < slotIndex) {
      slotEl.className = 'fill-slot filled-correct';
    } else if (i === slotIndex) {
      slotEl.className = 'fill-slot active';
      slotEl.innerText = '?';
    } else {
      slotEl.className = 'fill-slot';
      slotEl.innerText = `[ ${i + 1} ]`;
    }
  }

  // 更新提示文字
  const targetInfo = currentQuestionObj.blanks[slotIndex].target || '語法成分';
  document.getElementById('fillStageHint').innerText = `👉 請點選第 [ ${slotIndex + 1} ] 格：${targetInfo}`;

  // 渲染選項按鈕
  renderSlotOptions(slotIndex);
}

// 渲染當前空格的 4 個選項按鈕
function renderSlotOptions(slotIndex) {
  const optionsBox = document.getElementById('fillOptionsBox');
  optionsBox.innerHTML = '';

  const blankData = currentQuestionObj.blanks[slotIndex];
  const shuffledOpts = [...blankData.options].sort(() => Math.random() - 0.5);

  shuffledOpts.forEach(optText => {
    const btn = document.createElement('button');
    btn.className = 'fill-opt-btn';
    btn.innerText = optText;
    btn.onclick = () => handleOptionSelection(optText, btn);
    optionsBox.appendChild(btn);
  });
}

// 選項點擊事件判定
function handleOptionSelection(selectedText, btnEl) {
  if (isCurrentQuestionDone) return;

  const currentBlank = currentQuestionObj.blanks[currentBlankSlot];
  const feedbackEl = document.getElementById('fillFeedback');

  if (selectedText === currentBlank.answer) {
    // 答對該格
    feedbackEl.innerText = '';
    const currentSlotEl = document.getElementById(`fillSlot_${currentBlankSlot}`);
    currentSlotEl.innerText = selectedText;
    currentSlotEl.className = 'fill-slot filled-correct';

    const nextSlot = currentBlankSlot + 1;
    if (nextSlot < currentQuestionObj.blanks.length) {
      // 還有下一格：平滑進入下一格
      activateBlankSlot(nextSlot);
    } else {
      // 全句所有空格填寫完畢
      finishQuestionSuccess();
    }
  } else {
    // 答錯：晃動反饋
    btnEl.classList.add('wrong');
    feedbackEl.style.color = '#ef4444';
    feedbackEl.innerText = '❌ 助詞或變形不太對喔，請再試試看！';
    setTimeout(() => btnEl.classList.remove('wrong'), 450);
  }
}

// 整道題目完全答對
function finishQuestionSuccess() {
  isCurrentQuestionDone = true;
  document.getElementById('fillOptionsBox').innerHTML = '';
  document.getElementById('fillStageHint').innerText = '🎉 完美填入！';

  const feedbackEl = document.getElementById('fillFeedback');
  feedbackEl.style.color = '#10b981';
  feedbackEl.innerText = '✨ 答對了！點擊下方可前往下一題。';

  // 1. 播放完整句子自然韓文語音
  if (typeof speakKorean === 'function' && currentQuestionObj.fullKr) {
    speakKorean(currentQuestionObj.fullKr);
  }

  // 2. 展開精準文法說明卡片
  if (currentQuestionObj.grammarId) {
    renderGrammarCard(currentQuestionObj.grammarId);
  }

  // 3. 亮起下一題按鈕
  document.getElementById('fillNextBtn').style.display = 'inline-block';
}

// 顯示文法卡片
function renderGrammarCard(grammarIds) {
  const container = document.getElementById('fillGrammarCardContainer');
  container.innerHTML = '';

  const ids = Array.isArray(grammarIds) ? grammarIds : [grammarIds];
  if (typeof getGrammarInfoById === 'function') {
    ids.forEach(gid => {
      const gInfo = getGrammarInfoById(gid);
      if (gInfo) {
        const card = document.createElement('div');
        card.className = 'grammar-popup-card';
        card.style.marginTop = '16px';
        card.innerHTML = `
          <div class="grammar-card-title">💡 相關文法：${gInfo.title || gInfo.kr}</div>
          <div class="grammar-card-desc">${gInfo.desc || gInfo.explanation}</div>
        `;
        container.appendChild(card);
      }
    });
  }
}

// 前進下一題
function nextFillQuestion() {
  currentFillIndex++;
  if (currentFillIndex < currentFillQuestions.length) {
    renderFillQuestion();
  } else {
    // 測驗結束
    document.getElementById('fillProgressBar').style.width = '100%';
    document.getElementById('fillSentenceBox').innerHTML = '';
    document.getElementById('fillOptionsBox').innerHTML = '';
    document.getElementById('fillStageHint').innerText = '';
    document.getElementById('fillFeedback').innerText = '';
    document.getElementById('fillGrammarCardContainer').innerHTML = '';
    document.getElementById('fillNextBtn').style.display = 'none';

    document.getElementById('fillPromptText').innerHTML = `
      <div style="text-align: center; padding: 20px 0;">
        <h2 style="color: #10b981; margin-bottom: 8px;">🎉 本次填充測驗完成！</h2>
        <p style="color: #64748b;">所有的助詞與語尾都精準掌握了！</p>
        <button class="primary-btn" onclick="initFillQuiz()" style="margin-top: 16px;">
          🔄 再測驗一次
        </button>
      </div>
    `;
  }
}
