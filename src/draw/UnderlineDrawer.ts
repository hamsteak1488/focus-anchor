import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Point } from "../Point";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";
import { DrawOption } from "./DrawOption";

export class UnderlineDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo, drawOption: DrawOption): void {
    const config = ConfigManager.getInstance();

    for (const rect of anchorDrawInfo.sentenceRects) {
      const polygonVertices: Point[] = [];
      polygonVertices.push(
        new Point(rect.left, rect.bottom + config.paddingY),
        new Point(rect.right, rect.bottom + config.paddingY)
      );
      renderer.drawPolygon(polygonVertices, drawOption);
    }
  }
}
