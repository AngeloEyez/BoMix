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
            <q-input v-model="seriesInfo.path" label="數據庫路徑" readonly outlined dense>
              <template v-slot:append>
                <q-btn flat dense icon="folder" @click="selectDatabaseFile" />
                <q-btn v-if="seriesInfo.path" flat dense icon="close" class="close-db-btn" @click="closeDatabase">
                  <q-tooltip>關閉數據庫</q-tooltip>
                </q-btn>
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
  const seriesInfo = bomix.getSeriesInfo();
  const isSelectingFile = ref(false);

  const nameInput = ref(null);

  // 直接使用 seriesInfo 的 path 值來判斷是否可編輯
  const isEditable = ref(!!seriesInfo.value.path);

  // 監聽 series 變化
  watch(
    () => seriesInfo.value.path,
    (newPath) => {
      isEditable.value = !!newPath;
    }
  );

  // 直接使用 ref 來管理是否可以關閉
  const canClose = ref(true);

  // 監聽相關狀態變化來更新 canClose
  watch(
    [isSelectingFile, () => seriesInfo.value.path, () => seriesInfo.value.name],
    ([selecting, path, name]) => {
      canClose.value = !selecting && (!path || (!!path && !!name));
    },
    { immediate: true }
  );

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

      if (!seriesInfo.value.path) {
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
    // 如果是第一次開啟資料庫（之前沒有開啟的資料庫）
    const hadPreviousDatabase = !!seriesInfo.value.name;

    try {
      isSelectingFile.value = true;
      const result = await bomix.selectAndOpenDatabase();
      isSelectingFile.value = false;

      if (result) {
        bomix.addSessionLogs({
          message: `${seriesInfo.value.filename} (${seriesInfo.value.name}) 數據庫已開啟 (${seriesInfo.value.path})`,
          level: bomix.sessionLog.LEVEL.INFO,
        });
        Notify.create({
          type: "positive",
          message: result.message || `${seriesInfo.value.filename} 數據庫已開啟`,
        });

        // 如果已經有名稱，表示是已存在的資料庫，可以直接關閉對話框
        if (seriesInfo.value.name && !hadPreviousDatabase) {
          isOpen.value = false;
          return;
        }

        if (!seriesInfo.value.name) {
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
      await bomix.updateSeriesInfo({
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
      await bomix.updateSeriesInfo({
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

  // 處理 ESC 鍵
  function handleEscape() {
    if (canClose.value) {
      isOpen.value = false;
    }
  }

  // 關閉數據庫
  async function closeDatabase() {
    try {
      const response = await window.BoMixAPI.sendAction("close-database");
      if (response.status === "success") {
        bomix.addSessionLogs({
          message: `${seriesInfo.value.filename} (${seriesInfo.value.name}) 數據庫已關閉 (${seriesInfo.value.path})`,
          level: bomix.sessionLog.LEVEL.INFO,
        });
        await bomix.loadSeriesInfo();
        if (!seriesInfo.value.path) {
          isSelectingFile.value = false;
          nameInput.value = null;
        }
        Notify.create({
          type: "positive",
          message: "數據庫已關閉",
        });
      }
    } catch (error) {
      Notify.create({
        type: "negative",
        message: error.message || "關閉數據庫失敗",
      });
    }
  }
</script>

<style lang="scss" scoped>
  .close-db-btn {
    margin-left: 4px;
    color: #666;

    &:hover {
      color: var(--q-negative);
    }
  }
</style>
