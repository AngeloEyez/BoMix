/** * BOM 選擇器組件 * 用於選擇和排序要顯示的 BOM 清單 */

<template>
  <q-card class="bom-selector">
    <q-card-section class="row items-center">
      <div class="text-h6">選擇 {{ bomTypeLabel }} BOM</div>
      <q-space />
      <q-btn icon="close" flat round dense v-close-popup />
    </q-card-section>

    <q-card-section class="q-pa-md">
      <div class="row">
        <!-- 左側清單 -->
        <div class="col-5">
          <div class="text-subtitle2 q-mb-sm">所有 BOM</div>
          <q-input v-model="searchText" dense outlined placeholder="搜尋 BOM..." class="q-mb-md">
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-list bordered class="rounded-borders source-list" :class="{ 'items-dragging': isDragging }">
            <q-item
              v-for="bom in filteredSourceBOMs"
              :key="bom._id"
              clickable
              v-ripple
              :class="{ selected: selectedSourceItems.includes(bom._id) }"
              @click="toggleSourceSelection(bom._id)"
              @dblclick="addItem(bom._id)"
            >
              <q-item-section> {{ bom.project }}_{{ bom.phase }}_{{ bom.version }} </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- 中間按鈕組 -->
        <div class="col-2 flex flex-center column q-gutter-y-md">
          <q-btn icon="chevron_right" round color="primary" :disable="selectedSourceItems.length === 0" @click="addSelectedItems" />
          <q-btn icon="chevron_left" round color="secondary" :disable="selectedTargetItems.length === 0" @click="removeSelectedItems" />
          <q-btn icon="first_page" round color="negative" :disable="targetBOMs.length === 0" @click="removeAllItems" />
        </div>

        <!-- 右側清單 -->
        <div class="col-5">
          <div class="text-subtitle2 q-mb-sm">要顯示的 BOM</div>
          <q-list bordered class="rounded-borders target-list" :class="{ 'items-dragging': isDragging }">
            <draggable v-model="targetBOMs" item-key="_id" handle=".handle" @start="isDragging = true" @end="isDragging = false">
              <template #item="{ element }">
                <q-item
                  clickable
                  v-ripple
                  :class="{ selected: selectedTargetItems.includes(element._id) }"
                  @click="toggleTargetSelection(element._id)"
                >
                  <q-item-section avatar class="handle cursor-move">
                    <q-icon name="drag_indicator" />
                  </q-item-section>
                  <q-item-section> {{ element.project }}_{{ element.phase }}_{{ element.version }} </q-item-section>
                </q-item>
              </template>
            </draggable>
          </q-list>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
  import { ref, computed, watch, onMounted } from "vue";
  import { useQuasar } from "quasar";
  import draggable from "vuedraggable/src/vuedraggable";
  import { inject } from "vue";

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

        // 從 seriesInfo.config 加載已選擇的項目，若未初始化則使用空陣列
        const selectedBOMs = bomix.seriesInfo?.value?.config?.selectedBOMs?.[props.bomType] || [];
        targetBOMs.value = selectedBOMs.map((id) => sourceBOMs.value.find((bom) => bom._id === id)).filter(Boolean);

        // 從源列表中移除已選擇的項目
        sourceBOMs.value = sourceBOMs.value.filter((bom) => !targetBOMs.value.some((target) => target._id === bom._id));
      }
    } catch (error) {
      console.error("Failed to load BOMs:", error);
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

  // 監聽目標列表變化，更新 seriesInfo.config
  watch(
    targetBOMs,
    async (newValue) => {
      const selectedIds = newValue.map((bom) => bom._id);
      const currentConfig = bomix.seriesInfo?.value?.config || { selectedBOMs: {} };

      const newConfig = {
        ...currentConfig,
        selectedBOMs: {
          ...currentConfig.selectedBOMs,
          [props.bomType]: selectedIds,
        },
      };

      try {
        await bomix.updateSeriesConfig(newConfig);
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
  });
</script>

<style lang="scss" scoped>
  .bom-selector {
    width: 900px;
    max-width: 95vw;
  }

  .source-list,
  .target-list {
    height: 400px;
    overflow-y: auto;

    &.items-dragging {
      cursor: move;
    }

    .q-item {
      cursor: pointer;

      &.selected {
        background-color: rgba(var(--q-primary), 0.1);
      }
    }
  }

  .handle {
    cursor: move;
  }
</style>
