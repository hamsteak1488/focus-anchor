import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Point } from "../Point";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";
import { DrawOption } from "./DrawOption";

export class BracketDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo, drawOption: DrawOption): void {
    const config = ConfigManager.getInstance();

    const firstRect = anchorDrawInfo.sentenceRects[0];
    const lastRect = anchorDrawInfo.sentenceRects[anchorDrawInfo.sentenceRects.length - 1];

    const bracketWidth = firstRect.height / 4;

    const leftBracketVertices: Point[] = [];
    leftBracketVertices.push(
      new Point(firstRect.left - config.paddingX + bracketWidth, firstRect.top),
      new Point(firstRect.left - config.paddingX, firstRect.top),
      new Point(firstRect.left - config.paddingX, firstRect.bottom),
      new Point(firstRect.left - config.paddingX + bracketWidth, firstRect.bottom)
    );

    const rightBracketVertices: Point[] = [];
    rightBracketVertices.push(
      new Point(lastRect.right + config.paddingX - bracketWidth, lastRect.top),
      new Point(lastRect.right + config.paddingX, lastRect.top),
      new Point(lastRect.right + config.paddingX, lastRect.bottom),
      new Point(lastRect.right + config.paddingX - bracketWidth, lastRect.bottom)
    );

    renderer.drawLines(leftBracketVertices, drawOption);
    renderer.drawLines(rightBracketVertices, drawOption);
  }
}
