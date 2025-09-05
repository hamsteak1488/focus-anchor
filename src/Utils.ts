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
}
