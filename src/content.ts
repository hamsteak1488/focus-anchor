import { Point } from "./Point";
import { Renderer } from "./Renderer";
import { FocusManager } from "./FocusManager";
import { Drawer } from "./draw/Drawer";
import { DrawStrategy } from "./draw/DrawStrategy.enum";
import { OutlineDrawer } from "./draw/OutlineDrawer";
import { FixedUnderlineDrawer } from "./draw/FixedUnderlineDrawer";
import { UnderlineDrawer } from "./draw/UnderlineDrawer";
import { MergedOutlineDrawer } from "./draw/MergedOutlineDrawer";
import { SpotlightDrawer } from "./draw/SpotlightDrawer";
import { ConfigManager } from "./config/ConfigManager";
import { AnchorDrawInfo } from "./AnchorDrawInfo";
import { FirstCharDrawer } from "./draw/FirstCharDrawer";
import { HighlighterDrawer } from "./draw/HighlighterDrawer";

const renderer = new Renderer();
const focusManager = new FocusManager();

const drawerMap = new Map<DrawStrategy, Drawer>([
  [DrawStrategy.Underline, new UnderlineDrawer()],
  [DrawStrategy.FixedUnderline, new FixedUnderlineDrawer()],
  [DrawStrategy.Outline, new OutlineDrawer()],
  [DrawStrategy.MergedOutline, new MergedOutlineDrawer()],
  [DrawStrategy.Spotlight, new SpotlightDrawer()],
  [DrawStrategy.FirstChar, new FirstCharDrawer()],
  [DrawStrategy.Highlighter, new HighlighterDrawer()],
]);

let focusActive = false;
const config = ConfigManager.getInstance();

function init(): void {
  chrome.storage.local.get("config").then(({ config: loadedConfig }) => {
    if (loadedConfig) {
      config.assignProperties(loadedConfig);
    }
  });

  focusManager.init();
  renderer.updateCanvasSize();
  renderer.updateCanvasZIndex(focusManager.maxZIndex + 1);
}

function activateFocus(): void {
  init();
}
function deactivateFocus(): void {
  renderer.clearCanvas();
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

  drawer.draw(renderer, new AnchorDrawInfo(sentenceRects, firstCharRect));
}

let drawScheduled = false;
function registerDrawSchedule(): void {
  if (drawScheduled) return;
  drawScheduled = true;

  requestAnimationFrame(() => {
    drawFocusAnchor();
    drawScheduled = false;
  });
}

window.addEventListener("resize", () => {
  if (!focusActive) return;

  renderer.updateCanvasSize();
  registerDrawSchedule();
});

document.addEventListener(
  "scroll",
  function (e) {
    if (!focusActive) return;
    registerDrawSchedule();
  },
  true
);

document.addEventListener("mouseup", function (e) {
  if (!focusActive) return;

  const clickedTarget = e.target;
  const clickedX = e.clientX;
  const clickedY = e.clientY;

  if (!clickedTarget || !(clickedTarget instanceof Node)) {
    console.debug("Type of clicked target is not 'Node'");
    return;
  }
  const clickedNode = clickedTarget as Node;
  // focusManager.printInfo(clickedNode as Node);

  const focusMoved = focusManager.moveFocusFromClickInfo(
    clickedNode,
    new Point(clickedX, clickedY)
  );
  if (!focusMoved) return;

  if (!focusManager.existsAnchorRects()) return;

  registerDrawSchedule();
  focusManager.scrollToFocusedAnchor();
});

function isFocusedOnEditableNode(): boolean {
  switch (document.activeElement?.nodeName) {
    case "input":
    case "textarea":
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

document.addEventListener("keydown", function (e) {
  if (!focusActive) return;
  if (isFocusedOnEditableNode()) return;

  let moveDir = 0;

  switch (e.key) {
    case "ArrowUp":
      moveDir = -1;
      break;
    case "ArrowDown":
      moveDir = 1;
      break;
    case "ArrowLeft":
      moveDir = -1;
      break;
    case "ArrowRight":
      moveDir = 1;
      break;
    default:
      return;
  }

  e.preventDefault();

  const movedOnce = focusManager.moveFocus(moveDir);
  if (!movedOnce) return;
  while (!focusManager.existsAnchorRects()) {
    const moved = focusManager.moveFocus(moveDir);
    if (!moved) break;
  }

  registerDrawSchedule();
  focusManager.scrollToFocusedAnchor();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "toggle-focus") {
    focusActive = !focusActive;

    if (focusActive) {
      document.documentElement.classList.add("focus-anchor__active");
      activateFocus();
    } else {
      document.documentElement.classList.remove("focus-anchor__active");
      deactivateFocus();
    }
    sendResponse({ isActive: focusActive });
  }
  if (msg.type === "get-focus-state") {
    sendResponse({ isActive: focusActive });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "reload") {
    init();
  }
});

chrome.storage.onChanged.addListener((change, area) => {
  if (area === "local" && change.config) {
    config.assignProperties(change.config.newValue);
    if (focusActive) {
      registerDrawSchedule();
      focusManager.scrollToFocusedAnchor();
    }
  }
});
