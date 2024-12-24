import { app, ipcMain } from "electron";
import Datastore from "nedb-promises";
import log from "app/bomix/utils/logger";
import path from "path";

export class BoMixM {
  db;

  constructor() {
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
          const version = app.getVersion();
          log.log(version);
          return { status: "success", content: version };

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

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    });

    console.log("BoMixR - IPC initialized.");
  }
}
