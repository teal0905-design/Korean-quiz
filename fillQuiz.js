/**
 * 語法填充測驗核心邏輯 (修復衝突與高容錯版)
 */

let fillDataCache = {
  basic: null,        // fill_quiz_1_4.json
  intermediate: null, // fill_quiz_5_7.json
  advanced: null      // fill_quiz_8_10.json
};

let currentFillQuestions = [];
let currentFillIndex = 0;
let currentQuestionObj = null;
let currentBlankSlot = 0;
let isCurrentQuestionDone = false;

// 1. 智慧攔截並保留 app.js 原本的分頁切換邏輯
(function setupViewHook() {
  const originalSwitch = window.switchMainView;

  window.switchMainView = function(viewName) {
    // 執行原有 app.js 的切換
    if (typeof originalSwitch === 'function') {
      originalSwitch(viewName);
    } else {
      // 備用切換機制
      document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      const target = document.getElementById(viewName + 'View') || document.getElementById(viewName);
      if (target) target.classList.add('active');
    }

    // 當點選語法填充時的特別處理
    if (viewName === 'fillQuiz') {
      const fillView = document.getElementById('fillQuizView');
      if (fillView) {
        // 清除任何行內 style 避免干擾 .active
        fillView.style.display = '';
        fillView.classList.add('active');
      }

      // 首次進入或尚未載入題目時，自動初始化抽題
      if (currentFillQuestions.length === 0) {
        initFillQuiz();
      }
    }
  };
})();

// 2. 智慧 JSON 載入器 (同時相容根目錄或 data/ 目錄)
async function fetchQuizFile(fileName) {
  // 先嘗試 data/ 子目錄
  try {
    const resData = await fetch(`data/${fileName}`);
    if (resData.ok) {
      const json = await resData.json();
      return json.questions || json;
    }
  } catch (e) {}

  // 若失敗，再嘗試根目錄
  try {
    const resRoot = await fetch(fileName);
    if (resRoot.ok) {
      const json = await resRoot.json();
      return json.questions || json;
    }
  } catch (e) {}

  throw new Error(`找不到檔案 ${fileName}，請確認檔案已放置在根目錄或 data/ 目錄下。`);
}

// 根據難度階段載入題庫
async function loadFillQuizData(difficulty) {
  let pool = [];

  // 1~4 課資料
  if (!fillDataCache.basic) {
    fillDataCache.basic = await fetchQuizFile('fill_quiz_1_4.json');
  }
  pool = pool.concat(fillDataCache.basic);

  // 5~7 課資料
  if (difficulty === 'intermediate' || difficulty === 'advanced') {
    if (!fillDataCache.intermediate) {
      fillDataCache.intermediate = await fetchQuizFile('fill_quiz_5_7.json');
    }
    pool = pool.concat(fillDataCache.intermediate);
  }

  // 8~10 課資料
  if (difficulty === 'advanced') {
    if (!fillDataCache.advanced) {
      fillDataCache.advanced = await fetchQuizFile('fill_quiz_8_10.json');
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
    if (!rawPool || rawPool.length === 0) {
      throw new Error('題庫中沒有題目。');
    }

    const shuffled = [...rawPool].sort(() => Math.random() - 0.5);
    currentFillQuestions = shuffled.slice(0, targetCount);
    currentFillIndex = 0;

    renderFillQuestion();
  } catch (err) {
    console.error('填充題庫載入失敗：', err);
    document.getElementById('fillPromptText').innerHTML = `
      <div style="color: #ef4444; font-size: 1rem; line-height: 1.6;">
        ⚠️ 題庫載入失敗<br>
        <span style="font-size: 0.85rem; color: #64748b;">${err.message}</span>
      </div>
    `;
  }
}

// 渲染單道題目
function renderFillQuestion() {
  isCurrentQuestionDone = false;
  currentBlankSlot = 0;

  const grammarBox = document.getElementById('fillGrammarCardContainer');
  if (grammarBox) grammarBox.innerHTML = '';
  document.getElementById('fillFeedback').innerText = '';
  document.getElementById('fillNextBtn').style.display = 'none';

  currentQuestionObj = currentFillQuestions[currentFillIndex];

  // 更新進度與題目文字
  const total = currentFillQuestions.length;
  const progressPercent = (currentFillIndex / total) * 100;
  const pBar = document.getElementById('fillProgressBar');
  if (pBar) pBar.style.width = `${progressPercent}%`;

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

    if (idx < currentQuestionObj.blanks.length) {
      const slotSpan = document.createElement('span');
      slotSpan.id = `fillSlot_${idx}`;
      slotSpan.className = 'fill-slot';
      slotSpan.innerText = `[ ${idx + 1} ]`;
      sentenceBox.appendChild(slotSpan);
    }
  });

  activateBlankSlot(0);
}

