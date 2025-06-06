export class DropdownConfigItem<T> {
  defaultValue: T;
  selected: T;
  options: T[];

  constructor(defaultValue: T, options: T[]) {
    this.defaultValue = defaultValue;
    this.selected = defaultValue;
    this.options = options;
  }

  select(item: T) {
    this.selected = item;
  }
}
