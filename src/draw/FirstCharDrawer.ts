import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class FirstCharDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo): void {
    const config = ConfigManager.getInstance();

    if (!anchorDrawInfo.firstCharRect) return;
    const marginAppliedRect = Rect.from(anchorDrawInfo.firstCharRect);

    marginAppliedRect.x -= config.marginX;
    marginAppliedRect.y -= config.marginY;
    marginAppliedRect.width += config.marginX * 2;
    marginAppliedRect.height += config.marginY * 2;

    renderer.drawRect(marginAppliedRect, config.drawColor.selected, config.lineWidth);
  }
}
