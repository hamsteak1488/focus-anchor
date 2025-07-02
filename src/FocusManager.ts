import { Anchor } from "./Anchor";
import { ConfigManager } from "./config/ConfigManager";
import { SimpleDelimitPattern } from "./SimpleDelimitPattern";
import { FocusInfo } from "./FocusInfo";
import { Fragment } from "./Fragment";
import { Point } from "./Point";
import { Rect } from "./Rect";
import { DelimitPattern } from "./DelimitPattern";

export class FocusManager {
  private nodeList: Node[] = [];
  private nodeIdxMap = new Map<Node, number>();
  private anchorMap = new Map<number, Anchor[]>();

  private nonSplitTagList: RegExp[] = [
    /^a$/i,
    /^b$/i,
    /^em$/i,
    /^font$/i,
    /^i$/i,
    /^mark$/i,
    /^s$/i,
    /^span$/i,
    /^strong$/i,
    /^sup$/i,
    /^sub$/i,
    /^u$/i,
  ];
  private ignoreTagList: RegExp[] = [/^script$/i, /^#comment$/i, /^code$/i];
  private ignoreClassList: RegExp[] = [/^mjx/i, /^MathJax/i];
  private delimitPatterns: DelimitPattern[] = [
    new DelimitPattern((str) => {
      const regexp = /\. /g;

      let execResult = regexp.exec(str);
      if (execResult == null) {
        return false;
      }
      const lastIndex = regexp.lastIndex;

      execResult = regexp.exec(str);
      if (execResult == null && /^[0-9]+\. /.test(str.substring(0, lastIndex))) {
        return false;
      }

      return true;
    }, 1),
    new SimpleDelimitPattern(/。/, 0),
    new SimpleDelimitPattern(/\.\n/, 1),
    new SimpleDelimitPattern(/\. /, 1),
    new SimpleDelimitPattern(/\? /, 1),
    new SimpleDelimitPattern(/\?\n/, 1),
    new SimpleDelimitPattern(/! /, 1),
    new SimpleDelimitPattern(/!\n/, 1),
    new SimpleDelimitPattern(/\n\n/, 1),
  ];

  private focusInfo = new FocusInfo(0, 0);
  private config = ConfigManager.getInstance();

  private floorMergeTestRange = 10;
  private minRectArea = 100;

  public maxZIndex = 9999;

  init() {
    this.nodeList.splice(0, this.nodeList.length);
    this.nodeIdxMap.clear();
    this.anchorMap.clear();

    this.traverseAndExtract(document.body, []);

    for (let i = 0; i < this.nodeList.length; i++) {
      this.nodeIdxMap.set(this.nodeList[i], i);
    }

    // 최소 영역 만족 못하거나 보이지 않는 앵커 제거.
    this.anchorMap.forEach((anchors, node) => {
      this.anchorMap.set(
        node,
        anchors.filter((anchor) => {
          if (this.getRectsAreaOfAnchor(anchor) < this.minRectArea) {
            return false;
          }
          return true;
        })
      );
    });

    // 빈 앵커리스트를 앵커맵에서 제거.
    const deleteAnchorsKeys: number[] = [];
    for (const entry of this.anchorMap.entries()) {
      const nodeIdx = entry[0];
      const anchors = entry[1];

      if (anchors.length == 0) {
        deleteAnchorsKeys.push(nodeIdx);
      }
    }
    for (const nodeIdx of deleteAnchorsKeys) {
      this.anchorMap.delete(nodeIdx);
    }

    // 초기 인덱스 지정.
    let firstNodeIdx = -1;
    for (const key of this.anchorMap.keys()) {
      if (firstNodeIdx == -1 || key < firstNodeIdx) {
        firstNodeIdx = key;
      }
    }
    this.focusInfo.nodeIdx = firstNodeIdx;
    this.focusInfo.anchorIdx = 0;

    // for (const nodeIdx of this.anchorMap.keys()) {
    //   console.debug(`nodeList[${nodeIdx}]`);
    //   for (const anchor of this.anchorMap.get(nodeIdx)!) {
    //     console.debug(`anchor=${anchor}`);
    //   }
    // }
    // console.debug(`nodeList.length=${this.nodeList.length}`);
  }

  private hasMatchingClass(element: Element, regexpList: RegExp[]): boolean {
    for (const regexp of regexpList) {
      let matched = false;
      element.classList.forEach((clazz) => {
        matched = matched || regexp.test(clazz);
      });
      if (matched) {
        return true;
      }
    }
    return false;
  }

  private shouldSplitOnNode(node: Node): boolean {
    return this.nonSplitTagList.some((regexp) => regexp.test(node.nodeName));
  }

  private shouldIgnoreNode(node: Node): boolean {
    if (this.ignoreTagList.some((regexp) => regexp.test(node.nodeName))) {
      return true;
    }
    if (node instanceof Element && this.hasMatchingClass(node, this.ignoreClassList)) {
      return true;
    }
    return false;
  }

  private updateMaxZIfElementZHigher(element: Element) {
    const zIndex = parseInt(getComputedStyle(element).zIndex);
    if (zIndex) {
      this.maxZIndex = Math.max(this.maxZIndex, zIndex);
    }
  }

  private extractTextFromNode(node: Node, fragmentList: Fragment[]) {
    const parentElement = node.parentElement!;
    const style = getComputedStyle(parentElement);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0 ||
      parseFloat(style.width) * parseFloat(style.height) < this.minRectArea ||
      parentElement.hasAttribute("hidden") ||
      parentElement.getAttribute("aria-hidden") === "true"
    ) {
      return;
    }

    // 텍스트 노드로부터 텍스트 조각 획득.
    const trimmedContent = node.textContent?.trim();
    if (trimmedContent) {
      for (let i = 0; i < node.textContent!.length; i++) {
        fragmentList.push(new Fragment(node.textContent![i], node, i));
      }
    }
    return;
  }

