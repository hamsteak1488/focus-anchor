import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";
import { DrawOption } from "./DrawOption";

export class HighlighterDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo, drawOption: DrawOption): void {
    const config = ConfigManager.getInstance();

    const marginAppliedRects: Rect[] = [];
    for (const rect of anchorDrawInfo.sentenceRects) {
      const marginAppliedRect = Rect.from(rect);
      marginAppliedRect.x -= config.paddingX;
      marginAppliedRect.y -= config.paddingY;
      marginAppliedRect.width += config.paddingX * 2;
      marginAppliedRect.height += config.paddingY * 2;
      marginAppliedRects.push(marginAppliedRect);
    }

    for (const marginAppliedRect of marginAppliedRects) {
      renderer.fillRect(marginAppliedRect, drawOption);
    }
  }
}
