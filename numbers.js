/* =========================================
   數字轉換器邏輯 (numbers.js)
========================================= */

const SINO = {
  0: "영", 1: "일", 2: "이", 3: "삼", 4: "사", 5: "오",
  6: "육", 7: "칠", 8: "팔", 9: "구", 10: "십",
  100: "백", 1000: "천", 10000: "만"
};

const NATIVE = {
  1: "하나", 2: "둘", 3: "셋", 4: "넷", 5: "다섯",
  6: "여섯", 7: "일곱", 8: "여덟", 9: "아홉", 10: "열",
  20: "스물", 30: "서른", 40: "마흔", 50: "쉰"
};

const NATIVE_MOD = {
  1: "한", 2: "두", 3: "세", 4: "네", 20: "스무"
};

let currentConverterMode = 'time';

function toSino(num) {
  if (num === 0 || isNaN(num)) return "영";
  let res = "";
  const units = ["", "십", "백", "천", "만"];
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
  
  let tens = Math.floor(num / 10) * 10;
  let ones = num % 10;
  let res = "";

  if (useModifier && num === 20) return NATIVE_MOD[20];

  if (tens > 0) res += NATIVE[tens] + " ";
  if (ones > 0) {
    if (useModifier && NATIVE_MOD[ones]) res += NATIVE_MOD[ones];
    else res += NATIVE[ones];
  }
  return res.trim();
}

function switchConverter(mode) {
  currentConverterMode = mode;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
  
  const body = document.getElementById('converterBody');
  const res = document.getElementById('converterResult');
  res.innerHTML = '<div style="color: #94a3b8;">請輸入數字，即可產生韓文與發音</div>';

  if (mode === 'time') {
    body.innerHTML = `
      <div class="num-input-group">
        <input type="number" id="inputH" class="num-input" min="1" max="12" placeholder="時" oninput="generateResult()"> 點
        <input type="number" id="inputM" class="num-input" min="0" max="59" placeholder="分" oninput="generateResult()"> 分
      </div>
    `;
  } else if (mode === 'unit') {
    // 單位與金額模式：加入強大的下拉選單
    body.innerHTML = `
      <div class="num-input-group" style="flex-wrap: wrap;">
        <input type="number" id="inputCount" class="num-input" style="width:60px;" min="1" max="99" placeholder="數量" oninput="generateResult()">
        <select id="inputUnit" class="num-input" style="width: auto; padding: 6px; font-size:1rem;" onchange="generateResult()">
          <option value="개">個 (개)</option>
          <option value="명">名/人 (명)</option>
          <option value="잔">杯 (잔)</option>
          <option value="병">瓶 (병)</option>
          <option value="권">本 (권)</option>
          <option value="마리">隻/條 (마리)</option>
          <option value="송이">朵 (송이)</option>
          <option value="벌">件/套 (벌)</option>
          <option value="켤레">雙 (켤레)</option>
          <option value="장">張 (장)</option>
          <option value="대">台/輛 (대)</option>
        </select>
        <span style="color:#cbd5e1; margin:0 4px;">|</span>
        <input type="number" id="inputPrice" class="num-input" style="width:90px;" min="0" max="99999" step="1000" placeholder="金額" oninput="generateResult()"> 韓元
      </div>
    `;
  } else if (mode === 'date') {
    body.innerHTML = `
      <div class="num-input-group">
        <input type="number" id="inputMonth" class="num-input" min="1" max="12" placeholder="月" oninput="generateResult()"> 月
        <input type="number" id="inputDay" class="num-input" min="1" max="31" placeholder="日" oninput="generateResult()"> 日
      </div>
    `;
  }
}

