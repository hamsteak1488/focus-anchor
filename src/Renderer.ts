import { Point } from "./Point";
import { Rect } from "./Rect";

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
    this.ctx.stroke();
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
}
