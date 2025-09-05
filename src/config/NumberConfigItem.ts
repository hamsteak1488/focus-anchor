export class NumberConfigItem {
  value: number;
  /** There is no limit if null. */
  minValue: number | null;
  /** There is no limit if null. */
  maxValue: number | null;

  /** If there is no min or max limit, enter null there. */
  constructor(value: number, minValue: number | null, maxValue: number | null) {
    this.value = value;
    this.minValue = minValue;
    this.maxValue = maxValue;
  }
}
