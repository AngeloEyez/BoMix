import { app, ipcMain, dialog } from "electron";
import Datastore from "nedb-promises";
import log from "app/bomix/utils/logger";
import path from "path";
import { ConfigManager } from "./utils/configManager";
import pkg from "../package.json";

export class BoMixM {
  db;
  configManager;

  constructor() {
    this.configManager = new ConfigManager();
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

        // Just for test
        case "perform-calculation":
          try {
            const result = data;
            return { status: "success", content: result };
          } catch (error) {
            return { status: "error", message: getErrorMsg(error) };
          }

        case "read-Excel":
          return { status: "success", content: "read-Excel" };

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
