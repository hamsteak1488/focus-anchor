// overlayHoleCanvas.ts

import { Rect } from "./Rect";

export class CanvasHoleOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentRects: Rect[];
  private targetRects: Rect[];
  private startRects: Rect[];
  private duration: number;
  private startTime: number | null = null;
  private maxLen: number = 0;

  /**
   * @param initialRect 초기 홀 위치
   * @param duration 애니메이션 지속 시간(ms)
   */
  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    initialRects: Rect[],
    duration: number = 600
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.duration = duration;
    this.currentRects = initialRects.map((r) => Rect.from(r));
    this.targetRects = initialRects.map((r) => Rect.from(r));
    this.startRects = initialRects.map((r) => Rect.from(r));

    this.onResize();
    window.addEventListener("resize", () => this.onResize());

    this.draw();
  }

  /** 윈도우 리사이즈 시 캔버스 크기 동기화 */
  private onResize(): void {
    this.draw();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private draw(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(0, 0, width, height);
    this.currentRects.forEach((r) => {
      this.ctx.clearRect(r.x, r.y, r.width, r.height);
    });
  }

  private animate = (timestamp: number): void => {
    if (this.startTime === null) this.startTime = timestamp;
    const elapsed = timestamp - this.startTime;
    const tRaw = Math.min(elapsed / this.duration, 1);
    const t = this.easeOutCubic(tRaw);

    // 현재 프레임 보간
    for (let i = 0; i < this.maxLen; i++) {
      const start = this.startRects[i];
      const target = this.targetRects[i];
      this.currentRects[i] = new Rect(
        start.x + (target.x - start.x) * t,
        start.y + (target.y - start.y) * t,
        start.width + (target.width - start.width) * t,
        start.height + (target.height - start.height) * t
      );
    }

    this.draw();
    if (tRaw < 1) {
      requestAnimationFrame(this.animate);
    } else {
      // 애니메이션 완료 후, 최종 rect 배열로 설정
      this.startTime = null;
      this.currentRects = this.targetRects.map((r) => Rect.from(r));
      this.draw();
    }
  };

  private padRects(rects: Rect[], length: number): Rect[] {
    const result = rects.map((r) => Rect.from(r));
    const last = result[result.length - 1];
    while (result.length < length) result.push(Rect.from(last));
    return result;
  }

  /**
   * N->M 형태로 홀 개수와 위치를 동시에 변경하며 애니메이션
   * @param rects 목표 Rect 배열
   */
  public moveToRects(rects: Rect[]): void {
    this.startRects = this.currentRects.map((r) => Rect.from(r));
    this.targetRects = rects.map((r) => Rect.from(r));
    this.maxLen = Math.max(this.startRects.length, this.targetRects.length);
    this.startRects = this.padRects(this.startRects, this.maxLen);
    this.targetRects = this.padRects(this.targetRects, this.maxLen);
    this.currentRects = this.startRects.map((r) => Rect.from(r));
    this.startTime = null;
    requestAnimationFrame(this.animate);
  }

  /** 단일 Rect에 대한 편의 호출 */
  public moveTo(rect: Rect): void {
    this.moveToRects([rect]);
  }
}