function generateResult() {
  const resBox = document.getElementById('converterResult');
  let finalKr = "", displayHtml = "";

  if (currentConverterMode === 'time') {
    let h = parseInt(document.getElementById('inputH').value);
    let m = parseInt(document.getElementById('inputM').value);
    if (!h && m !== 0 && !m) return;

    let hStr = h ? `<span class="text-native">${toNative(h, true)}</span> <span class="text-unit">시</span>` : "";
    let mStr = m ? `<span class="text-sino">${toSino(m)}</span> <span class="text-unit">분</span>` : "";
    
    finalKr = (h ? toNative(h, true) + " 시 " : "") + (m ? toSino(m) + " 분" : "");
    displayHtml = hStr + " " + mStr;

  } else if (currentConverterMode === 'unit') {
    let count = parseInt(document.getElementById('inputCount').value);
    let unitStrVal = document.getElementById('inputUnit').value;
    let price = parseInt(document.getElementById('inputPrice').value);
    if (!count && price !== 0 && !price) return;

    let countStr = count ? `<span class="text-native">${toNative(count, true)}</span> <span class="text-unit">${unitStrVal}</span>` : "";
    let priceStr = (price || price===0) ? `<span class="text-sino">${toSino(price)}</span> <span class="text-unit">원</span>` : "";
    
    finalKr = (count ? toNative(count, true) + ` ${unitStrVal} ` : "") + ((price||price===0) ? toSino(price) + " 원" : "");
    displayHtml = countStr + (count && (price||price===0) ? " <br> " : "") + priceStr;

  } else if (currentConverterMode === 'date') {
    let m = parseInt(document.getElementById('inputMonth').value);
    let d = parseInt(document.getElementById('inputDay').value);
    if (!m && !d) return;

    let mKr = toSino(m);
    if (m === 6) mKr = "유";
    if (m === 10) mKr = "시";

    let mStr = m ? `<span class="text-sino">${mKr}</span> <span class="text-unit">월</span>` : "";
    let dStr = d ? `<span class="text-sino">${toSino(d)}</span> <span class="text-unit">일</span>` : "";
    
    finalKr = (m ? mKr + " 월 " : "") + (d ? toSino(d) + " 일" : "");
    displayHtml = mStr + " " + dStr;
  }

  resBox.innerHTML = `
    <div class="result-kr">${displayHtml}</div>
    <button class="btn-audio" style="padding:6px 16px;" onclick="speakKorean('${finalKr}')">🔊 聽發音</button>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  switchConverter('time');
});
/* =========================================
   極限數字特訓測驗 (Number Quiz)
========================================= */
let numQuizScore = 0;
let currentNumQuestion = null;

// 切換 轉換器 / 測驗 視圖
function switchNumberSubView(view) {
  document.getElementById('btnSubConverter').classList.toggle('active', view === 'converter');
  document.getElementById('btnSubNumQuiz').classList.toggle('active', view === 'quiz');
  document.getElementById('converterSubView').style.display = view === 'converter' ? 'block' : 'none';
  document.getElementById('numQuizSubView').style.display = view === 'quiz' ? 'block' : 'none';

  if (view === 'quiz' && document.getElementById('numQuizPrompt').innerText === '-') {
    startNumQuiz();
  }
}

function startNumQuiz() {
  numQuizScore = 0;
  document.getElementById('numQuizScore').innerText = `得分：0`;
  nextNumQuiz();
}

function nextNumQuiz() {
  document.getElementById('numQuizNextBtn').style.display = 'none';
  document.getElementById('numQuizAudioBtn').style.display = 'none';
  document.getElementById('numQuizMessage').innerText = '';

  // 隨機抽選題型：0=時間, 1=單位, 2=金額
  let type = Math.floor(Math.random() * 3);
  let qText = "", correctAns = "", distractors = [];

  if (type === 0) {
    // 【時間題】
    let h = Math.floor(Math.random() * 12) + 1;
    let m = Math.floor(Math.random() * 60);
    qText = `🕒 ${h} 點 ${m === 0 ? "整" : m + " 分"}`;

    let hNativeMod = toNative(h, true);  // 縮寫固有詞 (세)
    let hNativeFull = toNative(h, false); // 完整固有詞 (셋)
    let hSino = toSino(h);                // 漢字音 (삼)
    let mSino = m > 0 ? toSino(m) + " 분" : "";
    let mNative = m > 0 ? toNative(m, false) + " 분" : ""; // 故意用固有詞考分鐘

    correctAns = `${hNativeMod} 시 ${mSino}`.trim();
    distractors.push(`${hSino} 시 ${mSino}`.trim()); // 陷阱：全漢字音
    distractors.push(`${hNativeFull} 시 ${mSino}`.trim()); // 陷阱：未縮寫固有詞
    if (m > 0) distractors.push(`${hNativeMod} 시 ${mNative}`.trim()); // 陷阱：分鐘用固有詞
    else distractors.push(`${hSino} 시`);
  } 
  else if (type === 1) {
    // 【數量與單位題】
    let units = [
      {u: "개", zh: "個"}, {u: "명", zh: "名"}, {u: "잔", zh: "杯"},
      {u: "병", zh: "瓶"}, {u: "권", zh: "本"}, {u: "송이", zh: "朵"}
    ];
    let randUnit = units[Math.floor(Math.random() * units.length)];
    // 故意選容易縮寫變形的數字 (1~4, 20) 以及幾個普通數字
    let counts = [1, 2, 3, 4, 5, 6, 10, 20];
    let c = counts[Math.floor(Math.random() * counts.length)];

    qText = `🛍️ ${c} ${randUnit.zh}`;

    correctAns = `${toNative(c, true)} ${randUnit.u}`;
    distractors.push(`${toSino(c)} ${randUnit.u}`); // 陷阱：漢字音
    distractors.push(`${toNative(c, false)} ${randUnit.u}`); // 陷阱：未縮寫固有詞
    
    let wrongNum = (c === 1) ? 2 : c - 1;
    distractors.push(`${toNative(wrongNum, true)} ${randUnit.u}`); // 陷阱：純粹數字錯
  } 
  else {
    // 【金額題】
    let prices = [1000, 2500, 5000, 10000, 35000, 50000];
    let p = prices[Math.floor(Math.random() * prices.length)];
    qText = `💰 ${p.toLocaleString()} 韓元`;

    correctAns = `${toSino(p)} 원`;
    distractors.push(`${toNative(p > 99 ? 50 : p, false)} 원`); // 陷阱：固有詞
    distractors.push(`${toSino(p * 10)} 원`); // 陷阱：多一個零
    let wrongP = p === 1000 ? 2000 : p - 1000;
    distractors.push(`${toSino(wrongP)} 원`); // 陷阱：數字錯
  }

  // 去除重複的干擾選項
  let uniqueOptions = new Set([correctAns]);
  for (let d of distractors) {
    if (d !== correctAns && d !== "") uniqueOptions.add(d);
    if (uniqueOptions.size === 4) break;
  }
  
  let optionsArr = Array.from(uniqueOptions);
  optionsArr.sort(() => Math.random() - 0.5); // 打亂順序

  currentNumQuestion = { q: qText, ans: correctAns, opts: optionsArr };

  // 渲染畫面
  document.getElementById('numQuizPrompt').innerText = qText;
  let box = document.getElementById('numQuizOptions');
  box.innerHTML = '';
  
  optionsArr.forEach(opt => {
    let btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.innerText = opt;
    btn.onclick = () => checkNumAnswer(btn, opt);
    box.appendChild(btn);
  });
}

function checkNumAnswer(btn, selectedStr) {
  // 鎖定所有按鈕
  document.querySelectorAll('#numQuizOptions .opt-btn').forEach(b => b.onclick = null);
  let msg = document.getElementById('numQuizMessage');
  let audioBtn = document.getElementById('numQuizAudioBtn');

  if (selectedStr === currentNumQuestion.ans) {
    btn.classList.add('correct', 'bounce-success');
    msg.style.color = 'var(--success)';
    msg.innerText = '🎉 漂亮！完全正確！';
    numQuizScore++;
    document.getElementById('numQuizScore').innerText = `得分：${numQuizScore}`;
  } else {
    btn.classList.add('wrong', 'shake');
    msg.style.color = 'var(--error)';
    msg.innerText = `❌ 哎呀掉進陷阱了！正確是：${currentNumQuestion.ans}`;

    // 把正確的按鈕標示出來
    document.querySelectorAll('#numQuizOptions .opt-btn').forEach(b => {
      if (b.innerText === currentNumQuestion.ans) b.classList.add('correct');
    });
  }
  
  // 顯示下一題按鈕與發音按鈕
  document.getElementById('numQuizNextBtn').style.display = 'block';
  audioBtn.style.display = 'inline-block';
  audioBtn.onclick = () => speakKorean(currentNumQuestion.ans);
}
