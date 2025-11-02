import { Rect } from './Rect';

export class AnchorDrawInfo {
  sentenceRects: Rect[];
  firstCharRect: Rect | null;

  constructor(sentenceRects: Rect[], firstCharRect: Rect | null) {
    this.sentenceRects = sentenceRects;
    this.firstCharRect = firstCharRect;
  }
}
