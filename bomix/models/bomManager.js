import { dialog } from "electron";
import path from "path";
import { BomModel } from "./bomModel";
import log from "../utils/logger";

export class BomManager {
  #currentDb = null;
  #configManager;

  constructor(configManager) {
    this.#configManager = configManager;
  }

  async selectOrCreateDatabase() {
    try {
      const config = this.#configManager.getConfig();
      const defaultPath = config.defaultDatabasePath || process.cwd();

      const result = await dialog.showOpenDialog({
        title: "選擇或創建數據庫文件",
        defaultPath: defaultPath,
        filters: [{ name: "Database", extensions: ["db"] }],
        properties: ["openFile", "createDirectory", "promptToCreate"],
        message: "選擇現有數據庫或輸入新檔案名稱以創建",
      });

      if (result.canceled) {
        return null;
      }

      // 返回選擇的路徑（無論是現有文件還是新文件）
      return result.filePaths[0];
    } catch (error) {
      log.error("Failed to select database path:", error);
      throw error;
    }
  }

  async initDatabase(dbPath, seriesName, seriesNote = "") {
    try {
      if (this.#currentDb) {
        await this.#currentDb.close();
      }

      this.#currentDb = new BomModel(dbPath);
      await this.#currentDb.initSeries(seriesName, seriesNote);

      log.log("Database initialized:", dbPath);
      return this.#currentDb;
    } catch (error) {
      log.error("Failed to initialize database:", error);
      throw error;
    }
  }

  getCurrentDatabase() {
    return this.#currentDb;
  }

  async closeCurrentDatabase() {
    if (this.#currentDb) {
      await this.#currentDb.close();
      this.#currentDb = null;
    }
  }

  async openDatabase(dbPath) {
    try {
      if (this.#currentDb) {
        await this.#currentDb.close();
      }

      this.#currentDb = new BomModel(dbPath);
      const seriesInfo = await this.#currentDb.getSeriesInfo();

      if (!seriesInfo) {
        throw new Error("Invalid database format");
      }

      log.log("Database opened:", dbPath);
      return this.#currentDb;
    } catch (error) {
      log.error("Failed to open database:", error);
      throw error;
    }
  }
}
