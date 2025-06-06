import { Config } from "./Config";

export class ConfigManager {
  private static instance: Config;

  private constructor() {}

  static getInstance(): Config {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new Config();
    }
    return ConfigManager.instance;
  }
}
