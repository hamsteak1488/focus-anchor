import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class SpotlightDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo): void {
    const config = ConfigManager.getInstance();

    renderer.fillScreen("rgba(0, 0, 0, 0.5)");

    const marginAppliedRects: Rect[] = [];
    for (const rect of anchorDrawInfo.sentenceRects) {
      const marginAppliedRect = Rect.from(rect);
      marginAppliedRect.x -= config.marginX;
      marginAppliedRect.y -= config.marginY;
      marginAppliedRect.width += config.marginX * 2;
      marginAppliedRect.height += config.marginY * 2;
      marginAppliedRects.push(marginAppliedRect);
    }

    for (const marginAppliedRect of marginAppliedRects) {
      renderer.clearRect(marginAppliedRect);
    }
  }
}
