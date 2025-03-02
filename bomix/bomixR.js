import log from "./utils/logger";
import { ref } from "vue";
import { DEFAULT_CONFIG } from "./config/defaultConfig";
import { SessionLog } from "./sessionLog";

export class BoMixR {
  #seriesInfo; // 系列信息
  #statistics; // 統計信息
  #config; // 配置信息
  #sessionLogs; // 系統日誌內容
  #initialized; // 是否已初始化
  sessionLog; // 系統日誌類
  sessionLogState; // 新增 sessionLogState

  constructor() {
    this.sessionLog = SessionLog;
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
    this.#config = ref({ ...DEFAULT_CONFIG });
    this.#initialized = false;
    this.#sessionLogs = ref([]);
    this.sessionLogState = ref({
      isCollapsed: true,
      height: 24, // 預設高度為按鈕高度
    });
  }

  // 添加系統日誌
  addSessionLogs(logs) {
    // 確保輸入是陣列形式
    const logsArray = Array.isArray(logs) ? logs : [logs];

    const timestamp = new Date().toLocaleTimeString();
    const newLogs = logsArray.map((log) => {
      // 如果輸入是字符串，轉換為物件格式
      const logObj = typeof log === "string" ? { message: log, level: SessionLog.LEVEL.INFO } : { ...log };

      // 確保有默認的 level
      if (!logObj.level) {
        logObj.level = SessionLog.LEVEL.INFO;
      }

      return {
        ...logObj,
        timestamp,
      };
    });

    // 將新日誌添加到開頭
    this.#sessionLogs.value = [...newLogs, ...this.#sessionLogs.value];

    // 如果超過最大數量，刪除較舊的日誌
    if (this.#sessionLogs.value.length > SessionLog.MAX_LOGS) {
      this.#sessionLogs.value = this.#sessionLogs.value.slice(0, SessionLog.MAX_LOGS);
    }

    // 同時記錄到系統日誌
    // newLogs.forEach((l) => {
    //   switch (l.level) {
    //     case SessionLog.LEVEL.WARNING:
    //       log.warn(l.message);
    //       break;
    //     case SessionLog.LEVEL.ERROR:
    //       log.error(l.message);
    //       break;
    //     default:
    //       log.log(l.message);
    //   }
    // });
  }

  // 獲取系統日誌
  getSessionLogs() {
    return this.#sessionLogs;
  }

  // 清空系統日誌
  clearSessionLogs() {
    this.#sessionLogs.value = [];
  }

  // 初始化方法
  async #initialize() {
    try {
      await this.loadConfig();
      this.#initialized = true;
    } catch (error) {
      log.error("BoMixR - Failed to initialize:", error);
      throw error;
    }
  }

  // 確保初始化完成的輔助方法
  async ensureInitialized() {
    if (!this.#initialized) {
      await this.#initialize();
    }
  }

  // Getter for private config
  get config() {
    return this.#config;
  }

  // 獲取 series info
  get seriesInfo() {
    return this.#seriesInfo;
  }
  getSeriesInfo() {
    return this.#seriesInfo;
  }

  // 加載 config 信息
  async loadConfig() {
    try {
      const response = await window.BoMixAPI.sendAction("get-config");
      if (response.status === "success" && response.content) {
        Object.assign(this.#config.value, response.content);
      }
      log.log("BoMixR: load config:", this.#config.value);
    } catch (error) {
      log.error("BoMixR: Failed to load config :", error);
      throw error;
    }
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
            config: response.content.config || {
              selectedBOMs: {
                common: [],
                matrix: [],
                bccl: [],
              },
            },
          };
        } else {
          this.#seriesInfo.value = {
            name: "",
            note: "",
            path: "",
            filename: "",
            config: {
              selectedBOMs: {
                common: [],
                matrix: [],
                bccl: [],
              },
            },
          };
        }
      }
    } catch (error) {
      log.error("Load series info failed:", error);
      throw error;
    }
  }

  // 更新 series 信息
  async updateSeriesInfo(seriesData) {
    try {
      const response = await window.BoMixAPI.sendAction("update-series", seriesData);
      if (response.status === "success" && response.content) {
        this.#seriesInfo.value = {
          ...this.#seriesInfo.value,
          ...response.content,
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

  /**
   * 根據 ID 取得完整的 BOM 內容
   * @param {string} bomId - BOM 的 ID
   * @returns {Promise<Object>} BOM 的完整內容，包含 groups
   */
  async getBOMById(bomId) {
    try {
      const response = await window.BoMixAPI.sendAction("get-full-bom", { bomId });
      if (response.status === "success") {
        return response.content;
      }
      throw new Error(response.message || "Failed to get BOM");
    } catch (error) {
      log.error("Failed to get BOM by ID:", error);
      throw error;
    }
  }
}
