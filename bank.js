// 學習資料庫專用變數
let filteredVocabList = [], vocabCardIdx = 0, isAnimating = false;
let isPronHidden = false;

/* =========================================
   3. 學習資料庫 (文法 & 單字庫)
========================================= */
function switchBankSubView(sub) {
  document.getElementById('btnSubGrammar').classList.toggle('active', sub === 'grammar');
  document.getElementById('btnSubVocab').classList.toggle('active', sub === 'vocab');
  document.getElementById('grammarSubView').style.display = (sub === 'grammar') ? 'block' : 'none';
  document.getElementById('vocabSubView').style.display = (sub === 'vocab') ? 'block' : 'none';
  if (sub === 'vocab') renderVocabList();
}

function switchVocabMode(mode) {
  const isList = (mode === 'list');
  document.getElementById('btnVocabModeList').classList.toggle('active', isList);
  document.getElementById('btnVocabModeCard').classList.toggle('active', !isList);
  document.getElementById('vocabListView').style.display = isList ? 'block' : 'none';
  document.getElementById('vocabCardView').style.display = isList ? 'none' : 'block';
  if (isList) renderVocabList();
}

function filterBankData() {
  const val = document.getElementById('bankLessonSelect').value;
  let gList = (val === 'all') ? appData.grammars : appData.grammars.filter(g => g.lessonId === val);

  const gBox = document.getElementById('grammarList');
  if (gBox) {
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
  if (!container) return;

  if (!filteredVocabList || filteredVocabList.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;">暫無單字內容</div>';
    return;
  }

  container.innerHTML = filteredVocabList.map((v, idx) => {
    let exampleHtml = '';
    
    if (v.example && v.example.kr) {
      const safeEx = v.example.kr.replace(/'/g, "\\'");
      exampleHtml = `
        <div class="vocab-item-example" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border, #E5E7EB);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <div style="font-weight: 500; color: var(--text, #1F2937); font-size: 0.95rem;">${v.example.kr}</div>
              <div style="font-size: 0.82rem; color: var(--text-sub, #6B7280); margin-top: 2px;">${v.example.zh}</div>
            </div>
            <button class="btn-audio" style="padding: 3px 8px; font-size: 0.78rem; white-space: nowrap; flex-shrink: 0;" onclick="speakKorean('${safeEx}')">🔊 聽例句</button>
          </div>
        </div>
      `;
    } else {
      const matchedQ = appData.questions.find(q => q.correctOrder.some(w => w.includes(v.kr)));
      if (matchedQ) {
        const fullQ = matchedQ.correctOrder.join(' ');
        const safeQ = fullQ.replace(/'/g, "\\'");
        exampleHtml = `
          <div class="vocab-item-example" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border, #E5E7EB);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div>
                <div style="font-weight: 500; color: var(--text, #1F2937); font-size: 0.95rem;">${fullQ}</div>
                <div style="font-size: 0.82rem; color: var(--text-sub, #6B7280); margin-top: 2px;">${matchedQ.translation}</div>
              </div>
              <button class="btn-audio" style="padding: 3px 8px; font-size: 0.78rem; white-space: nowrap; flex-shrink: 0;" onclick="speakKorean('${safeQ}')">🔊 聽例句</button>
            </div>
          </div>
        `;
      }
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
          <button class="btn-audio" style="padding: 4px 10px; font-size:0.8rem;" onclick="speakKorean('${v.kr}')">🔊 單字</button>
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
  if (pronEl) {
    if (isPronHidden) pronEl.classList.add('hidden');
    else pronEl.classList.remove('hidden');
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

// 綁定觸控滑動事件
let startX = 0;
// 等待 DOM 載入後綁定，或者將事件寫在 initApp 後
document.addEventListener('DOMContentLoaded', () => {
  const vp = document.querySelector('.slider-viewport');
  if (vp) {
    vp.addEventListener('touchstart', e => { startX = e.changedTouches[0].screenX; }, false);
    vp.addEventListener('touchend', e => {
      const endX = e.changedTouches[0].screenX;
      if (endX < startX - 40) nextVocabCard();
      if (endX > startX + 40) prevVocabCard();
    }, false);
  }
});
