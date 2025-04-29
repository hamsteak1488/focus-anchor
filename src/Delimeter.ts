export class Delimeter {
  token: string;
  exclusiveStartIdx: number;

  constructor(token: string, exclusiveStartIdx: number) {
    this.token = token;
    this.exclusiveStartIdx = exclusiveStartIdx;
  }
}
