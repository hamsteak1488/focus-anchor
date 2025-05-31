import { Config } from "./Config";

const focusToggleButton = document.getElementById("focus-toggle")!;
const reloadButton = document.getElementById("reload")!;
const configTextArea = document.getElementById("config") as HTMLTextAreaElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const resetButton = document.getElementById("reset") as HTMLButtonElement;
const state = document.getElementById("state") as HTMLElement;

function checkRuntimeError(): boolean {
  if (chrome.runtime.lastError) {
    console.debug("No content script found or message failed:", chrome.runtime.lastError.message);
    return true;
  }
  return false;
}

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "get-focus-state" }, (resp) => {
    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive);
  });
});

focusToggleButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "toggle-focus" }, (resp) => {
    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive);
  });
});

reloadButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "reload" }, (resp) => {
    if (checkRuntimeError()) return;
  });
});

function updateIndicator(active: boolean) {
  focusToggleButton.style.backgroundColor = active ? "chartreuse" : "darkorange";
}

// --- 로딩 ------------------------------------------------------------
chrome.storage.sync.get("config").then(({ config }) => {
  if (!config) {
    chrome.storage.sync.set({ config: new Config() });
    configTextArea.value = JSON.stringify(new Config(), null, 2);
  } else {
    const assignedConfig = Object.assign(new Config(), config);
    configTextArea.value = JSON.stringify(assignedConfig, null, 2);
  }
});

// --- 저장 ------------------------------------------------------------
function save() {
  try {
    const json = JSON.parse(configTextArea.value);
    chrome.storage.sync.set({ config: json });
    flash("✔ saved");
  } catch {
    flash("✖ JSON 오류", true);
  }
}
saveButton.onclick = save;

// --- 리셋 ------------------------------------------------------------
function reset() {
  configTextArea.value = JSON.stringify(new Config(), null, 2);
  try {
    const json = JSON.parse(configTextArea.value);
    chrome.storage.sync.set({ config: json });
    flash("✔ reseted");
  } catch {
    flash("✖ JSON 오류", true);
  }
}
resetButton.onclick = reset;

// --- 다른 탭·기기에서 변경 시 즉시 반영 ------------------------------
chrome.storage.onChanged.addListener((change, area) => {
  if (area === "sync" && change.config) {
    const assignedConfig = Object.assign(new Config(), change.config.newValue);
    configTextArea.value = JSON.stringify(assignedConfig, null, 2);
    flash("↻ reloaded");
  }
});

// --- 버튼에 잠깐 피드백 ---------------------------------------------
function flash(text: string, error = false): void {
  state.textContent = text;
  state.style.color = error ? "red" : "green";

  setTimeout(() => {
    state.textContent = "";
    state.style.color = "";
  }, 1500);
}
