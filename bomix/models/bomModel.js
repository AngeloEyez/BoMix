import Datastore from "nedb-promises";
import path from "path";
import log from "../utils/logger";

export class BomModel {
  #db;
  #seriesInfo;

  constructor(dbPath) {
    this.#db = Datastore.create(dbPath);

    // 創建索引
    this.#db.ensureIndex({ fieldName: "type" }); // 用於區分不同類型的文檔
    this.#db.ensureIndex({ fieldName: "key" }); // 用於快速查找組
    this.#db.ensureIndex({ fieldName: "projectId" });
    this.#createIndexes();
  }

  async #createIndexes() {
    // 為組合鍵創建索引
    await this.#db.ensureIndex({ fieldName: "mfgpnKey" });
    await this.#db.ensureIndex({ fieldName: "projectId" });
    log.log("Database indexes created");
  }

  // Series 操作
  async initSeries(name, note = "") {
    try {
      const series = {
        type: "series",
        name,
        note,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.#seriesInfo = await this.#db.insert(series);
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
    return this.#seriesInfo;
  }

  // Project 操作
  async findExistingProject(projectData) {
    try {
      return await this.#db.findOne({
        type: "project",
        name: projectData.name,
        phase: projectData.phase,
        bomVersion: projectData.bomVersion,
      });
    } catch (error) {
      log.error("Failed to find existing project:", error);
      throw error;
    }
  }

  async updateProject(projectId, projectData) {
    try {
      const updatedProject = await this.#db.update(
        { _id: projectId },
        {
          $set: {
            ...projectData,
            updatedAt: new Date(),
          },
        },
        { returnUpdatedDocs: true }
      );

      // 刪除舊的 groups
      await this.#db.remove({ type: "group", projectId }, { multi: true });

      log.log("Project updated:", updatedProject);
      return updatedProject;
    } catch (error) {
      log.error("Failed to update project:", error);
      throw error;
    }
  }

  async createProject(projectData) {
    try {
      // 檢查是否存在相同的 project
      const existingProject = await this.findExistingProject(projectData);
      if (existingProject) {
        return await this.updateProject(existingProject._id, projectData);
      }

      const project = {
        type: "project",
        name: projectData.name,
        description: projectData.description,
        pcapn: projectData.pcapn,
        bomVersion: projectData.bomVersion,
        phase: projectData.phase,
        date: projectData.date || new Date(),
        filename: projectData.filename || "",
        createdAt: new Date(),
        //updatedAt: new Date(),
      };

      const savedProject = await this.#db.insert(project);
      log.log("Project created:", savedProject);
      return savedProject;
    } catch (error) {
      log.error("Failed to create project:", error);
      throw error;
    }
  }

  // Group 操作
  async createGroup(projectId, groupData) {
    try {
      // 創建 group key (主源的 MFG+MFGPN)
      const mainPart = groupData.parts.find((p) => p.isMain);
      if (!mainPart) {
        throw new Error("Main source part is required");
      }

      const group = {
        type: "group",
        projectId,
        process: groupData.process,
        item: groupData.item || "",
        qty: groupData.qty || "",
        location: groupData.location || "",
        ccl: groupData.ccl || "",
        mfgpnKey: `${mainPart.mfg}_${mainPart.mfgpn}`,
        parts: groupData.parts.map((part) => ({
          hhpn: part.hhpn,
          description: part.description,
          mfg: part.mfg,
          mfgpn: part.mfgpn,
          isMain: part.isMain || false,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedGroup = await this.#db.insert(group);
      log.debug("Group created:", savedGroup);
      return savedGroup;
    } catch (error) {
      log.error("Failed to create group:", error);
      throw error;
    }
  }

  // 查詢方法
  async getProjectById(projectId) {
    return await this.#db.findOne({ type: "project", _id: projectId });
  }

  async getAllProjects() {
    return await this.#db.find({ type: "project" }).sort({ createdAt: -1 });
  }

  async getGroupsByProjectId(projectId) {
    return await this.#db.find({ type: "group", projectId });
  }

  async findGroupByMfgpnKey(mfgpnKey) {
    return await this.#db.findOne({ type: "group", mfgpnKey });
  }

  // 完整的項目 BOM 數據
  async getFullProjectBOM(projectId) {
    const project = await this.getProjectById(projectId);
    if (!project) return null;

    const groups = await this.getGroupsByProjectId(projectId);

    return {
      ...project,
      groups,
    };
  }

  // 數據庫操作
  async close() {
    // 清理資源
    this.#db = null;
    this.#seriesInfo = null;
  }
}
