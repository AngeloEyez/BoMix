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

      const result = await dialog.showSaveDialog({
        title: "選擇或創建數據庫文件",
        defaultPath: path.join(defaultPath, "bom-series.db"),
        filters: [{ name: "Database", extensions: ["db"] }],
        properties: ["createDirectory"],
      });

      if (result.canceled) {
        return null;
      }

      return result.filePath;
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
}
