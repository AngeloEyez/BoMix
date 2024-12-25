<template>
  <q-dialog v-model="isOpen" persistent @keyup.esc="handleCancel">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">系統設置</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="config.defaultDatabasePath"
          label="預設數據庫路徑"
          outlined
          dense
        >
          <template v-slot:append>
            <q-btn flat dense icon="folder" @click="selectDirectory" />
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="取消" @click="handleCancel" />
        <q-btn flat label="保存" @click="saveConfig" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, watch } from "vue";
import { Notify } from "quasar";

// 定義組件名稱
defineOptions({
  name: "ConfigDialog",
});

// 定義 props 和 emits
const props = defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

// 組件邏輯
const isOpen = ref(props.modelValue);
const config = reactive({
  defaultDatabasePath: "",
});

// 監聽對話框開啟狀態
watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val;
    if (val) {
      loadConfig();
    }
  }
);

// 監聽內部狀態變化
watch(isOpen, (val) => {
  emit("update:modelValue", val);
});

// 加載配置
async function loadConfig() {
  try {
    const response = await window.BoMixAPI.sendAction("get-config");
    if (response.status === "success") {
      config.defaultDatabasePath = response.content.defaultDatabasePath || "";
    }
  } catch (error) {
    Notify.create({
      type: "negative",
      message: "加載配置失敗",
    });
  }
}

// 保存配置
async function saveConfig() {
  try {
    console.log("Saving config:", config);
    const configData = {
      defaultDatabasePath: config.defaultDatabasePath,
    };
    const response = await window.BoMixAPI.sendAction(
      "update-config",
      configData
    );
    if (response.status === "success") {
      Notify.create({
        type: "positive",
        message: "配置已保存",
      });
      isOpen.value = false;
    }
  } catch (error) {
    console.error("Save config error:", error);
    Notify.create({
      type: "negative",
      message: "保存配置失敗",
    });
  }
}

// 選擇目錄
async function selectDirectory() {
  try {
    const result = await window.BoMixAPI.selectDirectory();
    if (result) {
      config.defaultDatabasePath = result;
    }
  } catch (error) {
    Notify.create({
      type: "negative",
      message: "選擇目錄失敗",
    });
  }
}

// 處理取消操作
function handleCancel() {
  isOpen.value = false;
}
</script>
