// 系統日誌相關常量和方法
export const SessionLog = {
  LEVEL: {
    INFO: "information",
    WARNING: "warning",
    ERROR: "error",
  },
  MAX_LOGS: 500,

  // 靜態方法：將日誌添加到陣列
  push(array, message, level = SessionLog.LEVEL.INFO) {
    if (!Array.isArray(array)) {
      throw new Error("First parameter must be an array");
    }
    array.unshift({
      message,
      level,
    });
    return array;
  },
};
