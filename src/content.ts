import { Point } from './Point';
import { Renderer } from './Renderer';
import { FocusManager } from './FocusManager';
import { Drawer } from './draw/Drawer';
import { DrawStrategy } from './draw/DrawStrategy.enum';
import { OutlineDrawer } from './draw/OutlineDrawer';
import { FixedUnderlineDrawer } from './draw/FixedUnderlineDrawer';
import { UnderlineDrawer } from './draw/UnderlineDrawer';
import { MergedOutlineDrawer } from './draw/MergedOutlineDrawer';
import { SpotlightDrawer } from './draw/SpotlightDrawer';
import { ConfigManager } from './config/ConfigManager';
import { AnchorDrawInfo } from './AnchorDrawInfo';
import { FirstCharOutlineDrawer } from './draw/FirstCharOutlineDrawer';
import { HighlighterDrawer } from './draw/HighlighterDrawer';
import { FirstCharHighlighterDrawer } from './draw/FirstCharHighlighterDrawer';
import { BracketDrawer } from './draw/BracketDrawer';
import { DrawOption } from './draw/DrawOption';
import { Config } from './config/Config';
import { Idle } from 'idlejs';

const renderer = new Renderer();
const focusManager = new FocusManager();

const drawerMap = new Map<DrawStrategy, Drawer>([
  [DrawStrategy.Underline, new UnderlineDrawer()],
  [DrawStrategy.FixedUnderline, new FixedUnderlineDrawer()],
  [DrawStrategy.Outline, new OutlineDrawer()],
  [DrawStrategy.MergedOutline, new MergedOutlineDrawer()],
  [DrawStrategy.Spotlight, new SpotlightDrawer()],
  [DrawStrategy.FirstCharOutline, new FirstCharOutlineDrawer()],
  [DrawStrategy.Highlighter, new HighlighterDrawer()],
  [DrawStrategy.FirstCharHighlighter, new FirstCharHighlighterDrawer()],
  [DrawStrategy.Bracket, new BracketDrawer()],
]);

let idle: Idle;
let movedAfterFocus = false;
let lastMouseMoveClientX: number, lastMouseMoveClientY: number;

let focusActive = false;
const config = ConfigManager.getInstance();

async function init() {
  loadStorageConfigs();

  initIdle();

  renderer.updateCanvasZIndex(focusManager.maxZIndex + 1);

  update();
}

async function update() {
  focusManager.init();
  renderer.updateCanvasSize();
}

async function updateConfig(newConfig: any) {
  Config.assignProperties(config, newConfig);
  idle.within(config.focusOnCursorStayTimeMillis.value, 1);

  if (focusActive) {
    registerFrameDrawSchedule();
    focusManager.scrollToFocusedAnchor();
  }
}

function initIdle(): void {
  const idleTimeOutMillis = 700;

  idle = new Idle()
    .whenNotInteractive()
    .within(idleTimeOutMillis, 1)
    .do(() => {
      idleEvent();
    });
}

function activateFocus(): void {
  update();
  renderer.showToast('Focus activated', 1000, config.toastOption.selected, 'rgba(0, 128, 0, 0.5)');
  console.debug(`idle=${idle}`);
  idle.start();
}
function deactivateFocus(): void {
  renderer.clearCanvas();
  renderer.showToast(
    'Focus deactivated',
    1000,
    config.toastOption.selected,
    'rgba(196, 64, 0, 0.5)',
  );
  idle.stop();
}

function drawFocusAnchor(): void {
  const sentenceRects = focusManager.getSentenceRects();
  if (sentenceRects.length == 0) return;

  const firstCharRect = focusManager.getFirstCharRect();

  renderer.clearCanvas();

  const drawer = drawerMap.get(config.drawStrategy.selected);

  if (!drawer) {
    console.warn(`Cannot found drawer`);
    return;
  }

  const anchorDrawInfo = new AnchorDrawInfo(sentenceRects, firstCharRect);
  const drawOption = new DrawOption(
    config.drawColor.selected,
    config.opacity.value,
    config.lineWidth.value,
    config.borderRadius.value,
  );

  drawer.draw(renderer, anchorDrawInfo, drawOption);
}

let nextFrameDrawScheduled = false;
function registerFrameDrawSchedule(): void {
  if (nextFrameDrawScheduled) return;
  nextFrameDrawScheduled = true;

  requestAnimationFrame(() => {
    drawFocusAnchor();
    nextFrameDrawScheduled = false;
  });
}

window.addEventListener('resize', () => {
  if (!focusActive) return;

  renderer.updateCanvasSize();
  registerFrameDrawSchedule();
});

document.addEventListener(
  'scroll',
  function (e) {
    if (!focusActive) return;
    registerFrameDrawSchedule();
  },
  true,
);

