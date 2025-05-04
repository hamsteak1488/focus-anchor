export class Rect {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get left(): number {
    return this.x;
  }
  get top(): number {
    return this.y;
  }
  get right(): number {
    return this.x + this.width;
  }
  get bottom(): number {
    return this.y + this.height;
  }

  toString(): string {
    return `[x=${this.x}, y=${this.y}, width=${this.width}, height=${this.height}]`;
  }

  static from(rect: Rect): Rect {
    return new Rect(rect.x, rect.y, rect.width, rect.height);
  }
}
