import { FigureStrategy } from "./FigureStrategy.enum";
import { Config } from "./Config";
import { PaintStrategy } from "./PaintStrategy.enum";
import { Point } from "./Point";
import { Rect } from "./Rect";
import { Renderer } from "./Renderer";
import { FocusManager } from "./FocusManager";

const renderer = new Renderer();
const focusManager = new FocusManager();

let focusActive = false;
let config = new Config();

function init(): void {
  console.debug(`Started initializing.`);

  chrome.storage.sync.get("config").then(({ config: cfg }) => {
    if (!cfg) {
      config = new Config();
    } else {
      config = Object.assign<Config, string>(new Config(), cfg);
    }
  });

  renderer.updateCanvasSize();
  focusManager.config = config;
  focusManager.init();
}

function drawRects(rects: Rect[]): void {
  if (!rects || rects.length == 0) return;

  if (config.paintStrategy == PaintStrategy.SPOTLIGHT) {
    renderer.fillScreen("rgba(0, 0, 0, 0.5)");
  }

  if (config.figureStrategy == FigureStrategy.UNDERLINE) {
    console.log(rects);
    for (const rect of rects) {
      const polygonVertices: Point[] = [];
      polygonVertices.push(
        new Point(rect.left, rect.bottom + config.marginY),
        new Point(rect.right, rect.bottom + config.marginY)
      );
      renderer.drawPolygon(polygonVertices, "red");
    }
  }

  if (config.figureStrategy == FigureStrategy.UNDERLINE_FIXED) {
    const polygonVertices: Point[] = [];
    polygonVertices.push(
      new Point(rects[0].left, rects[0].bottom + config.marginY),
      new Point(rects[0].left + config.fixedUnderlineLength, rects[0].bottom + config.marginY)
    );
    renderer.drawPolygon(polygonVertices, "red");
  }

  if (config.figureStrategy == FigureStrategy.RECT) {
    const marginAppliedRects: Rect[] = [];
    for (const rect of rects) {
      const marginAppliedRect = Rect.from(rect);
      marginAppliedRect.x -= config.marginX;
      marginAppliedRect.y -= config.marginY;
      marginAppliedRect.width += config.marginX * 2;
      marginAppliedRect.height += config.marginY * 2;
      marginAppliedRects.push(marginAppliedRect);
    }
    if (config.paintStrategy == PaintStrategy.OUTLINE) {
      for (const marginAppliedRect of marginAppliedRects) {
        renderer.drawRectangle(marginAppliedRect, "red");
      }
    }
    if (config.paintStrategy == PaintStrategy.SPOTLIGHT) {
      for (const marginAppliedRect of marginAppliedRects) {
        renderer.clearRectangle(marginAppliedRect);
      }
    }
  }

  if (config.figureStrategy == FigureStrategy.RECT_MERGE) {
    // 폴리곤 정점 구성
    const leftVertices: Point[] = [];
    const rightVertices: Point[] = [];

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];

      leftVertices.push(new Point(rect.left, rect.top));
      rightVertices.push(new Point(rect.right, rect.top));

      leftVertices.push(new Point(rect.left, rect.bottom));
      rightVertices.push(new Point(rect.right, rect.bottom));

      if (i + 1 < rects.length) {
        const nextRect = rects[i + 1];

        // 충돌안하면 사각형 분리.
        if (rect.right < nextRect.left || rect.left > nextRect.right) {
          leftVertices[0].y -= config.marginY;
          leftVertices[leftVertices.length - 1].y += config.marginY;
          rightVertices[0].y -= config.marginY;
          rightVertices[rightVertices.length - 1].y += config.marginY;
          for (const v of leftVertices) {
            v.x -= config.marginX;
          }
          for (const v of rightVertices) {
            v.x += config.marginX;
          }

          const polygonVertices: Point[] = [];

          for (let i = 0; i < rightVertices.length; i++) {
            polygonVertices.push(rightVertices[i]);
          }
          for (let i = leftVertices.length - 1; i >= 0; i--) {
            polygonVertices.push(leftVertices[i]);
          }

          renderer.drawPolygon(polygonVertices, "red");

          leftVertices.splice(0, leftVertices.length);
          rightVertices.splice(0, rightVertices.length);
        }
        // 충돌할경우, 직각을 유지하기 위해 중간 Y값을 가진 정점 추가.
        else {
          const midY = (rect.y + rect.height + nextRect.y) / 2;

          leftVertices.push(new Point(rect.left, midY));
          leftVertices.push(new Point(nextRect.left, midY));
          rightVertices.push(new Point(rect.right, midY));
          rightVertices.push(new Point(nextRect.right, midY));
        }
      }
    }

    leftVertices[0].y -= config.marginY;
    leftVertices[leftVertices.length - 1].y += config.marginY;
    rightVertices[0].y -= config.marginY;
    rightVertices[rightVertices.length - 1].y += config.marginY;
    for (const v of leftVertices) {
      v.x -= config.marginX;
    }
    for (const v of rightVertices) {
      v.x += config.marginX;
    }

    const polygonVertices: Point[] = [];
    for (let i = 0; i < rightVertices.length; i++) {
      polygonVertices.push(rightVertices[i]);
    }
    for (let i = leftVertices.length - 1; i >= 0; i--) {
      polygonVertices.push(leftVertices[i]);
    }
    renderer.drawPolygon(polygonVertices, "red");
  }
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
  drawRects(rects);
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
    const newConfig = Object.assign(new Config(), change.config.newValue);
    config = newConfig;
  }
});
