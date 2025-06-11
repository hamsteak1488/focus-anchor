export class ColorConfigItem {
  selected: string;

  constructor(selected: string) {
    this.selected = selected;
  }

  select(color: string) {
    this.selected = color;
  }
}
