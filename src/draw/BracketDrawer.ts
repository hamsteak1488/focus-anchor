import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Point } from "../Point";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class BracketDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo): void {
    const config = ConfigManager.getInstance();

    const firstRect = anchorDrawInfo.sentenceRects[0];
    const lastRect = anchorDrawInfo.sentenceRects[anchorDrawInfo.sentenceRects.length - 1];

    const bracketWidth = firstRect.height / 4;

    const leftBracketVertices: Point[] = [];
    leftBracketVertices.push(
      new Point(firstRect.left - config.marginX + bracketWidth, firstRect.top),
      new Point(firstRect.left - config.marginX, firstRect.top),
      new Point(firstRect.left - config.marginX, firstRect.bottom),
      new Point(firstRect.left - config.marginX + bracketWidth, firstRect.bottom)
    );

    const rightBracketVertices: Point[] = [];
    rightBracketVertices.push(
      new Point(lastRect.right + config.marginX - bracketWidth, lastRect.top),
      new Point(lastRect.right + config.marginX, lastRect.top),
      new Point(lastRect.right + config.marginX, lastRect.bottom),
      new Point(lastRect.right + config.marginX - bracketWidth, lastRect.bottom)
    );

    renderer.drawLines(leftBracketVertices, config.drawColor.selected, config.lineWidth);
    renderer.drawLines(rightBracketVertices, config.drawColor.selected, config.lineWidth);
  }
}
