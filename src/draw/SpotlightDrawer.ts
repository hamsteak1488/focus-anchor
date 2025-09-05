import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Rect } from "../Rect";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";
import { DrawOption } from "./DrawOption";

export class SpotlightDrawer implements Drawer {
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

    drawOption.rgbColor = "rgb(0, 0, 0)";
    drawOption.opacityRatio = 50;

    renderer.fillOutsideOfRects(marginAppliedRects, drawOption);
  }
}
