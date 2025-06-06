import { Config } from "./config/Config";
import { DropdownConfigItem } from "./config/DropdownConfigItem";
import { DrawStrategy } from "./draw/DrawStrategy.enum";

const focusToggleButton = document.getElementById("focus-toggle")!;
const reloadButton = document.getElementById("reload")!;
const configContainer = document.getElementById("config-container")!;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const resetButton = document.getElementById("reset") as HTMLButtonElement;
const state = document.getElementById("state") as HTMLElement;

function updateIndicator(active: boolean) {
  focusToggleButton.style.backgroundColor = active ? "chartreuse" : "darkorange";
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
    updateIndicator(resp.isActive);
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

  chrome.storage.sync.set({ config: config });
}
saveButton.onclick = save;

function reset() {
  setConfigElementsValue(Config.default);
  chrome.storage.sync.set({ config: Config.default });
}
resetButton.onclick = reset;

chrome.storage.onChanged.addListener((change, area) => {
  if (area === "sync" && change.config) {
    const config = Config.default;
    Object.assign(config, change.config.newValue);
    setConfigElementsValue(config);

    flash("↻ Changes have been applied");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "get-focus-state" }, (resp) => {
    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive);
  });

  createConfigElements();
  loadStorageConfigs();
});

function loadStorageConfigs() {
  chrome.storage.sync.get("config").then(({ config }) => {
    console.log(`typeof config = ${typeof config}`);
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
    const label = document.createElement("label");
    label.textContent = key;
    wrapper.appendChild(label);

    if (typeof value == "number") {
      const input = document.createElement("input");
      input.id = `config-${key}`;
      input.type = "number";

      wrapper.appendChild(input);
    }
    if (typeof value == "boolean") {
      const select = document.createElement("select");
      select.id = `config-${key}`;

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
      select.id = `config-${key}`;
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
  console.log(`setConfigElementsValue: config= ${JSON.stringify(config)}`);
  console.log(`setConfigElementsValue: typeof config = ${typeof config}`);

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
      console.log(`setConfigElementsValue: value.selected= ${JSON.stringify(value.selected)}`);
      for (const option of selectElement.options) {
        if (option.value === String(value.selected)) {
          option.selected = true;
        }
      }
    }
  }
}
