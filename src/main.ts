import { ColorConfigItem } from './config/ColorConfigItem';
import { Config } from './config/Config';
import { DropdownConfigItem } from './config/DropdownConfigItem';
import { NumberConfigItem } from './config/NumberConfigItem';
import { Utils } from './Utils';
import { getReleaseNoteHtml } from './releaseNote';

// Main container elements
const mainContainer = document.getElementById('main-container')!;
const focusToggleButton = document.getElementById('focus-toggle')!;
const reloadButton = document.getElementById('reload')!;
const resetButton = document.getElementById('reset') as HTMLButtonElement;
const state = document.getElementById('state') as HTMLElement;
const releaseNoteButton = document.getElementById('release-note-button')!;

// Release Note elements
const releaseNoteContainer = document.getElementById('release-note-container')!;
const backToMainButton = document.getElementById('back-to-main')!;
const releaseNote = document.getElementById('release-note')!;

let activeHotkeyInputId: string | null = null;

const hotkeyConfigKeys = ['toggleHotkey', 'movePrevHotkey', 'moveNextHotkey'];

const keyDisplayMap: { [key: string]: string } = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

const storageKeyMap = Object.fromEntries(Object.entries(keyDisplayMap).map(([k, v]) => [v, k]));

function flash(text: string, error = false): void {
  state.textContent = text;
  state.style.color = error ? 'red' : 'green';

  setTimeout(() => {
    state.textContent = '';
    state.style.color = '';
  }, 5000);
}

function getStorageKey(eventKey: string): string {
  if (eventKey.length === 1 && eventKey.match(/[a-zA-Z]/)) {
    return eventKey.toUpperCase();
  }
  if (eventKey === ' ') {
    return 'Space';
  }
  return eventKey;
}

function formatHotkeyForDisplay(hotkey: string): string {
  return hotkey
    .split('+')
    .map((part) => keyDisplayMap[part] || part)
    .join('+');
}

function initHotkeySetup(buttonId: string, inputId: string) {
  const button = document.getElementById(buttonId) as HTMLButtonElement;
  const input = document.getElementById(inputId) as HTMLInputElement;

  button.addEventListener('click', () => {
    activeHotkeyInputId = input.id;
    input.value = 'Press a key combination...';
    input.focus();
  });

  input.addEventListener('keydown', (e) => {
    if (activeHotkeyInputId !== input.id) return;

    e.preventDefault();
    e.stopPropagation();

    const hotkeyParts: string[] = [];
    if (e.ctrlKey) hotkeyParts.push('Control');
    if (e.shiftKey) hotkeyParts.push('Shift');
    if (e.altKey) hotkeyParts.push('Alt');
    if (e.metaKey) hotkeyParts.push('Meta');

    let newHotkey = '';

    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      newHotkey = hotkeyParts.join('+');
      if (newHotkey) {
        input.value = newHotkey + '...';
      } else {
        input.value = 'Press a key combination...';
      }
      return;
    }

    const storageKey = getStorageKey(e.key);
    hotkeyParts.push(storageKey);
    newHotkey = hotkeyParts.join('+');

    if (newHotkey) {
      input.value = formatHotkeyForDisplay(newHotkey);
      saveConfigFromElements();
      activeHotkeyInputId = null;
      flash('Hotkey set successfully!');
    } else {
      flash('Invalid hotkey. Try again.', true);
    }
  });

  input.addEventListener('blur', () => {
    if (activeHotkeyInputId === input.id) {
      activeHotkeyInputId = null;
      loadStorageConfigs();
      flash('Hotkey setting cancelled.', true);
    }
  });
}

function updateIndicator(color: string) {
  focusToggleButton.style.backgroundColor = color;
  if (color === 'chartreuse') {
    focusToggleButton.style.color = '#333';
  } else {
    focusToggleButton.style.color = '#333';
  }
}

function checkRuntimeError(): boolean {
  if (chrome.runtime.lastError) {
    console.debug('No content script found or message failed:', chrome.runtime.lastError.message);
    return true;
  }
  return false;
}

async function checkForUpdates() {
  const { releaseNoteChecked } = await chrome.storage.local.get('releaseNoteChecked');
  const badge = releaseNoteButton.querySelector('.notification-badge') as HTMLElement;
  if (badge && !releaseNoteChecked) {
    badge.style.display = 'block';
  }
}

