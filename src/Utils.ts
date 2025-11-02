import { Point } from './Point';

export class Utils {
  static clamp(value: number, min: number | null, max: number | null) {
    if (min != null) {
      value = Math.max(min, value);
    }
    if (max != null) {
      value = Math.min(max, value);
    }

    return value;
  }

  static getVectorLength(u: Point, v: Point): number {
    const dx = v.x - u.x;
    const dy = v.y - u.y;

    return Math.sqrt(dx * dx + dy * dy);
  }
}
