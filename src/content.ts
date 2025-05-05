import { clear } from "console";
import { Anchor } from "./Anchor";
import { Delimeter } from "./Delimeter";
import { FigureStrategy } from "./FigureStrategy.enum";
import { Fragment } from "./Fragment";
import { PaintStrategy } from "./PaintStrategy.enum";
import { Point } from "./Point";
import { Rect } from "./Rect";
import { Stack } from "./Stack";
import { CanvasHoleOverlay } from "./CanvasHoleOverlay";

const nodeList: Node[] = [];
const nodeIdxMap = new Map<Node, number>();
const anchorMap = new Map<Node, Anchor[]>();
const rectMap = new Map<Anchor, Rect[]>();
const floorSeperatedRectMap = new Map<Anchor, Rect[]>();
const nonSplitTagList: string[] = ["A", "B", "STRONG", "CODE", "SPAN"];
const ignoreSplitTagList: string[] = ["SCRIPT"];
const delimiters: Delimeter[] = [
  new Delimeter(". ", 1),
  new Delimeter("? ", 1),
  new Delimeter("! ", 1),
  new Delimeter(".\n", 1),
];

let focusActive = false;
let focusedNodeIdx = 0;
let focusedSentenceIdx = 0;
let figureStrategy =
  FigureStrategy[(process.env.FIGURE_STRATEGY as keyof typeof FigureStrategy) ?? "UNDERLINE"];
let paintStrategy =
  PaintStrategy[(process.env.PAINT_STRATEGY as keyof typeof PaintStrategy) ?? "OUTLINE"];

const startDelayTime = 0;
const marginX = parseInt(process.env.MARGIN_X ?? "0");
const marginY = parseInt(process.env.MARGIN_Y ?? "0");
const fixedUnderlineLength = 20;
const floorMergeTestReduction = 1;
const minRectArea = 100;

let fragmentListStack = new Stack<Fragment[]>();

let canvas = document.getElementById("overlay-canvas") as HTMLCanvasElement;
if (!canvas) {
  canvas = document.createElement("canvas");
  canvas.id = "overlay-canvas";
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);
}

const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function updateCanvasSize() {
  // document의 전체 scrollable 영역을 계산
  canvas.width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  canvas.height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
}
updateCanvasSize();

// const canvasHoleOverlay = new CanvasHoleOverlay(canvas, ctx, [new Rect(0, 0, 100, 100)], 1000);

