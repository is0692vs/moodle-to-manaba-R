// デフォルト設定
const DEFAULT_COLORS = {
  emptyCellColor: "#ffffff",
  courseCellColor: "#f0f8ff",
  headerColor: "#e8f4f8",
  linkColor: "#0066cc",
  borderColor: "#c8d7e1",
};

// プリセット設定
const PRESETS = {
  purple: {
    emptyCellColor: "#ffffff",
    courseCellColor: "#f3e5f5",
    headerColor: "#e1bee7",
    linkColor: "#7b1fa2",
    borderColor: "#ce93d8",
  },
  pink: {
    emptyCellColor: "#ffffff",
    courseCellColor: "#fce4ec",
    headerColor: "#f8bbd0",
    linkColor: "#c2185b",
    borderColor: "#f48fb1",
  },
  blue: {
    emptyCellColor: "#ffffff",
    courseCellColor: "#e3f2fd",
    headerColor: "#bbdefb",
    linkColor: "#1976d2",
    borderColor: "#90caf9",
  },
  green: {
    emptyCellColor: "#ffffff",
    courseCellColor: "#e8f5e9",
    headerColor: "#c8e6c9",
    linkColor: "#388e3c",
    borderColor: "#a5d6a7",
  },
};

// 要素の取得
const colorInputs = {
  emptyCellColor: document.getElementById("emptyCellColor"),
  courseCellColor: document.getElementById("courseCellColor"),
  headerColor: document.getElementById("headerColor"),
  linkColor: document.getElementById("linkColor"),
  borderColor: document.getElementById("borderColor"),
};

const colorValues = {
  emptyCellColor: document.getElementById("emptyCellValue"),
  courseCellColor: document.getElementById("courseCellValue"),
  headerColor: document.getElementById("headerValue"),
  linkColor: document.getElementById("linkValue"),
  borderColor: document.getElementById("borderValue"),
};

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const status = document.getElementById("status");
const enabledToggle = document.getElementById("enabledToggle");
const clearCacheBtn = document.getElementById("clearCacheBtn");

// 設定を読み込み
async function loadSettings() {
  const result = await chrome.storage.sync.get(["timetableColors", "extensionEnabled"]);
  const colors = result.timetableColors || DEFAULT_COLORS;
  const enabled = result.extensionEnabled !== undefined ? result.extensionEnabled : true;

  Object.keys(colorInputs).forEach((key) => {
    colorInputs[key].value = colors[key];
    colorValues[key].textContent = colors[key];
  });
  
  enabledToggle.checked = enabled;
}

// 設定を保存
async function saveSettings() {
  const colors = {};
  Object.keys(colorInputs).forEach((key) => {
    colors[key] = colorInputs[key].value;
  });

  await chrome.storage.sync.set({ timetableColors: colors });

  // ステータス表示
  status.style.display = "block";
  setTimeout(() => {
    status.style.display = "none";
  }, 2000);

  // アクティブなタブに設定を適用
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "updateColors", colors });
    }
  } catch (error) {
    console.log("Could not update active tab:", error);
  }
}

// リセット
function resetSettings() {
  Object.keys(colorInputs).forEach((key) => {
    colorInputs[key].value = DEFAULT_COLORS[key];
    colorValues[key].textContent = DEFAULT_COLORS[key];
  });
}

// カラー入力の変更を監視
Object.keys(colorInputs).forEach((key) => {
  colorInputs[key].addEventListener("input", (e) => {
    colorValues[key].textContent = e.target.value;
  });
});

// プリセット適用
document.querySelectorAll(".preset-color").forEach((preset) => {
  preset.addEventListener("click", () => {
    const presetName = preset.dataset.preset;
    const colors = PRESETS[presetName];

    Object.keys(colors).forEach((key) => {
      colorInputs[key].value = colors[key];
      colorValues[key].textContent = colors[key];
    });
  });
});

// イベントリスナー
saveBtn.addEventListener("click", saveSettings);
resetBtn.addEventListener("click", resetSettings);

// ON/OFF切り替え
enabledToggle.addEventListener("change", async (e) => {
  const enabled = e.target.checked;
  await chrome.storage.sync.set({ extensionEnabled: enabled });
  
  // アクティブなタブに通知
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "toggleExtension", enabled });
    }
  } catch (error) {
    console.log("Could not update active tab:", error);
  }
  
  // ステータス表示
  status.textContent = enabled ? "機能を有効にしました" : "機能を無効にしました";
  status.style.display = "block";
  setTimeout(() => {
    status.style.display = "none";
  }, 2000);
});

// キャッシュクリア
clearCacheBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove("moodle_courses_cache");
  
  // アクティブなタブに通知
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "clearCache" });
    }
  } catch (error) {
    console.log("Could not update active tab:", error);
  }
  
  // ステータス表示
  status.textContent = "キャッシュをクリアしました";
  status.style.display = "block";
  setTimeout(() => {
    status.style.display = "none";
  }, 2000);
});

// 初期化
loadSettings();
