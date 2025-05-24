import { Anchor } from "./Anchor";
import { Delimeter } from "./Delimeter";
import { FigureStrategy } from "./FigureStrategy.enum";
import { Fragment } from "./Fragment";
import { PaintStrategy } from "./PaintStrategy.enum";
import { Point } from "./Point";
import { Rect } from "./Rect";
import { Stack } from "./Stack";

class FocusedInfo {
  nodeIdx: number;
  anchorIdx: number;

  constructor(nodeIdx: number, anchorIdx: number) {
    this.nodeIdx = nodeIdx;
    this.anchorIdx = anchorIdx;
  }
}

const nodeList: Node[] = [];
const nodeIdxMap = new Map<Node, number>();
const anchorMap = new Map<number, Anchor[]>();
const rectMap = new Map<Anchor, Rect[]>();
const floorSeperatedRectMap = new Map<Anchor, Rect[]>();
const nonSplitTagList: string[] = ["A", "B", "STRONG", "CODE", "SPAN", "SUP", "EM"];
const ignoreSplitTagList: string[] = ["SCRIPT", "#comment"];
const delimiters: Delimeter[] = [
  new Delimeter(". ", 1),
  new Delimeter("? ", 1),
  new Delimeter("! ", 1),
  new Delimeter(".\n", 1),
  new Delimeter(". ", 0),
];

let focusActive = false;
const focusedInfo = new FocusedInfo(0, 0);
let figureStrategy =
  FigureStrategy[(process.env.FIGURE_STRATEGY as keyof typeof FigureStrategy) ?? "UNDERLINE"];
let paintStrategy =
  PaintStrategy[(process.env.PAINT_STRATEGY as keyof typeof PaintStrategy) ?? "OUTLINE"];