function traversalPreOrder(node: Node): void {
  if (ignoreSplitTagList.includes(node.nodeName)) return;

  nodeList.push(node);

  // 탐색 대상이 텍스트 노드라면, 텍스트조각으로 분리해서 스택 최상단에 삽입.
  if (node.nodeType == Node.TEXT_NODE) {
    const trimmedContent = node.textContent?.trim();
    if (trimmedContent) {
      for (let i = 0; i < node.textContent!.length; i++) {
        fragmentListStack.peek().push(new Fragment(node.textContent![i], node, i));
      }
    }
    return;
  }

  // 비분리 태그가 아니라면 상위 노드와 분리가 필요하므로 스택에 새 리스트 추가.
  if (!nonSplitTagList.includes(node.nodeName)) {
    fragmentListStack.push([]);
  }

  node.childNodes.forEach((child) => {
    // console.debug(`start traversal = ${child.nodeName}`);
    traversalPreOrder(child);
    // console.debug(`end traversal = ${child.nodeName}`);

    // 만약 비분리 태그가 아니라면 텍스트 조각이 이어져 해석되면 안되므로 구분용 조각 추가.
    if (child.nodeType != Node.TEXT_NODE && !nonSplitTagList.includes(child.nodeName)) {
      fragmentListStack.peek().push(new Fragment("", child, -1));
    }
  });

  // 비분리 태그라면 상위 노드에서 해석해야하므로 반환.
  if (nonSplitTagList.includes(node.nodeName)) {
    return;
  }

  // 스택 최상단의 조각들을 이어붙여 해석.
  let fragmentList = fragmentListStack.pop();
  let fragmentBuffer: Fragment[] = [];
  let stringBuffer = "";
  for (const fragment of fragmentList) {
    if (fragment.idx != -1) {
      fragmentBuffer.push(fragment);
      stringBuffer += fragment.ch;
    }

    let needSplit = false;

    // 구분자를 통해 이어붙인 조각들이 문장으로 분리되어야 하는지 검사.
    for (const delimeter of delimiters) {
      if (delimeter.token.length > fragmentBuffer.length) continue;

      let matchSucceed = true;
      for (let i = 0; i < delimeter.token.length; i++) {
        if (
          delimeter.token[i] !=
          fragmentBuffer[fragmentBuffer.length - delimeter.token.length + i].ch
        ) {
          matchSucceed = false;
          break;
        }
      }

      if (matchSucceed) {
        let popCount = delimeter.token.length - delimeter.exclusiveStartIdx;
        console.debug(`popCount=${popCount}`);
        while (popCount--) {
          fragmentBuffer.pop();
        }

        needSplit = true;
        break;
      }
    }

    // 구분용 조각인 경우.
    if (fragment.idx == -1) {
      needSplit = true;
    }

    if (!needSplit) continue;

    // 노드의 앵커인덱스를 Map에 삽입.
    // 공백 문자뿐인 문장은 필요없으므로 검사.
    // 텍스트 없는 분리 태그가 첫번째 조각으로 오면 길이가 0일수도 있으므로 검사.
    if (fragmentBuffer.length > 0 && stringBuffer.trim()) {
      if (!anchorMap.get(fragmentBuffer[0].node)) {
        anchorMap.set(fragmentBuffer[0].node, []);
      }
      anchorMap
        .get(fragmentBuffer[0].node)!
        .push(
          new Anchor(
            fragmentBuffer[0].node,
            fragmentBuffer[0].idx,
            fragmentBuffer[fragmentBuffer.length - 1].node,
            fragmentBuffer[fragmentBuffer.length - 1].idx + 1
          )
        );
    }
    fragmentBuffer = [];
    stringBuffer = "";
  }

  // 마지막 문장이 프레임버퍼에 남아있을 수 있으므로 처리.
  if (fragmentBuffer.length > 0 && stringBuffer.trim()) {
    if (!anchorMap.has(fragmentBuffer[0].node)) {
      anchorMap.set(fragmentBuffer[0].node, []);
    }
    anchorMap
      .get(fragmentBuffer[0].node)!
      .push(
        new Anchor(
          fragmentBuffer[0].node,
          fragmentBuffer[0].idx,
          fragmentBuffer[fragmentBuffer.length - 1].node,
          fragmentBuffer[fragmentBuffer.length - 1].idx + 1
        )
      );
  }
}

function init(): void {
  traversalPreOrder(document.body);

  for (let i = 0; i < nodeList.length; i++) {
    nodeIdxMap.set(nodeList[i], i);
  }

  // 최소 영역 만족 못하는 앵커 제거.
  anchorMap.forEach((anchors, node) => {
    anchorMap.set(
      node,
      anchors.filter((anchor) => {
        return getRectsAreaOfAnchor(anchor) >= minRectArea;
      })
    );
  });

  // 빈 앵커리스트를 앵커맵에서 제거.
  const deleteAnchorsKeys: Node[] = [];
  for (const entry of anchorMap.entries()) {
    const node = entry[0];
    const anchors = entry[1];

    if (anchors.length == 0) {
      deleteAnchorsKeys.push(node);
    }
  }
  for (const key of deleteAnchorsKeys) {
    anchorMap.delete(key);
  }

  // 초기 인덱스 지정.
  const firstNode = anchorMap.keys().next().value as Node;
  focusedNodeIdx = nodeIdxMap.get(firstNode)!;
  focusedSentenceIdx = 0;

  for (const node of anchorMap.keys()) {
    console.debug(
      `nodeList[${nodeIdxMap.get(node)}]: anchorIndices=${anchorMap.get(node)!.map((anchor) => {
        return `(s=${anchor.startOffsetIdx},e=${anchor.endOffsetIdx})`;
      })}`
    );
  }
  console.debug(`nodeList.length=${nodeList.length}`);
}

