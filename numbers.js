/* =========================================
   數字工具區 (numbers.js) - 包含轉換器、特訓與單字庫
========================================= */

// --- 核心轉換器資料 ---
const SINO = { 0: "영", 1: "일", 2: "이", 3: "삼", 4: "사", 5: "오", 6: "육", 7: "칠", 8: "팔", 9: "구", 10: "십", 100: "백", 1000: "천", 10000: "만" };
const NATIVE = { 1: "하나", 2: "둘", 3: "셋", 4: "넷", 5: "다섯", 6: "여섯", 7: "일곱", 8: "여덟", 9: "아홉", 10: "열", 20: "스물", 30: "서른", 40: "마흔", 50: "쉰" };
const NATIVE_MOD = { 1: "한", 2: "두", 3: "세", 4: "네", 20: "스무" };

let currentConverterMode = 'time';

function toSino(num) {
  if (num === 0 || isNaN(num)) return "영";
  let res = "", units = ["", "십", "백", "천", "만"];
  let strNum = num.toString().split("").reverse();
  for (let i = 0; i < strNum.length; i++) {
    let n = parseInt(strNum[i]);
    if (n !== 0) {
      let char = SINO[n];
      if (n === 1 && i > 0 && i < 4) char = ""; 
      res = char + units[i] + " " + res;
    }
  }
  return res.trim();
}

function toNative(num, useModifier = false) {
  if (num === 0 || isNaN(num)) return "영";
  if (num > 99) return toSino(num); 
  let tens = Math.floor(num / 10) * 10, ones = num % 10, res = "";
  if (useModifier && num === 20) return NATIVE_MOD[20];
  if (tens > 0) res += NATIVE[tens] + " ";
  if (ones > 0) {
    if (useModifier && NATIVE_MOD[ones]) res += NATIVE_MOD[ones];
    else res += NATIVE[ones];
  }
  return res.trim();
}

// =========================================
// 主視圖切換 (包含新加的單字庫 library)
// =========================================
function switchNumberSubView(view) {
  document.getElementById('btnSubConverter').classList.toggle('active', view === 'converter');
  document.getElementById('btnSubNumQuiz').classList.toggle('active', view === 'quiz');
  document.getElementById('btnSubNumLib').classList.toggle('active', view === 'library');

  document.getElementById('converterSubView').style.display = view === 'converter' ? 'block' : 'none';
  document.getElementById('numQuizSubView').style.display = view === 'quiz' ? 'block' : 'none';
  document.getElementById('numLibrarySubView').style.display = view === 'library' ? 'block' : 'none';

  if (view === 'quiz' && document.getElementById('numQuizPrompt').innerText === '-') startNumQuiz();
}

// =========================================
// 1. 轉換器邏輯
// =========================================
function switchConverter(mode) {
  currentConverterMode = mode;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
  const body = document.getElementById('converterBody');
  document.getElementById('converterResult').innerHTML = '<div style="color: #94a3b8;">請輸入數字，即可產生韓文與發音</div>';

  if (mode === 'time') {
    body.innerHTML = `<div class="num-input-group"><input type="number" id="inputH" class="num-input" min="1" max="12" placeholder="時" oninput="generateResult()"> 點 <input type="number" id="inputM" class="num-input" min="0" max="59" placeholder="分" oninput="generateResult()"> 分</div>`;
  } else if (mode === 'unit') {
    body.innerHTML = `
      <div class="num-input-group" style="flex-wrap: wrap;">
        <input type="number" id="inputCount" class="num-input" style="width:60px;" min="1" max="99" placeholder="數量" oninput="generateResult()">
        <select id="inputUnit" class="num-input" style="width: auto; padding: 6px;" onchange="generateResult()">
          <option value="개">個 (개)</option><option value="명">名/人 (명)</option><option value="잔">杯 (잔)</option>
          <option value="병">瓶 (병)</option><option value="권">本 (권)</option><option value="마리">隻/條 (마리)</option>
          <option value="송이">朵 (송이)</option><option value="벌">件/套 (벌)</option><option value="켤레">雙 (켤레)</option>
          <option value="장">張 (장)</option><option value="대">台/輛 (대)</option>
        </select>
        <span style="color:#cbd5e1; margin:0 4px;">|</span>
        <input type="number" id="inputPrice" class="num-input" style="width:90px;" min="0" max="99999" step="1000" placeholder="金額" oninput="generateResult()"> 韓元
      </div>`;
  } else if (mode === 'date') {
    body.innerHTML = `<div class="num-input-group"><input type="number" id="inputMonth" class="num-input" min="1" max="12" placeholder="月" oninput="generateResult()"> 月 <input type="number" id="inputDay" class="num-input" min="1" max="31" placeholder="日" oninput="generateResult()"> 日</div>`;
  }
}

