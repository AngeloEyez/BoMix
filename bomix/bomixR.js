import log from "./utils/logger";
import * as XLSX from "xlsx";

export class BoMixR {
  constructor() {
    log.log("BoMixR initialized");
  }

  test(msg) {
    log.log("test:", msg);
  }

  async importBOMfromXLS(file) {
    try {
      // 檢查是否已經初始化數據庫
      const dbInfo = await window.BoMixAPI.sendAction("get-current-database");
      if (!dbInfo.content) {
        // 如果沒有打開的數據庫，提示用戶創建或選擇
        const dbPath = await window.BoMixAPI.sendAction("select-database");
        if (!dbPath.content) {
          throw new Error("未選擇數據庫路徑");
        }

        // 初始化數據庫
        const initResult = await window.BoMixAPI.sendAction("init-database", {
          path: dbPath.content,
          seriesName: "New Series", // 這裡可以添加一個對話框讓用戶輸入
          seriesNote: "Imported from Excel",
        });

        if (initResult.status !== "success") {
          throw new Error("數據庫初始化失敗");
        }
      }

      // 讀取 Excel 文件
      const data = await this.#readExcelFile(file);

      // 解析 Excel 數據
      const bomData = await this.#parseExcelData(data, file.name);

      // 保存到數據庫
      const result = await window.BoMixAPI.sendAction(
        "import-bom-data",
        bomData
      );

      log.log("BOM data imported:", result);
      return result;
    } catch (error) {
      log.error("Import BOM failed:", error);
      throw error;
    }
  }

  async #readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  async #parseExcelData(workbook, filename) {
    try {
      // 檢查 BOM 類型
      const bomType = this.#detectBOMType(workbook);
      log.log("Detected BOM type:", bomType);

      // 根據不同類型解析數據
      switch (bomType) {
        case "commonBOM":
          return await this.#parseCommonBOM(workbook, filename);
        case "matrixBOM":
          return await this.#parseMatrixBOM(workbook, filename);
        default:
          throw new Error(`不支援的 BOM 類型: ${bomType}`);
      }
    } catch (error) {
      log.error("Parse Excel data failed:", error);
      throw error;
    }
  }

  #detectBOMType(workbook) {
    try {
      const sheets = workbook.SheetNames;

      // 檢查 commonBOM
      const commonSheets = ["ALL", "SMD", "PTH", "BOTTOM", "MP"];
      const hasCommonSheets = commonSheets.every((sheet) =>
        sheets.includes(sheet)
      );

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
      const hasMatrixSheets = matrixSheets.every((sheet) =>
        sheets.includes(sheet)
      );

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

      throw new Error("無法識別的 BOM 格式");
    } catch (error) {
      log.error("Detect BOM type failed:", error);
      throw error;
    }
  }

  // 獲取指定行的數據
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

  // 解析 Common BOM
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
          if (!rowData.hhpn && !rowData.mfgpn) continue;

          // 如果 A 列有值，創建新的 group
          if (rowData.item) {
            currentGroup = {
              process: sheetName,
              item: rowData.item,
              project: {
                name: "", // 這些值可能需要從其他地方獲取
                models: [],
              },
              parts: [],
            };
            groups.push(currentGroup);

            // 添加主要來源
            currentGroup.parts.push({
              hhpn: rowData.hhpn,
              stdpn: rowData.stdpn,
              grppn: rowData.grppn,
              description: rowData.description,
              mfg: rowData.mfg,
              mfgpn: rowData.mfgpn,
              qty: rowData.qty,
              location: rowData.location,
              ccl: rowData.ccl,
              leadtime: rowData.leadtime,
              remark: rowData.remark,
              approval: rowData.approval,
              isMainSource: true,
            });
          }
          // 如果 A 列沒有值且有當前 group，添加為次要來源
          else if (currentGroup) {
            currentGroup.parts.push({
              hhpn: rowData.hhpn,
              stdpn: rowData.stdpn,
              grppn: rowData.grppn,
              description: rowData.description,
              mfg: rowData.mfg,
              mfgpn: rowData.mfgpn,
              qty: rowData.qty,
              location: rowData.location,
              ccl: rowData.ccl,
              leadtime: rowData.leadtime,
              remark: rowData.remark,
              approval: rowData.approval,
              isMainSource: false,
            });
          }
        }
      }

      // 從 SMD sheet 中提取項目信息
      const smdSheet = workbook.Sheets["SMD"];
      const projectInfo = {
        name: this.#extractProjectInfo(smdSheet, "B3", "Product Code:"),
        description: this.#extractProjectInfo(smdSheet, "B4", "Description:"),
        pcapn: this.#extractProjectInfo(smdSheet, "F4", "PCA PN:"),
        bomVersion: this.#extractProjectInfo(smdSheet, "H3", "BOM Version:"),
        phase: this.#extractProjectInfo(smdSheet, "J3", "Phase:"),
        date: this.#extractProjectInfo(smdSheet, "H4", "Date:"),
        filename: filename,
      };

      return {
        project: projectInfo,
        groups: groups,
      };
    } catch (error) {
      log.error("Parse Common BOM failed:", error);
      throw error;
    }
  }

  // 輔助方法：提取項目信息
  #extractProjectInfo(sheet, cellAddress, prefix) {
    try {
      const value = this.#getCellValue(
        sheet,
        XLSX.utils.decode_cell(cellAddress).r,
        XLSX.utils.decode_cell(cellAddress).c
      );

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

  // 輔助方法：獲取單元格值
  #getCellValue(sheet, row, col) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellAddress];
    return cell ? cell.v : "";
  }

  // 解析 Matrix BOM
  async #parseMatrixBOM(workbook, filename) {
    try {
      return {
        project: {
          name: "Matrix BOM Project",
          description: "Parsed from Matrix BOM format",
          pcapn: "TBD",
          bomVersion: "1.0",
          phase: "EVT",
          date: new Date(),
        },
        groups: [],
      };
    } catch (error) {
      log.error("Parse Matrix BOM failed:", error);
      throw error;
    }
  }
}
