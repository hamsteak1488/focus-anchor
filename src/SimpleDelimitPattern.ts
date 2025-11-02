import { DelimitPattern } from './DelimitPattern';

export class SimpleDelimitPattern extends DelimitPattern {
  regexp: RegExp;

  constructor(regexp: RegExp, exclusionCountFromEnd: number) {
    super((str: string) => {
      return regexp.test(str);
    }, exclusionCountFromEnd);
    this.regexp = regexp;
  }
}
