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
    // 設置日誌格式
    if (log.transports?.console) {
      log.transports.console.level = "silly";
      // 主進程添加時間戳，渲染進程不添加
      log.transports.console.format = isMain
        ? "{h}:{i}:{s}.{ms} {processType} [{level}] {text}"
        : "{processType} [{level}] {text}";
    }

    if (log.transports?.file) {
      log.transports.file.level = "silly";
      log.transports.file.format =
        "{y}-{m}-{d} {h}:{i}:{s}.{ms} {processType} [{level}] {text}";
    }

    // 設置 IPC 傳輸格式
    if (log.transports?.ipc) {
      log.transports.ipc.level = "silly";
      log.transports.ipc.format = "{processType} [{level}] {text}";
    }
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