document.addEventListener('mousemove', async function (e) {
  lastMouseMoveClientX = e.clientX;
  lastMouseMoveClientY = e.clientY;
  movedAfterFocus = true;
});

document.addEventListener('click', async function (e) {
  if (!e.target || !(e.target instanceof Element)) {
    console.debug("Type of clicked target is not 'Node'");
    return;
  }

  mouseFocus(e.target, e.clientX, e.clientY);
});

async function idleEvent() {
  if (config.useFocusOnCursorStay.selected === 'false') return;

  console.debug(`idle!`);

  if (!movedAfterFocus) {
    return;
  }

  const element = document.elementFromPoint(lastMouseMoveClientX, lastMouseMoveClientY);
  if (!element) {
    console.debug(
      `Return value of elementFromPoint(${lastMouseMoveClientX}, ${lastMouseMoveClientY}) is null.`,
    );
    return;
  }

  mouseFocus(element, lastMouseMoveClientX, lastMouseMoveClientY);
}

function isFocusedOnEditableNode(): boolean {
  switch (document.activeElement?.nodeName) {
    case 'input':
    case 'textarea':
      return true;
  }
  if (
    document.activeElement &&
    document.activeElement instanceof HTMLElement &&
    document.activeElement.isContentEditable
  ) {
    return true;
  }

  return false;
}

function isHotkeyMatch(event: KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey.split('+').map((p) => p.trim());
  let key = parts.pop(); // The last part is the key

  const modifiers = {
    control: parts.includes('Control'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
    meta: parts.includes('Meta'), // Command key on Mac
  };

  let eventKey = event.key;
  if (eventKey.length === 1 && eventKey.match(/[a-zA-Z]/)) {
    eventKey = eventKey.toUpperCase();
  }
  if (eventKey === ' ') {
    eventKey = 'Space';
  }

  return (
    eventKey === key &&
    event.ctrlKey === modifiers.control &&
    event.shiftKey === modifiers.shift &&
    event.altKey === modifiers.alt &&
    event.metaKey === modifiers.meta
  );
}

async function mouseFocus(targetElement: Element, clientX: number, clientY: number) {
  if (!focusActive) return;

  // focusManager.printInfo(clickedNode as Node);

  const focusMoved = focusManager.moveFocusFromClickInfo(
    targetElement,
    new Point(clientX, clientY),
  );
  if (!focusMoved) return;

  if (!focusManager.existsAnchorRects()) return;

  movedAfterFocus = false;

  registerFrameDrawSchedule();
  focusManager.scrollToFocusedAnchor();
}

function toggleFocus(): void {
  focusActive = !focusActive;

  if (focusActive) {
    document.documentElement.classList.add('focus-anchor__active');
    activateFocus();
  } else {
    document.documentElement.classList.remove('focus-anchor__active');
    deactivateFocus();
  }
}

function sendToggleFocus(): void {
  chrome.runtime.sendMessage({ type: 'request-toggle-focus' });
}

document.addEventListener('keydown', function (e) {
  if (isFocusedOnEditableNode()) return;

  if (isHotkeyMatch(e, config.toggleHotkey)) {
    e.preventDefault();
    sendToggleFocus();
    return;
  }

  if (!focusActive) return;

  let moveDir = 0;

  if (isHotkeyMatch(e, config.movePrevHotkey)) {
    moveDir = -1;
  }
  if (isHotkeyMatch(e, config.moveNextHotkey)) {
    moveDir = 1;
  }

  if (moveDir == 0) return;

  e.preventDefault();

  movedAfterFocus = false;

  // 만약 도착한 앵커에 렌더링할 사각형이 존재하지 않는다면 현재 위치가 유효한 지점이 아니라고 판단하고 다시 이동.
  const movedOnce = focusManager.moveFocus(moveDir);
  if (!movedOnce) return;
  while (!focusManager.existsAnchorRects()) {
    const moved = focusManager.moveFocus(moveDir);
    if (!moved) break;
  }

  registerFrameDrawSchedule();
  focusManager.scrollToFocusedAnchor();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'toggle-focus') {
    toggleFocus();
    sendResponse({ isActive: focusActive });
  }
  if (msg.type === 'get-focus-state') {
    sendResponse({ isActive: focusActive });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'reload') {
    update();
  }
});

chrome.storage.onChanged.addListener((change, area) => {
  if (area === 'local' && change.config) {
    if (change.config.newValue) {
      updateConfig(change.config.newValue);
    }
  }
});

async function loadStorageConfigs() {
  const { config: storedConfig } = await chrome.storage.local.get('config');
  if (storedConfig) {
    updateConfig(storedConfig);
  }
}

/*
debug.ts 테스트용.

document.addEventListener("DOMContentLoaded", function (e) {
  console.debug("hi!");
  activateFocus();
});
*/

init();
