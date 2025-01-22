/** * BOM 選擇器組件 * 用於選擇和排序要顯示的 BOM 清單 */

<template>
  <q-card class="bom-selector" ref="dialogRef">
    <q-resize-observer @resize="onResize" debounce="50" />
    <div class="resize-handle"></div>
    <q-card-section class="row items-center q-pb-sm">
      <div class="text-h6">選擇 {{ bomTypeLabel }} BOM</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section class="q-pa-md q-pt-none">
      <div class="row q-col-gutter-md">
        <!-- 左側清單 -->
        <div class="col-5">
          <div class="text-subtitle2 q-mb-sm">所有 BOM</div>
          <q-input v-model="searchText" dense outlined placeholder="搜尋 BOM..." class="q-mb-md">
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>

          <div class="list-container">
            <q-list bordered separator class="rounded-borders source-list" :class="{ 'items-dragging': isDragging }">
              <q-item
                v-for="bom in filteredSourceBOMs"
                :key="bom._id"
                clickable
                :class="{ selected: selectedSourceItems.includes(bom._id) }"
                @click="handleSourceClick($event, bom._id)"
                @dblclick="addItem(bom._id)"
              >
                <q-item-section>
                  <div class="bom-item">
                    <span class="project">{{ bom.project }}</span>
                    <span class="phase">{{ bom.phase }}</span>
                    <span class="version">{{ bom.version }}</span>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>

        <!-- 中間按鈕組 -->
        <div class="col-2 flex flex-center column q-gutter-y-md">
          <q-btn icon="chevron_right" round color="primary" :disable="selectedSourceItems.length === 0" @click="addSelectedItems">
            <q-tooltip>加入選擇的 BOM</q-tooltip>
          </q-btn>
          <q-btn icon="chevron_left" round color="secondary" :disable="selectedTargetItems.length === 0" @click="removeSelectedItems">
            <q-tooltip>移除選擇的 BOM</q-tooltip>
          </q-btn>
          <q-btn icon="first_page" round color="negative" :disable="targetBOMs.length === 0" @click="removeAllItems">
            <q-tooltip>移除全部 BOM</q-tooltip>
          </q-btn>
        </div>

        <!-- 右側清單 -->
        <div class="col-5">
          <div class="text-subtitle2 q-mb-sm">
            要顯示的 BOM
            <span class="text-caption text-grey-8 q-ml-sm"> 已選擇 {{ targetBOMs.length }} 個 BOM </span>
          </div>
          <div class="list-container">
            <q-list bordered separator class="rounded-borders target-list" :class="{ 'items-dragging': isDragging }">
              <draggable v-model="targetBOMs" item-key="_id" handle=".handle" @start="isDragging = true" @end="isDragging = false">
                <template #item="{ element }">
                  <q-item
                    clickable
                    :class="{ selected: selectedTargetItems.includes(element._id) }"
                    @click="handleTargetClick($event, element._id)"
                    @dblclick="removeItem(element._id)"
                  >
                    <q-item-section avatar class="handle cursor-move">
                      <q-icon name="drag_indicator" />
                    </q-item-section>
                    <q-item-section>
                      <div class="bom-item">
                        <span class="project">{{ element.project }}</span>
                        <span class="phase">{{ element.phase }}</span>
                        <span class="version">{{ element.version }}</span>
                      </div>
                    </q-item-section>
                  </q-item>
                </template>
              </draggable>
            </q-list>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
  import { ref, computed, watch, onMounted, nextTick } from "vue";
  import { useQuasar } from "quasar";
  import draggable from "vuedraggable/src/vuedraggable";
  import { inject } from "vue";
  import log from "app/bomix/utils/logger";

  const props = defineProps({
    bomType: {
      type: String,
      required: true,
      validator: (value) => ["common", "matrix", "bccl"].includes(value),
    },
  });

  const bomix = inject("BoMix");
  const $q = useQuasar();

  // 狀態變數
  const searchText = ref("");
  const sourceBOMs = ref([]);
  const targetBOMs = ref([]);
  const selectedSourceItems = ref([]);
  const selectedTargetItems = ref([]);
  const isDragging = ref(false);
  const dialogRef = ref(null);
  const lastClickedSource = ref(null);
  const lastClickedTarget = ref(null);
  const minWidth = 900;
  const minHeight = 600;

  // 計算屬性
  const bomTypeLabel = computed(() => {
    const labels = {
      common: "Common",
      matrix: "Matrix",
      bccl: "BCCL",
    };
    return labels[props.bomType];
  });

  const filteredSourceBOMs = computed(() => {
    if (!searchText.value) return sourceBOMs.value;
    const searchLower = searchText.value.toLowerCase();
    return sourceBOMs.value.filter((bom) => {
      const bomText = `${bom.project}_${bom.phase}_${bom.version}`.toLowerCase();
      return bomText.includes(searchLower);
    });
  });

  // 方法
  const loadBOMs = async () => {
    try {
      // 從 bomix 加載所有 BOM
      const response = await window.BoMixAPI.sendAction("get-bom-list");
      if (response.status === "success") {
        sourceBOMs.value = response.content;

        // 從 seriesInfo.config 加載已選擇的 BOM id
        const selectedIds = bomix.seriesInfo.value?.config?.selectedBOMs?.[props.bomType] || [];
        log.log(`Loading selected BOMs for ${props.bomType}:`, selectedIds);

        // 根據 id 找到對應的 BOM 物件
        targetBOMs.value = selectedIds.map((id) => sourceBOMs.value.find((bom) => bom._id === id)).filter(Boolean);

        // 從源列表中移除已選擇的項目
        sourceBOMs.value = sourceBOMs.value.filter((bom) => !selectedIds.includes(bom._id));
      }
    } catch (error) {
      log.error("Failed to load BOMs:", error);
      $q.notify({
        type: "negative",
        message: "載入 BOM 清單失敗",
      });
    }
  };

  const toggleSourceSelection = (id) => {
    const index = selectedSourceItems.value.indexOf(id);
    if (index === -1) {
      selectedSourceItems.value.push(id);
    } else {
      selectedSourceItems.value.splice(index, 1);
    }
  };

  const toggleTargetSelection = (id) => {
    const index = selectedTargetItems.value.indexOf(id);
    if (index === -1) {
      selectedTargetItems.value.push(id);
    } else {
      selectedTargetItems.value.splice(index, 1);
    }
  };

  const addItem = (id) => {
    const item = sourceBOMs.value.find((bom) => bom._id === id);
    if (item) {
      targetBOMs.value.push(item);
      sourceBOMs.value = sourceBOMs.value.filter((bom) => bom._id !== id);
      selectedSourceItems.value = selectedSourceItems.value.filter((i) => i !== id);
    }
  };

  const addSelectedItems = () => {
    selectedSourceItems.value.forEach((id) => addItem(id));
  };

  const removeItem = (id) => {
    const item = targetBOMs.value.find((bom) => bom._id === id);
    if (item) {
      sourceBOMs.value.push(item);
      targetBOMs.value = targetBOMs.value.filter((bom) => bom._id !== id);
      selectedTargetItems.value = selectedTargetItems.value.filter((i) => i !== id);
    }
  };

  const removeSelectedItems = () => {
    selectedTargetItems.value.forEach((id) => removeItem(id));
  };

  const removeAllItems = () => {
    sourceBOMs.value.push(...targetBOMs.value);
    targetBOMs.value = [];
    selectedTargetItems.value = [];
  };

  // 處理窗口大小調整
  const onResize = ({ width, height }) => {
    if (!dialogRef.value) return;

    // 確保不超出主窗口大小
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.9;

    const newWidth = Math.min(Math.max(width, minWidth), maxWidth);
    const newHeight = Math.min(Math.max(height, minHeight), maxHeight);

    requestAnimationFrame(() => {
      dialogRef.value.style.width = `${newWidth}px`;
      dialogRef.value.style.height = `${newHeight}px`;
    });
  };

  // 初始化窗口大小
  const initializeDialogSize = () => {
    if (!dialogRef.value) return;

    const width = dialogRef.value.offsetWidth;
    const height = dialogRef.value.offsetHeight;
    onResize({ width, height });
  };

  // 處理源清單點擊
  const handleSourceClick = (event, id) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + 點擊：切換選擇狀態
      toggleSourceSelection(id);
    } else if (event.shiftKey && lastClickedSource.value) {
      // Shift + 點擊：選擇範圍
      const startIndex = sourceBOMs.value.findIndex((bom) => bom._id === lastClickedSource.value);
      const endIndex = sourceBOMs.value.findIndex((bom) => bom._id === id);
      const [start, end] = [startIndex, endIndex].sort((a, b) => a - b);

      selectedSourceItems.value = sourceBOMs.value.slice(start, end + 1).map((bom) => bom._id);
    } else {
      // 普通點擊：清除其他選擇，只選當前項
      selectedSourceItems.value = [id];
    }
    lastClickedSource.value = id;
  };

  // 處理目標清單點擊
  const handleTargetClick = (event, id) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + 點擊：切換選擇狀態
      toggleTargetSelection(id);
    } else if (event.shiftKey && lastClickedTarget.value) {
      // Shift + 點擊：選擇範圍
      const startIndex = targetBOMs.value.findIndex((bom) => bom._id === lastClickedTarget.value);
      const endIndex = targetBOMs.value.findIndex((bom) => bom._id === id);
      const [start, end] = [startIndex, endIndex].sort((a, b) => a - b);

      selectedTargetItems.value = targetBOMs.value.slice(start, end + 1).map((bom) => bom._id);
    } else {
      // 普通點擊：清除其他選擇，只選當前項
      selectedTargetItems.value = [id];
    }
    lastClickedTarget.value = id;
  };

  // 監聽目標列表變化，更新 seriesInfo
  watch(
    targetBOMs,
    async (newValue) => {
      // 只儲存 _id
      const selectedIds = newValue.map((bom) => bom._id);
      const currentConfig = bomix.seriesInfo?.value?.config || { selectedBOMs: {} };

      try {
        await bomix.updateSeriesInfo({
          config: {
            ...currentConfig,
            selectedBOMs: {
              ...currentConfig.selectedBOMs,
              [props.bomType]: selectedIds,
            },
          },
        });
        log.log(bomix.seriesInfo?.value?.config.selectedBOMs);
      } catch (error) {
        console.error("Failed to update selected BOMs:", error);
        $q.notify({
          type: "negative",
          message: "更新已選擇的 BOM 失敗",
        });
      }
    },
    { deep: true }
  );

  onMounted(() => {
    loadBOMs();
    // 等待 DOM 更新後初始化大小
    nextTick(() => {
      initializeDialogSize();
    });
  });
