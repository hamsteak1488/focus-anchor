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
    Config.assignProperties(config, object);
    return config;
  }

  static assignProperties(config: Config, object: any): void {
    for (const key of Object.keys(object) as (keyof Config)[]) {
      if (config[key] instanceof NumberConfigItem) {
        /*
          1.4.0에서 Config 코드 리팩토링된 버전으로 업데이트할 때 기존 설정값을 불러올 수 있도록 로직 추가.
          확장프로그램을 비활성화 해두거나 혹은 설정창을 계속 열지 않는다면 main.ts의 저장 로직으로 가지 못할 수 있으므로 최소 세 번의 업데이트 후에 삭제해야할 듯 함.
        */
        if (object[key].value === undefined && object[key] != undefined) {
          const oldNumberValue = object[key];
          delete object[key];
          object[key] = new NumberConfigItem(
            oldNumberValue,
            config[key].minValue,
            config[key].maxValue
          );
        }

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
  scrollBehavior = new DropdownConfigItem<string>(
    (process.env.DEFAULT_SCROLL_BEHAVIOR as string) ?? "smooth",
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
