import { Anchor } from "./Anchor";
import { Delimeter } from "./Delimeter";
import { FigureStrategy } from "./FigureStrategy.enum";
import { Fragment } from "./Fragment";
import { Config } from "./Config";
import { PaintStrategy } from "./PaintStrategy.enum";
import { Point } from "./Point";
import { Rect } from "./Rect";
import { Stack } from "./Stack";
import { FocusInfo } from "./FocusInfo";
import { Renderer } from "./Renderer";

const renderer = new Renderer();

const nodeList: Node[] = [];
const nodeIdxMap = new Map<Node, number>();
const anchorMap = new Map<number, Anchor[]>();

const nonSplitTagList: string[] = ["A", "B", "STRONG", "CODE", "SPAN", "SUP", "EM"];
const ignoreSplitTagList: string[] = ["SCRIPT", "#comment", "MJX-CONTAINER"];
const delimiters: Delimeter[] = [
  new Delimeter(". ", 1),
  new Delimeter("? ", 1),
  new Delimeter("! ", 1),
  new Delimeter(".\n", 1),
  new Delimeter(". ", 0),
];

let focusActive = false;
const focusInfo = new FocusInfo(0, 0);
let config = new Config();

const floorMergeTestRange = 10;
const minRectArea = 100;

function extractAnchorsFromFragments(fragmentList: Fragment[]) {
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

function traversalPreOrder(node: Node, fragmentListStack: Stack<Fragment[]>): void {
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
    traversalPreOrder(child, fragmentListStack);

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
  extractAnchorsFromFragments(fragmentList);
}

function init(): void {
  console.debug(`Started initializing.`);

  chrome.storage.sync.get("config").then(({ config: cfg }) => {
    if (!cfg) {
      config = new Config();
    } else {
      config = Object.assign<Config, string>(new Config(), cfg);
    }
  });

  nodeList.splice(0, nodeList.length);
  nodeIdxMap.clear();
  anchorMap.clear();

  renderer.updateCanvasSize();

  traversalPreOrder(document.body, new Stack<Fragment[]>());

  for (let i = 0; i < nodeList.length; i++) {
    nodeIdxMap.set(nodeList[i], i);
  }

  // 최소 영역 만족 못하거나 보이지 않는 앵커 제거.
  anchorMap.forEach((anchors, node) => {
    anchorMap.set(
      node,
      anchors.filter((anchor) => {
        const node = nodeList[anchor.startNodeIdx];
        const parentElement = node.parentElement!;
        const style = getComputedStyle(parentElement);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          parseFloat(style.opacity) === 0 ||
          parseFloat(style.width) * parseFloat(style.height) < minRectArea ||
          parentElement.hasAttribute("hidden") ||
          parentElement.getAttribute("aria-hidden") === "true" ||
          getRectsAreaOfAnchor(anchor) < minRectArea
        ) {
          return false;
        }
        return true;
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
  for (const nodeIdx of deleteAnchorsKeys) {
    anchorMap.delete(nodeIdx);
  }

  // 초기 인덱스 지정.
  const firstNodeIdx = anchorMap.keys().next().value as number;
  focusInfo.nodeIdx = firstNodeIdx;
  focusInfo.anchorIdx = 0;

  // for (const nodeIdx of anchorMap.keys()) {
  //   console.debug(`nodeList[${nodeIdx}]: anchorIndices=${anchorMap.get(nodeIdx)!}`);
  // }
  console.debug(`nodeList.length=${nodeList.length}`);
}

function getRectFromDomRect(domRect: DOMRect): Rect {
  return new Rect(domRect.x, domRect.y, domRect.width, domRect.height);
}

function getRectsFromAnchor(anchor: Anchor): Rect[] {
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
    console.warn("getRectsFromAnchor: Failed to get rects from domRects");
    return [];
  }

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
  const rects = getRectsFromAnchor(anchor);

  if (rects.length == 0) {
    console.debug("getFloorSeperatedRectsFromAnchor: Failed to get rects from getRectsFromAnchor");
    return [];
  }

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
      // console.debug(`getFloorSeperatedRectsFromRects: Detected overlappnig rectangles, idx of rect is ${i}`);
      const newLeft = Math.min(rect.left, rects[i].left);
      const newTop = Math.min(rect.top, rects[i].top);
      const newRight = Math.max(rect.right, rects[i].right);
      const newBottom = Math.max(rect.bottom, rects[i].bottom);

      const newRect = new Rect(newLeft, newTop, newRight - newLeft, newBottom - newTop);
      floorSeperatedRects[floorSeperatedRects.length - 1] = newRect;
    }
  }

  return floorSeperatedRects;
}

function findFocusedInfoFromNode(node: Node, clickedPoint: Point): FocusInfo | null {
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
          return new FocusInfo(nodeIdxMap.get(childNode)!, i);
        }
      }
    }
  }

  return null;
}

