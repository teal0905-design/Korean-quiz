/* =========================================
   數字轉換器邏輯 (numbers.js)
========================================= */

// 漢字音 (일, 이, 삼...)
const SINO = {
  0: "영", 1: "일", 2: "이", 3: "삼", 4: "사", 5: "오",
  6: "육", 7: "칠", 8: "팔", 9: "구", 10: "십",
  100: "백", 1000: "천", 10000: "만"
};

// 固有詞 (하나, 둘, 셋...)
const NATIVE = {
  1: "하나", 2: "둘", 3: "셋", 4: "넷", 5: "다섯",
  6: "여섯", 7: "일곱", 8: "여덟", 9: "아홉", 10: "열",
  20: "스물", 30: "서른", 40: "마흔", 50: "쉰"
};

// 固有詞遇到量詞的變形 (한, 두, 세, 네, 스무)
const NATIVE_MOD = {
  1: "한", 2: "두", 3: "세", 4: "네", 20: "스무"
};

let currentConverterMode = 'time';

// 數字轉漢字音 (支援到 99,999)
function toSino(num) {
  if (num === 0 || isNaN(num)) return "영";
  let res = "";
  const units = ["", "십", "백", "천", "만"];
  let strNum = num.toString().split("").reverse();
  for (let i = 0; i < strNum.length; i++) {
    let n = parseInt(strNum[i]);
    if (n !== 0) {
      let char = SINO[n];
      // 10, 100, 1000 不會唸 일십, 일백, 일천 (只有萬會唸 일만/만)
      if (n === 1 && i > 0 && i < 4) char = ""; 
      res = char + units[i] + " " + res;
    }
  }
  return res.trim();
}

// 數字轉固有詞 (支援到 99)
function toNative(num, useModifier = false) {
  if (num === 0 || isNaN(num)) return "영";
  if (num > 99) return toSino(num); // 超過99通常用漢字音
  
  let tens = Math.floor(num / 10) * 10;
  let ones = num % 10;
  let res = "";

  // 處理剛好是 20 的變形 (스무)
  if (useModifier && num === 20) return NATIVE_MOD[20];

  if (tens > 0) res += NATIVE[tens] + " ";
  if (ones > 0) {
    if (useModifier && NATIVE_MOD[ones]) res += NATIVE_MOD[ones];
    else res += NATIVE[ones];
  }
  return res.trim();
}

// 切換轉換器模式
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
  } else if (mode === 'count') {
    body.innerHTML = `
      <div class="num-input-group">
        <input type="number" id="inputCount" class="num-input" min="1" max="99" placeholder="數量" oninput="generateResult()"> 個
        <span style="color:#cbd5e1;">|</span>
        <input type="number" id="inputPrice" class="num-input" style="width:100px;" min="0" max="99999" step="1000" placeholder="金額" oninput="generateResult()"> 韓元
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

// 自動產生結果
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

  } else if (currentConverterMode === 'count') {
    let count = parseInt(document.getElementById('inputCount').value);
    let price = parseInt(document.getElementById('inputPrice').value);
    if (!count && price !== 0 && !price) return;

    let countStr = count ? `<span class="text-native">${toNative(count, true)}</span> <span class="text-unit">개</span>` : "";
    let priceStr = (price || price===0) ? `<span class="text-sino">${toSino(price)}</span> <span class="text-unit">원</span>` : "";
    
    finalKr = (count ? toNative(count, true) + " 개 " : "") + ((price||price===0) ? toSino(price) + " 원" : "");
    displayHtml = countStr + (count && (price||price===0) ? " / " : "") + priceStr;

  } else if (currentConverterMode === 'date') {
    let m = parseInt(document.getElementById('inputMonth').value);
    let d = parseInt(document.getElementById('inputDay').value);
    if (!m && !d) return;

    // 特殊月份：6月(유월)、10月(시월)
    let mKr = toSino(m);
    if (m === 6) mKr = "유";
    if (m === 10) mKr = "시";

    let mStr = m ? `<span class="text-sino">${mKr}</span> <span class="text-unit">월</span>` : "";
    let dStr = d ? `<span class="text-sino">${toSino(d)}</span> <span class="text-unit">일</span>` : "";
    
    finalKr = (m ? mKr + " 월 " : "") + (d ? toSino(d) + " 일" : "");
    displayHtml = mStr + " " + dStr;
  }

  // 渲染結果並綁定發音按鈕
  resBox.innerHTML = `
    <div class="result-kr">${displayHtml}</div>
    <button class="btn-audio" style="padding:6px 16px;" onclick="speakKorean('${finalKr}')">🔊 聽發音</button>
  `;
}

// 預設開啟時間模式
document.addEventListener('DOMContentLoaded', () => {
  switchConverter('time');
});