  private traverseAndExtract(element: Element, fragmentList: Fragment[]): void {
    element.childNodes.forEach((child) => {
      if (child instanceof Element) {
        this.updateMaxZIfElementZHigher(child);
      }

      if (this.shouldIgnoreNode(child)) {
        return;
      }

      this.nodeList.push(child);
      this.nodeIdxMap.set(child, this.nodeList.length - 1);

      // 탐색 대상이 텍스트 노드라면, 텍스트 조각으로 획득해서 스택 최상단에 삽입.
      if (child.nodeType == Node.TEXT_NODE) {
        this.extractTextFromNode(child, fragmentList);
        return;
      }

      if (!(child instanceof Element)) {
        console.debug(`element ${element.nodeName} is not instance of element`);
        return;
      }

      // 비분리 태그가 아니라면 상위 노드와 분리가 필요하므로 스택에 새 리스트 추가.
      if (this.shouldSplitOnNode(child)) {
        this.traverseAndExtract(child, fragmentList);
      } else {
        this.traverseAndExtract(child, []);
      }

      // 만약 비분리 태그가 아닐 경우 텍스트 조각이 이어져 해석되면 안되므로 구분용 조각 추가.
      if (!this.shouldSplitOnNode(child)) {
        fragmentList.push(new Fragment("", child, -1));
      }
    });

    // 비분리 태그라면 상위 노드에서 해석해야하므로 반환.
    if (this.shouldSplitOnNode(element)) {
      return;
    }

    // 스택 최상단의 조각들을 이어붙여 해석.
    this.extractAnchorFromFragments(fragmentList);
  }

