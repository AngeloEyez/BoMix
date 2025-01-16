<template>
  <div
    class="bom-table-container"
    @drop.prevent="handleDrop"
    @dragover.prevent
    :style="containerStyle"
  >
    <div class="table-header">
      <q-btn
        flat
        round
        dense
        icon="delete"
        class="action-btn"
        :class="{ disabled: !selected.length }"
        :disable="!selected.length"
        @click="confirmDelete"
      >
        <q-tooltip>刪除選中的 BOM</q-tooltip>
      </q-btn>

      <q-btn
        flat
        round
        dense
        icon="upload_file"
        class="action-btn"
        :class="{ disabled: !hasSeries }"
        :disable="!hasSeries"
        @click="import_excel_files()"
      >
        <q-tooltip>導入 Excel BOM</q-tooltip>
      </q-btn>
    </div>
    <q-table
      class="bom-table"
      :rows="bomList"
      :columns="columns"
      row-key="_id"
      v-model:selected="selected"
      selection="multiple"
      :pagination="{ rowsPerPage: 0 }"
      virtual-scroll
      :virtual-scroll-sticky-size-start="48"
      :rows-per-page-options="[0]"
      no-data-label="No data available"
    >
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th auto-width>
            <q-checkbox v-model="props.selected" />
          </q-th>
          <q-th v-for="col in props.cols" :key="col.name" :props="props">
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td auto-width>
            <q-checkbox v-model="props.selected" />
          </q-td>
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
            {{ props.row[col.field] }}
          </q-td>
        </q-tr>
      </template>
    </q-table>
    <EditSeriesDialog v-model="showEditSeries" />
    <q-dialog v-model="showDeleteConfirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm"
            >確定要刪除選中的 {{ selected.length }} 個 BOM 嗎？</span
          >
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn
            flat
            label="刪除"
            color="negative"
            @click="deleteBOMs"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { inject, ref, watch, onMounted, onUnmounted, computed } from "vue";
import { Notify, useQuasar } from "quasar";
import EditSeriesDialog from "components/EditSeriesDialog.vue";

const props = defineProps({
  availableHeight: {
    type: Number,
    required: true,
  },
});

// 計算容器高度
const containerStyle = computed(() => ({
  height: `${props.availableHeight}px`,
  maxHeight: `${props.availableHeight}px`,
}));

const bomix = inject("BoMix");
const $q = useQuasar();
const showEditSeries = ref(false);
const selected = ref([]);
const showDeleteConfirm = ref(false);
const bomList = ref([]);
const seriesInfo = bomix.getSeriesInfo();
const hasSeries = ref(false);

// 監聽 series 變化
watch(
  () => seriesInfo.value.path,
  async (newPath) => {
    if (newPath) {
      hasSeries.value = true;
      await loadBOMList();
    } else {
      hasSeries.value = false;
      bomList.value = [];
      selected.value = [];
    }
  },
  { immediate: true }
);

const columns = [
  {
    name: "project",
    required: true,
    label: "Project",
    align: "left",
    field: "project",
    sortable: true,
  },
  {
    name: "phase",
    required: true,
    label: "Phase",
    align: "left",
    field: "phase",
    sortable: true,
  },
  {
    name: "version",
    required: true,
    label: "Version",
    align: "left",
    field: "version",
    sortable: true,
  },
  {
    name: "date",
    required: true,
    label: "Date",
    align: "left",
    field: "date",
    sortable: true,
    format: (val) => new Date(val).toLocaleDateString(),
  },
];

async function loadBOMList() {
  try {
    if (!seriesInfo.value.path) {
      bomList.value = [];
      return;
    }
    const response = await window.BoMixAPI.sendAction("get-bom-list");
    if (response.status === "success") {
      bomList.value = response.content;
    }
  } catch (error) {
    $q.notify({
      type: "negative",
      message: "載入 BOM 列表失敗",
    });
    bomList.value = [];
  }
}

async function handleDrop(event) {
  let excelFiles = [];
  for (const f of event.dataTransfer.files) {
    if (f.name.endsWith(".xls") || f.name.endsWith(".xlsx"))
      excelFiles.push({
        path: window.BoMixAPI.getFilePath(f),
        name: f.name,
        type: f.type,
        size: f.size,
      });
    console.log("File Path of dragged files: ", f.path);
  }

  if (excelFiles.length === 0) {
    Notify.create({
      type: "warning",
      message: "沒有可導入的 Excel 文件",
    });
    return;
  }

  // 如果沒有 series path，先打開對話框
  if (!seriesInfo.value.path) {
    showEditSeries.value = true;
    // 等待對話框關閉
    await new Promise((resolve) => {
      const unwatch = watch(showEditSeries, async (newVal) => {
        if (!newVal) {
          unwatch();
          if (seriesInfo.value.path) {
            resolve();
          } else {
            Notify.create({
              type: "warning",
              message: "未選擇數據庫，取消導入",
            });
          }
        }
      });
    });
  }

  if (!seriesInfo.value.path) return;

  await import_excel_files(excelFiles);
}

async function import_excel_files(excelFiles = []) {
  try {
    const response = await window.BoMixAPI.sendAction("import-excel-files", {
      files: excelFiles,
    });

    if (response.status === "success") {
      await loadBOMList();
      await bomix.updateStatistics();
      Notify.create({
        type: "positive",
        message: "成功導入 BOM 文件",
      });
    } else if (response.status === "error") {
      Notify.create({
        type: "negative",
        message: response.message || "導入失敗",
      });
    }
  } catch (error) {
    Notify.create({
      type: "negative",
      message: error.message || "導入失敗",
    });
  }
}

function confirmDelete() {
  if (selected.value.length > 0) {
    showDeleteConfirm.value = true;
  }
}

async function deleteBOMs() {
  try {
    const response = await window.BoMixAPI.sendAction("delete-boms", {
      ids: selected.value.map((bom) => bom._id),
    });
    if (response.status === "success") {
      $q.notify({
        type: "positive",
        message: "刪除成功",
      });
      selected.value = [];
      await loadBOMList();
      await bomix.updateStatistics();
    }
  } catch (error) {
    $q.notify({
      type: "negative",
      message: "刪除失敗",
    });
  }
}
</script>

<style lang="scss" scoped>
.bom-table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  transition: height 0.3s ease;

  .table-header {
    padding: 8px 16px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
    display: flex;
    gap: 8px;

    .action-btn {
      color: #666;
      transition: all 0.3s ease;

      &:not(.disabled):hover {
        color: var(--q-primary);
      }

      &.disabled {
        opacity: 0.5;
      }
    }
  }

  .bom-table {
    flex: 1;
    display: flex;
    flex-direction: column;

    :deep(.q-table__container) {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    :deep(.q-table__middle) {
      flex: 1;
      min-height: 100px;
    }

    :deep(.q-virtual-scroll__content) {
      flex: 1;
    }

    :deep(.q-table__grid-content) {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :deep(.q-table__bottom) {
      border-top: 1px solid rgba(0, 0, 0, 0.12);
    }
  }
}
</style>
