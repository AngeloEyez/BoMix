# 修改 BOMViewer 組件的布局和顯示方式
<template>
  <div class="bom-viewer">
    <!-- Common BOM 表格 -->
    <div v-if="commonBOMs.length > 0" class="common-bom-section">
      <div class="text-subtitle1 q-mb-sm">Common BOM</div>
      <q-table
        :rows="commonBOMRows"
        :columns="commonColumns"
        row-key="key"
        dense
        flat
        :pagination="{ rowsPerPage: 0 }"
        :rows-per-page-options="[0]"
        class="full-height"
      >
        <!-- 自定義表格樣式 -->
        <template v-slot:body="props">
          <q-tr :props="props" :class="getRowClass(props.row)">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <!-- 處理 projects 欄位 -->
              <template v-if="col.name === 'projects'">
                <div class="project-quantities">
                  <template v-for="(qty, project) in props.row.projects" :key="project">
                    <div v-if="qty" class="project-qty">{{ project }}: {{ qty }}</div>
                  </template>
                </div>
              </template>
              <!-- 其他一般欄位 -->
              <template v-else>
                {{ col.value }}
              </template>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted } from "vue";
  import { inject } from "vue";
  import log from "app/bomix/utils/logger";

  const bomix = inject("BoMix");

  // 響應式數據
  const commonBOMs = ref([]);
  const loadedBOMs = ref(new Map()); // 用於存儲已加載的 BOM 數據

  // 表格列定義
  const commonColumns = [
    { name: "item", label: "Item", field: "item", align: "left", style: "width: 80px" },
    { name: "description", label: "Description", field: "description", align: "left" },
    { name: "mfg", label: "MFG", field: "mfg", align: "left", style: "width: 100px" },
    { name: "mfgpn", label: "MFGPN", field: "mfgpn", align: "left", style: "width: 120px" },
    { name: "ccl", label: "CCL", field: "ccl", align: "center", style: "width: 60px" },
    { name: "process", label: "Process", field: "process", align: "center", style: "width: 80px" },
    { name: "projects", label: "Projects", field: "projects", align: "left", style: "width: 200px" },
  ];

  // 計算屬性：處理 Common BOM 的所有行（包括主料和替代料）
  const commonBOMRows = computed(() => {
    const rows = [];
    let groupIndex = 0;

    // 遍歷所有已加載的 BOM
    loadedBOMs.value.forEach((bom) => {
      // 處理每個 group
      bom.groups.forEach((group) => {
        const mainPart = group.parts.find((p) => p.isMain);
        if (!mainPart) return;

        // 查找是否已存在相同的 group
        const existingGroupIndex = rows.findIndex((r) => r.isMain && r.mfg === mainPart.mfg && r.mfgpn === mainPart.mfgpn);

        if (existingGroupIndex !== -1) {
          // 如果存在，更新 projects 資訊
          rows[existingGroupIndex].projects[bom.project] = group.qty;
        } else {
          // 如果不存在，創建新的 group（主料）
          rows.push({
            key: `group_${groupIndex}_main`,
            groupIndex,
            isMain: true,
            item: group.item,
            description: mainPart.description,
            mfg: mainPart.mfg,
            mfgpn: mainPart.mfgpn,
            ccl: group.ccl,
            process: group.process,
            projects: { [bom.project]: group.qty },
          });

          // 添加替代料
          group.parts
            .filter((p) => !p.isMain)
            .forEach((part, partIndex) => {
              rows.push({
                key: `group_${groupIndex}_alt_${partIndex}`,
                groupIndex,
                isMain: false,
                item: "",
                description: part.description,
                mfg: part.mfg,
                mfgpn: part.mfgpn,
                ccl: "",
                process: "",
                projects: {},
              });
            });

          groupIndex++;
        }
      });
    });

    return rows;
  });

  // 監聽 selectedBOMs 的變化
  watch(
    () => bomix.seriesInfo.value?.config?.selectedBOMs?.common,
    async (newIds) => {
      if (!newIds) return;

      try {
        // 清理不再需要的 BOM 數據
        const currentIds = new Set(newIds);
        for (const [id] of loadedBOMs.value) {
          if (!currentIds.has(id)) {
            loadedBOMs.value.delete(id);
          }
        }

        // 加載新的 BOM 數據
        await Promise.all(
          newIds.map(async (id) => {
            if (!loadedBOMs.value.has(id)) {
              const bom = await bomix.getBOMById(id);
              if (bom) {
                loadedBOMs.value.set(id, bom);
              }
            }
          })
        );

        commonBOMs.value = Array.from(loadedBOMs.value.values());
      } catch (error) {
        log.error("Failed to load BOMs:", error);
      }
    },
    { immediate: true, deep: true }
  );

  // 根據 group 獲取行的樣式類
  const getRowClass = (row) => {
    return {
      "group-row": true,
      "group-even": row.groupIndex % 2 === 0,
      "group-odd": row.groupIndex % 2 === 1,
      "alt-part": !row.isMain,
    };
  };

  // 初始加載
  onMounted(async () => {
    const selectedIds = bomix.seriesInfo.value?.config?.selectedBOMs?.common;
    if (selectedIds) {
      try {
        await Promise.all(
          selectedIds.map(async (id) => {
            const bom = await bomix.getBOMById(id);
            if (bom) {
              loadedBOMs.value.set(id, bom);
            }
          })
        );
        commonBOMs.value = Array.from(loadedBOMs.value.values());
      } catch (error) {
        log.error("Failed to load initial BOMs:", error);
      }
    }
  });
</script>

<style lang="scss" scoped>
  .bom-viewer {
    height: 100%;
    width: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background-color: red;

    .common-bom-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .q-table {
        flex: 1;
        overflow: auto;
        background-color: white;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

        thead tr th {
          position: sticky;
          top: 0;
          z-index: 1;
          background-color: #f5f5f5;
          color: #666;
          font-weight: 500;
          font-size: 0.85rem;
          padding: 4px 8px;
        }

        tbody td {
          padding: 2px 8px;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        .group-row {
          &.group-even {
            background-color: #ffffff;
          }

          &.group-odd {
            background-color: rgba(0, 0, 0, 0.02);
          }

          &.alt-part {
            color: #666;
            font-style: italic;
          }

          &:hover {
            background-color: rgba(0, 0, 0, 0.03);
          }
        }

        .project-quantities {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;

          .project-qty {
            font-size: 0.85rem;
            color: #666;
            background-color: rgba(0, 0, 0, 0.05);
            padding: 1px 4px;
            border-radius: 3px;
          }
        }
      }
    }
  }
</style>
