export class FocusInfo {
  nodeIdx: number;
  anchorIdx: number;

  constructor(nodeIdx: number, anchorIdx: number) {
    this.nodeIdx = nodeIdx;
    this.anchorIdx = anchorIdx;
  }
}
