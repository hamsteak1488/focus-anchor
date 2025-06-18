export class DelimitPattern {
  test: (str: string) => boolean;
  exclusionCountFromEnd: number;

  constructor(test: (str: string) => boolean, exclusionCountFromEnd: number) {
    this.test = test;
    this.exclusionCountFromEnd = exclusionCountFromEnd;
  }
}
