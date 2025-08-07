import { colord } from "colord";
import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class FirstCharHighlighterDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo): void {
    const config = ConfigManager.getInstance();

    if (!anchorDrawInfo.firstCharRect) return;
    const marginAppliedRect = Rect.from(anchorDrawInfo.firstCharRect);

    marginAppliedRect.x -= config.marginX;
    marginAppliedRect.y -= config.marginY;
    marginAppliedRect.width += config.marginX * 2;
    marginAppliedRect.height += config.marginY * 2;

    const highlighterColor = colord(config.drawColor.selected).alpha(0.2).toRgbString();

    if (config.borderRadius > 0) {
      renderer.fillRoundRect(
        marginAppliedRect,
        highlighterColor,
        (Math.min(marginAppliedRect.width, marginAppliedRect.height) *
          (config.borderRadius / 100)) /
          2
      );
    } else {
      renderer.fillRect(marginAppliedRect, config.drawColor.selected);
    }
  }
}
