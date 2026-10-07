// 定義教材檔案清單 (每兩課一個單位 + 特殊變化)
const DATA_FILES = [
  'data_1_2.json',
  'data_3_4.json',
  'data_5_6.json',
  'data_7_8.json',
  'data_9_10.json',
  'data_special.json'
];

async function initApp() {
  try {
    // 透過 Promise.allSettled 平行讀取，若後續檔案尚未建立也不會中斷
    const results = await Promise.allSettled(DATA_FILES.map(file => fetch(file)));
    const validResponses = results
      .filter(r => r.status === 'fulfilled' && r.value.ok)
      .map(r => r.value.json());

    const dataList = await Promise.all(validResponses);

    // 重置資料容器並自動合併
    appData = { lessons: [], questions: [], grammars: [], vocabularies: [] };
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
