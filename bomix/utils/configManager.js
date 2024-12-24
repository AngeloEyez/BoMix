import { app } from "electron";
import path from "path";
import fs from "fs";
import log from "./logger";

export class ConfigManager {
  #configPath;
  #config;

  constructor() {
    // 改用 userData 目錄而不是 exe 目錄
    this.#configPath = path.join(app.getPath("userData"), "config.json");
    console.log("configPath:", this.#configPath);
    this.#loadConfig();
  }

  #loadConfig() {
    try {
      if (fs.existsSync(this.#configPath)) {
        const data = fs.readFileSync(this.#configPath, "utf8");
        this.#config = JSON.parse(data);
        log.log("config loaded succesfully:", this.#config);
      } else {
        // 默認配置
        this.#config = {
          defaultPath: "",
        };
        this.#saveConfig();
        log.log("創建默認配置:", this.#config);
      }
    } catch (error) {
      log.error("加載配置文件失敗:", error);
      // 如果加載失敗，使用默認配置
      this.#config = { defaultPath: "" };
    }
  }

  #saveConfig() {
    try {
      // 確保目錄存在
      const configDir = path.dirname(this.#configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        log.log("創建配置目錄:", configDir);
      }

      // 檢查文件權限
      try {
        // 如果文件存在，檢查是否可寫
        if (fs.existsSync(this.#configPath)) {
          fs.accessSync(this.#configPath, fs.constants.W_OK);
        }
      } catch (error) {
        throw new Error(`配置文件無寫入權限: ${error.message}`);
      }

      // 寫入配置文件
      fs.writeFileSync(
        this.#configPath,
        JSON.stringify(this.#config, null, 2),
        "utf8"
      );
      log.log("配置保存成功:", this.#config);
      return true;
    } catch (error) {
      const errorMessage = `保存配置失敗: ${error.message}\n路徑: ${
        this.#configPath
      }\n數據: ${JSON.stringify(this.#config)}`;
      log.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  getConfig() {
    return { ...this.#config };
  }

  updateConfig(newConfig) {
    try {
      // 驗證新配置
      if (typeof newConfig !== "object") {
        throw new Error("配置必須是一個對象");
      }

      // 檢查必要的字段
      if (!("defaultPath" in newConfig)) {
        throw new Error("配置缺少必要的 defaultPath 字段");
      }

      // 更新配置
      this.#config = {
        ...this.#config,
        ...newConfig,
      };

      // 保存到文件
      this.#saveConfig();

      return this.getConfig();
    } catch (error) {
      const errorMessage = `更新配置失敗: ${error.message}`;
      log.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
}
