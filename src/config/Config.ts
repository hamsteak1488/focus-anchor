import { DrawStrategy } from "../draw/DrawStrategy.enum";
import { DropdownConfigItem } from "./DropdownConfigItem";

export class Config {
  static get default(): Config {
    return new Config();
  }

  static from(object: any): Config {
    const config = Config.default;
    for (const key of Object.keys(object) as (keyof Config)[]) {
      if (typeof config[key] === "number") {
        (config as any)[key] = object[key];
      }
      if (typeof config[key] === "boolean") {
        (config as any)[key] = object[key];
      }
      if (config[key] instanceof DropdownConfigItem) {
        (config[key] as DropdownConfigItem<any>).select(object[key].selected);
      }
    }
    return config;
  }

  assignProperties(object: any): void {
    const config: Config = this;
    for (const key of Object.keys(object) as (keyof Config)[]) {
      if (typeof config[key] === "number") {
        (config as any)[key] = object[key];
      }
      if (typeof config[key] === "boolean") {
        (config as any)[key] = object[key];
      }
      if (config[key] instanceof DropdownConfigItem) {
        (config[key] as DropdownConfigItem<any>).select(object[key].selected);
      }
    }
  }

  marginX: number = 1;
  marginY: number = 2;

  drawStrategy = new DropdownConfigItem<DrawStrategy>(DrawStrategy.Outline, [
    DrawStrategy.Spotlight,
    DrawStrategy.Outline,
    DrawStrategy.Underline,
  ]);

  fixedUnderlineLength: number = 20;

  autoScroll: boolean = true;
  scrollBehavior = new DropdownConfigItem<ScrollBehavior>("smooth", ["smooth", "instant"]);

  strictClickDetection: boolean = true;

  focusYBias: number = 0.2;
}
