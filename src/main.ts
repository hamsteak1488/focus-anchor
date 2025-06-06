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

chrome.storage.sync.get("config").then(({ config }) => {
  if (!config) {
    chrome.storage.sync.set({ config: Config.defaultJson });
    configTextArea.value = Config.defaultJson;
  } else {
    const assignedConfig = Object.assign(JSON.parse(Config.defaultJson), config);
    configTextArea.value = JSON.stringify(assignedConfig, null, 2);
  }
});

function save() {
  try {
    const json = JSON.parse(configTextArea.value);
    chrome.storage.sync.set({ config: json });
    flash("✔ saved");
  } catch {
    flash("✖ JSON error", true);
  }
}
saveButton.onclick = save;

function reset() {
  configTextArea.value = Config.defaultJson;
  try {
    const json = JSON.parse(configTextArea.value);
    chrome.storage.sync.set({ config: json });
    flash("✔ reseted");
  } catch {
    flash("✖ JSON error", true);
  }
}
resetButton.onclick = reset;

chrome.storage.onChanged.addListener((change, area) => {
  if (area === "sync" && change.config) {
    const assignedConfig = Object.assign(JSON.parse(Config.defaultJson), change.config.newValue);
    configTextArea.value = JSON.stringify(assignedConfig, null, 2);
    flash("↻ reloaded");
  }
});

function flash(text: string, error = false): void {
  state.textContent = text;
  state.style.color = error ? "red" : "green";

  setTimeout(() => {
    state.textContent = "";
    state.style.color = "";
  }, 1500);
}
