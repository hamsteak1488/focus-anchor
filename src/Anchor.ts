export class Anchor {
  startNode: Node;
  startOffsetIdx: number;
  endNode: Node;
  endOffsetIdx: number;

  constructor(startNode: Node, startIdx: number, endNode: Node, endIdx: number) {
    this.startNode = startNode;
    this.startOffsetIdx = startIdx;
    this.endNode = endNode;
    this.endOffsetIdx = endIdx;
  }

  toString(): string {
    return `[startOffsetIdx=${this.startOffsetIdx}, endOffsetIdx=${this.endOffsetIdx}]`;
  }
}
