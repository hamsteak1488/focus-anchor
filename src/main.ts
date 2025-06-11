import { Config } from "./config/Config";
import { DropdownConfigItem } from "./config/DropdownConfigItem";

const focusToggleButton = document.getElementById("focus-toggle")!;
const reloadButton = document.getElementById("reload")!;
const configContainer = document.getElementById("config-container")!;
const resetButton = document.getElementById("reset") as HTMLButtonElement;
const state = document.getElementById("state") as HTMLElement;

function updateIndicator(color: string) {
  focusToggleButton.style.backgroundColor = color;
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

function save() {
  const config = Config.default;

  for (const key of Object.keys(config) as (keyof Config)[]) {
    if (typeof config[key] === "number") {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      (config as any)[key] = Number(input.value);
    }
    if (typeof config[key] === "boolean") {
      const selectElement = document.getElementById(`config-${key}`) as HTMLSelectElement;
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      (config as any)[key] = selectedOption.value === "true";
    }
    if (config[key] instanceof DropdownConfigItem) {
      const selectElement = document.getElementById(`config-${key}`) as HTMLSelectElement;
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      (config[key] as DropdownConfigItem<any>).select(selectedOption.value);
    }
  }

  chrome.storage.local.set({ config: config });
}

function reset() {
  setConfigElementsValue(Config.default);
  chrome.storage.local.set({ config: Config.default });

  flash("✔ Reseted!");
}
resetButton.onclick = reset;

chrome.storage.onChanged.addListener((change, area) => {
  if (area === "local" && change.config) {
    const config = Config.default;
    Object.assign(config, change.config.newValue);
    setConfigElementsValue(config);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "get-focus-state" }, (resp) => {
    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive ? "chartreuse" : "darkorange");
  });

  createConfigElements();
  loadStorageConfigs();
});

function loadStorageConfigs() {
  chrome.storage.local.get("config").then(({ config }) => {
    if (config) {
      const storageConfig = Config.from(config);
      setConfigElementsValue(storageConfig);
    } else {
      setConfigElementsValue(Config.default);
      save();
    }
  });
}

function createConfigElements(): void {
  const config = Config.default;

  for (const key of Object.keys(config) as (keyof Config)[]) {
    const value = config[key];

    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      "border-radius": "5px 20px 5px 20px",
      padding: "10px",
    });

    const label = document.createElement("label");
    label.className = "form-label mb-0";
    label.textContent = key;
    wrapper.appendChild(label);

    if (typeof value == "number") {
      const input = document.createElement("input");
      input.className = "form-control";
      input.style.maxWidth = "8ch";
      input.id = `config-${key}`;
      input.type = "number";
      input.addEventListener("input", (e) => save());

      wrapper.appendChild(input);
    }
    if (typeof value == "boolean") {
      const select = document.createElement("select");
      select.id = `config-${key}`;
      select.className = "form-select w-auto";
      select.addEventListener("change", (e) => save());

      ["true", "false"].forEach((v) => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = v;
        select.appendChild(option);
      });

      wrapper.appendChild(select);
    }

    if (value instanceof DropdownConfigItem) {
      const select = document.createElement("select");
      select.className = "form-select w-auto";
      select.id = `config-${key}`;
      select.addEventListener("change", (e) => save());

      value.options.forEach((v) => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = v;
        select.appendChild(option);
      });
      wrapper.appendChild(select);
    }

    configContainer.appendChild(wrapper);
  }
}

function setConfigElementsValue(config: Config): void {
  for (const key of Object.keys(config) as (keyof Config)[]) {
    const value = config[key];

    if (typeof value === "number") {
      const input = document.getElementById(`config-${key}`) as HTMLInputElement;
      input.value = String(value);
    }
    if (typeof value === "boolean") {
      const selectElement = document.getElementById(`config-${key}`) as HTMLSelectElement;
      for (const option of selectElement.options) {
        if (option.value === String(value)) {
          option.selected = true;
        }
      }
    }
    if (value instanceof DropdownConfigItem) {
      const selectElement = document.getElementById(`config-${key}`) as HTMLSelectElement;
      for (const option of selectElement.options) {
        if (option.value === String(value.selected)) {
          option.selected = true;
        }
      }
    }
  }
}
