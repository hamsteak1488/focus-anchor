import { ConfigManager } from "../config/ConfigManager";
import { Point } from "../Point";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class UnderlineDrawer implements Drawer {
  draw(renderer: Renderer, rects: Rect[]): void {
    const config = ConfigManager.getInstance();

    for (const rect of rects) {
      const polygonVertices: Point[] = [];
      polygonVertices.push(
        new Point(rect.left, rect.bottom + config.marginY),
        new Point(rect.right, rect.bottom + config.marginY)
      );
      renderer.drawPolygon(polygonVertices, "red", config.lineWidth);
    }
  }
}
