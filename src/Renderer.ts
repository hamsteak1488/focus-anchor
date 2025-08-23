import { Point } from "./Point";
import { Rect } from "./Rect";

export enum ToastOption {
  TOP = "top",
  MIDDLE = "middle",
  BOTTOM = "bottom",
  DISABLED = "disabled",
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor() {
    const canvasId = "focus-anchor-overlay-canvas";

    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.id = canvasId;

      Object.assign(this.canvas.style, {
        position: "fixed",
        top: "0",
        left: "0",
        pointerEvents: "none",
        zIndex: "9999",
      });

      document.body.appendChild(this.canvas);
    }

    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
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

  drawLine(from: Point, to: Point, color: string, lineWidth: number): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  drawLines(vertices: Point[], color: string, lineWidth: number): void {
    if (vertices.length == 0) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;

    this.ctx.beginPath();
    this.ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      this.ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    this.ctx.stroke();
  }

  drawRect(rect: Rect, color: string, lineWidth: number): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  drawRoundRect(rect: Rect, color: string, lineWidth: number, radius: number): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    this.ctx.stroke();
  }

  fillRect(rect: Rect, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  fillRoundRect(rect: Rect, color: string, radius: number): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
    this.ctx.fill();
  }

  fillOutsideRoundRects(rects: Rect[], color: string, radius: number): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.fillStyle = "rgba(0, 0, 0, 1)";

    for (const rect of rects) {
      this.ctx.beginPath();
      this.ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  clearRect(rect: Rect) {
    this.ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
  }

  drawPolygon(vertices: Point[], color: string, lineWidth: number): void {
    if (vertices.length == 0) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;

    this.ctx.beginPath();
    this.ctx.moveTo(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y);
    for (let i = 0; i < vertices.length; i++) {
      this.ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }

  fillScreen(color: string): void {
    this.fillRect(new Rect(0, 0, this.canvas.width, this.canvas.height), color);
  }

  showToast(
    message: string,
    duration: number = 3000,
    toastOption: ToastOption = ToastOption.BOTTOM,
    color: string = "rgba(0, 0, 0, 0.7)"
  ): void {
    if (toastOption === ToastOption.DISABLED) {
      return;
    }

    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.backgroundColor = color;
    toast.style.color = "white";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "5px";
    toast.style.zIndex = "999999";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.5s";

    switch (toastOption) {
      case ToastOption.TOP:
        toast.style.top = "10%";
        break;
      case ToastOption.MIDDLE:
        toast.style.top = "50%";
        toast.style.transform = "translate(-50%, -50%)";
        break;
      case ToastOption.BOTTOM:
        toast.style.bottom = "10%";
        break;
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "1";
    }, 100);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 500);
    }, duration);
  }
}
