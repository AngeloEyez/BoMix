/**
 * BOM 資料庫模型
 *
 * 此模組負責處理 BOM (Bill of Materials) 相關的資料庫操作，包括：
 * - Series 管理：創建、讀取和更新系列資訊
 * - BOM 操作：創建、查詢、更新和刪除 BOM
 * - Group 操作：管理 BOM 中的零件群組
 * - 資料庫維護：索引創建、資料壓縮等
 *
 * 資料結構：
 * - Series：儲存系列基本資訊
 * - BOM：包含專案、版本、階段等基本資訊
 * - Group：包含零件資訊、位置、數量、Matrix等
 *
 * @module bomModel
 * @requires nedb-promises
 * @requires path
 * @requires ./utils/logger
 */

import Datastore from "nedb-promises";
import path from "path";
import log from "../utils/logger";

export class BomModel {
  #db;
  #seriesInfo;
  #dbPath;

  constructor(dbPath) {
    this.#db = Datastore.create(dbPath);
    this.#dbPath = dbPath;

    // 創建索引
    this.#db.ensureIndex({ fieldName: "type" }); // 用於區分不同類型的文檔
    this.#db.ensureIndex({ fieldName: "key" }); // 用於快速查找組
    this.#db.ensureIndex({ fieldName: "projectId" });
    this.#createIndexes();

    // 設定自動壓縮間隔時間（以毫秒為單位）
    this.#db.setAutocompactionInterval(5 * 60 * 1000);
  }

