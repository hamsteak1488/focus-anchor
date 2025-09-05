import { DrawStrategy } from "../draw/DrawStrategy.enum";
import { ToastOption } from "../Renderer";
import { ColorConfigItem } from "./ColorConfigItem";
import { DropdownConfigItem } from "./DropdownConfigItem";
import { NumberConfigItem } from "./NumberConfigItem";

export class Config {
  static get default(): Config {
    return new Config();
  }

  static from(object: any): Config {
    const config = Config.default;
    for (const key of Object.keys(object) as (keyof Config)[]) {
      if (config[key] instanceof NumberConfigItem) {
        config[key].value = object[key].value;
        continue;
      }
      if (config[key] instanceof DropdownConfigItem) {
        config[key].selected = object[key].selected;
        continue;
      }
      if (config[key] instanceof ColorConfigItem) {
        config[key].selected = object[key].selected;
        continue;
      }

      (config as any)[key] = object[key];
    }
    return config;
  }

  assignProperties(object: any): void {
    const config: Config = this;
    for (const key of Object.keys(object) as (keyof Config)[]) {
      if (config[key] instanceof NumberConfigItem) {
        config[key].value = object[key].value;
        continue;
      }
      if (config[key] instanceof DropdownConfigItem) {
        config[key].selected = object[key].selected;
        continue;
      }
      if (config[key] instanceof ColorConfigItem) {
        config[key].selected = object[key].selected;
        continue;
      }

      (config as any)[key] = object[key];
    }
  }

  paddingX = new NumberConfigItem(parseInt(process.env.DEFAULT_PADDING_X ?? "1"), null, null);
  paddingY = new NumberConfigItem(parseInt(process.env.DEFAULT_PADDING_X ?? "2"), null, null);

  drawStrategy = new DropdownConfigItem<DrawStrategy>(
    DrawStrategy[(process.env.DEFAULT_DRAW_STRATEGY as keyof typeof DrawStrategy) ?? "Underline"],
    [
      DrawStrategy.Underline,
      DrawStrategy.FixedUnderline,
      DrawStrategy.Outline,
      DrawStrategy.MergedOutline,
      DrawStrategy.Spotlight,
      DrawStrategy.FirstCharOutline,
      DrawStrategy.Highlighter,
      DrawStrategy.FirstCharHighlighter,
      DrawStrategy.Bracket,
    ]
  );

  drawColor = new ColorConfigItem(process.env.DEFAULT_DRAW_COLOR ?? "#FF0000");

  opacity = new NumberConfigItem(parseInt(process.env.DEFAULT_OPACITY ?? "100"), 0, 100);

  lineWidth = new NumberConfigItem(parseInt(process.env.DEFAULT_LINE_WIDTH ?? "3"), 1, null);

  borderRadius = new NumberConfigItem(parseInt(process.env.DEFAULT_BORDER_RADIUS ?? "0"), 0, 100);

  fixedUnderlineLength = new NumberConfigItem(
    parseInt(process.env.DEFAULT_FIXED_UNDERLINE_LENGTH ?? "20"),
    null,
    null
  );

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

  focusYBias = new NumberConfigItem(parseInt(process.env.DEFAULT_FOCUS_Y_BIAS ?? "30"), 0, 100);

  toggleHotkey: string = process.env.DEFAULT_TOGGLE_HOTKEY ?? "Control+Shift+F";
  movePrevHotkey: string = process.env.DEFAULT_MOVE_PREV_HOTKEY ?? "ArrowLeft";
  moveNextHotkey: string = process.env.DEFAULT_MOVE_NEXT_HOTKEY ?? "ArrowRight";

  toastOption = new DropdownConfigItem<ToastOption>(
    (process.env.DEFAULT_TOAST_OPTION as ToastOption) ?? ToastOption.BOTTOM,
    [ToastOption.TOP, ToastOption.MIDDLE, ToastOption.BOTTOM, ToastOption.DISABLED]
  );
}