async function showReleaseNote() {
  releaseNote.innerHTML = await getReleaseNoteHtml();

  mainContainer.style.display = 'none';
  releaseNoteContainer.style.display = 'block';
  releaseNoteContainer.style.width = '600px';

  chrome.storage.local.set({ releaseNoteChecked: true });
  const badge = releaseNoteButton.querySelector('.notification-badge') as HTMLElement;
  if (badge) {
    badge.style.display = 'none';
  }
}

function showMainContent() {
  mainContainer.style.display = 'block';
  releaseNoteContainer.style.display = 'none';
}

// --- Event Listeners ---

focusToggleButton.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id!, { type: 'toggle-focus' }, (resp) => {
    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive ? 'chartreuse' : 'darkorange');
  });
});

reloadButton.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id!, { type: 'reload' }, (resp) => {
    if (checkRuntimeError()) return;
  });
});

releaseNoteButton.addEventListener('click', async () => {
  showReleaseNote();
});

backToMainButton.addEventListener('click', showMainContent);

resetButton.onclick = () => {
  loadConfigToElements(Config.default);
  chrome.storage.local.set({ config: Config.default });
  flash('✔ Reseted!');
};

chrome.storage.onChanged.addListener((change, area) => {
  if (area === 'local' && change.config) {
    loadStorageConfigs();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: 'get-focus-state' }, (resp) => {
    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive ? 'chartreuse' : 'darkorange');
  });

  loadStorageConfigs();
  checkForUpdates();

  const config = Config.default;
  for (const key of Object.keys(config) as (keyof Config)[]) {
    const element = document.getElementById(`config-${key}`);
    if (!element) continue;

    if (hotkeyConfigKeys.includes(key)) {
      continue;
    }

    if (config[key] instanceof DropdownConfigItem) {
      element.addEventListener('change', () => saveConfigFromElements());
    } else {
      element.addEventListener('input', () => saveConfigFromElements());
    }
  }

  initHotkeySetup('set-hotkey', 'config-toggleHotkey');
  initHotkeySetup('set-move-prev-hotkey', 'config-movePrevHotkey');
  initHotkeySetup('set-move-next-hotkey', 'config-moveNextHotkey');
});

function loadStorageConfigs() {
  chrome.storage.local.get('config').then(({ config }) => {
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
    const element = document.getElementById(`config-${key}`);
    if (!element) continue;

    if (hotkeyConfigKeys.includes(key)) {
      (element as HTMLInputElement).value = formatHotkeyForDisplay(config[key] as string);
    } else if (config[key] instanceof NumberConfigItem) {
      (element as HTMLInputElement).value = String(config[key].value);
    } else if (config[key] instanceof DropdownConfigItem) {
      (element as HTMLSelectElement).value = String(config[key].selected);
    } else if (config[key] instanceof ColorConfigItem) {
      (element as HTMLInputElement).value = config[key].selected;
    } else if (typeof config[key] === 'string') {
      (element as HTMLInputElement).value = config[key];
    }
  }
}

function saveConfigFromElements() {
  const config = Config.default;

  for (const key of Object.keys(config) as (keyof Config)[]) {
    const element = document.getElementById(`config-${key}`);
    if (!element) continue;

    if (hotkeyConfigKeys.includes(key)) {
      const displayValue = (element as HTMLInputElement).value;
      (config[key] as string) = displayValue
        .split('+')
        .map((part) => storageKeyMap[part] || part)
        .join('+');
    } else if (config[key] instanceof NumberConfigItem) {
      config[key].value = Utils.clamp(
        Number((element as HTMLInputElement).value),
        config[key].minValue,
        config[key].maxValue,
      );
    } else if (config[key] instanceof DropdownConfigItem) {
      config[key].selected = (element as HTMLSelectElement).value;
    } else if (config[key] instanceof ColorConfigItem) {
      config[key].selected = (element as HTMLInputElement).value;
    } else if (typeof config[key] === 'string') {
      (config[key] as string) = (element as HTMLInputElement).value;
    }
  }

  chrome.storage.local.set({ config: config });
}
