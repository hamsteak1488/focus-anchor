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
        anchorDrawInfo.sentenceRects[0].bottom + config.paddingY.value
      ),
      new Point(
        anchorDrawInfo.sentenceRects[0].left + config.fixedUnderlineLength.value,
        anchorDrawInfo.sentenceRects[0].bottom + config.paddingY.value
      )
    );
    renderer.drawPolygon(polygonVertices, drawOption);
  }
}