  async #createIndexes() {
    // 為組合鍵創建索引
    await this.#db.ensureIndex({ fieldName: "mfgpnKey" });
    await this.#db.ensureIndex({ fieldName: "project" });
    await this.#db.ensureIndex({ fieldName: "version" });
    await this.#db.ensureIndex({ fieldName: "phase" });
    log.log("Database indexes created");
  }

  // 手動觸發壓縮
  async compactDatabase() {
    try {
      await this.#db.compactDatafile();
      log.log("Database compaction completed");
    } catch (error) {
      log.error("Database compaction failed:", error);
      throw error;
    }
  }

  /**
   * 初始化或取得 Series 資訊的基本結構
   * @param {Object} options - 初始化選項
   * @param {string} options.name - Series 名稱
   * @param {string} options.note - Series 備註
   * @returns {Object} 標準化的 Series 資訊物件
   * @private
   */
  #initSeriesInfo(options = {}) {
    return this.#normalizeData({
      type: "series",
      name: options.name || "",
      note: options.note || "",
      path: this.#dbPath,
      filename: path.parse(this.#dbPath).name,
      config: {
        selectedBOMs: {
          common: undefined,
          matrix: undefined,
          bccl: undefined,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Series 操作
  async initSeries(name, note = "") {
    try {
      this.#seriesInfo = await this.#db.insert(this.#initSeriesInfo({ name, note }));
      log.log("Series initialized:", this.#seriesInfo);
      return this.#seriesInfo;
    } catch (error) {
      log.error("Failed to initialize series:", error);
      throw error;
    }
  }

  async getSeriesInfo() {
    if (!this.#seriesInfo) {
      this.#seriesInfo = await this.#db.findOne({ type: "series" });
    }

    // 如果沒有找到 series 信息，創建一個空的對象
    if (!this.#seriesInfo) {
      this.#seriesInfo = this.#initSeriesInfo();
    }

    return this.#seriesInfo;
  }

  // BOM 操作
  async findExistingBOM(bomData) {
    try {
      return await this.#db.findOne({
        type: "bom",
        project: bomData.project,
        phase: bomData.phase,
        version: bomData.version,
      });
    } catch (error) {
      log.error("Failed to find existing BOM:", error);
      throw error;
    }
  }

  async updateBOM(bomId, bomData) {
    try {
      const updatedBOM = await this.#db.update(
        { _id: bomId },
        {
          $set: {
            ...bomData,
            updatedAt: new Date(),
          },
        },
        { returnUpdatedDocs: true }
      );

      // 刪除舊的 groups
      await this.#db.remove({ type: "group", bomId }, { multi: true });

      log.log("BOM updated:", updatedBOM);
      return updatedBOM;
    } catch (error) {
      log.error("Failed to update BOM:", error);
      throw error;
    }
  }

  async createBOM(bomData) {
    try {
      // 檢查是否存在相同的 BOM
      const existingBOM = await this.findExistingBOM(bomData);
      if (existingBOM) {
        return await this.updateBOM(existingBOM._id, bomData);
      }

      const bom = this.#normalizeData({
        type: "bom",
        project: bomData.project,
        description: bomData.description,
        pcapn: bomData.pcapn,
        version: bomData.version,
        phase: bomData.phase,
        date: bomData.date || new Date(),
        filename: bomData.filename || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedBOM = await this.#db.insert(bom);
      log.log("BOM created:", savedBOM);
      return savedBOM;
    } catch (error) {
      log.error("Failed to create BOM:", error);
      throw error;
    }
  }

  // Group 操作
  async createGroup(bomId, groupData) {
    try {
      // 創建 group key (主源的 MFG+MFGPN)
      const mainPart = groupData.parts.find((p) => p.isMain);
      if (!mainPart) {
        throw new Error("Main source part is required");
      }

      const group = this.#normalizeData({
        type: "group",
        bomId,
        process: groupData.process,
        item: groupData.item || "",
        qty: groupData.qty || "",
        location: groupData.location || "",
        ccl: groupData.ccl || "",
        mfgpnKey: `${mainPart.mfg}_${mainPart.mfgpn}`,
        parts: groupData.parts.map((part) =>
          this.#normalizeData({
            hhpn: part.hhpn,
            description: part.description,
            mfg: part.mfg,
            mfgpn: part.mfgpn,
            isMain: part.isMain || false,
          })
        ),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedGroup = await this.#db.insert(group);

      //log.log("Group created:", savedGroup);
      return savedGroup;
    } catch (error) {
      log.error("Failed to create group:", error);
      throw error;
    }
  }

  // 查詢方法
  async getBOMById(bomId) {
    return await this.#db.findOne({ type: "bom", _id: bomId });
  }

  async getAllBOMs() {
    return await this.#db.find({ type: "bom" }).sort({ createdAt: -1 });
  }

  async getGroupsByBOMId(bomId) {
    return await this.#db.find({ type: "group", bomId });
  }

  async findGroupByMfgpnKey(mfgpnKey) {
    return await this.#db.findOne({ type: "group", mfgpnKey });
  }

  // 完整的 BOM 數據
  async getFullBOM(bomId) {
    const bom = await this.getBOMById(bomId);
    if (!bom) return null;

    const groups = await this.getGroupsByBOMId(bomId);

    return {
      ...bom,
      groups,
    };
  }

  // 數據庫操作
  async close() {
    try {
      // 執行最後一次壓縮
      await this.compactDatabase();

      // 清理資源
      //this.#db.stopAutocompaction();
      this.#db = null;
      this.#seriesInfo = null;

      log.log("Database closed and compacted");
    } catch (error) {
      log.error("Error closing database:", error);
      throw error;
    }
  }

  async updateSeriesInfo(seriesData) {
    try {
      if (!this.#seriesInfo) {
        // 如果沒有初始化，則創建一個新的
        this.#seriesInfo = this.#initSeriesInfo();
      }

      const updatedSeries = await this.#db.update(
        { type: "series" },
        {
          $set: {
            ...this.#normalizeData(seriesData),
            path: this.#dbPath,
            filename: path.parse(this.#dbPath).name,
            updatedAt: new Date(),
          },
        },
        { returnUpdatedDocs: true, upsert: true }
      );

      // 更新快取的系列資訊
      this.#seriesInfo = updatedSeries;

      //log.log("Series info updated:", updatedSeries);
      return updatedSeries;
    } catch (error) {
      log.error("Failed to update series info:", error);
      throw error;
    }
  }

  async getStatistics() {
    try {
      // 獲取所有 BOM
      const boms = await this.#db.find({ type: "bom" });

      // 計算不重複的專案名稱數量
      const uniqueProjects = new Set(boms.map((b) => b.project));

      // 計算不重複的階段數量
      const uniquePhases = new Set(boms.map((b) => b.phase));

      // 計算 BOM 總數
      const bomCount = new Set(boms.map((b) => `${b.project}_${b.phase}_${b.version}`));

      return {
        projectCount: uniqueProjects.size,
        phaseCount: uniquePhases.size,
        bomCount: bomCount.size,
      };
    } catch (error) {
      log.error("Get statistics failed:", error);
      throw error;
    }
  }

  // 查詢方法
  async getAllBOMsWithoutGroups() {
    try {
      return await this.#db.find({ type: "bom" }).sort({ createdAt: -1 });
    } catch (error) {
      log.error("Failed to get all BOMs:", error);
      throw error;
    }
  }

  async deleteBOMs(bomIds) {
    try {
      // 刪除指定的 BOM 記錄
      const deleteResult = await this.#db.remove({ type: "bom", _id: { $in: bomIds } }, { multi: true });

      // 刪除相關的 groups
      await this.#db.remove({ type: "group", bomId: { $in: bomIds } }, { multi: true });

      log.log(`Deleted ${deleteResult} BOMs and their groups`);
      return deleteResult;
    } catch (error) {
      log.error("Failed to delete BOMs:", error);
      throw error;
    }
  }

  // 將null或空字串轉為undefined，保留數字0
  #normalizeData(data) {
    const obj = { ...data };
    for (const key in obj) {
      if (obj[key] === null || obj[key] === "") {
        obj[key] = undefined;
      }
    }
    return obj;
  }

  /**
   * 更新指定 group 的 matrix 資料
   * @param {string} groupId - Group ID
   * @param {Object} matrix - Matrix 資料
   * @returns {Promise<void>}
   */
  async updateMatrix(groupId, matrix) {
    try {
      // 檢查 matrix 是否為空
      const isMatrixEmpty = Object.values(matrix).every((value) => (Array.isArray(value) ? value.length === 0 : !value));

      // 準備更新的資料
      const updateData = {
        matrix: isMatrixEmpty ? undefined : matrix,
        updatedAt: new Date(),
      };

      // 更新 group
      await this.#db.update({ _id: groupId }, { $set: updateData });

      //log.log(`Updated matrix for group ${groupId}:`, updateData.matrix);
    } catch (error) {
      log.error(`Failed to update matrix for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * 更新 Series 的 config
   * @param {Object} config - 新的 config 物件
   * @returns {Promise<Object>} 更新後的 Series 資訊
   */
  async updateSeriesConfig(config) {
    try {
      if (!this.#seriesInfo || !this.#seriesInfo._id) {
        throw new Error("Series not initialized");
      }

      const updateData = {
        config,
        updatedAt: new Date(),
      };

      await this.#db.update({ _id: this.#seriesInfo._id }, { $set: updateData });

      // 更新快取的 seriesInfo
      this.#seriesInfo = {
        ...this.#seriesInfo,
        ...updateData,
      };

      log.log("Series config updated");
      return this.#seriesInfo;
    } catch (error) {
      log.error("Failed to update series config:", error);
      throw error;
    }
  }
}
