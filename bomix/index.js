import { app, ipcMain } from "electron";
import log from "app/bomix/utils/logger";
import path from "path";

export class BoMixApp {
  constructor() {
    this.#setupIpcHandlers();
    log.log("BoMixApp initialized");

    log.log(app.getPath("exe"));
    log.log(path.join(app.getPath("exe"), "../conf.db"));
  }

  // 封裝 IPC API
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

    console.log("BoMixApp - IPC initialized.");
  }
}
