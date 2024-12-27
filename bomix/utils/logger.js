// ==========================================================
// log-electron
//
// main process: import { log } from 'app/bomix/utils/utils';
// renderer process:

// electron-log supports the following log levels:
//

import log from "electron-log";
import { maxDepth, toJSON } from "electron-log/src/node/transforms/object";

// 判斷當前進程類型
const isMain = process.type === "browser";
const processTag = isMain ? "[M]" : "[R]";

// 初始化日誌級別和格式
const initializeLogLevels = () => {
  try {
    // 設置所有傳輸方式的日誌級別為 silly（最低級別，顯示所有日誌）
    Object.keys(log.transports).forEach((transport) => {
      if (log.transports[transport]) {
        log.transports[transport].level = "silly";
      }
    });

    // 設置日誌格式
    if (log.transports?.console) {
      // 主進程添加時間戳，渲染進程不添加
      log.transports.console.format = isMain
        ? "{h}:{i}:{s}.{ms} {processType} [{level}] {text}"
        : "{processType} [{level}] {text}";
    }

    if (log.transports?.file) {
      log.transports.file.format =
        "{y}-{m}-{d} {h}:{i}:{s}.{ms} {processType} [{level}] {text}";
    }

    // 設置 IPC 傳輸格式
    if (log.transports?.ipc) {
      log.transports.ipc.format = "{processType} [{level}] {text}";
    }

    // 輸出當前日誌級別設置
    // console.log("Log levels configured:", {
    //   console: log.transports.console?.level,
    //   file: log.transports.file?.level,
    //   ipc: log.transports.ipc?.level,
    // });
  } catch (error) {
    console.error("Error initializing log levels:", error);
  }
};

// 添加自定義變量
log.variables.processType = processTag;

// 在主進程中初始化
if (isMain) {
  log.initialize();
  initializeLogLevels();
}

// 在渲染進程中初始化
if (!isMain) {
  log.initialize();
  initializeLogLevels();
}

export default log;
