export class DropdownConfigItem<T> {
  selected: T;
  options: T[];

  constructor(selected: T, options: T[]) {
    this.selected = selected;
    this.options = options;
  }

  select(item: T) {
    this.selected = item;
  }
}
