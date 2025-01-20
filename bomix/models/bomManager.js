import { dialog } from "electron";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import { BomModel } from "./bomModel";
import log from "../utils/logger";
import path from "path";
import { SessionLog } from "../sessionLog";

export class BomManager {
  #currentDb = null;
  #configManager;

  constructor(configManager) {
    this.#configManager = configManager;
  }

  /**
   * 導入多個 BOM 文件
   * @param {Array} files 要導入的文件列表，每個文件包含 path 屬性
   * @param {Array} result 用於收集導入結果的數組
   * @returns {Promise<void>}
   */
  async importBOMs(files, result) {
    const db = this.getCurrentDatabase();
    if (!db) {
      throw new Error("NO_DATABASE");
    }

    for (const file of files) {
      const filePath = file.path;
      if (!filePath) {
        SessionLog.push(result, `無效的文件路徑: ${filePath}`, SessionLog.LEVEL.WARNING);
        log.warn("Invalid file path:", filePath);
        continue;
      }
      const filename = path.basename(filePath);

      try {
        // 讀取 Excel 文件
        const workbook = await this.readExcelFile(filePath);

        // 檢查 BOM 類型
        const bomType = this.detectBOMType(workbook);
        log.log(`Detected BOM type: ${bomType} for file ${filename}`);

        // 根據不同類型解析數據
        switch (bomType) {
          case "commonBOM":
            try {
              await this.#parseCommonBOM(workbook, filename);
              SessionLog.push(result, `成功導入 Common BOM: ${filename}`, SessionLog.LEVEL.INFORMATION);
            } catch (error) {
              SessionLog.push(result, `導入 Common BOM 失敗: ${filename} 錯誤: ${error.message}`, SessionLog.LEVEL.ERROR);
              log.error(`Parse Common BOM failed for file ${filename}:`, error);
              continue;
            }
            break;
          case "matrixBOM":
            try {
              await this.#parseMatrixBOM(workbook, filename);
              SessionLog.push(result, `成功導入 Matrix BOM: ${filename}`, SessionLog.LEVEL.INFORMATION);
            } catch (error) {
              SessionLog.push(result, `導入 Matrix BOM 失敗: ${filename} 錯誤: ${error.message}`, SessionLog.LEVEL.ERROR);
              log.error(`Parse Matrix BOM failed for file ${filename}:`, error);
              continue;
            }
            break;
          default:
            SessionLog.push(result, `不支援的 BOM 類型: ${filename}`, SessionLog.LEVEL.WARNING);
            continue;
        }
      } catch (error) {
        // 記錄錯誤信息
        SessionLog.push(result, `導入文件失敗: ${filename} 錯誤: ${error.message}`, SessionLog.LEVEL.ERROR);
        log.error(`Failed to import file ${filename}:`, error);
      }
    }
  }

