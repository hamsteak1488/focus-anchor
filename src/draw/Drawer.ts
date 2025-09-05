import { AnchorDrawInfo } from "../AnchorDrawInfo";
import { Renderer } from "../Renderer";
import { DrawOption } from "./DrawOption";

export interface Drawer {
  draw(renderer: Renderer, anchorDrawInfo: AnchorDrawInfo, drawOption: DrawOption): void;
}
