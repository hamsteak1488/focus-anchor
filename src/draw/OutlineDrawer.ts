import { ConfigManager } from "../config/ConfigManager";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class OutlineDrawer implements Drawer {
  draw(renderer: Renderer, rects: Rect[]): void {
    const config = ConfigManager.getInstance();

    const marginAppliedRects: Rect[] = [];
    for (const rect of rects) {
      const marginAppliedRect = Rect.from(rect);
      marginAppliedRect.x -= config.marginX;
      marginAppliedRect.y -= config.marginY;
      marginAppliedRect.width += config.marginX * 2;
      marginAppliedRect.height += config.marginY * 2;
      marginAppliedRects.push(marginAppliedRect);
    }

    for (const marginAppliedRect of marginAppliedRects) {
      renderer.drawRectangle(marginAppliedRect, "red");
    }
  }
}
