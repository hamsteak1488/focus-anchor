import { AnchorDrawInfo } from '../AnchorDrawInfo';
import { ConfigManager } from '../config/ConfigManager';
import { Point } from '../Point';
import { Renderer } from '../Renderer';
import { Drawer } from './Drawer';
import { DrawOption } from './DrawOption';

export class MergedOutlineDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo, drawOption: DrawOption): void {
    const config = ConfigManager.getInstance();

    for (const rect of anchorDrawInfo.sentenceRects) {
      rect.x -= config.paddingX.value;
      rect.y -= config.paddingY.value;
      rect.width += config.paddingX.value * 2;
      rect.height += config.paddingY.value * 2;
    }

    // 폴리곤 정점 구성
    const leftVertices: Point[] = [];
    const rightVertices: Point[] = [];

    const firstRect = anchorDrawInfo.sentenceRects[0];
    leftVertices.push(new Point(firstRect.left, firstRect.top));
    rightVertices.push(new Point(firstRect.right, firstRect.top));

    for (let i = 0; i < anchorDrawInfo.sentenceRects.length; i++) {
      const rect = anchorDrawInfo.sentenceRects[i];

      leftVertices.push(new Point(rect.left, rect.bottom));
      rightVertices.push(new Point(rect.right, rect.bottom));

      if (i + 1 == anchorDrawInfo.sentenceRects.length) {
        continue;
      }
      const nextRect = anchorDrawInfo.sentenceRects[i + 1];

      // 충돌안하면 사각형 분리.
      if (rect.right < nextRect.left || rect.left > nextRect.right) {
        const polygonVertices: Point[] = [];

        for (let i = 0; i < rightVertices.length; i++) {
          polygonVertices.push(rightVertices[i]);
        }
        for (let i = leftVertices.length - 1; i >= 0; i--) {
          polygonVertices.push(leftVertices[i]);
        }

        renderer.drawPolygon(polygonVertices, drawOption);

        leftVertices.splice(0, leftVertices.length);
        rightVertices.splice(0, rightVertices.length);

        leftVertices.push(new Point(nextRect.left, nextRect.top));
        rightVertices.push(new Point(nextRect.right, nextRect.top));
      }
      // 충돌할경우, 직각을 유지하기 위해 중간 Y값을 가진 정점 추가.
      else {
        let leftY = rect.left <= nextRect.left ? rect.bottom : nextRect.top;
        leftVertices.pop();
        leftVertices.push(new Point(rect.left, leftY));
        if (rect.left != nextRect.left) {
          leftVertices.push(new Point(nextRect.left, leftY));
        }

        let rightY = rect.right >= nextRect.right ? rect.bottom : nextRect.top;
        rightVertices.pop();
        rightVertices.push(new Point(rect.right, rightY));
        if (rect.right != nextRect.right) {
          rightVertices.push(new Point(nextRect.right, rightY));
        }
      }
    }

    const polygonVertices: Point[] = [];
    for (let i = 0; i < rightVertices.length; i++) {
      polygonVertices.push(rightVertices[i]);
    }
    for (let i = leftVertices.length - 1; i >= 0; i--) {
      polygonVertices.push(leftVertices[i]);
    }
    renderer.drawPolygon(polygonVertices, drawOption);
  }
}
