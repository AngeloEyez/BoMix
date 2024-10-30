import { app, ipcMain } from "electron";
import Datastore from "nedb-promises";
import log from "app/bomix/utils/logger";
import path from "path";

export class BoMixM {
  db;

  constructor() {
    this.#setupIpcHandlers();

    this.db = new Datastore();
    console.log(this.db);

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
          const version = app.getVersion();
          log.log(version);
          return { status: "success", content: version };

        case "perform-calculation":
          try {
            const result = data;
            return { status: "success", content: result };
          } catch (error) {
            return { status: "error", message: getErrorMsg(error) };
          }

        case "read-Excel":
          return { status: "success", content: "read-Excel" };

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    });

    console.log("BoMixR - IPC initialized.");
  }
}
