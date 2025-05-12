export class Anchor {
  startNodeIdx: number;
  startOffsetIdx: number;
  endNodeIdx: number;
  endOffsetIdx: number; // endOffsetIdx는 exclusive.

  constructor(
    startNodeIdx: number,
    startOffsetIdx: number,
    endNodeIdx: number,
    endOffsetIdx: number
  ) {
    this.startNodeIdx = startNodeIdx;
    this.startOffsetIdx = startOffsetIdx;
    this.endNodeIdx = endNodeIdx;
    this.endOffsetIdx = endOffsetIdx;
  }

  toString(): string {
    return `start:[node=${this.startNodeIdx}, offset=${this.startOffsetIdx}], end:[node=${this.endNodeIdx}, offset=${this.endOffsetIdx}]`;
  }
}