function generateResult() {
  const resBox = document.getElementById('converterResult');
  let finalKr = "", displayHtml = "";

  if (currentConverterMode === 'time') {
    let h = parseInt(document.getElementById('inputH').value), m = parseInt(document.getElementById('inputM').value);
    if (!h && m !== 0 && !m) return;
    finalKr = (h ? toNative(h, true) + " 시 " : "") + (m ? toSino(m) + " 분" : "");
    displayHtml = (h ? `<span class="text-native">${toNative(h, true)}</span> <span class="text-unit">시</span> ` : "") + (m ? `<span class="text-sino">${toSino(m)}</span> <span class="text-unit">분</span>` : "");
  } else if (currentConverterMode === 'unit') {
    let count = parseInt(document.getElementById('inputCount').value), unitStrVal = document.getElementById('inputUnit').value, price = parseInt(document.getElementById('inputPrice').value);
    if (!count && price !== 0 && !price) return;
    finalKr = (count ? toNative(count, true) + ` ${unitStrVal} ` : "") + ((price||price===0) ? toSino(price) + " 원" : "");
    displayHtml = (count ? `<span class="text-native">${toNative(count, true)}</span> <span class="text-unit">${unitStrVal}</span>` : "") + (count && (price||price===0) ? " <br> " : "") + ((price||price===0) ? `<span class="text-sino">${toSino(price)}</span> <span class="text-unit">원</span>` : "");
  } else if (currentConverterMode === 'date') {
    let m = parseInt(document.getElementById('inputMonth').value), d = parseInt(document.getElementById('inputDay').value);
    if (!m && !d) return;
    let mKr = m === 6 ? "유" : (m === 10 ? "시" : toSino(m));
    finalKr = (m ? mKr + " 월 " : "") + (d ? toSino(d) + " 일" : "");
    displayHtml = (m ? `<span class="text-sino">${mKr}</span> <span class="text-unit">월</span> ` : "") + (d ? `<span class="text-sino">${toSino(d)}</span> <span class="text-unit">일</span>` : "");
  }

  resBox.innerHTML = `<div class="result-kr">${displayHtml}</div><button class="btn-audio" style="padding:6px 16px;" onclick="speakKorean('${finalKr}')">🔊 聽發音</button>`;
}

// =========================================
// 2. 極限特訓邏輯
// =========================================
let numQuizScore = 0, currentNumQuestion = null;

function startNumQuiz() {
  numQuizScore = 0; document.getElementById('numQuizScore').innerText = `得分：0`; nextNumQuiz();
}

function nextNumQuiz() {
  document.getElementById('numQuizNextBtn').style.display = 'none';
  document.getElementById('numQuizAudioBtn').style.display = 'none';
  document.getElementById('numQuizMessage').innerText = '';

  let type = Math.floor(Math.random() * 3), qText = "", correctAns = "", distractors = [];
  if (type === 0) {
    let h = Math.floor(Math.random() * 12) + 1, m = Math.floor(Math.random() * 60);
    qText = `🕒 ${h} 點 ${m === 0 ? "整" : m + " 分"}`;
    let hNativeMod = toNative(h, true), hNativeFull = toNative(h, false), hSino = toSino(h);
    let mSino = m > 0 ? toSino(m) + " 분" : "", mNative = m > 0 ? toNative(m, false) + " 분" : "";
    correctAns = `${hNativeMod} 시 ${mSino}`.trim();
    distractors.push(`${hSino} 시 ${mSino}`.trim());
    distractors.push(`${hNativeFull} 시 ${mSino}`.trim());
    distractors.push(m > 0 ? `${hNativeMod} 시 ${mNative}`.trim() : `${hSino} 시`);
  } else if (type === 1) {
    let units = [{u: "개", zh: "個"}, {u: "명", zh: "名"}, {u: "잔", zh: "杯"}, {u: "병", zh: "瓶"}, {u: "권", zh: "本"}];
    let randUnit = units[Math.floor(Math.random() * units.length)];
    let counts = [1, 2, 3, 4, 5, 6, 10, 20], c = counts[Math.floor(Math.random() * counts.length)];
    qText = `🛍️ ${c} ${randUnit.zh}`;
    correctAns = `${toNative(c, true)} ${randUnit.u}`;
    distractors.push(`${toSino(c)} ${randUnit.u}`);
    distractors.push(`${toNative(c, false)} ${randUnit.u}`);
    distractors.push(`${toNative(c === 1 ? 2 : c - 1, true)} ${randUnit.u}`);
  } else {
    let prices = [1000, 2500, 5000, 10000, 35000, 50000], p = prices[Math.floor(Math.random() * prices.length)];
    qText = `💰 ${p.toLocaleString()} 韓元`;
    correctAns = `${toSino(p)} 원`;
    distractors.push(`${toNative(p > 99 ? 50 : p, false)} 원`);
    distractors.push(`${toSino(p * 10)} 원`);
    distractors.push(`${toSino(p === 1000 ? 2000 : p - 1000)} 원`);
  }

  let uniqueOpts = new Set([correctAns]);
  for (let d of distractors) { if (d !== correctAns && d !== "") uniqueOpts.add(d); if (uniqueOpts.size === 4) break; }
  let optionsArr = Array.from(uniqueOpts).sort(() => Math.random() - 0.5);
  currentNumQuestion = { q: qText, ans: correctAns };

  document.getElementById('numQuizPrompt').innerText = qText;
  let box = document.getElementById('numQuizOptions');
  box.innerHTML = '';
  optionsArr.forEach(opt => {
    let btn = document.createElement('button'); btn.className = 'opt-btn'; btn.innerText = opt;
    btn.onclick = () => checkNumAnswer(btn, opt); box.appendChild(btn);
  });
}

