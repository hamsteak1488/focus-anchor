import { FigureStrategy } from "./FigureStrategy.enum";
import { PaintStrategy } from "./PaintStrategy.enum";

export class Config {
  marginX: number = 1;
  marginY: number = 2;

  figureStrategy: FigureStrategy = FigureStrategy.UNDERLINE_FIXED;
  paintStrategy: PaintStrategy = PaintStrategy.OUTLINE;

  fixedUnderlineLength: number = 20;

  autoScroll: boolean = true;
  strictClickDetection: boolean = false;
}
