const nodeList: Node[] = [];
const isAnchorNode: boolean[] = [];

var focusedNodeIdx = 0;
var focusedSentenceIdx = 0;
var focusedSentenceStartCharIdx = 0;

/*
    무시 리스트 = ['a', 'b', 's', ...]
    노드 이름이 무시 리스트에 해당하면 스택에 추가 X, 그 외에는 스택에 새 버퍼 삽입.
    모든 노드는 자식 중 텍스트 노드 있으면 버퍼에 삽입.
    
    anchor 노드에서 자식 노드 순회 모두 끝나면, 스택 최상단 버퍼를 꺼내서 문장 분리.
    버퍼의 모든 텍스트를 이어붙임, 이 때 각 문자는 버퍼 내 몇번째 텍스트노드에 위치해있는지 기록.
    ". "과 같은 문장 종료 문자열로 문장 분리.
    분리된 문장의 첫번째 문자에 해당하는 텍스트노드를 '앵커 노드'로 지정.
    
*/

function traversalPreOrder(node: Node): void {
  nodeList.push(node);

  node.childNodes.forEach((child) => traversalPreOrder(child));
}

window.addEventListener("load", () => {
  setTimeout(() => {
    traversalPreOrder(document.body);
    console.log(`nodeList.length=${nodeList.length}`);
  }, 3000);
});

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
  canvas.width = Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth
  );
  canvas.height = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );
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

function moveNodeFocus(offset: number) {
  const dir = Math.sign(offset);
  var cnt = Math.abs(offset);

  while (cnt > 0) {
    focusedNodeIdx += dir;
    if (nodeList[focusedNodeIdx].nodeType !== Node.TEXT_NODE) continue;

    const node = nodeList[focusedNodeIdx].parentNode as Node;

    console.log(
      `nodeList[focusedNodeIdx].parentNode.nodeName=${node.nodeName}`
    );

    if (["asdf"].includes(node.nodeName)) {
      focusedNodeIdx += dir;
      continue;
    }

    cnt--;
  }
}

function moveSentenceFocus(offset: number) {
  const focusedNodeText = nodeList[focusedNodeIdx].textContent;
  if (!focusedNodeText) return;

  const sentenceStartCharIndices: number[] = [];
  let startCharIdx = 0;
  while (true) {
    sentenceStartCharIndices.push(startCharIdx);
    const nextStartCharIdx = focusedNodeText.indexOf(". ", startCharIdx);
    if (nextStartCharIdx == -1) break;
    startCharIdx = nextStartCharIdx + 2;
  }

  if (focusedSentenceIdx == -1) {
    focusedSentenceIdx = sentenceStartCharIndices.length - 1;
  }

  const nextFocusedSentenceIdx = focusedSentenceIdx + offset;
  if (nextFocusedSentenceIdx > sentenceStartCharIndices.length - 1) {
    focusedSentenceIdx = 0;
    moveNodeFocus(1);
    moveSentenceFocus(nextFocusedSentenceIdx - sentenceStartCharIndices.length);
    return;
  }
  if (nextFocusedSentenceIdx < 0) {
    focusedSentenceIdx = -1;
    moveNodeFocus(-1);
    moveSentenceFocus(nextFocusedSentenceIdx + 1);
    return;
  }

  focusedSentenceIdx = nextFocusedSentenceIdx;
  focusedSentenceStartCharIdx = sentenceStartCharIndices[focusedSentenceIdx];
}

function updateFocusedNode() {
  if (nodeList[focusedNodeIdx].nodeType !== Node.TEXT_NODE) return;

  const range = document.createRange();
  range.setStart(nodeList[focusedNodeIdx], focusedSentenceStartCharIdx);
  range.setEnd(nodeList[focusedNodeIdx], focusedSentenceStartCharIdx);

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
    console.log("텍스트 노드를 찾을 수 없거나 비어 있음");
    return;
  }

  rect.x = clickedFirstCharRect.x + window.scrollX;
  rect.y = clickedFirstCharRect.y + window.scrollY;
  rect.width = clickedFirstCharRect.width;
  rect.height = clickedFirstCharRect.height;

  drawRectangle();
}

function checkNode(node: Node) {
  console.log("--- check ---");
  console.log(`node.nodeType=${node.nodeType}`);
  console.log(`node.nodeName=${node.nodeName}`);
  console.log(`node.parentNode?.nodeType=${node.parentNode?.nodeType}`);
  console.log(`node.parentNode?.nodeName=${node.parentNode?.nodeName}`);
  console.log("-------------");
}

document.addEventListener("mouseup", function (e) {
  const clickedElement = e.target;

  checkNode(clickedElement as Node);

  var idx = nodeList.findIndex((node) => node === clickedElement);
  console.log(`clickedElement=${clickedElement}`);
  console.log(`idx=${idx}`);

  if (idx === -1) return;
  while (idx < nodeList.length && nodeList[idx].nodeType !== Node.TEXT_NODE)
    idx++;

  focusedNodeIdx = idx;
  focusedSentenceIdx = 0;
  focusedSentenceStartCharIdx = 0;
  updateFocusedNode();
});

document.addEventListener("keydown", function (e) {
  switch (e.key) {
    case "ArrowUp":
      moveSentenceFocus(-1);
      e.preventDefault();
      break;
    case "ArrowDown":
      moveSentenceFocus(1);
      e.preventDefault();
      break;
    case "ArrowLeft":
      moveSentenceFocus(-1);
      e.preventDefault();
      break;
    case "ArrowRight":
      moveSentenceFocus(1);
      e.preventDefault();
      break;
    default:
      return;
  }
  updateFocusedNode();
});
