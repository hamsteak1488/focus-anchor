import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { Renderer } from "../Renderer";

export interface Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo): void;
}
