import { app, ipcMain, dialog } from "electron";
import Datastore from "nedb-promises";
import log from "app/bomix/utils/logger";
import path from "path";
import { ConfigManager } from "./utils/configManager";
import pkg from "../package.json";
import { BomManager } from "./models/bomManager";

export class BoMixM {
  db;
  configManager;
  bomManager;

  constructor() {
    this.configManager = new ConfigManager();
    this.bomManager = new BomManager();
    this.#setupIpcHandlers();

    this.db = Datastore.create("C:\\Temp\\abc.db");
    console.log(this.db);

    var doc = {
      hello: "world",
      n: 5,
      today: new Date(),
      nedbIsAwesome: true,
      notthere: null,
      notToBeSaved: undefined, // Will not be saved
      fruits: ["apple", "orange", "pear"],
      infos: { name: "nedb" },
    };

    this.db.insert(doc);

    // debug message
    log.log(app.getPath("exe"));
    log.log(path.join(app.getPath("exe"), "../conf.db"));
    log.log("BoMixR initialized");
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

            // 創建項目
            const project = await db.createProject(data.project);

            // 創建所有組
            for (const groupData of data.groups) {
              await db.createGroup(project._id, groupData);
            }

            return {
              status: "success",
              content: await db.getFullProjectBOM(project._id),
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
