// ==========================================================
// log-electron
//
// main process: import { log } from 'app/bomix/utils/utils';
// renderer process:

// electron-log supports the following log levels:
//

import log from "electron-log";
import { maxDepth, toJSON } from "electron-log/src/node/transforms/object";

const isMain = typeof process === "object" && process.type === "browser";
if (!isMain) {
  // 在渲染進程
  //customizeLog();
} else {
  // 在主進程

  log.initialize();
  //customizeLog();
}

//设置格式
log.transports.console.format =
  "{h}:{i}:{s}.{ms}[{processType}][{level}] {text}";

log.hooks.push((message, transport) => {
  if (transport !== log.transports.console) {
    return message;
  }
  message.variables.processType =
    message.variables.processType === "main" ? "M" : "R";
  return message;
});

// Echo console.log() etc. to the terminal using electron logger.
Object.assign(console, log.functions);

// 更完整的客製化輸出  --------------------------------------------------------------------------------
//import chalk from 'chalk';

async function customizeLog() {
  const color = {
    //error: chalk.bgRed.white.bold,
    //warn: chalk.yellow.bold,
    //info: chalk.blue.bold,
    error: (t) => t,
    warn: (t) => t,
    info: (t) => t,
    verbose: (t) => t,
    debug: (t) => t,
    silly: (t) => t,
  };

  //log.transports.file.resolvePathFn = () => path.join(global.logHome, 'debug_last.log');
  //log.transports.file.level = global.logLevel;

  // Change the console output to just the text we create in our hook.
  log.transports.console.format = "{text}";

  log.hooks.push((message, transport) => {
    let text = null;

    if (transport !== log.transports.console) {
      return message;
    }

    // Clone message and data because they are shared by the different
    // transports.
    const newMessage = Object.assign({}, message);
    const { data, date, level } = newMessage;
    const dataClone = [...data];

    if (typeof dataClone[0] === "string") {
      text = dataClone[0];
    } else {
      // Deal with objects, arrays etc.
      // Step 1: Ensure the object is not deeper the 6 levels.
      let safeObj = maxDepth({ data: dataClone[0] });

      // Step 2: This 'toJSON' method actually removes cyclic references so that
      // JSON.stringify() can safely handle them.
      safeObj = toJSON({ data: safeObj });

      // Step 3: JSON.stringify() the safe object
      text = JSON.stringify(toJSON({ data: safeObj }));
    }

    // Personal tweak to highlight messages starting with 'XXXXX'
    if (text.startsWith("XXXXX")) {
      //text = chalk.bold(text);
    }

    // Build strings ready for output
    const colorize = color[level];
    const lvl = padString(level, 7);
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour12: false, // 使用 24 小時制
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      fractionalSecondDigits: 3, // 毫秒顯示三位
    });

    // Tag entries with their process type:
    //   - M: main
    //   - R: renderer
    const processType =
      newMessage.variables.processType === "main" ? "[M]" : "[R]";

    // Colorize the beginning of the output
    const prefix = colorize(`${formattedTime}${processType}${lvl}|`);

    // Add the final string back to the clone of the data array and save it to
    // newMessage.data
    dataClone[0] = `${prefix} ${text}`;
    newMessage.data = dataClone;

    // Return the newly constructed message
    return newMessage;
  });

  Object.assign(console, log.functions);
}

function padString(str, maxLength) {
  while (str.length < maxLength) {
    str += " ";
  }
  return str;
}

export default log;