function checkNumAnswer(btn, selectedStr) {
  document.querySelectorAll('#numQuizOptions .opt-btn').forEach(b => b.onclick = null);
  let msg = document.getElementById('numQuizMessage'), audioBtn = document.getElementById('numQuizAudioBtn');
  if (selectedStr === currentNumQuestion.ans) {
    btn.classList.add('correct', 'bounce-success'); msg.style.color = 'var(--success)'; msg.innerText = '🎉 漂亮！完全正確！';
    numQuizScore++; document.getElementById('numQuizScore').innerText = `得分：${numQuizScore}`;
  } else {
    btn.classList.add('wrong', 'shake'); msg.style.color = 'var(--error)'; msg.innerText = `❌ 正確是：${currentNumQuestion.ans}`;
    document.querySelectorAll('#numQuizOptions .opt-btn').forEach(b => { if (b.innerText === currentNumQuestion.ans) b.classList.add('correct'); });
  }
  document.getElementById('numQuizNextBtn').style.display = 'block';
  audioBtn.style.display = 'inline-block'; audioBtn.onclick = () => speakKorean(currentNumQuestion.ans);
}

// =========================================
// 3. 獨立數字單字庫邏輯 (全新加入)
// =========================================

// 將單字寫死在這裡，完全獨立於 appData，不干擾主程式
const NUM_VOCAB_DATA = {
  native: {
    title: "🌸 韓式數字 (固有詞)",
    themeColor: "#2563eb",
    list: [
      { kr: "하나", pron: "ha-na", zh: "一 (1)", note: "💡 遇到量詞縮寫為：한 (例：한 개)", example: { kr: "사과 한 개 주세요.", zh: "請給我一顆蘋果。" } },
      { kr: "둘", pron: "dul", zh: "二 (2)", note: "💡 遇到量詞縮寫為：두 (例：두 시)", example: { kr: "커피 두 잔 마셨어요.", zh: "喝了兩杯咖啡。" } },
      { kr: "셋", pron: "set", zh: "三 (3)", note: "💡 遇到量詞縮寫為：세 (例：세 잔)", example: { kr: "세 시에 만나요.", zh: "三點見面吧。" } },
      { kr: "넷", pron: "net", zh: "四 (4)", note: "💡 遇到量詞縮寫為：네 (例：네 명)", example: { kr: "학생 네 명 있어요.", zh: "有四名學生。" } },
      { kr: "다섯", pron: "da-seot", zh: "五 (5)", example: { kr: "다섯 살이에요.", zh: "五歲。" } },
      { kr: "여섯", pron: "yeo-seot", zh: "六 (6)", example: { kr: "여섯 개 샀어요.", zh: "買了六個。" } },
      { kr: "일곱", pron: "il-gop", zh: "七 (7)", example: { kr: "일곱 시에 일어납니다.", zh: "七點起床。" } },
      { kr: "여덟", pron: "yeo-deol", zh: "八 (8)", example: { kr: "고양이 여덟 마리.", zh: "八隻貓。" } },
      { kr: "아홉", pron: "a-hop", zh: "九 (9)", example: { kr: "아홉 번 말했어요.", zh: "說了九次。" } },
      { kr: "열", pron: "yeol", zh: "十 (10)", example: { kr: "열 명 왔어요.", zh: "來了十個人。" } },
      { kr: "스물", pron: "seu-mul", zh: "二十 (20)", note: "💡 遇到量詞縮寫為：스무 (例：스무 살)", example: { kr: "스무 살입니다.", zh: "是二十歲。" } }
    ]
  },
  sino: {
    title: "🈴 漢字音數字",
    themeColor: "#dc2626",
    list: [
      { kr: "일", pron: "il", zh: "一 (1)", example: { kr: "일 월 일 일.", zh: "一月一日。" } },
      { kr: "이", pron: "i", zh: "二 (2)", example: { kr: "이 층으로 가세요.", zh: "請去二樓。" } },
      { kr: "삼", pron: "sam", zh: "三 (3)", example: { kr: "삼십 분 걸려요.", zh: "花費三十分鐘。" } },
      { kr: "사", pron: "sa", zh: "四 (4)", example: { kr: "사만 원입니다.", zh: "是四萬韓元。" } },
      { kr: "오", pron: "o", zh: "五 (5)", example: { kr: "오 분 쉬세요.", zh: "請休息五分鐘。" } },
      { kr: "육", pron: "yuk", zh: "六 (6)", example: { kr: "육천 원이에요.", zh: "是六千韓元。" } },
      { kr: "칠", pron: "chil", zh: "七 (7)", example: { kr: "칠 일 동안.", zh: "七天期間。" } },
      { kr: "팔", pron: "pal", zh: "八 (8)", example: { kr: "팔월입니다.", zh: "是八月。" } },
      { kr: "구", pron: "gu", zh: "九 (9)", example: { kr: "구십 점이에요.", zh: "是九十分。" } },
      { kr: "십", pron: "sip", zh: "十 (10)", example: { kr: "십 초 남았어요.", zh: "剩下十秒。" } },
      { kr: "백", pron: "baek", zh: "百 (100)", example: { kr: "백 원입니다.", zh: "是一百韓元。" } },
      { kr: "천", pron: "cheon", zh: "千 (1,000)", example: { kr: "오천 원 주세요.", zh: "請給我五千韓元。" } },
      { kr: "만", pron: "man", zh: "萬 (10,000)", example: { kr: "만 원짜리 지폐.", zh: "一萬韓元的紙鈔。" } }
    ]
  }
};

