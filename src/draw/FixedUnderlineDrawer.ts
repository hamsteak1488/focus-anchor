import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Point } from "../Point";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";
import { DrawOption } from "./DrawOption";

export class FixedUnderlineDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo, drawOption: DrawOption): void {
    const config = ConfigManager.getInstance();

    const polygonVertices: Point[] = [];
    polygonVertices.push(
      new Point(
        anchorDrawInfo.sentenceRects[0].left,
        anchorDrawInfo.sentenceRects[0].bottom + config.paddingY
      ),
      new Point(
        anchorDrawInfo.sentenceRects[0].left + config.fixedUnderlineLength,
        anchorDrawInfo.sentenceRects[0].bottom + config.paddingY
      )
    );
    renderer.drawPolygon(polygonVertices, drawOption);
  }
}