  async readExcelFile(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      return XLSX.read(buffer, { type: "buffer" });
    } catch (error) {
      log.error("Read Excel file failed:", error);
      throw error;
    }
  }

  detectBOMType(workbook) {
    try {
      const sheets = workbook.SheetNames;

      // 檢查 commonBOM
      const commonSheets = ["ALL", "SMD", "PTH", "BOTTOM", "MP"];
      const hasCommonSheets = commonSheets.every((sheet) => sheets.includes(sheet));

      if (hasCommonSheets) {
        // 檢查所有 commonSheets 的第5列是否都有13個項目
        const isCommonBOM = commonSheets.every((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const headerRow = this.#getRowData(sheet, 5);
          return headerRow.filter((cell) => cell !== null).length === 13;
        });

        if (isCommonBOM) {
          return "commonBOM";
        }
      }

      // 檢查 matrixBOM
      const matrixSheets = ["SMD", "PTH"];
      const hasMatrixSheets = matrixSheets.every((sheet) => sheets.includes(sheet));

      if (hasMatrixSheets) {
        // 檢查所有 matrixSheets 的第5列是否都有17個項目
        const isMatrixBOM = matrixSheets.every((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const headerRow = this.#getRowData(sheet, 5);
          return headerRow.length === 17;
        });

        if (isMatrixBOM) {
          return "matrixBOM";
        }
      }

      return "unknown BOM type";
    } catch (error) {
      log.error("Detect BOM type failed:", error);
      throw error;
    }
  }

  #getRowData(sheet, rowIndex) {
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const row = [];

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex - 1, c: C });
      const cell = sheet[cellAddress];
      row.push(cell ? cell.v : null);
    }

    return row;
  }

  #getCellValue(sheet, row, col) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellAddress];
    return cell ? cell.v : "";
  }

  #extractProjectInfo(sheet, cellAddress, prefix) {
    try {
      const value = this.#getCellValue(sheet, XLSX.utils.decode_cell(cellAddress).r, XLSX.utils.decode_cell(cellAddress).c);

      if (!value) return "";

      // 如果找到前綴，移除它並清理空白
      if (value.includes(prefix)) {
        return value.split(prefix)[1].trim();
      }

      // 如果沒有找到前綴，返回整個值（清理後）
      return value.trim();
    } catch (error) {
      log.error(`Failed to extract project info from ${cellAddress}:`, error);
      return "";
    }
  }

  async #parseCommonBOM(workbook, filename) {
    try {
      const worksheets = ["SMD", "PTH", "BOTTOM"];
      const groups = [];

      // 處理每個 worksheet
      for (const sheetName of worksheets) {
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        let currentGroup = null;

        // 從第6列開始處理
        for (let row = 5; row <= range.e.r; row++) {
          // 獲取當前行的所有數據
          const rowData = {
            item: this.#getCellValue(sheet, row, 0), // A列
            hhpn: this.#getCellValue(sheet, row, 1), // B列
            stdpn: this.#getCellValue(sheet, row, 2), // C列
            grppn: this.#getCellValue(sheet, row, 3), // D列
            description: this.#getCellValue(sheet, row, 4), // E列
            mfg: this.#getCellValue(sheet, row, 5), // F列
            mfgpn: this.#getCellValue(sheet, row, 6), // G列
            qty: this.#getCellValue(sheet, row, 7), // H列
            location: this.#getCellValue(sheet, row, 8), // I列
            ccl: this.#getCellValue(sheet, row, 9), // J列
            leadtime: this.#getCellValue(sheet, row, 10), // K列
            remark: this.#getCellValue(sheet, row, 11), // L列
            approval: this.#getCellValue(sheet, row, 12), // M列
          };

          // 跳過空行
          if (!rowData.hhpn || !rowData.mfgpn) continue;

          // 如果 A 列有值，創建新的 group
          if (rowData.item) {
            currentGroup = {
              process: sheetName,
              item: rowData.item,
              qty: rowData.qty,
              location: rowData.location,
              ccl: rowData.ccl,
              parts: [],
            };
            groups.push(currentGroup);

            // 添加主要來源
            currentGroup.parts.push({
              hhpn: rowData.hhpn,
              description: rowData.description,
              mfg: rowData.mfg,
              mfgpn: rowData.mfgpn,
              remark: rowData.remark,
              isMain: true,
            });
          }
          // 如果 A 列沒有值且有當前 group，添加為次要來源
          else if (currentGroup) {
            currentGroup.parts.push({
              hhpn: rowData.hhpn,
              description: rowData.description,
              mfg: rowData.mfg,
              mfgpn: rowData.mfgpn,
              remark: rowData.remark,
              isMain: false,
            });
          }
        }
      }

      // 從 SMD sheet 中提取項目信息
      const smdSheet = workbook.Sheets["SMD"];
      const projectInfo = {
        project: this.#extractProjectInfo(smdSheet, "B3", "Product Code:"),
        description: this.#extractProjectInfo(smdSheet, "B4", "Description:"),
        pcapn: this.#extractProjectInfo(smdSheet, "F4", "PCA PN:"),
        version: this.#extractProjectInfo(smdSheet, "H3", "BOM Version:"),
        phase: this.#extractProjectInfo(smdSheet, "J3", "Phase:"),
        date: this.#extractProjectInfo(smdSheet, "H4", "Date:"),
        filename: filename,
      };

      // 創建或更新 BOM
      const bom = await db.createBOM(projectInfo);

      // 創建所有 groups
      for (const groupData of groups) {
        await db.createGroup(bom._id, groupData);
      }
    } catch (error) {
      //log.error("Parse Common BOM failed:", error);
      throw error;
    }
  }

  async #parseMatrixBOM(workbook, filename) {
    try {
      const groups = [];
      const sheets = ["SMD", "PTH", "BOTTOM"];

      for (const sheetName of sheets) {
        console.log(sheetName);
      }

      // 從 SMD sheet 中提取項目信息
      const smdSheet = workbook.Sheets["SMD"];
      const projectInfo = {
        project: this.#extractProjectInfo(smdSheet, "B3", "Product Code:"),
        description: this.#extractProjectInfo(smdSheet, "B4", "Description:"),
        pcapn: this.#extractProjectInfo(smdSheet, "F4", "PCA PN:"),
        version: this.#extractProjectInfo(smdSheet, "H3", "BOM Version:"),
        phase: this.#extractProjectInfo(smdSheet, "J3", "Phase:"),
        date: this.#extractProjectInfo(smdSheet, "H4", "Date:"),
        filename: filename,
      };

      return {
        project: projectInfo,
        groups: groups,
      };
    } catch (error) {
      log.error("Parse Matrix BOM failed:", error);
      throw error;
    }
  }

  async selectOrCreateDatabase() {
    try {
      const config = this.#configManager.getConfig();
      const defaultPath = config.defaultDatabasePath || process.cwd();

      const result = await dialog.showOpenDialog({
        title: "選擇或創建數據庫文件",
        defaultPath: defaultPath,
        filters: [{ name: "Database", extensions: ["db"] }],
        properties: ["openFile", "createDirectory", "promptToCreate"],
        message: "選擇現有數據庫或輸入新檔案名稱以創建",
      });

      if (result.canceled) {
        return null;
      }

      // 返回選擇的路徑（無論是現有文件還是新文件）
      return result.filePaths[0];
    } catch (error) {
      log.error("Failed to select database path:", error);
      throw error;
    }
  }

  async initDatabase(dbPath, seriesName, seriesNote = "") {
    try {
      if (this.#currentDb) {
        await this.#currentDb.close();
      }

      this.#currentDb = new BomModel(dbPath);
      await this.#currentDb.initSeries(seriesName, seriesNote);

      log.log("Database initialized:", dbPath);
      return this.#currentDb;
    } catch (error) {
      log.error("Failed to initialize database:", error);
      throw error;
    }
  }

  getCurrentDatabase() {
    return this.#currentDb;
  }

  async closeCurrentDatabase() {
    if (this.#currentDb) {
      await this.#currentDb.close();
      this.#currentDb = null;
    }
  }

  async openDatabase(dbPath) {
    try {
      if (this.#currentDb) {
        await this.#currentDb.close();
      }

      this.#currentDb = new BomModel(dbPath);
      const seriesInfo = await this.#currentDb.getSeriesInfo();

      if (!seriesInfo) {
        throw new Error("Invalid database format");
      }

      log.log("Database opened:", dbPath);
      return this.#currentDb;
    } catch (error) {
      log.error("Failed to open database:", error);
      throw error;
    }
  }
}
