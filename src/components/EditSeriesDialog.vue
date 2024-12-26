<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 400px">
      <q-card-section class="row items-center">
        <div class="text-h6">系列設定</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup v-if="canClose" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="seriesInfo.name"
          label="系列名稱"
          :rules="[(val) => !!val || '請輸入系列名稱']"
          :disable="!isEditable"
          @update:model-value="handleNameChange"
          outlined
          dense
        />

        <q-input
          v-model="seriesInfo.note"
          label="備註"
          type="textarea"
          :disable="!isEditable"
          @update:model-value="handleNoteChange"
          class="q-mt-md"
          outlined
          dense
        />

        <div class="row items-center q-mt-md">
          <div class="col">
            <q-input
              v-model="filePath"
              label="數據庫路徑"
              readonly
              outlined
              dense
            >
              <template v-slot:append>
                <q-btn flat dense icon="folder" @click="selectDatabaseFile" />
              </template>
            </q-input>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn
          flat
          label="確定"
          v-close-popup
          :disable="!canClose"
          @click="handleClose"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { Notify } from "quasar";

const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(props.modelValue);
const isEditable = ref(false);
const filePath = ref("");
const seriesInfo = ref({
  name: "",
  note: "",
});

// 只有當有名稱且可編輯時才能關閉
const canClose = computed(() => {
  return isEditable.value && !!seriesInfo.value.name;
});

watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val;
    if (val) {
      loadSeriesInfo();
    }
  }
);

watch(isOpen, (val) => {
  emit("update:modelValue", val);
});

// 加載系列信息
async function loadSeriesInfo() {
  try {
    const response = await window.BoMixAPI.sendAction("get-current-database");
    if (response.status === "success" && response.content) {
      seriesInfo.value = {
        name: response.content.name || "",
        note: response.content.note || "",
      };
      filePath.value = response.content.path || "";
      isEditable.value = true;
    } else {
      // 沒有已開啟的數據庫，自動開啟選擇對話框
      isEditable.value = false;
      await selectDatabaseFile();
    }
  } catch (error) {
    Notify.create({
      type: "negative",
      message: "加載系列信息失敗",
    });
  }
}

// 選擇數據庫文件
async function selectDatabaseFile() {
  try {
    const response = await window.BoMixAPI.sendAction("select-database");
    if (response.status === "success" && response.content) {
      const newDbPath = response.content;

      // // 檢查當前是否有已開啟的數據庫
      // const currentDb = await window.BoMixAPI.sendAction(
      //   "get-current-database"
      // );

      // if (currentDb.status === "success" && currentDb.content) {
      //   // 有已開啟的數據庫，先關閉它
      //   await window.BoMixAPI.sendAction("close-database");
      // }

      // 嘗試打開或創建新數據庫
      const openResult = await window.BoMixAPI.sendAction("open-database", {
        path: newDbPath,
      });

      if (openResult.status === "success") {
        // 更新界面顯示
        filePath.value = openResult.content.path;
        seriesInfo.value = {
          name: openResult.content.name || "",
          note: openResult.content.note || "",
        };
        isEditable.value = true;

        // 顯示成功消息
        Notify.create({
          type: "positive",
          message: openResult.message || "數據庫已開啟",
        });
      }
    }
  } catch (error) {
    Notify.create({
      type: "negative",
      message: error.message || "選擇數據庫失敗",
    });
  }
}

// 處理名稱變更
async function handleNameChange(value) {
  if (!value || !isEditable.value) return;

  try {
    await window.BoMixAPI.sendAction("update-series", {
      name: value,
      note: seriesInfo.value.note,
    });
  } catch (error) {
    Notify.create({
      type: "negative",
      message: "更新系列名稱失敗",
    });
  }
}

// 處理備註變更
async function handleNoteChange(value) {
  if (!isEditable.value) return;

  try {
    await window.BoMixAPI.sendAction("update-series", {
      name: seriesInfo.value.name,
      note: value,
    });
  } catch (error) {
    Notify.create({
      type: "negative",
      message: "更新系列備註失敗",
    });
  }
}

// 處理關閉
function handleClose() {
  if (!canClose.value) return;
  isOpen.value = false;
}
</script>