// 聚焦啟動特定空格
function activateBlankSlot(slotIndex) {
  currentBlankSlot = slotIndex;
  const totalSlots = currentQuestionObj.blanks.length;

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

  const targetInfo = currentQuestionObj.blanks[slotIndex].target || '語法成分';
  document.getElementById('fillStageHint').innerText = `👉 請點選第 [ ${slotIndex + 1} ] 格：${targetInfo}`;

  renderSlotOptions(slotIndex);
}

// 渲染當前空格的選項按鈕
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

// 選項點擊判定
function handleOptionSelection(selectedText, btnEl) {
  if (isCurrentQuestionDone) return;

  const currentBlank = currentQuestionObj.blanks[currentBlankSlot];
  const feedbackEl = document.getElementById('fillFeedback');

  if (selectedText === currentBlank.answer) {
    feedbackEl.innerText = '';
    const currentSlotEl = document.getElementById(`fillSlot_${currentBlankSlot}`);
    if (currentSlotEl) {
      currentSlotEl.innerText = selectedText;
      currentSlotEl.className = 'fill-slot filled-correct';
    }

    const nextSlot = currentBlankSlot + 1;
    if (nextSlot < currentQuestionObj.blanks.length) {
      activateBlankSlot(nextSlot);
    } else {
      finishQuestionSuccess();
    }
  } else {
    btnEl.classList.add('wrong');
    feedbackEl.style.color = '#ef4444';
    feedbackEl.innerText = '❌ 助詞或變形不太對喔，請再試試看！';
    setTimeout(() => btnEl.classList.remove('wrong'), 450);
  }
}

// 全句答對完成
function finishQuestionSuccess() {
  isCurrentQuestionDone = true;
  document.getElementById('fillOptionsBox').innerHTML = '';
  document.getElementById('fillStageHint').innerText = '🎉 完美填入！';

  const feedbackEl = document.getElementById('fillFeedback');
  feedbackEl.style.color = '#10b981';
  feedbackEl.innerText = '✨ 答對了！點擊下方可前往下一題。';

  // 1. 播放完整句子自然韓文發音
  if (typeof speakKorean === 'function' && currentQuestionObj.fullKr) {
    speakKorean(currentQuestionObj.fullKr);
  }

  // 2. 顯示下一題按鈕
  document.getElementById('fillNextBtn').style.display = 'inline-block';
}

// 前進下一題
function nextFillQuestion() {
  currentFillIndex++;
  if (currentFillIndex < currentFillQuestions.length) {
    renderFillQuestion();
  } else {
    const pBar = document.getElementById('fillProgressBar');
    if (pBar) pBar.style.width = '100%';

    document.getElementById('fillSentenceBox').innerHTML = '';
    document.getElementById('fillOptionsBox').innerHTML = '';
    document.getElementById('fillStageHint').innerText = '';
    document.getElementById('fillFeedback').innerText = '';
    document.getElementById('fillNextBtn').style.display = 'none';

    document.getElementById('fillPromptText').innerHTML = `
      <div style="text-align: center; padding: 16px 0;">
        <h3 style="color: #10b981; margin-bottom: 8px;">🎉 本次填充測驗完成！</h3>
        <p style="color: #64748b; font-size: 0.95rem;">所有的助詞與語尾都精準掌握了！</p>
        <button class="btn btn-submit" onclick="initFillQuiz()" style="margin-top: 12px; width: auto; padding: 10px 24px;">
          🔄 再測驗一次
        </button>
      </div>
    `;
  }
}
