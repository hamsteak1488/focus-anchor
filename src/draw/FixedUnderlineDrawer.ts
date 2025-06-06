import { Config } from "../Config";
import { Point } from "../Point";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class FixedUnderlineDrawer implements Drawer {
  draw(renderer: Renderer, rects: Rect[]): void {
    const config = Config.getInstance();

    const polygonVertices: Point[] = [];
    polygonVertices.push(
      new Point(rects[0].left, rects[0].bottom + config.marginY),
      new Point(rects[0].left + config.fixedUnderlineLength, rects[0].bottom + config.marginY)
    );
    renderer.drawPolygon(polygonVertices, "red");
  }
}
