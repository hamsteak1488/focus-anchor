export class Delimeter {
  regexp: RegExp;
  exclusionCountFromEnd: number;

  constructor(regexp: RegExp, exclusiveStartIdx: number) {
    this.regexp = regexp;
    this.exclusionCountFromEnd = exclusiveStartIdx;
  }
}
