import log from "./utils/logger";
import * as XLSX from "xlsx";
import { ref } from "vue";


export class BoMixR {
  #seriesInfo;
  #statistics;

  constructor() {
    this.#seriesInfo = ref({
      name: "",
      note: "",
      path: "",
      filename: "",
    });
    this.#statistics = ref({
      projectCount: 0,
      phaseCount: 0,
      bomCount: 0,
    });
    log.log("BoMixR initialized");
  }

  // 獲取 series info
  getSeriesInfo() {
    return this.#seriesInfo;
  }

  // 加載 series 信息
  async loadSeriesInfo() {
    try {
      const response = await window.BoMixAPI.sendAction("get-current-database");
      if (response.status === "success") {
        if (response.content) {
          this.#seriesInfo.value = {
            name: response.content.name || "",
            note: response.content.note || "",
            path: response.content.path || "",
            filename: response.content.filename || "",
          };
        } else {
          this.#seriesInfo.value = {
            name: "",
            note: "",
            path: "",
            filename: "",
          };
        }
      }
    } catch (error) {
      log.error("Load series info failed:", error);
      throw error;
    }
  }

  // 更新 series 信息
  async updateSeriesInfo(name, note) {
    try {
      const response = await window.BoMixAPI.sendAction("update-series", {
        name,
        note,
      });
      if (response.status === "success" && response.content) {
        this.#seriesInfo.value = {
          name: response.content.name,
          note: response.content.note,
          path: response.content.path,
          filename: response.content.filename,
        };
      } else {
        throw new Error(response.message || "更新系列信息失敗");
      }
    } catch (error) {
      log.error("Update series info failed:", error);
      throw error;
    }
  }

  // 選擇並打開數據庫
  async selectAndOpenDatabase() {
    try {
      const response = await window.BoMixAPI.sendAction("select-database");
      if (response.status === "success" && response.content) {
        const openResult = await window.BoMixAPI.sendAction("open-database", {
          path: response.content,
        });

        if (openResult.status === "success") {
          this.#seriesInfo.value = {
            name: openResult.content.name || "",
            note: openResult.content.note || "",
            path: openResult.content.path || "",
            filename: openResult.content.filename || "",
          };
          return openResult;
        }
      }
      return null;
    } catch (error) {
      log.error("Select and open database failed:", error);
      throw error;
    }
  }

  test(msg) {
    log.log("test:", msg);
  }

  // 獲取統計數據
  getStatistics() {
    return this.#statistics;
  }

  // 更新統計數據
  async updateStatistics() {
    try {
      const response = await window.BoMixAPI.sendAction("get-statistics");
      if (response.status === "success") {
        this.#statistics.value = response.content;
      } else {
        this.#statistics.value = {
          projectCount: 0,
          phaseCount: 0,
          bomCount: 0,
        };
      }
    } catch (error) {
      log.error("Update statistics failed:", error);
    }
  }
}
