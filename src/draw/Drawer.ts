import { Rect } from "../Rect";
import { Renderer } from "../Renderer";

export interface Drawer {
  draw(renderer: Renderer, rects: Rect[]): void;
}
