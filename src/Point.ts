export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static add(u: Point, v: Point): Point {
    return new Point(u.x + v.x, u.y + v.y);
  }
}
