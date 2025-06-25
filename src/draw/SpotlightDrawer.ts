import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class SpotlightDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo): void {
    const config = ConfigManager.getInstance();

    const marginAppliedRects: Rect[] = [];
    for (const rect of anchorDrawInfo.sentenceRects) {
      const marginAppliedRect = Rect.from(rect);
      marginAppliedRect.x -= config.marginX;
      marginAppliedRect.y -= config.marginY;
      marginAppliedRect.width += config.marginX * 2;
      marginAppliedRect.height += config.marginY * 2;
      marginAppliedRects.push(marginAppliedRect);
    }

    if (config.borderRadius > 0) {
      renderer.fillOutsideRoundRects(
        marginAppliedRects,
        "rgba(0, 0, 0, 0.5)",
        (Math.min(marginAppliedRects[0].width, marginAppliedRects[0].height) *
          (config.borderRadius / 100)) /
          2
      );
    } else {
      renderer.fillScreen("rgba(0, 0, 0, 0.5)");
      for (const marginAppliedRect of marginAppliedRects) {
        renderer.clearRect(marginAppliedRect);
      }
    }
  }
}
