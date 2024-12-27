<template>
  <q-dialog v-model="isOpen" persistent @keyup.esc="handleEscape">
    <q-card style="min-width: 400px">
      <q-card-section class="row items-center">
        <div class="text-h6">系列設定</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup v-if="canClose" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="row items-center">
          <div class="col">
            <q-input
              v-model="seriesInfo.path"
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

        <q-input
          ref="nameInput"
          v-model="seriesInfo.name"
          label="系列名稱"
          :rules="[(val) => !!val || '請輸入系列名稱']"
          :disable="!isEditable"
          @update:model-value="handleNameChange"
          outlined
          dense
          class="q-mt-md"
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
      </q-card-section>

      <!-- <q-card-actions align="right" class="text-primary">
        <q-btn
          flat
          label="確定"
          v-close-popup
          :disable="!canClose"
          @click="handleClose"
        />
      </q-card-actions> -->
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { Notify } from "quasar";
import { inject } from "vue";

const bomix = inject("BoMix");
const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = ref(props.modelValue);
const seriesInfo = ref({
  name: "",
  note: "",
  path: "",
});
const isSelectingFile = ref(false);

const nameInput = ref(null);

// 使用 bomix 的 seriesInfo 來判斷是否可編輯
const isEditable = computed(() => {
  return !!bomix.getSeriesInfo().value.path;
});

// 只有當沒有開啟資料庫，或者有開啟資料庫且有名稱時才能關閉
// 且不在選擇檔案時才能關閉
const canClose = computed(() => {
  return (
    !isSelectingFile.value &&
    (!seriesInfo.value.path ||
      (!!seriesInfo.value.path && !!seriesInfo.value.name))
  );
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
    await bomix.loadSeriesInfo();
    const currentSeries = bomix.getSeriesInfo();
    seriesInfo.value = {
      name: currentSeries.value.name,
      note: currentSeries.value.note,
      path: currentSeries.value.path,
    };

    if (!currentSeries.value.path) {
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
    isSelectingFile.value = true;
    const result = await bomix.selectAndOpenDatabase();
    isSelectingFile.value = false;

    if (result) {
      const currentSeries = bomix.getSeriesInfo();
      seriesInfo.value = {
        name: currentSeries.value.name,
        note: currentSeries.value.note,
        path: currentSeries.value.path,
      };

      Notify.create({
        type: "positive",
        message:
          result.message || `${currentSeries.value.filename} 數據庫已開啟`,
      });

      if (!currentSeries.value.name) {
        nextTick(() => {
          nameInput.value?.focus();
        });
      }
    }
  } catch (error) {
    Notify.create({
      type: "negative",
      message: error.message || `選擇數據庫失敗`,
    });
    isSelectingFile.value = false;
  }
}

// 處理名稱變更
async function handleNameChange(value) {
  if (!value || !isEditable.value) return;

  try {
    await bomix.updateSeriesInfo(value, seriesInfo.value.note);
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
    await bomix.updateSeriesInfo(seriesInfo.value.name, value);
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

// 處理 ESC 鍵
function handleEscape() {
  if (canClose.value) {
    isOpen.value = false;
  }
}
</script>
