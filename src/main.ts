import { ColorConfigItem } from "./config/ColorConfigItem";
import { Config } from "./config/Config";
import { DropdownConfigItem } from "./config/DropdownConfigItem";

const focusToggleButton = document.getElementById("focus-toggle")!;
const reloadButton = document.getElementById("reload")!;
const resetButton = document.getElementById("reset") as HTMLButtonElement;
const state = document.getElementById("state") as HTMLElement;
const setHotkeyButton = document.getElementById("set-hotkey") as HTMLButtonElement;
const toggleHotkeyInput = document.getElementById("config-toggleHotkey") as HTMLInputElement;

let isSettingHotkey = false;

function updateIndicator(color: string) {
  focusToggleButton.style.backgroundColor = color;
  if (color === "chartreuse") {
    focusToggleButton.style.color = "#333"; // Darker text for light background
  } else {
    focusToggleButton.style.color = "white"; // White text for dark background
  }
}

function flash(text: string, error = false): void {
  state.textContent = text;
  state.style.color = error ? "red" : "green";

  setTimeout(() => {
    state.textContent = "";
    state.style.color = "";
  }, 1500);
}

function checkRuntimeError(): boolean {
  if (chrome.runtime.lastError) {
    console.debug("No content script found or message failed:", chrome.runtime.lastError.message);
    return true;
  }
  return false;
}

setHotkeyButton.addEventListener("click", () => {
  isSettingHotkey = true;
  toggleHotkeyInput.value = "Press a key combination...";
  toggleHotkeyInput.focus();
  flash("Press a key combination to set hotkey.", false);
});

toggleHotkeyInput.addEventListener("keydown", (e) => {
  if (!isSettingHotkey) return;

  e.preventDefault();
  e.stopPropagation();

  const hotkeyParts: string[] = [];
  if (e.ctrlKey) hotkeyParts.push("Control");
  if (e.shiftKey) hotkeyParts.push("Shift");
  if (e.altKey) hotkeyParts.push("Alt");
  if (e.metaKey) hotkeyParts.push("Meta");

  let newHotkey = "";

  // If a non-modifier key is pressed, this is the final key in the combination
  if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
    let key = e.key;
    if (key === " ") {
      key = "Space";
    }
    hotkeyParts.push(key.toUpperCase());
    newHotkey = hotkeyParts.join("+");

    if (newHotkey) {
      toggleHotkeyInput.value = newHotkey;
      saveConfigFromElements();
      isSettingHotkey = false; // Hotkey is set, exit setting mode
      flash("Hotkey set successfully!");
    } else {
      flash("Invalid hotkey. Try again.", true);
    }
  } else {
    // Only modifier key is pressed, just update the display
    // Do not finalize the hotkey here, just show what's being held
    newHotkey = hotkeyParts.join("+");
    if (newHotkey) {
      toggleHotkeyInput.value = newHotkey + "..."; // Indicate waiting for more input
    } else {
      toggleHotkeyInput.value = "Press a key combination..."; // No modifiers held
    }
  }
});

toggleHotkeyInput.addEventListener("blur", () => {
  if (isSettingHotkey) {
    isSettingHotkey = false;
    loadConfigToElements(Config.default); // Revert to saved hotkey if not set
    flash("Hotkey setting cancelled.", true);
  }
});

focusToggleButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "toggle-focus" }, (resp) => {
    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive ? "chartreuse" : "darkorange");
  });
});

reloadButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "reload" }, (resp) => {
    if (checkRuntimeError()) return;
  });
});

function reset() {
  loadConfigToElements(Config.default);
  chrome.storage.local.set({ config: Config.default });

  flash("✔ Reseted!");
}
resetButton.onclick = reset;

chrome.storage.onChanged.addListener((change, area) => {
  if (area === "local" && change.config) {
    loadStorageConfigs();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "get-focus-state" }, (resp) => {
    console.debug(`sent and received "get-focus-state => ${resp.isActive}`);

    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive ? "chartreuse" : "darkorange");
  });

  loadStorageConfigs();

  const config = Config.default;
  for (const key of Object.keys(config) as (keyof Config)[]) {
    if (typeof config[key] === "number") {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      input.addEventListener("input", () => saveConfigFromElements());
    }
    if (config[key] instanceof DropdownConfigItem) {
      const select = document.getElementById(`config-${key}`) as HTMLSelectElement;
      select.addEventListener("change", () => saveConfigFromElements());
    }
    if (config[key] instanceof ColorConfigItem) {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      input.addEventListener("input", () => saveConfigFromElements());
    }
    if (key === "toggleHotkey") {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      input.addEventListener("input", () => saveConfigFromElements());
    }
  }
});

function loadStorageConfigs() {
  chrome.storage.local.get("config").then(({ config }) => {
    if (config) {
      const storageConfig = Config.from(config);
      loadConfigToElements(storageConfig);
    } else {
      loadConfigToElements(Config.default);
      saveConfigFromElements();
    }
  });
}

function loadConfigToElements(config: Config): void {
  for (const key of Object.keys(config) as (keyof Config)[]) {
    if (typeof config[key] === "number") {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      input.value = String(config[key]);
    }
    if (config[key] instanceof DropdownConfigItem) {
      const selectElement = document.getElementById(`config-${key}`) as HTMLSelectElement;
      for (const option of selectElement.options) {
        if (option.value === String(config[key].selected)) {
          option.selected = true;
        }
      }
    }
    if (config[key] instanceof ColorConfigItem) {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      input.value = config[key].selected;
    }
    if (key === "toggleHotkey") {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      input.value = config[key];
    }
  }

  // Ensure the hotkey input is updated after loading configs
  if (toggleHotkeyInput) {
    toggleHotkeyInput.value = config.toggleHotkey;
  }
}

function saveConfigFromElements() {
  const config = Config.default;

  for (const key of Object.keys(config) as (keyof Config)[]) {
    if (typeof config[key] === "number") {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      (config[key] as number) = Number(input.value);
    }
    if (config[key] instanceof DropdownConfigItem) {
      const selectElement = document.getElementById(`config-${key}`) as HTMLSelectElement;
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      config[key].selected = selectedOption.value;
    }
    if (config[key] instanceof ColorConfigItem) {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      config[key].selected = input.value;
    }
    if (key === "toggleHotkey") {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      (config[key] as string) = input.value;
    }
  }

  chrome.storage.local.set({ config: config });
}
