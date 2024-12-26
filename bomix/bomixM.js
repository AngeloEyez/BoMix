import { app, ipcMain, dialog } from "electron";
import Datastore from "nedb-promises";
import log from "app/bomix/utils/logger";
import path from "path";
import { ConfigManager } from "./utils/configManager";
import pkg from "../package.json";
import { BomManager } from "./models/bomManager";

export class BoMixM {
  configManager;
  bomManager;

  constructor() {
    this.configManager = new ConfigManager();
    this.bomManager = new BomManager(this.configManager);
    this.#setupIpcHandlers();
    this.#setupAppHandlers(); //應用程序級別的事件
    log.log("BoMixR initialized");
  }

  #setupAppHandlers() {
    // 在應用程序退出前關閉數據庫
    app.on("before-quit", async (event) => {
      try {
        event.preventDefault(); // 暫時阻止退出
        log.log("Application is closing, cleaning up...");

        // 關閉當前數據庫
        await this.bomManager.closeCurrentDatabase();

        log.log("Cleanup completed, now quitting...");
        app.exit(0); // 正常退出
      } catch (error) {
        log.error("Error during cleanup:", error);
        app.exit(1); // 錯誤退出
      }
    });

    // 處理渲染進程崩潰
    app.on("render-process-gone", async (event, webContents, details) => {
      log.error("Renderer process crashed:", details);
      try {
        await this.bomManager.closeCurrentDatabase();
      } catch (error) {
        log.error("Error closing database after crash:", error);
      }
    });

    // 處理未捕獲的異常
    process.on("uncaughtException", async (error) => {
      log.error("Uncaught exception:", error);
      try {
        await this.bomManager.closeCurrentDatabase();
        app.exit(1);
      } catch (closeError) {
        log.error(
          "Error closing database after uncaught exception:",
          closeError
        );
        app.exit(1);
      }
    });
  }

  /**
   * @description 封裝 IPC API
   * @param
   * @returns
   */
  #setupIpcHandlers() {
    ipcMain.handle("BoMix-action", async (_event, args) => {
      const { action, data } = args;

      switch (action) {
        case "get-app-version":
          return { status: "success", content: pkg.version };

        case "get-current-database":
          try {
            const currentDb = this.bomManager.getCurrentDatabase();
            if (currentDb) {
              const seriesInfo = await currentDb.getSeriesInfo();
              return { status: "success", content: seriesInfo };
            }
            return { status: "success", content: null };
          } catch (error) {
            log.error("Failed to get current database:", error);
            return { status: "error", message: error.message };
          }

        case "select-database":
          const dbPath = await this.bomManager.selectOrCreateDatabase();
          return { status: "success", content: dbPath };

        case "init-database":
          try {
            const db = await this.bomManager.initDatabase(
              data.path,
              data.seriesName,
              data.seriesNote
            );
            return { status: "success", content: await db.getSeriesInfo() };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "import-bom-data":
          try {
            const db = this.bomManager.getCurrentDatabase();
            if (!db) {
              throw new Error("No database is currently open");
            }

            // 創建或更新項目
            const project = await db.createProject(data.project);

            // 創建所有組
            for (const groupData of data.groups) {
              await db.createGroup(project._id, groupData);
            }

            return {
              status: "success",
              content: await db.getFullProjectBOM(project._id),
              message: project.updatedAt ? "專案已更新" : "專案已創建",
            };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "get-config":
          return {
            status: "success",
            content: this.configManager.getConfig(),
          };

        case "update-config":
          try {
            log.log(data);
            const updatedConfig = this.configManager.updateConfig(data);
            return { status: "success", content: updatedConfig };
          } catch (error) {
            log.log(error);
            return { status: "error", message: error.message };
          }

        case "update-series":
          try {
            const db = this.bomManager.getCurrentDatabase();
            if (!db) {
              throw new Error("No database is currently open");
            }
            const updatedSeries = await db.updateSeriesInfo(data);
            return { status: "success", content: updatedSeries };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "close-database":
          try {
            await this.bomManager.closeCurrentDatabase();
            return { status: "success" };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "open-database":
          try {
            const dbPath = data.path;
            // 嘗試打開現有數據庫
            const db = await this.bomManager.openDatabase(dbPath);
            const seriesInfo = await db.getSeriesInfo();
            return {
              status: "success",
              content: seriesInfo,
              message: "已開啟現有數據庫",
            };
          } catch (error) {
            // 如果打開失敗，創建新數據庫
            const db = await this.bomManager.initDatabase(
              data.path,
              "New Series",
              ""
            );
            const seriesInfo = await db.getSeriesInfo();
            return {
              status: "success",
              content: seriesInfo,
              message: "已創建新數據庫",
            };
          }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    });

    ipcMain.handle("dialog:openDirectory", async () => {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
      });
      return result.canceled ? null : result.filePaths[0];
    });

    console.log("BoMixR - IPC initialized.");
  }
}