function getRectFromDomRect(domRect: DOMRect): Rect {
  return new Rect(
    domRect.x + window.scrollX,
    domRect.y + window.scrollY,
    domRect.width,
    domRect.height
  );
}

function getRectsFromAnchor(anchor: Anchor): Rect[] {
  if (rectMap.has(anchor)) {
    return rectMap.get(anchor)!;
  }

  const range = document.createRange();
  range.setStart(anchor.startNode, anchor.startOffsetIdx);
  range.setEnd(anchor.endNode, anchor.endOffsetIdx);

  const domRects = range.getClientRects();
  if (!domRects || domRects.length == 0) {
    console.debug("getRectsFromAnchor: Failed to get client rects from a anchor");
    return [];
  }

  const rects: Rect[] = [];
  for (const domRect of domRects) {
    rects.push(getRectFromDomRect(domRect));
  }

  if (!rects || rects.length == 0) {
    console.debug("getRectsFromAnchor: Failed to get rects from domRects");
    return [];
  }

  rectMap.set(anchor, rects);

  return rects;
}

function getRectsAreaOfAnchor(anchor: Anchor): number {
  const rects = getRectsFromAnchor(anchor);

  let totalRectArea = 0;
  for (const rect of rects) {
    totalRectArea += rect.width * rect.height;
  }

  return totalRectArea;
}

function getFloorSeperatedRectsFromRects(anchor: Anchor): Rect[] {
  if (floorSeperatedRectMap.has(anchor)) {
    return floorSeperatedRectMap.get(anchor)!;
  }

  const rects = getRectsFromAnchor(anchor);

  rects.sort((a, b) => {
    return a.y - b.y;
  });

  const floorSeperatedRects: Rect[] = [rects[0]];
  // 같은 층 사각형 병합
  for (let i = 1; i < rects.length; i++) {
    const rect = floorSeperatedRects[floorSeperatedRects.length - 1];
    // 옆면이 겹치지 않는 경우: 바로 리스트에 추가.
    if (
      rect.bottom < rects[i].top + floorMergeTestReduction ||
      rect.top > rects[i].bottom - floorMergeTestReduction
    ) {
      floorSeperatedRects.push(rects[i]);
    }
    // 옆면이 겹치는 경우. 바운딩 사각형 추가.
    else {
      console.debug(
        `getFloorSeperatedRectsFromRects: Detected overlappnig rectangles, idx of rect is ${i}`
      );
      const newLeft = Math.min(rect.left, rects[i].left);
      const newTop = Math.min(rect.top, rects[i].top);
      const newRight = Math.max(rect.right, rects[i].right);
      const newBottom = Math.max(rect.bottom, rects[i].bottom);

      const newRect = new Rect(newLeft, newTop, newRight - newLeft, newBottom - newTop);
      floorSeperatedRects[floorSeperatedRects.length - 1] = newRect;
    }
  }

  floorSeperatedRectMap.set(anchor, floorSeperatedRects);

  return floorSeperatedRects;
}

