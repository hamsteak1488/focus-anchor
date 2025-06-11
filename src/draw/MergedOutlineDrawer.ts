import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { ConfigManager } from "../config/ConfigManager";
import { Point } from "../Point";
import { Renderer } from "../Renderer";
import { Drawer } from "./Drawer";

export class MergedOutlineDrawer implements Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo): void {
    const config = ConfigManager.getInstance();

    // 폴리곤 정점 구성
    const leftVertices: Point[] = [];
    const rightVertices: Point[] = [];

    for (let i = 0; i < anchorDrawInfo.sentenceRects.length; i++) {
      const rect = anchorDrawInfo.sentenceRects[i];

      leftVertices.push(new Point(rect.left, rect.top));
      rightVertices.push(new Point(rect.right, rect.top));

      leftVertices.push(new Point(rect.left, rect.bottom));
      rightVertices.push(new Point(rect.right, rect.bottom));

      if (i + 1 < anchorDrawInfo.sentenceRects.length) {
        const nextRect = anchorDrawInfo.sentenceRects[i + 1];

        // 충돌안하면 사각형 분리.
        if (rect.right < nextRect.left || rect.left > nextRect.right) {
          leftVertices[0].y -= config.marginY;
          leftVertices[leftVertices.length - 1].y += config.marginY;
          rightVertices[0].y -= config.marginY;
          rightVertices[rightVertices.length - 1].y += config.marginY;
          for (const v of leftVertices) {
            v.x -= config.marginX;
          }
          for (const v of rightVertices) {
            v.x += config.marginX;
          }

          const polygonVertices: Point[] = [];

          for (let i = 0; i < rightVertices.length; i++) {
            polygonVertices.push(rightVertices[i]);
          }
          for (let i = leftVertices.length - 1; i >= 0; i--) {
            polygonVertices.push(leftVertices[i]);
          }

          renderer.drawPolygon(polygonVertices, "red", config.lineWidth);

          leftVertices.splice(0, leftVertices.length);
          rightVertices.splice(0, rightVertices.length);
        }
        // 충돌할경우, 직각을 유지하기 위해 중간 Y값을 가진 정점 추가.
        else {
          const midY = (rect.y + rect.height + nextRect.y) / 2;

          leftVertices.push(new Point(rect.left, midY));
          leftVertices.push(new Point(nextRect.left, midY));
          rightVertices.push(new Point(rect.right, midY));
          rightVertices.push(new Point(nextRect.right, midY));
        }
      }
    }

    leftVertices[0].y -= config.marginY;
    leftVertices[leftVertices.length - 1].y += config.marginY;
    rightVertices[0].y -= config.marginY;
    rightVertices[rightVertices.length - 1].y += config.marginY;
    for (const v of leftVertices) {
      v.x -= config.marginX;
    }
    for (const v of rightVertices) {
      v.x += config.marginX;
    }

    const polygonVertices: Point[] = [];
    for (let i = 0; i < rightVertices.length; i++) {
      polygonVertices.push(rightVertices[i]);
    }
    for (let i = leftVertices.length - 1; i >= 0; i--) {
      polygonVertices.push(leftVertices[i]);
    }
    renderer.drawPolygon(polygonVertices, "red", config.lineWidth);
  }
}
