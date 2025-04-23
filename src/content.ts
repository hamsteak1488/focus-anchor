import { Stack } from "./Stack";

const nodeList: Node[] = [];
const anchorIndicesMap = new Map<Node, number[]>();
const nonSplitTagList: string[] = ["A", "B", "STRONG", "CODE", "SPAN"];
const delimiters: string[] = [". ", "? ", "! "];

let focusedNodeIdx = 0;
let focusedSentenceIdx = 0;
let focusedSentenceStartCharIdx = 0;

/*
    무시 리스트 = ['a', 'b', 's', ...]
    노드 이름이 무시 리스트에 해당하면 스택에 추가 X, 그 외에는 스택에 새 버퍼 삽입.
    모든 노드는 자식 중 텍스트 노드 있으면 버퍼에 삽입.
    
    anchor 노드에서 자식 노드 순회 모두 끝나면, 스택 최상단 버퍼를 꺼내서 문장 분리.
    버퍼의 모든 텍스트를 이어붙임, 이 때 각 문자는 버퍼 내 몇번째 텍스트노드에 위치해있는지 기록.
    ". "과 같은 문장 종료 문자열로 문장 분리.
    분리된 문장의 첫번째 문자에 해당하는 텍스트노드를 '앵커 노드'로 지정.
    
*/

class Fragment {
  ch: string;
  node: Node;
  idx: number;

  constructor(ch: string, node: Node, idx: number) {
    this.ch = ch;
    this.node = node;
    this.idx = idx;
  }
}

let fragmentListStack = new Stack<Fragment[]>();

function traversalPreOrder(node: Node): void {
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
      if (delimeter.length > fragmentBuffer.length) continue;

      let matchSucceed = true;
      for (let i = 0; i < delimeter.length; i++) {
        if (delimeter[i] != fragmentBuffer[fragmentBuffer.length - delimeter.length + i].ch) {
          matchSucceed = false;
          break;
        }
      }

      if (matchSucceed) {
        needSplit = true;
        break;
      }
    }

    // 구분용 조각이라면
    if (fragment.idx == -1) {
      needSplit = true;
    }

    if (!needSplit) continue;

    // 노드의 앵커인덱스를 Map에 삽입.
    // 공백 문자뿐인 문장은 필요없으므로 검사.
    // 텍스트 없는 분리 태그가 첫번째 조각으로 오면 길이가 0일수도 있으므로 검사.
    if (fragmentBuffer.length > 0 && stringBuffer.trim()) {
      if (!anchorIndicesMap.get(fragmentBuffer[0].node)) {
        anchorIndicesMap.set(fragmentBuffer[0].node, []);
      }
      anchorIndicesMap.get(fragmentBuffer[0].node)!.push(fragmentBuffer[0].idx);
    }
    fragmentBuffer = [];
    stringBuffer = "";
  }

  // 마지막 문장이 프레임버퍼에 남아있을 수 있으므로 처리.
  if (fragmentBuffer.length > 0 && stringBuffer.trim()) {
    if (!anchorIndicesMap.has(fragmentBuffer[0].node)) {
      anchorIndicesMap.set(fragmentBuffer[0].node, []);
    }
    anchorIndicesMap.get(fragmentBuffer[0].node)!.push(fragmentBuffer[0].idx);
  }
}

function init(): void {
  traversalPreOrder(document.body);

  let i = 0;
  anchorIndicesMap.forEach((anchorIndices) => {
    console.debug(`${i++}: anchorIndices=${anchorIndices}`);
  });
}

window.addEventListener(
  "load",
  () => {
    setTimeout(() => {
      init();
      console.debug(`nodeList.length=${nodeList.length}`);
    }, 1000);
  },
  { once: true }
);

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

window.addEventListener("resize", updateCanvasSize);

let rect = {
  x: 100,
  y: 100,
  width: 50,
  height: 50,
};

function drawRectangle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  ctx.strokeRect(rect.x, rect.y + rect.height, 20, 0);
}
drawRectangle();

function moveFocus(offset: number) {
  const dir = Math.sign(offset);
  let cnt = Math.abs(offset);

  while (cnt > 0) {
    const focusedNode = nodeList[focusedNodeIdx];

    if (
      focusedSentenceIdx + dir < 0 ||
      focusedSentenceIdx + dir > anchorIndicesMap.get(focusedNode)!.length - 1
    ) {
      let endOfNode = false;

      while (true) {
        if (focusedNodeIdx + dir < 0 || focusedNodeIdx + dir > nodeList.length - 1) {
          endOfNode = true;
          break;
        }

        if (!anchorIndicesMap.has(nodeList[focusedNodeIdx + dir])) {
          console.debug(`${focusedNodeIdx + dir} doesn't have anchorIndices`);
          focusedNodeIdx += dir;
          continue;
        }

        focusedNodeIdx += dir;
        if (dir > 0) {
          focusedSentenceIdx = 0;
        }
        if (dir < 0) {
          focusedSentenceIdx = anchorIndicesMap.get(nodeList[focusedNodeIdx])!.length - 1;
        }
        break;
      }
      if (endOfNode) break;
    } else {
      focusedSentenceIdx += dir;
    }

    cnt--;
  }
}

function updateFocusedNode() {
  console.debug(`focusedNodeIdx=${focusedNodeIdx}`);
  console.debug(`focusedSentenceIdx=${focusedSentenceIdx}`);

  const range = document.createRange();
  const anchorIdx = anchorIndicesMap.get(nodeList[focusedNodeIdx])![focusedSentenceIdx];

  console.debug(`anchorIdx=${anchorIdx}`);
  console.debug(
    `anchorIndicesMap.get(nodeList[focusedNodeIdx])=${anchorIndicesMap.get(
      nodeList[focusedNodeIdx]
    )!}`
  );

  range.setStart(nodeList[focusedNodeIdx], anchorIdx);
  range.setEnd(nodeList[focusedNodeIdx], anchorIdx);

  var clickedFirstCharRect = null;
  const rects = range.getClientRects();
  if (rects.length == 0) return;
  clickedFirstCharRect = {
    x: rects[0].x,
    y: rects[0].y,
    width: rects[0].width,
    height: rects[0].height,
  };

  if (!clickedFirstCharRect) {
    console.debug("텍스트 노드를 찾을 수 없거나 비어 있음");
    return;
  }

  rect.x = clickedFirstCharRect.x + window.scrollX;
  rect.y = clickedFirstCharRect.y + window.scrollY;
  rect.width = clickedFirstCharRect.width;
  rect.height = clickedFirstCharRect.height;

  drawRectangle();
}

function printInfo(node: Node) {
  console.debug(`
    --- Clicked Node Info ---\n
    node.nodeType=${node.nodeType}
    node.nodeName=${node.nodeName}
    node.parentNode?.nodeType=${node.parentNode?.nodeType}
    node.parentNode?.nodeName=${node.parentNode?.nodeName}
    node.textContent=${node.textContent}
    -------------`);
}

document.addEventListener("mouseup", function (e) {
  const clickedElement = e.target;

  printInfo(clickedElement as Node);

  var idx = nodeList.findIndex((node) => node === clickedElement);

  if (idx === -1) return;
  while (idx < nodeList.length && !anchorIndicesMap.has(nodeList[idx])) idx++;

  focusedNodeIdx = idx;
  focusedSentenceIdx = 0;
  focusedSentenceStartCharIdx = 0;
  updateFocusedNode();
});

document.addEventListener("keydown", function (e) {
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
