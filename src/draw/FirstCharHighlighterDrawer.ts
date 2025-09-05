import { colord } from "colord";
import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";
import { DrawOption } from "./DrawOption";

export class FirstCharHighlighterDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo, drawOption: DrawOption): void {
    const config = ConfigManager.getInstance();

    if (!anchorDrawInfo.firstCharRect) return;
    const marginAppliedRect = Rect.from(anchorDrawInfo.firstCharRect);

    marginAppliedRect.x -= config.paddingX;
    marginAppliedRect.y -= config.paddingY;
    marginAppliedRect.width += config.paddingX * 2;
    marginAppliedRect.height += config.paddingY * 2;

    renderer.fillRect(marginAppliedRect, drawOption);
  }
}