function getFocusedInfoFromClickedNode(
  clickedNodeIdx: number,
  clickedPoint: Point
): FocusInfo | null {
  let pNode: Node | null = nodeList[clickedNodeIdx];
  while (pNode && nonSplitTagList.includes(pNode.nodeName)) {
    pNode = pNode.parentNode;
  }
  if (!pNode) {
    return null;
  }

  const res = findFocusedInfoFromNode(pNode, clickedPoint);
  if (res) return res;

  if (config.strictClickDetection) return null;

  // 만약 정확한 앵커를 찾지 못했다면, 근접한 앵커 정보라도 반환.
  for (let pNodeIdx = clickedNodeIdx; pNodeIdx < nodeList.length; pNodeIdx++) {
    if (anchorMap.has(pNodeIdx)) {
      return new FocusInfo(pNodeIdx, 0);
    }
  }

  return null;
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

function moveFocus(offset: number): boolean {
  const dir = Math.sign(offset);
  let cnt = Math.abs(offset);

  while (cnt > 0) {
    // 다음 목적지가 현재 노드 내 앵커인덱스 리스트에 존재할 경우.
    if (
      focusInfo.anchorIdx + dir >= 0 &&
      focusInfo.anchorIdx + dir <= anchorMap.get(focusInfo.nodeIdx)!.length - 1
    ) {
      focusInfo.anchorIdx += dir;
      cnt--;
      continue;
    }

    // 다음 목적지가 현재 노드 내 앵커인덱스 리스트를 벗어나는 경우.
    let endOfNode = false;
    const nextfocusInfo = new FocusInfo(focusInfo.nodeIdx, focusInfo.anchorIdx);
    while (true) {
      if (nextfocusInfo.nodeIdx + dir < 0 || nextfocusInfo.nodeIdx + dir > nodeList.length - 1) {
        endOfNode = true;
        break;
      }

      if (!anchorMap.has(nextfocusInfo.nodeIdx + dir)) {
        // console.debug(`${nextfocusInfo.nodeIdx + dir} doesn't have anchorIndices`);
        nextfocusInfo.nodeIdx += dir;
        continue;
      }

      // 앵커인덱스를 가진 노드 발견하면 focus idx update.
      nextfocusInfo.nodeIdx += dir;
      if (dir > 0) {
        nextfocusInfo.anchorIdx = 0;
      }
      if (dir < 0) {
        nextfocusInfo.anchorIdx = anchorMap.get(nextfocusInfo.nodeIdx)!.length - 1;
      }
      break;
    }

    // 현재 노드가 마지막이라면 더 이상 이동하지 않고 종료.
    if (endOfNode) return false;

    focusInfo.nodeIdx = nextfocusInfo.nodeIdx;
    focusInfo.anchorIdx = nextfocusInfo.anchorIdx;

    cnt--;
  }

  return true;
}

function isScrollable(node: HTMLElement): boolean {
  const overflowY = getComputedStyle(node).overflowY;
  return (overflowY === "scroll" || overflowY === "auto") && node.scrollHeight > node.clientHeight;
}

function getOffsetYFromElementToAnchor(from: HTMLElement, to: Anchor): number {
  const range = document.createRange();
  range.setStart(nodeList[to.startNodeIdx], to.startOffsetIdx);
  range.setEnd(nodeList[to.endNodeIdx], to.endOffsetIdx);
  const toRect = range.getBoundingClientRect();
  const fromRect = from.getBoundingClientRect();

  return toRect.top - (from === document.scrollingElement ? 0 : fromRect.top);
}

function getOffsetYFromElementToElement(from: HTMLElement, to: HTMLElement): number {
  const toRect = to.getBoundingClientRect();
  const fromRect = from.getBoundingClientRect();

  return toRect.top - (from === document.scrollingElement ? 0 : fromRect.top);
}

function scrollToAnchor(anchor: Anchor, bias: number): void {
  const node = nodeList[anchor.startNodeIdx];

  let scrollParent = node.parentElement;
  while (scrollParent) {
    if (isScrollable(scrollParent)) break;
    scrollParent = scrollParent.parentElement;
  }

  if (!scrollParent || scrollParent === document.body) {
    scrollParent = document.scrollingElement as HTMLElement;
  }

  const biasOffset = scrollParent.clientHeight * bias * -1;
  const offsetY = getOffsetYFromElementToAnchor(scrollParent, anchor) + biasOffset;

  const maxScrollTop = scrollParent.scrollHeight - scrollParent.clientHeight;
  const availableIncreaseScrollAmount = maxScrollTop - scrollParent.scrollTop;
  const availableDecreaseScrollAmount = scrollParent.scrollTop;
  const deficientScroll =
    offsetY > 0
      ? Math.max(0, offsetY - availableIncreaseScrollAmount)
      : Math.max(0, Math.abs(offsetY) - availableDecreaseScrollAmount) * -1;

  // console.debug(`biasOffset=${biasOffset}`);
  // console.debug(`deficientScroll=${deficientScroll}`);

  scrollParent.scrollBy({
    top: offsetY,
    behavior: config.scrollBehavior,
  });

  if (scrollParent !== document.scrollingElement) {
    scrollRecursively(scrollParent, deficientScroll);
  }
}

function scrollRecursively(element: HTMLElement, extraOffset: number): void {
  let scrollParent = element.parentElement;
  while (scrollParent) {
    if (isScrollable(scrollParent)) break;
    scrollParent = scrollParent.parentElement;
  }

  if (scrollParent === document.body) {
    scrollParent = document.scrollingElement as HTMLElement;
  }

  if (!scrollParent) return;

  const offsetY = getOffsetYFromElementToElement(scrollParent, element) + extraOffset;

  const maxScrollTop = scrollParent.scrollHeight - scrollParent.clientHeight;
  const availableIncreaseScrollAmount = maxScrollTop - scrollParent.scrollTop;
  const availableDecreaseScrollAmount = scrollParent.scrollTop;
  const deficientScroll =
    offsetY > 0
      ? Math.max(0, offsetY - availableIncreaseScrollAmount)
      : Math.max(0, Math.abs(offsetY) - availableDecreaseScrollAmount) * -1;

  // console.debug(`deficientScroll=${deficientScroll}`);

  scrollParent.scrollBy({
    top: offsetY,
    behavior: config.scrollBehavior,
  });

  if (scrollParent !== document.scrollingElement) {
    scrollRecursively(scrollParent, deficientScroll);
  }
}

function scrollToFocusedAnchor(): void {
  if (!config.autoScroll) return;

  const focusedAnchor = anchorMap.get(focusInfo.nodeIdx)![focusInfo.anchorIdx];

  scrollToAnchor(focusedAnchor, config.focusYBias);
}

function existsAnchorRects(): boolean {
  const anchor = anchorMap.get(focusInfo.nodeIdx)![focusInfo.anchorIdx];
  const rects = getFloorSeperatedRectsFromAnchor(anchor);
  return rects.length > 0;
}

function updateFocusedNode(): void {
  if (!focusActive) return;

  // console.debug(`focusInfo.nodeIdx=${focusInfo.nodeIdx}`);
  // console.debug(`focusInfo.anchorIdx=${focusInfo.anchorIdx}`);

  const anchor = anchorMap.get(focusInfo.nodeIdx)![focusInfo.anchorIdx];

  // console.debug(
  //   `anchorMap.get(${nodeList[focusInfo.nodeIdx]}).length)=${
  //     anchorMap.get(focusInfo.nodeIdx)!.length
  //   }`
  // );
  // console.debug(`anchor=${anchor}`);

  const rects = getFloorSeperatedRectsFromAnchor(anchor);

  if (rects.length == 0) return;

  renderer.clearCanvas();
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

let renderScheduled = false;
function rerender(): void {
  if (renderScheduled) return;
  renderScheduled = true;

  requestAnimationFrame(() => {
    updateFocusedNode();
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
  printInfo(clickedNode as Node);

  let clickedNodeIdx = nodeIdxMap.get(clickedNode);
  if (!clickedNodeIdx) return;

  const res = getFocusedInfoFromClickedNode(clickedNodeIdx, new Point(clickedX, clickedY));
  if (!res) return;

  focusInfo.nodeIdx = res.nodeIdx;
  focusInfo.anchorIdx = res.anchorIdx;

  if (!existsAnchorRects()) return;

  updateFocusedNode();
  scrollToFocusedAnchor();
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

  const movedOnce = moveFocus(moveDir);
  if (!movedOnce) return;
  while (!existsAnchorRects()) {
    const moved = moveFocus(moveDir);
    if (!moved) break;
  }

  updateFocusedNode();
  scrollToFocusedAnchor();
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
