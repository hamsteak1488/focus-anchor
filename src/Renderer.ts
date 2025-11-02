import { DrawOption } from './draw/DrawOption';
import { Point } from './Point';
import { Rect } from './Rect';
import { Utils } from './Utils';

export enum ToastOption {
  TOP = 'top',
  MIDDLE = 'middle',
  BOTTOM = 'bottom',
  DISABLED = 'disabled',
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor() {
    const canvasId = 'focus-anchor-overlay-canvas';

    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;

      Object.assign(this.canvas.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        pointerEvents: 'none',
        zIndex: '9999',
      });

      document.body.appendChild(this.canvas);
    }

    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  updateCanvasZIndex(zIndex: number) {
    this.canvas.style.zIndex = zIndex.toString();
  }

  updateCanvasSize() {
    this.canvas.width = document.documentElement.clientWidth;
    this.canvas.height = document.documentElement.clientHeight;
  }

  clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawLine(from: Point, to: Point, drawOption: DrawOption): void {
    this.ctx.strokeStyle = drawOption.rgba;
    this.ctx.lineWidth = drawOption.lineWidth;

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  drawLines(vertices: Point[], drawOption: DrawOption): void {
    if (vertices.length == 0) return;

    this.ctx.strokeStyle = drawOption.rgba;
    this.ctx.lineWidth = drawOption.lineWidth;

    this.ctx.beginPath();
    this.ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      this.ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    this.ctx.stroke();
  }

  drawRect(rect: Rect, drawOption: DrawOption): void {
    const radius = (Math.min(rect.width, rect.height) * (drawOption.radiusRatio / 100)) / 2;

    this.ctx.strokeStyle = drawOption.rgba;
    this.ctx.lineWidth = drawOption.lineWidth;
    this.ctx.beginPath();
    this.ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    this.ctx.stroke();
  }

  fillRect(rect: Rect, drawOption: DrawOption): void {
    const radius = (Math.min(rect.width, rect.height) * (drawOption.radiusRatio / 100)) / 2;

    this.ctx.fillStyle = drawOption.rgba;
    this.ctx.beginPath();
    this.ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    this.ctx.fill();
  }

  fillOutsideOfRects(rects: Rect[], drawOption: DrawOption): void {
    this.ctx.fillStyle = drawOption.rgba;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 1)';

    for (const rect of rects) {
      const radius = (Math.min(rect.width, rect.height) * (drawOption.radiusRatio / 100)) / 2;

      this.ctx.beginPath();
      this.ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  clearRect(rect: Rect) {
    this.ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
  }

  drawPolygon(vertices: Point[], drawOption: DrawOption): void {
    if (vertices.length == 0) return;

    this.ctx.strokeStyle = drawOption.rgba;
    this.ctx.lineWidth = drawOption.lineWidth;

    this.ctx.beginPath();
    for (let i = 0; i < vertices.length; i++) {
      const prv = vertices[(i - 1 + vertices.length) % vertices.length];
      const cur = vertices[i];
      const nxt = vertices[(i + 1) % vertices.length];
      const nnxt = vertices[(i + 2) % vertices.length];

      /*
        u->v = {v.x-u.x, v.y-u.y}
        normalized(u->v) = {(v.x-u.x) / len(u->v), (v.y-u.y) / len(u->v)}
      */
      const lenFromPrvToCur = Utils.getVectorLength(prv, cur);
      const lenFromCurToNxt = Utils.getVectorLength(cur, nxt);
      const lenFromNxtToNnxt = Utils.getVectorLength(nxt, nnxt);

      const prvRadius =
        (Math.min(lenFromPrvToCur, lenFromCurToNxt) / 2) * (drawOption.radiusRatio / 100);
      const radius =
        (Math.min(lenFromCurToNxt, lenFromNxtToNnxt) / 2) * (drawOption.radiusRatio / 100);
      const offset = new Point(
        ((nxt.x - cur.x) / lenFromCurToNxt) * prvRadius,
        ((nxt.y - cur.y) / lenFromCurToNxt) * prvRadius,
      );
      const offseted = Point.add(cur, offset);

      if (prv.x == nxt.x || prv.y == nxt.y) {
        this.ctx.moveTo(cur.x, cur.y);
        this.ctx.lineTo(offseted.x, offseted.y);
      }

      this.ctx.moveTo(offseted.x, offseted.y);

      this.ctx.arcTo(nxt.x, nxt.y, nnxt.x, nnxt.y, radius);
    }
    this.ctx.stroke();
  }

  fillScreen(drawOption: DrawOption): void {
    this.fillRect(new Rect(0, 0, this.canvas.width, this.canvas.height), drawOption);
  }

  showToast(
    message: string,
    duration: number = 3000,
    toastOption: ToastOption = ToastOption.BOTTOM,
    color: string = 'rgba(0, 0, 0, 0.7)',
  ): void {
    if (toastOption === ToastOption.DISABLED) {
      return;
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = color;
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '999999';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';

    switch (toastOption) {
      case ToastOption.TOP:
        toast.style.top = '10%';
        break;
      case ToastOption.MIDDLE:
        toast.style.top = '50%';
        toast.style.transform = 'translate(-50%, -50%)';
        break;
      case ToastOption.BOTTOM:
        toast.style.bottom = '10%';
        break;
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '1';
    }, 100);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 500);
    }, duration);
  }
}
