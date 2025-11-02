import { AnchorDrawInfo } from '../AnchorDrawInfo';
import { ConfigManager } from '../config/ConfigManager';
import { Rect } from '../Rect';
import { Renderer } from '../Renderer';
import { Drawer } from './Drawer';
import { DrawOption } from './DrawOption';

export class FirstCharOutlineDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo, drawOption: DrawOption): void {
    const config = ConfigManager.getInstance();

    if (!anchorDrawInfo.firstCharRect) return;
    const marginAppliedRect = Rect.from(anchorDrawInfo.firstCharRect);

    marginAppliedRect.x -= config.paddingX.value;
    marginAppliedRect.y -= config.paddingY.value;
    marginAppliedRect.width += config.paddingX.value * 2;
    marginAppliedRect.height += config.paddingY.value * 2;

    renderer.drawRect(marginAppliedRect, drawOption);
  }
}
