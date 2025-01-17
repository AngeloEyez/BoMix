import { app, ipcMain, dialog } from "electron";
import path from "path";
import log from "./utils/logger";
import pkg from "../package.json";
import { ConfigManager } from "./config/configManager";
import { BomManager } from "./models/bomManager";

export class BoMixM {
  #bomManager;
  #configManager;

  constructor() {
    this.#configManager = new ConfigManager();
    this.#bomManager = new BomManager(this.#configManager);
    this.#setupIpcHandlers();
    this.#setupAppHandlers(); //應用程序級別的事件
    log.log("BoMixR: All initialized");
  }

  #setupAppHandlers() {
    // 在應用程序退出前關閉數據庫
    app.on("before-quit", async (event) => {
      try {
        event.preventDefault(); // 暫時阻止退出
        log.log("Application is closing, cleaning up...");

        // 關閉當前數據庫
        await this.#bomManager.closeCurrentDatabase();

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
        await this.#bomManager.closeCurrentDatabase();
      } catch (error) {
        log.error("Error closing database after crash:", error);
      }
    });

    // 處理未捕獲的異常
    process.on("uncaughtException", async (error) => {
      log.error("Uncaught exception:", error);
      try {
        await this.#bomManager.closeCurrentDatabase();
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
    ipcMain.handle("BoMix-action", async (event, { action, data }) => {
      switch (action) {
        case "get-app-version":
          return { status: "success", content: pkg.version };

        case "get-current-database":
          try {
            const currentDb = this.#bomManager.getCurrentDatabase();
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
          const dbPath = await this.#bomManager.selectOrCreateDatabase();
          return { status: "success", content: dbPath };

        case "init-database":
          try {
            const db = await this.#bomManager.initDatabase(
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
            const db = this.#bomManager.getCurrentDatabase();
            if (!db) {
              throw new Error("No database is currently open");
            }

            // 創建或更新 BOM
            const bom = await db.createBOM(data.project);

            // 創建所有 groups
            for (const groupData of data.groups) {
              await db.createGroup(bom._id, groupData);
            }

            return {
              status: "success",
              content: bom,
              message: "BOM data imported successfully",
            };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "get-config":
          return {
            status: "success",
            content: this.#configManager.getConfig(),
          };

        case "update-config":
          try {
            log.log(data);
            const updatedConfig = this.#configManager.updateConfig(data);
            return { status: "success", content: updatedConfig };
          } catch (error) {
            log.log(error);
            return { status: "error", message: error.message };
          }

        case "update-series":
          try {
            const db = this.#bomManager.getCurrentDatabase();
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
            await this.#bomManager.closeCurrentDatabase();
            return { status: "success" };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "open-database":
          try {
            const dbPath = data.path;
            const db = await this.#bomManager.openDatabase(dbPath);
            const seriesInfo = await db.getSeriesInfo();
            return {
              status: "success",
              content: seriesInfo,
              message: `已開啟 ${seriesInfo.filename} 數據庫`,
            };
          } catch (error) {
            // 如果打開失敗，創建新數據庫
            const db = await this.#bomManager.initDatabase(
              data.path,
              "New Series",
              ""
            );
            const seriesInfo = await db.getSeriesInfo();
            return {
              status: "success",
              content: seriesInfo,
              message: `已創建 ${seriesInfo.filename} 數據庫`,
            };
          }

        case "get-statistics":
          try {
            const db = this.#bomManager.getCurrentDatabase();
            if (!db) {
              return { status: "error", message: "No database is open" };
            }
            const stats = await db.getStatistics();
            return { status: "success", content: stats };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "get-full-bom":
          try {
            const db = this.#bomManager.getCurrentDatabase();
            if (!db) {
              throw new Error("No database is currently open");
            }
            const fullBOM = await db.getFullBOM(data.bomId);
            return { status: "success", content: fullBOM };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "get-bom-list":
          try {
            const db = this.#bomManager.getCurrentDatabase();
            if (!db) {
              return { status: "error", message: "No database is open" };
            }
            const boms = await db.getAllBOMsWithoutGroups();
            return { status: "success", content: boms };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "delete-boms":
          try {
            const db = this.#bomManager.getCurrentDatabase();
            if (!db) {
              return { status: "error", message: "No database is open" };
            }
            await db.deleteBOMs(data.ids);
            return { status: "success", message: "BOMs deleted successfully" };
          } catch (error) {
            return { status: "error", message: error.message };
          }

        case "import-excel-files":
          try {
            const db = this.#bomManager.getCurrentDatabase();
            if (!db) {
              return { status: "error", message: "NO_DATABASE" };
            }

            let filesToProcess = [];

            // 如果沒有有效的文件數據，打開文件選擇對話框
            if (
              !data.files ||
              !Array.isArray(data.files) ||
              data.files.length === 0
            ) {
              const result = await dialog.showOpenDialog({
                properties: ["openFile", "multiSelections"],
                filters: [
                  {
                    name: "Excel Files",
                    extensions: ["xls", "xlsx"],
                  },
                ],
                title: "選擇 Excel BOM 文件",
              });

              if (result.canceled) {
                return { status: "canceled", message: "Operation cancelled" };
              }

              filesToProcess = result.filePaths.map((path) => ({ path }));
            } else {
              filesToProcess = data.files;
            }

            for (const file of filesToProcess) {
              const filePath = file.path;
              if (!filePath) {
                log.error("Invalid file path:", filePath);
                continue;
              }

              const workbook = await this.#bomManager.readExcelFile(filePath);
              const bomData = await this.#bomManager.parseExcelData(
                workbook,
                path.basename(filePath)
              );

              // 創建或更新 BOM
              const bom = await db.createBOM(bomData.project);

              // 創建所有 groups
              for (const groupData of bomData.groups) {
                await db.createGroup(bom._id, groupData);
              }
            }

            return {
              status: "success",
              message: "BOM files imported successfully",
            };
          } catch (error) {
            log.error("Import Excel files failed:", error);
            return { status: "error", message: error.message };
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

    log.log("BoMixR: IPC initialized.");
  }
}
