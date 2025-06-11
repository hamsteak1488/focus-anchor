import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Point } from "../Point";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class UnderlineDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo): void {
    const config = ConfigManager.getInstance();

    for (const rect of anchorDrawInfo.sentenceRects) {
      const polygonVertices: Point[] = [];
      polygonVertices.push(
        new Point(rect.left, rect.bottom + config.marginY),
        new Point(rect.right, rect.bottom + config.marginY)
      );
      renderer.drawPolygon(polygonVertices, config.drawColor.selected, config.lineWidth);
    }
  }
}
