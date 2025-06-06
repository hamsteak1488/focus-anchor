import { Config } from "./Config";
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

const renderer = new Renderer();
const focusManager = new FocusManager();

const drawerMap = new Map<DrawStrategy, Drawer>([
  [DrawStrategy.Underline, new UnderlineDrawer()],
  [DrawStrategy.FixedUnderline, new FixedUnderlineDrawer()],
  [DrawStrategy.Outline, new OutlineDrawer()],
  [DrawStrategy.MergedOutline, new MergedOutlineDrawer()],
  [DrawStrategy.Spotlight, new SpotlightDrawer()],
]);

let focusActive = false;
const config = Config.getInstance();

function init(): void {
  console.debug(`Started initializing.`);

  chrome.storage.sync.get("config").then(({ config: loadedConfig }) => {
    if (loadedConfig) {
      Object.assign<Config, string>(config, loadedConfig);
    }
  });

  renderer.updateCanvasSize();
  focusManager.config = config;
  focusManager.init();
}

function activateFocus(): void {
  init();
}
function deactivateFocus(): void {
  renderer.clearCanvas();
}

function drawFocusAnchor(): void {
  const rects = focusManager.getCurrentFocusRects();
  if (rects.length == 0) return;

  renderer.clearCanvas();

  const drawer = drawerMap.get(config.drawStrategy);

  if (!drawer) {
    console.warn(`Cannot found drawer`);
    return;
  }

  drawer.draw(renderer, rects);
}

let renderScheduled = false;
function rerender(): void {
  if (renderScheduled) return;
  renderScheduled = true;

  requestAnimationFrame(() => {
    drawFocusAnchor();
    renderScheduled = false;
  });
}

window.addEventListener("resize", () => {
  if (!focusActive) return;

  renderer.updateCanvasSize();
  rerender();
});

document.addEventListener(
  "scroll",
  function (e) {
    if (!focusActive) return;
    rerender();
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
  focusManager.printInfo(clickedNode as Node);

  const focusMoved = focusManager.moveFocusFromClickInfo(
    clickedNode,
    new Point(clickedX, clickedY)
  );
  if (!focusMoved) return;

  if (!focusManager.existsAnchorRects()) return;

  drawFocusAnchor();
  focusManager.scrollToFocusedAnchor();
});

document.addEventListener("keydown", function (e) {
  if (!focusActive) return;

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

  drawFocusAnchor();
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
  if (area === "sync" && change.config) {
    Object.assign(config, change.config.newValue);
  }
});