function drawRectangle(rect: Rect, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function fillRectangle(rect: Rect, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function clearRectangle(rect: Rect) {
  ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
}

function drawPolygon(vertices: Point[], color: string): void {
  if (vertices.length == 0) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y);
  for (let i = 0; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawRects(rects: Rect[]): void {
  if (!rects || rects.length == 0) return;

  if (paintStrategy == PaintStrategy.HIGHLIGHT) {
    fillRectangle(new Rect(0, 0, canvas.width, canvas.height), "rgba(0, 0, 0, 0.5)");
  }

  if (figureStrategy == FigureStrategy.UNDERLINE) {
    console.log(rects);
    for (const rect of rects) {
      const polygonVertices: Point[] = [];
      polygonVertices.push(
        new Point(rect.left, rect.bottom + marginY),
        new Point(rect.right, rect.bottom + marginY)
      );
      drawPolygon(polygonVertices, "red");
    }
  }

  if (figureStrategy == FigureStrategy.UNDERLINE_FIXED) {
    const polygonVertices: Point[] = [];
    polygonVertices.push(
      new Point(rects[0].left, rects[0].bottom + marginY),
      new Point(rects[0].left + fixedUnderlineLength, rects[0].bottom + marginY)
    );
    drawPolygon(polygonVertices, "red");
  }

  if (figureStrategy == FigureStrategy.RECT) {
    const marginAppliedRects: Rect[] = [];
    for (const rect of rects) {
      const marginAppliedRect = Rect.from(rect);
      marginAppliedRect.x -= marginX;
      marginAppliedRect.y -= marginY;
      marginAppliedRect.width += marginX * 2;
      marginAppliedRect.height += marginY * 2;
      marginAppliedRects.push(marginAppliedRect);
    }
    if (paintStrategy == PaintStrategy.OUTLINE) {
      for (const marginAppliedRect of marginAppliedRects) {
        drawRectangle(marginAppliedRect, "red");
      }
    }
    if (paintStrategy == PaintStrategy.HIGHLIGHT) {
      // canvasHoleOverlay.moveToRects(marginAppliedRects);
      for (const marginAppliedRect of marginAppliedRects) {
        clearRectangle(marginAppliedRect);
      }
    }
  }

  if (figureStrategy == FigureStrategy.RECT_MERGE) {
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
          leftVertices[0].y -= marginY;
          leftVertices[leftVertices.length - 1].y += marginY;
          rightVertices[0].y -= marginY;
          rightVertices[rightVertices.length - 1].y += marginY;
          for (const v of leftVertices) {
            v.x -= marginX;
          }
          for (const v of rightVertices) {
            v.x += marginX;
          }

          const polygonVertices: Point[] = [];

          for (let i = 0; i < rightVertices.length; i++) {
            polygonVertices.push(rightVertices[i]);
          }
          for (let i = leftVertices.length - 1; i >= 0; i--) {
            polygonVertices.push(leftVertices[i]);
          }

          drawPolygon(polygonVertices, "red");

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

    leftVertices[0].y -= marginY;
    leftVertices[leftVertices.length - 1].y += marginY;
    rightVertices[0].y -= marginY;
    rightVertices[rightVertices.length - 1].y += marginY;
    for (const v of leftVertices) {
      v.x -= marginX;
    }
    for (const v of rightVertices) {
      v.x += marginX;
    }

    const polygonVertices: Point[] = [];
    for (let i = 0; i < rightVertices.length; i++) {
      polygonVertices.push(rightVertices[i]);
    }
    for (let i = leftVertices.length - 1; i >= 0; i--) {
      polygonVertices.push(leftVertices[i]);
    }
    drawPolygon(polygonVertices, "red");
  }
}

function clearAll(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function activateFocus(): void {
  updateFocusedNode();
}
function deactivateFocus(): void {
  clearAll();
}

function moveFocus(offset: number) {
  const dir = Math.sign(offset);
  let cnt = Math.abs(offset);

  while (cnt > 0) {
    const focusedNode = nodeList[focusedNodeIdx];

    // 다음 목적지가 현재 노드 내 앵커인덱스 리스트에 존재할 경우.
    if (
      focusedSentenceIdx + dir >= 0 &&
      focusedSentenceIdx + dir <= anchorMap.get(focusedNode)!.length - 1
    ) {
      focusedSentenceIdx += dir;
      cnt--;
      continue;
    }

    // 다음 목적지가 현재 노드 내 앵커인덱스 리스트를 벗어나는 경우.
    let endOfNode = false;
    let nextFosuedNodeIdx = focusedNodeIdx;
    let nextFocusedSentenceIdx = focusedSentenceIdx;
    while (true) {
      if (nextFosuedNodeIdx + dir < 0 || nextFosuedNodeIdx + dir > nodeList.length - 1) {
        endOfNode = true;
        break;
      }

      if (!anchorMap.has(nodeList[nextFosuedNodeIdx + dir])) {
        console.debug(`${nextFosuedNodeIdx + dir} doesn't have anchorIndices`);
        nextFosuedNodeIdx += dir;
        continue;
      }

      // 앵커인덱스를 가진 노드 발견하면 focus idx update.
      nextFosuedNodeIdx += dir;
      if (dir > 0) {
        nextFocusedSentenceIdx = 0;
      }
      if (dir < 0) {
        nextFocusedSentenceIdx = anchorMap.get(nodeList[nextFosuedNodeIdx])!.length - 1;
      }
      break;
    }

    // 현재 노드가 마지막이라면 더 이상 이동하지 않고 종료.
    if (endOfNode) break;

    focusedNodeIdx = nextFosuedNodeIdx;
    focusedSentenceIdx = nextFocusedSentenceIdx;

    cnt--;
  }
}

function updateFocusedNode(): void {
  if (!focusActive) return;

  console.debug(`focusedNodeIdx=${focusedNodeIdx}`);
  console.debug(`focusedSentenceIdx=${focusedSentenceIdx}`);

  const anchor = anchorMap.get(nodeList[focusedNodeIdx])![focusedSentenceIdx];

  console.debug(
    `anchorMap.get(${nodeList[focusedNodeIdx]}).length)=${
      anchorMap.get(nodeList[focusedNodeIdx])!.length
    }`
  );
  console.debug(`anchor=${anchor}`);
  console.debug(`getRectsAreaOfAnchor(anchor)=${getRectsAreaOfAnchor(anchor)}`);

  const rects = getFloorSeperatedRectsFromRects(anchor);

  clearAll();
  drawRects(rects);
}

function printInfo(node: Node): void {
  console.debug(`
    --- Node Info ---\n
    node.nodeType=${node.nodeType}
    node.nodeName=${node.nodeName}
    node.parentNode?.nodeType=${node.parentNode?.nodeType}
    node.parentNode?.nodeName=${node.parentNode?.nodeName}
    -------------`);
}

window.addEventListener(
  "load",
  () => {
    setTimeout(() => {
      init();
    }, startDelayTime);
  },
  { once: true }
);

window.addEventListener("resize", () => {
  updateCanvasSize();
  rectMap.clear();
  floorSeperatedRectMap.clear();
});

document.addEventListener("mouseup", function (e) {
  if (!focusActive) return;

  const clickedTarget = e.target;

  if (!clickedTarget || !(clickedTarget instanceof Node)) {
    console.debug("Type of clicked target is not 'Node'");
    return;
  }
  const clickedNode = clickedTarget as Node;
  printInfo(clickedNode as Node);

  let idx = nodeIdxMap.get(clickedNode);

  if (!idx) return;
  while (idx < nodeList.length && !anchorMap.has(nodeList[idx])) idx++;

  focusedNodeIdx = idx;
  focusedSentenceIdx = 0;
  updateFocusedNode();
});

document.addEventListener("keydown", function (e) {
  if (!focusActive) return;

  switch (e.key) {
    case "ArrowUp":
      moveFocus(-1);
      e.preventDefault();
      break;
    case "ArrowDown":
      moveFocus(1);
      e.preventDefault();
      break;
    case "ArrowLeft":
      moveFocus(-1);
      e.preventDefault();
      break;
    case "ArrowRight":
      moveFocus(1);
      e.preventDefault();
      break;
    default:
      return;
  }
  updateFocusedNode();
});

chrome.storage.local.get("focusActive", ({ focusActive: stored }) => {
  focusActive = stored ?? false;
  if (focusActive) {
    document.documentElement.classList.add("focus-anchor__active");
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "toggle-focus") {
    focusActive = !focusActive;

    if (focusActive) {
      document.documentElement.classList.add("focus-anchor__active");
      activateFocus();
    } else {
      document.documentElement.classList.remove("focus-anchor__active");
      deactivateFocus();
    }

    chrome.storage.local.set({ focusActive });

    sendResponse({ isActive: focusActive });
  } else if (msg.type === "get-focus-state") {
    sendResponse({ isActive: focusActive });
  }
});
