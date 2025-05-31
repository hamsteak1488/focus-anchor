import { FigureStrategy } from "./FigureStrategy.enum";
import { PaintStrategy } from "./PaintStrategy.enum";

export class Config {
  marginX: number;
  marginY: number;

  figureStrategy: FigureStrategy;
  paintStrategy: PaintStrategy;

  fixedUnderlineLength: number;

  constructor(
    marginX: number,
    marginY: number,
    figureStrategy: FigureStrategy,
    paintStrategy: PaintStrategy,
    fixedUnderlineLength: number
  ) {
    this.marginX = marginX;
    this.marginY = marginY;
    this.figureStrategy = figureStrategy;
    this.paintStrategy = paintStrategy;
    this.fixedUnderlineLength = fixedUnderlineLength;
  }

  static default(): Config {
    return new Config(1, 2, FigureStrategy.UNDERLINE_FIXED, PaintStrategy.OUTLINE, 20);
  }
}
