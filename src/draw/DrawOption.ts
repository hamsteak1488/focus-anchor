import { colord } from 'colord';

export class DrawOption {
  /** RGB color */
  rgbColor: string;
  /** range: [0, 100] */
  opacityRatio: number;
  /** range: [0, ∞] */
  lineWidth: number;
  /** range: [0, 100] */
  radiusRatio: number;

  constructor(rgbColor: string, opacityRatio: number, lineWidth: number, radiusRatio: number) {
    this.rgbColor = rgbColor;
    this.opacityRatio = opacityRatio;
    this.lineWidth = lineWidth;
    this.radiusRatio = radiusRatio;
  }

  /** range: [0.0, 1.0] */
  get alpha(): number {
    console.debug();
    return this.opacityRatio / 100;
  }

  get rgba(): string {
    return colord(this.rgbColor).alpha(this.alpha).toRgbString();
  }
}
