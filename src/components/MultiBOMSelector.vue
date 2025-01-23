/** * BOM 選擇器組件 * 用於選擇和排序要顯示的 BOM 清單 */

<template>
  <div class="bom-selector" ref="cardRef">
    <!-- 標題列（可拖動區域） -->
    <div class="titlebar" @mousedown.prevent="startDrag">
      <div class="text-h6">選擇 {{ bomTypeLabel }} BOM</div>
      <q-space />
      <q-btn icon="close" flat round dense @click="$emit('close')" />
    </div>

    <!-- 主要內容區域 -->
    <div class="content-area">
      <div class="row q-col-gutter-md h-100">
        <!-- 左側清單 -->
        <div class="col-5 list-section">
          <div class="list-header">
            <div class="text-subtitle2">所有 BOM</div>
            <q-input v-model="searchText" dense outlined placeholder="搜尋 BOM..." class="q-mt-sm">
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>

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
        <div class="col-auto buttons-section">
          <div class="buttons-container">
            <q-btn
              icon="chevron_right"
              round
              flat
              color="grey-8"
              size="sm"
              :disable="selectedSourceItems.length === 0"
              @click="addSelectedItems"
            >
              <q-tooltip>加入選擇的 BOM</q-tooltip>
            </q-btn>
            <q-btn
              icon="chevron_left"
              round
              flat
              color="grey-8"
              size="sm"
              :disable="selectedTargetItems.length === 0"
              @click="removeSelectedItems"
            >
              <q-tooltip>移除選擇的 BOM</q-tooltip>
            </q-btn>
            <q-btn icon="first_page" round flat color="grey-8" size="sm" :disable="targetBOMs.length === 0" @click="removeAllItems">
              <q-tooltip>移除全部 BOM</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- 右側清單 -->
        <div class="col-5 list-section">
          <div class="list-header">
            <div class="text-subtitle2">已選擇的 BOM ({{ targetBOMs.length }})</div>
            <div class="description text-grey-7 q-mt-sm">
              <div>• 拖曳 <q-icon name="drag_indicator" size="16px" /> 可調整顯示順序</div>
              <div>• 雙擊項目可移除</div>
            </div>
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
    </div>

    <!-- resize 控制區域 -->
    <div class="resize-controls">
      <!-- 底部調整大小控制條 -->
      <div class="resize-bottom" @mousedown.prevent="startResizeBottom"></div>
      <!-- 右下角調整大小控制點 -->
      <div class="resize-corner" @mousedown.prevent="startResizeCorner"></div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted, onUnmounted } from "vue";
  import { useQuasar } from "quasar";
  import draggable from "vuedraggable/src/vuedraggable";
  import { inject } from "vue";
  import log from "app/bomix/utils/logger";

  // Props 和 Emits
  const props = defineProps({
    bomType: {
      type: String,
      required: true,
      validator: (value) => ["common", "matrix", "bccl"].includes(value),
    },
  });

  const emit = defineEmits(["close"]);

  // 注入依賴
  const bomix = inject("BoMix");
  const $q = useQuasar();

  // 狀態變數
  const searchText = ref("");
  const sourceBOMs = ref([]);
  const targetBOMs = ref([]);
  const selectedSourceItems = ref([]);
  const selectedTargetItems = ref([]);
  const isDragging = ref(false);
  const isResizing = ref(false);
  const dragStart = ref({ x: 0, y: 0 });
  const cardRef = ref(null);
  const lastClickedSource = ref(null);
  const lastClickedTarget = ref(null);
  const windowSize = computed(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  // 尺寸限制
  const sizeLimit = computed(() => ({
    min: {
      width: Math.floor(windowSize.value.width * 0.5),
      height: Math.floor(windowSize.value.height * 0.5),
    },
    max: {
      width: Math.floor(windowSize.value.width * 0.95),
      height: Math.floor(windowSize.value.height * 0.95),
    },
  }));

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

  // 拖動相關方法
  const startDrag = (event) => {
    if (event.target.closest("button")) return;

    isDragging.value = true;
    const rect = cardRef.value.getBoundingClientRect();

    dragStart.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const onDrag = (event) => {
    if (!isDragging.value || !cardRef.value) return;

    const rect = cardRef.value.getBoundingClientRect();
    const container = document.querySelector(".main-layout"); // 獲取主應用容器
    const containerRect = container.getBoundingClientRect();

    let newX = event.clientX - dragStart.value.x;
    let newY = event.clientY - dragStart.value.y;

    // 限制在主應用容器範圍內
    newX = Math.max(containerRect.left, Math.min(newX, containerRect.right - rect.width));
    newY = Math.max(containerRect.top, Math.min(newY, containerRect.bottom - rect.height));

    cardRef.value.style.left = `${newX}px`;
    cardRef.value.style.top = `${newY}px`;
  };

  const stopDrag = () => {
    isDragging.value = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  };

  // Resize 相關方法
  const startResizeCorner = (event) => {
    event.stopPropagation();
    if (!cardRef.value) return;

    isResizing.value = true;
    const rect = cardRef.value.getBoundingClientRect();

    dragStart.value = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      left: rect.left,
      type: "corner",
    };

    document.addEventListener("mousemove", onResize);
    document.addEventListener("mouseup", stopResize);
  };

  const startResizeBottom = (event) => {
    event.stopPropagation();
    if (!cardRef.value) return;

    isResizing.value = true;
    const rect = cardRef.value.getBoundingClientRect();

    dragStart.value = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      type: "bottom",
    };

    document.addEventListener("mousemove", onResize);
    document.addEventListener("mouseup", stopResize);
  };

  const onResize = (event) => {
    if (!isResizing.value || !cardRef.value) return;

    const container = document.querySelector(".main-layout");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const rect = cardRef.value.getBoundingClientRect();

    if (dragStart.value.type === "corner") {
      // 計算寬度和高度的變化量
      const deltaWidth = event.clientX - dragStart.value.startX;
      const deltaHeight = event.clientY - dragStart.value.startY;

      // 計算新的寬度和高度
      let newWidth = dragStart.value.startWidth + deltaWidth;
      let newHeight = dragStart.value.startHeight + deltaHeight;

      // 確保不超出容器右邊界
      const maxPossibleWidth = containerRect.right - dragStart.value.left;

      // 限制最小和最大尺寸
      newWidth = Math.min(Math.max(newWidth, sizeLimit.value.min.width), Math.min(sizeLimit.value.max.width, maxPossibleWidth));
      newHeight = Math.min(
        Math.max(newHeight, sizeLimit.value.min.height),
        Math.min(sizeLimit.value.max.height, containerRect.bottom - rect.top)
      );

      // 應用新的尺寸
      cardRef.value.style.width = `${newWidth}px`;
      cardRef.value.style.height = `${newHeight}px`;
    } else if (dragStart.value.type === "bottom") {
      // 只調整高度
      const deltaHeight = event.clientY - dragStart.value.startY;
      let newHeight = dragStart.value.startHeight + deltaHeight;

      newHeight = Math.min(
        Math.max(newHeight, sizeLimit.value.min.height),
        Math.min(sizeLimit.value.max.height, containerRect.bottom - rect.top)
      );

      cardRef.value.style.height = `${newHeight}px`;
    }
  };

  const stopResize = () => {
    isResizing.value = false;
    document.removeEventListener("mousemove", onResize);
    document.removeEventListener("mouseup", stopResize);
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

  // 修改初始化邏輯
  const initializeCard = () => {
    if (!cardRef.value) return;

    const container = document.querySelector(".main-layout");
    const containerRect = container.getBoundingClientRect();

    const initialWidth = Math.min(Math.max(900, sizeLimit.value.min.width), sizeLimit.value.max.width);
    const initialHeight = Math.min(Math.max(600, sizeLimit.value.min.height), sizeLimit.value.max.height);

    // 設置初始尺寸
    cardRef.value.style.width = `${initialWidth}px`;
    cardRef.value.style.height = `${initialHeight}px`;

    // 設置初始位置（置中）
    const left = containerRect.left + (containerRect.width - initialWidth) / 2;
    const top = containerRect.top + (containerRect.height - initialHeight) / 2;

    cardRef.value.style.left = `${left}px`;
    cardRef.value.style.top = `${top}px`;
  };

  // 生命週期鉤子
  onMounted(() => {
    loadBOMs();
    // 等待下一個渲染週期再初始化卡片
    requestAnimationFrame(initializeCard);
  });

  onUnmounted(() => {
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("mousemove", onResize);
    document.removeEventListener("mouseup", stopResize);
  });
</script>

<style lang="scss" scoped>
  .bom-selector {
    position: fixed;
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 4px;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12);
    width: 900px;
    height: 600px;
    transform: translate(0, 0);
    transition: none;
    z-index: 6000; // 確保在其他元素之上

    .titlebar {
      display: flex;
      align-items: center;
      padding: 4px 12px;
      background: #e0e0e0;
      cursor: move;
      user-select: none;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
      height: 36px;

      &:hover {
        background: #d5d5d5;
      }

      .text-h6 {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
      }
    }

    .content-area {
      flex: 1;
      overflow: hidden;
      padding: 6px 2px 1px 18px;
      height: calc(100% - 36px);
      background: #f5f5f5;

      .h-100 {
        height: 100%;
      }

      .list-section {
        display: flex;
        flex-direction: column;
        height: 100%;
        flex: 1; // 讓 list-section 填滿可用空間
        padding-right: 6px;
        padding-left: 6px;

        .list-header {
          flex: 0 0 auto;
          margin-bottom: 8px;
        }

        .list-container {
          flex: 1;
          overflow: hidden;
          min-height: 0; // 重要：允許 flex 子元素收縮

          .source-list,
          .target-list {
            height: 100%;
            overflow-y: auto;
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 4px;

            &.items-dragging {
              cursor: move;
            }

            .q-item {
              cursor: pointer;
              user-select: none;
              min-height: 32px;
              padding: 4px 8px;

              &:hover {
                background-color: rgba(0, 0, 0, 0.03);
              }

              &.selected {
                background-color: rgba(25, 118, 210, 0.1) !important;
              }

              .q-item__section--avatar {
                min-width: 24px;
                padding-right: 4px;
              }

              .q-item__section--side {
                padding-left: 4px;
              }
            }
          }
        }
      }

      .buttons-section {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 8px 0;

        .buttons-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
          justify-content: center;
          height: auto;

          .q-btn {
            width: 32px !important;
            height: 32px !important;
            padding: 6px !important;
            opacity: 1;
            transition: all 0.3s ease;

            &:hover:not(:disabled) {
              background-color: rgba(0, 0, 0, 0.05);
              opacity: 1;
            }

            &:active:not(:disabled) {
              background-color: rgba(0, 0, 0, 0.1);
            }

            &:disabled {
              opacity: 0.4 !important;
              color: rgba(0, 0, 0, 0.4) !important;
            }

            .q-icon {
              font-size: 24px;
              font-weight: 600;
            }

            &::before {
              box-shadow: none !important;
            }
          }
        }
      }
    }

    .resize-controls {
      position: absolute;
      right: 0;
      bottom: 0;
      z-index: 1;

      .resize-bottom {
        position: absolute;
        bottom: 0;
        left: -100%;
        width: calc(100% - 24px);
        height: 6px;
        cursor: ns-resize;
        background: transparent;

        &:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      }

      .resize-corner {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 24px;
        height: 24px;
        cursor: se-resize;
        background: linear-gradient(135deg, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.1) 100%);

        &:hover {
          background: linear-gradient(135deg, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.2) 100%);
        }

        &::after {
          content: "";
          position: absolute;
          right: 4px;
          bottom: 4px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 8px 8px;
          border-color: transparent transparent rgba(0, 0, 0, 0.3) transparent;
        }
      }
    }

    .description {
      font-size: 0.85rem;
      line-height: 1.4;

      .q-icon {
        vertical-align: text-bottom;
      }
    }
  }

  .handle {
    cursor: move;
    color: #666;
  }

  .bom-item {
    display: flex;
    align-items: center;
    font-family: monospace;
    font-size: 13px;
    gap: 8px;
    width: 100%;

    .project {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-left: -4px;
    }

    .phase {
      flex: 0 0 30px;
      text-align: left;
      padding-left: 4px;
    }

    .version {
      flex: 0 0 30px;
      text-align: left;
      padding-left: 4px;
    }
  }
</style>