  private extractAnchorFromFragments(fragmentList: Fragment[]) {
    let fragmentBuffer: Fragment[] = [];
    let stringBuffer = "";

    for (const fragment of fragmentList) {
      if (fragment.idx != -1) {
        fragmentBuffer.push(fragment);
        stringBuffer += fragment.ch;
      }

      let needSplit = false;

      // 구분자를 통해 이어붙인 조각들이 문장으로 분리되어야 하는지 검사.
      for (const delimitPattern of this.delimitPatterns) {
        let matchSucceed = delimitPattern.test(stringBuffer);

        if (matchSucceed) {
          let popCount = delimitPattern.exclusionCountFromEnd;
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
        const firstFragmentNodeIdx = this.nodeIdxMap.get(fragmentBuffer[0].node)!;
        const lastFragmentNodeIdx = this.nodeIdxMap.get(
          fragmentBuffer[fragmentBuffer.length - 1].node
        )!;

        if (!this.anchorMap.get(firstFragmentNodeIdx)) {
          this.anchorMap.set(firstFragmentNodeIdx, []);
        }
        this.anchorMap
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
      const firstFragmentNodeIdx = this.nodeIdxMap.get(fragmentBuffer[0].node)!;
      const lastFragmentNodeIdx = this.nodeIdxMap.get(
        fragmentBuffer[fragmentBuffer.length - 1].node
      )!;

      if (!this.anchorMap.has(firstFragmentNodeIdx)) {
        this.anchorMap.set(firstFragmentNodeIdx, []);
      }
      this.anchorMap
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

  private getRectFromDomRect(domRect: DOMRect): Rect {
    return new Rect(domRect.x, domRect.y, domRect.width, domRect.height);
  }

  private getRectsFromAnchor(anchor: Anchor): Rect[] {
    const range = document.createRange();
    range.setStart(this.nodeList[anchor.startNodeIdx], anchor.startOffsetIdx);
    range.setEnd(this.nodeList[anchor.endNodeIdx], anchor.endOffsetIdx);

    if (typeof range.getClientRects !== "function") {
      console.warn("getClientRects를 지원하지 않는 환경입니다.");
      return [];
    }

    const domRects = range.getClientRects();
    if (!domRects || domRects.length == 0) {
      // console.debug("getRectsFromAnchor: Failed to get client rects from a anchor");
      return [];
    }

    const rects: Rect[] = [];
    for (const domRect of domRects) {
      rects.push(this.getRectFromDomRect(domRect));
    }

    if (!rects || rects.length == 0) {
      console.warn("getRectsFromAnchor: Failed to get rects from domRects");
      return [];
    }

    return rects;
  }

  private getFirstCharRectFromAnchor(anchor: Anchor): Rect | null {
    const node = this.nodeList[anchor.startNodeIdx];
    if (!node.textContent) return null;

    let startOffset = anchor.startOffsetIdx;
    while (startOffset < anchor.endOffsetIdx) {
      const ch = node.textContent[startOffset];
      if (ch.trim().length == 0) {
        startOffset++;
      } else {
        break;
      }
    }

    if (startOffset == anchor.endOffsetIdx) return null;

    const range = document.createRange();
    range.setStart(node, startOffset);
    range.setEnd(node, startOffset + 1);

    if (typeof range.getClientRects !== "function") {
      console.warn("getClientRects를 지원하지 않는 환경입니다.");
      return null;
    }

    const domRects = range.getClientRects();
    if (!domRects || domRects.length == 0) {
      return null;
    }

    return this.getRectFromDomRect(domRects[0]);
  }

  private getRectsAreaOfAnchor(anchor: Anchor): number {
    const rects = this.getRectsFromAnchor(anchor);

    let totalRectArea = 0;
    for (const rect of rects) {
      totalRectArea += rect.width * rect.height;
    }

    return totalRectArea;
  }

  private getFloorSeperatedRectsFromAnchor(anchor: Anchor): Rect[] {
    const rects = this.getRectsFromAnchor(anchor);

    if (rects.length == 0) {
      console.debug(
        "getFloorSeperatedRectsFromAnchor: Failed to get rects from getRectsFromAnchor"
      );
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
        this.floorMergeTestRange
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

  private findFocusInfoFromClickInfo(node: Node, clickedPoint: Point): FocusInfo | null {
    // 텍스트를 클릭해도 clickedTarget에는 텍스트 노드가 아니라 그 상위 노드가 담김.
    // 앵커를 가진 노드는 모두 텍스트 노드이므로, 모든 노드에 대해 자식 노드로부터 영역 내 클릭 위치가 있는 앵커 탐색.
    for (const childNode of node.childNodes) {
      if (childNode.hasChildNodes()) {
        const res = this.findFocusInfoFromClickInfo(childNode, clickedPoint);
        if (res) return res;
      }

      const anchors = this.anchorMap.get(this.nodeIdxMap.get(childNode)!);
      if (!anchors) continue;

      for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];
        const rects = this.getFloorSeperatedRectsFromAnchor(anchor);

        for (const rect of rects) {
          if (
            clickedPoint.x >= rect.left &&
            clickedPoint.x <= rect.right &&
            clickedPoint.y >= rect.top &&
            clickedPoint.y <= rect.bottom
          ) {
            return new FocusInfo(this.nodeIdxMap.get(childNode)!, i);
          }
        }
      }
    }

    return null;
  }

  private getFocusInfoFromClickInfo(clickedNodeIdx: number, clickedPoint: Point): FocusInfo | null {
    let pNode: Node | null = this.nodeList[clickedNodeIdx];
    while (pNode && this.nonSplitTagList.some((regexp) => regexp.test(pNode!.nodeName))) {
      pNode = pNode.parentNode;
    }
    if (!pNode) {
      return null;
    }

    const res = this.findFocusInfoFromClickInfo(pNode, clickedPoint);
    if (res) return res;

    if (this.config.strictClickDetection.selected == "true") return null;

    // 만약 정확한 앵커를 찾지 못했다면, 근접한 앵커 정보라도 반환.
    for (let pNodeIdx = clickedNodeIdx; pNodeIdx < this.nodeList.length; pNodeIdx++) {
      if (this.anchorMap.has(pNodeIdx)) {
        return new FocusInfo(pNodeIdx, 0);
      }
    }

    return null;
  }

  moveFocusFromClickInfo(clickedNode: Node, clickedPoint: Point): boolean {
    let clickedNodeIdx = this.nodeIdxMap.get(clickedNode);
    if (!clickedNodeIdx) return false;

    const newFocusInfo = this.getFocusInfoFromClickInfo(clickedNodeIdx, clickedPoint);
    if (!newFocusInfo) return false;

    this.focusInfo = newFocusInfo;

    return true;
  }

  moveFocus(offset: number): boolean {
    const dir = Math.sign(offset);
    let cnt = Math.abs(offset);

    while (cnt > 0) {
      // 다음 목적지가 현재 노드 내 앵커인덱스 리스트에 존재할 경우.
      if (
        this.focusInfo.anchorIdx + dir >= 0 &&
        this.focusInfo.anchorIdx + dir <= this.anchorMap.get(this.focusInfo.nodeIdx)!.length - 1
      ) {
        this.focusInfo.anchorIdx += dir;
        cnt--;
        continue;
      }

      // 다음 목적지가 현재 노드 내 앵커인덱스 리스트를 벗어나는 경우.
      let endOfNode = false;
      const nextfocusInfo = new FocusInfo(this.focusInfo.nodeIdx, this.focusInfo.anchorIdx);
      while (true) {
        if (
          nextfocusInfo.nodeIdx + dir < 0 ||
          nextfocusInfo.nodeIdx + dir > this.nodeList.length - 1
        ) {
          endOfNode = true;
          break;
        }

        if (!this.anchorMap.has(nextfocusInfo.nodeIdx + dir)) {
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
          nextfocusInfo.anchorIdx = this.anchorMap.get(nextfocusInfo.nodeIdx)!.length - 1;
        }
        break;
      }

      // 현재 노드가 마지막이라면 더 이상 이동하지 않고 종료.
      if (endOfNode) return false;

      this.focusInfo.nodeIdx = nextfocusInfo.nodeIdx;
      this.focusInfo.anchorIdx = nextfocusInfo.anchorIdx;

      cnt--;
    }

    return true;
  }

  private isScrollable(node: HTMLElement): boolean {
    const overflowY = getComputedStyle(node).overflowY;
    return (
      (overflowY === "scroll" || overflowY === "auto") && node.scrollHeight > node.clientHeight
    );
  }

  private getAnchorBoundingRect(anchor: Anchor): Rect {
    const range = document.createRange();
    range.setStart(this.nodeList[anchor.startNodeIdx], anchor.startOffsetIdx);
    range.setEnd(this.nodeList[anchor.endNodeIdx], anchor.endOffsetIdx);
    return range.getBoundingClientRect();
  }

  private scrollToAnchor(anchor: Anchor, bias: number): void {
    const node = this.nodeList[anchor.startNodeIdx];
    const anchorRect = this.getAnchorBoundingRect(anchor);

    let scrollParent = node.parentElement;
    while (scrollParent) {
      if (this.isScrollable(scrollParent)) break;
      /*
        포커스 노드의 스크롤 부모를 찾기 전에 fixed 속성을 가진 노드를 만났다면
        스크롤 부모의 스크롤을 이동해도 포커스 노드의 위치는 변하지 않으므로 스크롤 취소.
      */
      if (getComputedStyle(scrollParent).position == "fixed") return;
      scrollParent = scrollParent.parentElement;
    }

    if (scrollParent === document.body || !scrollParent) {
      scrollParent = document.scrollingElement as HTMLElement;
    }

    const viewportHeight = window.innerHeight;

    // 노드가 최종적으로 위치해야 할 뷰포트 내 타겟 Y좌표.
    const targetY = viewportHeight * bias;
    const distFromAnchorToTargetY = anchorRect.top - targetY;

    const maxScrollTop = scrollParent.scrollHeight - scrollParent.clientHeight;
    const scrollParentTop =
      scrollParent === document.scrollingElement ? 0 : scrollParent.getBoundingClientRect().top;
    const scrollParentBottom =
      scrollParent === document.scrollingElement
        ? viewportHeight
        : scrollParent.getBoundingClientRect().bottom;

    // 최대로 증가가능한 스크롤 양 계산.
    // (스크롤바를 아래로 움직일 수 있는 양)과 (포커스된 문장이 스크롤로 인해 화면에서 사라지지 않는 최대 한도량) 중 더 작은값을 '스크롤 증가 한도량'으로 지정.
    const availableIncreaseScrollAmount = Math.min(
      maxScrollTop - scrollParent.scrollTop,
      Math.max(0, anchorRect.top - scrollParentTop)
    );
    // 최대로 감소가능한 스크롤 양 계산.
    const availableDecreaseScrollAmount = Math.min(
      scrollParent.scrollTop,
      Math.max(0, scrollParentBottom - anchorRect.bottom)
    );

    // 부모 스크롤 컨테이너를 최대한 움직였을 때 타겟 Y좌표까지 부족한 스크롤 계산.
    const deficientScroll =
      distFromAnchorToTargetY > 0
        ? Math.max(0, distFromAnchorToTargetY - availableIncreaseScrollAmount)
        : Math.max(0, Math.abs(distFromAnchorToTargetY) - availableDecreaseScrollAmount) * -1;

    scrollParent.scrollBy({
      top: distFromAnchorToTargetY - deficientScroll,
      behavior: this.config.scrollBehavior.selected,
    });

    // 부족한 스크롤은 조상 스크롤 컨테이너에게 전가.
    if (scrollParent !== document.scrollingElement) {
      this.scrollRecursively(scrollParent, deficientScroll);
    }
  }

  private scrollRecursively(element: HTMLElement, extraOffset: number): void {
    // 스크롤 컨테이너의 position이 fixed라면 스크롤 부모의 스크롤을 움직여도 위치가 변하지 않음.
    if (getComputedStyle(element).position == "fixed") {
      return;
    }

    let scrollParent = element.parentElement;
    while (scrollParent) {
      if (this.isScrollable(scrollParent)) break;
      if (getComputedStyle(scrollParent).position == "fixed") return;
      scrollParent = scrollParent.parentElement;
    }

    if (!scrollParent || scrollParent === document.body) {
      scrollParent = document.scrollingElement as HTMLElement;
    }

    if (!scrollParent) return;

    const maxScrollTop = scrollParent.scrollHeight - scrollParent.clientHeight;
    const availableIncreaseScrollAmount = maxScrollTop - scrollParent.scrollTop;
    const availableDecreaseScrollAmount = scrollParent.scrollTop;
    const deficientScroll =
      extraOffset > 0
        ? Math.max(0, extraOffset - availableIncreaseScrollAmount)
        : Math.max(0, Math.abs(extraOffset) - availableDecreaseScrollAmount) * -1;

    // console.debug(`deficientScroll=${deficientScroll}`);

    scrollParent.scrollBy({
      top: extraOffset - deficientScroll,
      behavior: this.config.scrollBehavior.selected,
    });

    // 부족한 스크롤은 또다시 조상 스크롤 컨테이너에게 전가.
    if (scrollParent !== document.scrollingElement) {
      this.scrollRecursively(scrollParent, deficientScroll);
    }
  }

  getSentenceRects(): Rect[] {
    const anchor = this.anchorMap.get(this.focusInfo.nodeIdx)![this.focusInfo.anchorIdx];
    return this.getFloorSeperatedRectsFromAnchor(anchor);
  }

  getFirstCharRect(): Rect | null {
    const anchor = this.anchorMap.get(this.focusInfo.nodeIdx)![this.focusInfo.anchorIdx];
    return this.getFirstCharRectFromAnchor(anchor);
  }

  scrollToFocusedAnchor(): void {
    if (this.config.autoScroll.selected != "true") return;
    if (this.focusInfo.nodeIdx == -1) return;

    const focusedAnchor = this.anchorMap.get(this.focusInfo.nodeIdx)![this.focusInfo.anchorIdx];

    this.scrollToAnchor(focusedAnchor, this.config.focusYBias / 100);
  }

  existsAnchorRects(): boolean {
    const anchor = this.anchorMap.get(this.focusInfo.nodeIdx)![this.focusInfo.anchorIdx];
    const rects = this.getFloorSeperatedRectsFromAnchor(anchor);
    return rects.length > 0;
  }

  printInfo(node: Node): void {
    console.debug(`
      --- Node Info ---
      nodeIdx=${this.nodeIdxMap.get(node)}
      node.nodeType=${node.nodeType}
      node.nodeName=${node.nodeName}
      node.parentNode?.nodeType=${node.parentNode?.nodeType}
      node.parentNode?.nodeName=${node.parentNode?.nodeName}
      -------------`);
  }
}
