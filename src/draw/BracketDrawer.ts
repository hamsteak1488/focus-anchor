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
      new Point(firstRect.left - config.paddingX.value + bracketWidth, firstRect.top),
      new Point(firstRect.left - config.paddingX.value, firstRect.top),
      new Point(firstRect.left - config.paddingX.value, firstRect.bottom),
      new Point(firstRect.left - config.paddingX.value + bracketWidth, firstRect.bottom)
    );

    const rightBracketVertices: Point[] = [];
    rightBracketVertices.push(
      new Point(lastRect.right + config.paddingX.value - bracketWidth, lastRect.top),
      new Point(lastRect.right + config.paddingX.value, lastRect.top),
      new Point(lastRect.right + config.paddingX.value, lastRect.bottom),
      new Point(lastRect.right + config.paddingX.value - bracketWidth, lastRect.bottom)
    );

    renderer.drawLines(leftBracketVertices, drawOption);
    renderer.drawLines(rightBracketVertices, drawOption);
  }
}
