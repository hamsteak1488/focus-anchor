export class Stack<T> {
  private _data: T[] = [];

  constructor() {}

  push(item: T): void {
    this._data.push(item);
  }

  pop(): T {
    const top = this._data[this._data.length - 1];
    this._data.pop();
    return top;
  }

  peek(): T {
    return this._data[this._data.length - 1];
  }

  isEmpty(): boolean {
    return this._data.length === 0;
  }

  size(): number {
    return this._data.length;
  }
}