function openNumLibDetail(type) {
  document.getElementById('numLibMenu').style.display = 'none';
  document.getElementById('numLibDetail').style.display = 'block';
  
  const data = NUM_VOCAB_DATA[type];
  document.getElementById('numLibDetailTitle').innerText = data.title;
  
  const container = document.getElementById('numLibListContainer');
  container.innerHTML = data.list.map(v => {
    const safeEx = v.example.kr.replace(/'/g, "\\'");
    
    // 如果有變形註解 (note)，就產生帶有微紅底色的提示框
    const noteHtml = v.note 
      ? `<div style="font-size: 0.85rem; color: #b91c1c; background: #fee2e2; padding: 6px 10px; border-radius: 6px; display: inline-block; margin-top: 8px; font-weight: 500;">${v.note}</div>` 
      : '';

    return `
      <div class="vocab-item-card" style="border-left: 4px solid ${data.themeColor}; margin-bottom: 12px;">
        <div class="vocab-item-header">
          <div class="vocab-item-kr-group">
            <span class="vocab-item-kr">${v.kr}</span>
            <span class="vocab-item-pron" style="font-size:0.9rem; color:#888; margin-left:8px;">[ ${v.pron} ]</span>
          </div>
          <button class="btn-audio" style="padding: 4px 10px; font-size:0.8rem;" onclick="speakKorean('${v.kr}')">🔊 單字</button>
        </div>
        <div class="vocab-item-meta" style="margin-top: 4px;">
          <span class="vocab-item-zh" style="font-weight:bold;">${v.zh}</span>
        </div>
        
        <!-- 變形提示區塊 -->
        ${noteHtml}
        
        <div class="vocab-item-example" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border, #E5E7EB);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <div style="font-weight: 500; color: var(--text, #1F2937); font-size: 0.95rem;">${v.example.kr}</div>
              <div style="font-size: 0.82rem; color: var(--text-sub, #6B7280); margin-top: 2px;">${v.example.zh}</div>
            </div>
            <button class="btn-audio" style="padding: 3px 8px; font-size: 0.78rem; white-space: nowrap; flex-shrink: 0;" onclick="speakKorean('${safeEx}')">🔊 聽例句</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function backToNumLibMenu() {
  document.getElementById('numLibDetail').style.display = 'none';
  document.getElementById('numLibMenu').style.display = 'block';
}

// 預設載入初始化
document.addEventListener('DOMContentLoaded', () => { switchConverter('time'); });
