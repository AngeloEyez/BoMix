<template>
  <div class="bom-table-container" @drop.prevent="handleDrop" @dragover.prevent>
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
import { inject, ref, watch, onMounted } from "vue";
import { Notify, useQuasar } from "quasar";
import EditSeriesDialog from "components/EditSeriesDialog.vue";

const bomix = inject("BoMix");
const $q = useQuasar();
const showEditSeries = ref(false);
const selected = ref([]);
const showDeleteConfirm = ref(false);
const bomList = ref([]);
const seriesInfo = bomix.getSeriesInfo();

// 監聽 series 變化
watch(
  () => seriesInfo.value.path,
  async (newPath) => {
    if (newPath) {
      await loadBOMList();
    } else {
      bomList.value = [];
      selected.value = [];
    }
  }
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
  // 保存拖放的文件
  const droppedFiles = event.dataTransfer.files;

  // 如果沒有 series path，先打開對話框
  if (!seriesInfo.value.path) {
    showEditSeries.value = true;
    // 等待對話框關閉
    await new Promise((resolve) => {
      const unwatch = watch(showEditSeries, async (newVal) => {
        if (!newVal) {
          // 對話框關閉
          unwatch(); // 停止監聽
          // 確認是否有 path
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

  // 確認有 path 後才處理文件
  if (!seriesInfo.value.path) return;

  for (const file of droppedFiles) {
    try {
      if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
        await bomix.importBOMfromXLS(file);
        await loadBOMList();
        Notify.create({
          type: "positive",
          message: `成功導入 ${file.name}`,
        });
      } else {
        Notify.create({
          type: "warning",
          message: `跳過非 Excel 檔案: ${file.name}`,
        });
      }
    } catch (error) {
      Notify.create({
        type: "negative",
        message: error.message || "導入失敗",
        caption: file.name,
      });
    }
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

onMounted(async () => {
  await loadBOMList();
});
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

  .table-header {
    padding: 8px 16px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;

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
    height: calc(100% - 48px);

    :deep(.q-table__middle) {
      max-height: unset !important;
    }

    :deep(.q-table__container) {
      height: 100%;
    }

    :deep(.q-virtual-scroll__content) {
      max-height: unset !important;
    }
  }
}
</style>
