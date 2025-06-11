import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Point } from "../Point";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class FixedUnderlineDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo): void {
    const config = ConfigManager.getInstance();

    const polygonVertices: Point[] = [];
    polygonVertices.push(
      new Point(
        anchorDrawInfo.sentenceRects[0].left,
        anchorDrawInfo.sentenceRects[0].bottom + config.marginY
      ),
      new Point(
        anchorDrawInfo.sentenceRects[0].left + config.fixedUnderlineLength,
        anchorDrawInfo.sentenceRects[0].bottom + config.marginY
      )
    );
    renderer.drawPolygon(polygonVertices, config.drawColor.selected, config.lineWidth);
  }
}
