import { ConfigManager } from "../config/ConfigManager";
import { Point } from "../Point";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class FixedUnderlineDrawer implements Drawer {
  draw(renderer: Renderer, rects: Rect[]): void {
    const config = ConfigManager.getInstance();

    const polygonVertices: Point[] = [];
    polygonVertices.push(
      new Point(rects[0].left, rects[0].bottom + config.marginY),
      new Point(rects[0].left + config.fixedUnderlineLength, rects[0].bottom + config.marginY)
    );
    renderer.drawPolygon(polygonVertices, "red", config.lineWidth);
  }
}