</script>

<style lang="scss" scoped>
  .bom-selector {
    width: 900px;
    max-width: 95vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    position: relative;
    resize: both;
    overflow: hidden;
  }

  .resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 20px;
    height: 20px;
    cursor: se-resize;
    background: linear-gradient(135deg, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.1) 100%);
  }

  .q-card__section:last-child {
    flex: 1;
    overflow: hidden;
  }

  .list-container {
    height: 450px;
    display: flex;
    flex-direction: column;
  }

  .source-list,
  .target-list {
    flex: 1;
    overflow-y: auto;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.12);

    &.items-dragging {
      cursor: move;
    }

    .q-item {
      cursor: pointer;
      user-select: none;

      &:hover {
        background-color: rgba(0, 0, 0, 0.03);
      }

      &.selected {
        background-color: rgba(25, 118, 210, 0.1) !important;
      }
    }

    .bom-item {
      display: flex;
      align-items: center;
      font-family: monospace;
      font-size: 14px;

      .project {
        min-width: 120px;
      }

      .phase {
        min-width: 60px;
        margin-left: 8px;
      }

      .version {
        min-width: 40px;
        margin-left: 8px;
      }
    }
  }

  .handle {
    cursor: move;
    color: #666;
  }

  .q-btn {
    margin: 4px 0;
  }
</style>
