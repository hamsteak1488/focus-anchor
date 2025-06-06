import { DrawStrategy } from "./draw/DrawStrategy.enum";

export class Config {
  private static instance: Config;

  private constructor() {}

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  static get defaultJson(): string {
    return JSON.stringify(new Config(), null, 2);
  }

  marginX: number = 1;
  marginY: number = 2;

  drawStrategy: DrawStrategy = DrawStrategy.Outline;

  fixedUnderlineLength: number = 20;

  autoScroll: boolean = true;
  scrollBehavior: ScrollBehavior = "smooth";

  strictClickDetection: boolean = true;

  focusYBias: number = 0.2;
}