const startDelayTime = 0;
const marginX = parseInt(process.env.MARGIN_X ?? "0");
const marginY = parseInt(process.env.MARGIN_Y ?? "0");
const fixedUnderlineLength = 20;
const floorMergeTestRange = 10;
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
  nodeIdxMap.set(node, nodeList.length - 1);

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
    if (
      child.nodeType != Node.TEXT_NODE &&
      !nonSplitTagList.includes(child.nodeName) &&
      !ignoreSplitTagList.includes(child.nodeName)
    ) {
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
      const firstFragmentNodeIdx = nodeIdxMap.get(fragmentBuffer[0].node)!;
      const lastFragmentNodeIdx = nodeIdxMap.get(fragmentBuffer[fragmentBuffer.length - 1].node)!;

      if (!anchorMap.get(firstFragmentNodeIdx)) {
        anchorMap.set(firstFragmentNodeIdx, []);
      }
      anchorMap
        .get(firstFragmentNodeIdx)!
        .push(
          new Anchor(
            firstFragmentNodeIdx,
            fragmentBuffer[0].idx,
            lastFragmentNodeIdx,
            fragmentBuffer[fragmentBuffer.length - 1].idx + 1
          )
        );
    }
    fragmentBuffer = [];
    stringBuffer = "";
  }

  // 마지막 문장이 프레임버퍼에 남아있을 수 있으므로 처리.
  if (fragmentBuffer.length > 0 && stringBuffer.trim()) {
    const firstFragmentNodeIdx = nodeIdxMap.get(fragmentBuffer[0].node)!;
    const lastFragmentNodeIdx = nodeIdxMap.get(fragmentBuffer[fragmentBuffer.length - 1].node)!;

    if (!anchorMap.has(firstFragmentNodeIdx)) {
      anchorMap.set(firstFragmentNodeIdx, []);
    }
    anchorMap
      .get(firstFragmentNodeIdx)!
      .push(
        new Anchor(
          firstFragmentNodeIdx,
          fragmentBuffer[0].idx,
          lastFragmentNodeIdx,
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
  const deleteAnchorsKeys: number[] = [];
  for (const entry of anchorMap.entries()) {
    const nodeIdx = entry[0];
    const anchors = entry[1];

    if (anchors.length == 0) {
      deleteAnchorsKeys.push(nodeIdx);
    }
  }
  for (const key of deleteAnchorsKeys) {
    anchorMap.delete(key);
  }

  // 초기 인덱스 지정.
  const firstNodeIdx = anchorMap.keys().next().value as number;
  focusedInfo.nodeIdx = firstNodeIdx;
  focusedInfo.anchorIdx = 0;

  for (const nodeIdx of anchorMap.keys()) {
    console.debug(`nodeList[${nodeIdx}]: anchorIndices=${anchorMap.get(nodeIdx)!}`);
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
  range.setStart(nodeList[anchor.startNodeIdx], anchor.startOffsetIdx);
  range.setEnd(nodeList[anchor.endNodeIdx], anchor.endOffsetIdx);

  if (typeof range.getClientRects !== "function") {
    console.warn("getClientRects를 지원하지 않는 환경입니다.");
    return [];
  }

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

function getFloorSeperatedRectsFromAnchor(anchor: Anchor): Rect[] {
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
      Math.abs((rect.top + rect.bottom) / 2 - (rects[i].top + rects[i].bottom) / 2) >
      floorMergeTestRange
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

function findFocusedInfoFromNode(node: Node, clickedPoint: Point): FocusedInfo | null {
  // 텍스트를 클릭해도 clickedTarget에는 텍스트 노드가 아니라 그 상위 노드가 담김.
  // 앵커를 가진 노드는 모두 텍스트 노드이므로, 모든 노드에 대해 자식 노드로부터 영역 내 클릭 위치가 있는 앵커 탐색.
  for (const childNode of node.childNodes) {
    if (childNode.hasChildNodes()) {
      const res = findFocusedInfoFromNode(childNode, clickedPoint);
      if (res) return res;
    }

    const anchors = anchorMap.get(nodeIdxMap.get(childNode)!);
    if (!anchors) continue;

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const rects = getFloorSeperatedRectsFromAnchor(anchor);

      for (const rect of rects) {
        if (
          clickedPoint.x >= rect.left &&
          clickedPoint.x <= rect.right &&
          clickedPoint.y >= rect.top &&
          clickedPoint.y <= rect.bottom
        ) {
          return new FocusedInfo(nodeIdxMap.get(childNode)!, i);
        }
      }
    }
  }

  return null;
}

function getFocusedInfoFromClickedNode(
  clickedNodeIdx: number,
  clickedPoint: Point
): FocusedInfo | null {
  let pNode: Node | null = nodeList[clickedNodeIdx];
  while (pNode && nonSplitTagList.includes(pNode.nodeName)) {
    pNode = pNode.parentNode;
  }
  if (!pNode) {
    return null;
  }

  const res = findFocusedInfoFromNode(pNode, clickedPoint);
  if (res) return res;

  // 만약 정확한 앵커를 찾지 못했다면, 근접한 앵커 정보라도 반환.
  for (let pNodeIdx = clickedNodeIdx; pNodeIdx < nodeList.length; pNodeIdx++) {
    if (anchorMap.has(pNodeIdx)) {
      return new FocusedInfo(pNodeIdx, 0);
    }
  }

  return null;
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

  if (paintStrategy == PaintStrategy.SPOTLIGHT) {
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
    if (paintStrategy == PaintStrategy.SPOTLIGHT) {
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
    // 다음 목적지가 현재 노드 내 앵커인덱스 리스트에 존재할 경우.
    if (
      focusedInfo.anchorIdx + dir >= 0 &&
      focusedInfo.anchorIdx + dir <= anchorMap.get(focusedInfo.nodeIdx)!.length - 1
    ) {
      focusedInfo.anchorIdx += dir;
      cnt--;
      continue;
    }

    // 다음 목적지가 현재 노드 내 앵커인덱스 리스트를 벗어나는 경우.
    let endOfNode = false;
    const nextfocusedInfo = new FocusedInfo(focusedInfo.nodeIdx, focusedInfo.anchorIdx);
    while (true) {
      if (
        nextfocusedInfo.nodeIdx + dir < 0 ||
        nextfocusedInfo.nodeIdx + dir > nodeList.length - 1
      ) {
        endOfNode = true;
        break;
      }

      if (!anchorMap.has(nextfocusedInfo.nodeIdx + dir)) {
        console.debug(`${nextfocusedInfo.nodeIdx + dir} doesn't have anchorIndices`);
        nextfocusedInfo.nodeIdx += dir;
        continue;
      }

      // 앵커인덱스를 가진 노드 발견하면 focus idx update.
      nextfocusedInfo.nodeIdx += dir;
      if (dir > 0) {
        nextfocusedInfo.anchorIdx = 0;
      }
      if (dir < 0) {
        nextfocusedInfo.anchorIdx = anchorMap.get(nextfocusedInfo.nodeIdx)!.length - 1;
      }
      break;
    }

    // 현재 노드가 마지막이라면 더 이상 이동하지 않고 종료.
    if (endOfNode) break;

    focusedInfo.nodeIdx = nextfocusedInfo.nodeIdx;
    focusedInfo.anchorIdx = nextfocusedInfo.anchorIdx;

    cnt--;
  }
}

function scrollToFocusedAnchor(): void {
  const focusedAnchor = anchorMap.get(focusedInfo.nodeIdx)![focusedInfo.anchorIdx];
  const firstRectOfAnchor = rectMap.get(focusedAnchor)![0];

  scrollTo({
    top: firstRectOfAnchor.top - (window.innerHeight / 2 - firstRectOfAnchor.height / 2),
    behavior: "smooth",
  });
}

function updateFocusedNode(): void {
  if (!focusActive) return;

  console.debug(`focusedInfo.nodeIdx=${focusedInfo.nodeIdx}`);
  console.debug(`focusedInfo.anchorIdx=${focusedInfo.anchorIdx}`);

  const anchor = anchorMap.get(focusedInfo.nodeIdx)![focusedInfo.anchorIdx];

  console.debug(
    `anchorMap.get(${nodeList[focusedInfo.nodeIdx]}).length)=${
      anchorMap.get(focusedInfo.nodeIdx)!.length
    }`
  );
  console.debug(`anchor=${anchor}`);

  const rects = getFloorSeperatedRectsFromAnchor(anchor);

  clearAll();
  drawRects(rects);
}

function printInfo(node: Node): void {
  console.debug(`
    --- Node Info ---
    nodeIdx=${nodeIdxMap.get(node)}
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
  updateFocusedNode();
});

document.addEventListener("mouseup", function (e) {
  if (!focusActive) return;

  const clickedTarget = e.target;
  const clickedX = e.clientX + window.scrollX;
  const clickedY = e.clientY + window.scrollY;

  if (!clickedTarget || !(clickedTarget instanceof Node)) {
    console.debug("Type of clicked target is not 'Node'");
    return;
  }
  const clickedNode = clickedTarget as Node;
  printInfo(clickedNode as Node);

  let clickedNodeIdx = nodeIdxMap.get(clickedNode);
  if (!clickedNodeIdx) return;

  const res = getFocusedInfoFromClickedNode(clickedNodeIdx, new Point(clickedX, clickedY));
  if (!res) return;

  focusedInfo.nodeIdx = res.nodeIdx;
  focusedInfo.anchorIdx = res.anchorIdx;

  updateFocusedNode();
  scrollToFocusedAnchor();
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
  scrollToFocusedAnchor();
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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "get-figure") {
    sendResponse({ figure: figureStrategy.toString() });
  }
  if (msg.type === "set-figure") {
    figureStrategy = msg.figure;
  }
  if (msg.type === "get-paint") {
    sendResponse({ paint: paintStrategy.toString() });
  }
  if (msg.type === "set-paint") {
    paintStrategy = msg.paint;
  }
});
