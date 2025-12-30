import { AnchorDrawInfo } from '../AnchorDrawInfo';
import { ConfigManager } from '../config/ConfigManager';
import { Rect } from '../Rect';
import { Renderer } from '../Renderer';
import { Drawer } from './Drawer';
import { DrawOption } from './DrawOption';

export class HorizontalSpotlightDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo, drawOption: DrawOption): void {
    const config = ConfigManager.getInstance();

    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;

    for (const rect of anchorDrawInfo.sentenceRects) {
      const marginAppliedRect = Rect.from(rect);
      marginAppliedRect.y -= config.paddingY.value;
      marginAppliedRect.height += config.paddingY.value * 2;

      minY = Math.min(minY, marginAppliedRect.top);
      maxY = Math.max(maxY, marginAppliedRect.bottom);
    }

    const backgroundDrawOption = DrawOption.from(drawOption);
    backgroundDrawOption.rgbColor = 'rgb(0, 0, 0)';
    backgroundDrawOption.opacityRatio = 40;
    backgroundDrawOption.radiusRatio = 0;

    const clientWidth = document.documentElement.clientWidth;
    const clientHeight = document.documentElement.clientHeight;

    renderer.fillRect(new Rect(0, 0, clientWidth, minY), backgroundDrawOption);
    renderer.fillRect(new Rect(0, maxY, clientWidth, clientHeight - maxY), backgroundDrawOption);

    if (!anchorDrawInfo.firstCharRect) return;
    const firstCharRect = Rect.from(anchorDrawInfo.firstCharRect);

    firstCharRect.x -= config.paddingX.value;
    firstCharRect.y -= config.paddingY.value;
    firstCharRect.width += config.paddingX.value * 2;
    firstCharRect.height += config.paddingY.value * 2;

    renderer.fillRect(firstCharRect, drawOption);
  }
}
