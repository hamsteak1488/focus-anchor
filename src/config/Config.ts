import { DrawStrategy } from "../draw/DrawStrategy.enum";
import { ColorConfigItem } from "./ColorConfigItem";
import { DropdownConfigItem } from "./DropdownConfigItem";

export class Config {
  static get default(): Config {
    return new Config();
  }

  static from(object: any): Config {
    const config = Config.default;
    for (const key of Object.keys(object) as (keyof Config)[]) {
      if (config[key] instanceof DropdownConfigItem) {
        (config[key] as DropdownConfigItem<any>).selected = object[key].selected;
      }
      if (config[key] instanceof ColorConfigItem) {
        (config[key] as ColorConfigItem).selected = object[key].selected;
      } else {
        (config as any)[key] = object[key];
      }
    }
    return config;
  }

  assignProperties(object: any): void {
    const config: Config = this;
    for (const key of Object.keys(object) as (keyof Config)[]) {
      if (config[key] instanceof DropdownConfigItem) {
        (config[key] as DropdownConfigItem<any>).selected = object[key].selected;
      }
      if (config[key] instanceof ColorConfigItem) {
        (config[key] as ColorConfigItem).selected = object[key].selected;
      } else {
        (config as any)[key] = object[key];
      }
    }
  }

  marginX: number = parseInt(process.env.DEFAULT_MARGIN_X ?? "1");
  marginY: number = parseInt(process.env.DEFAULT_MARGIN_Y ?? "2");

  drawStrategy = new DropdownConfigItem<DrawStrategy>(
    DrawStrategy[(process.env.DEFAULT_DRAW_STRATEGY as keyof typeof DrawStrategy) ?? "Underline"],
    [
      DrawStrategy.Underline,
      DrawStrategy.FixedUnderline,
      DrawStrategy.Outline,
      DrawStrategy.MergedOutline,
      DrawStrategy.Spotlight,
      DrawStrategy.FirsrChar,
    ]
  );
  drawColor = new ColorConfigItem(process.env.DEFAULT_DRAW_COLOR ?? "#FF0000");
  lineWidth: number = parseInt(process.env.DEFAULT_LINE_WIDTH ?? "3");
  borderRadius: number = parseInt(process.env.DEFAULT_BORDER_RADIUS ?? "0");
  fixedUnderlineLength: number = parseInt(process.env.DEFAULT_FIXED_UNDERLINE_LENGTH ?? "20");

  autoScroll = new DropdownConfigItem<string>(process.env.DEFAULT_AUTO_SCROLL ?? "true", [
    "true",
    "false",
  ]);
  scrollBehavior = new DropdownConfigItem<ScrollBehavior>(
    (process.env.DEFAULT_SCROLL_BEHAVIOR as ScrollBehavior) ?? "smooth",
    ["smooth", "instant"]
  );

  strictClickDetection = new DropdownConfigItem<string>(
    process.env.DEFAULT_STRICT_CLICK_DETECTION ?? "true",
    ["true", "false"]
  );

  focusYBias: number = parseInt(process.env.DEFAULT_FOCUS_Y_BIAS ?? "20");
}
