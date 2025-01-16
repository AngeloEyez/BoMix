<!-- 系統日誌組件 -->
<template>
  <div
    class="session-log"
    :class="{ collapsed: isCollapsed }"
    :style="{ height: height + 'px' }"
  >
    <!-- 上邊界拖拽區域 -->
    <div v-show="!isCollapsed" class="resize-handle" @mousedown="startResize" />

    <!-- 展開/收合按鈕 -->
    <div class="toggle-area">
      <div class="toggle-button" @click="toggleCollapse">
        <span class="toggle-title">Session Log</span>
        <q-btn
          flat
          dense
          round
          size="xs"
          :icon="isCollapsed ? 'expand_less' : 'expand_more'"
          style="min-height: 16px; width: 16px; font-size: 14px"
        />
      </div>
    </div>

    <!-- 日誌內容區域 -->
    <div class="log-content" v-show="!isCollapsed">
      <div class="log-header">
        <div class="text-subtitle2">系統日誌</div>
        <q-btn flat dense round icon="delete" size="sm" @click="clearLogs" />
      </div>
      <q-scroll-area class="log-scroll-area">
        <pre class="log-text">{{ logs.join("\n") }}</pre>
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
/**
 * 系統日誌組件
 * 提供可折疊、可調整高度的日誌顯示功能
 */
import { ref, onMounted, onUnmounted } from "vue";

const MIN_HEIGHT = 100;
const DEFAULT_HEIGHT = 100;

// 計算最大高度
function getMaxHeight() {
  const windowHeight = window.innerHeight;
  const headerHeight = 64; // MainLayout header height
  return Math.floor((windowHeight - headerHeight) * 0.8); // 允許使用 80% 的可視區域
}

// 日誌相關的響應式變量
const isCollapsed = ref(true);
const height = ref(DEFAULT_HEIGHT);
const lastExpandedHeight = ref(DEFAULT_HEIGHT);
const isResizing = ref(false);
const startY = ref(0);
const startHeight = ref(0);
const logs = ref(["系統啟動..."]);

// 日誌區域拖拽調整大小
function startResize(e) {
  if (!isCollapsed.value) {
    isResizing.value = true;
    startY.value = e.clientY;
    startHeight.value = height.value;
    e.preventDefault();
  }
}

function handleMouseMove(e) {
  if (isResizing.value) {
    const diff = startY.value - e.clientY;
    const newHeight = Math.min(
      Math.max(MIN_HEIGHT, startHeight.value + diff),
      getMaxHeight()
    );
    height.value = newHeight;
    lastExpandedHeight.value = newHeight;
    notifyStateChange();
  }
}

function handleMouseUp() {
  isResizing.value = false;
}

// 切換日誌區域的展開/收起狀態
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  if (isCollapsed.value) {
    isResizing.value = false;
    lastExpandedHeight.value = height.value; // 收合時記住當前高度
  } else {
    height.value = lastExpandedHeight.value; // 展開時恢復上次的高度
  }
  notifyStateChange();
}

// 清空日誌
function clearLogs() {
  logs.value = [];
}

// 添加日誌的方法（可以被其他組件調用）
function addLog(message) {
  logs.value.push(`[${new Date().toLocaleTimeString()}] ${message}`);
}

// 通知狀態變化
function notifyStateChange() {
  const event = new CustomEvent("session-log-change", {
    detail: {
      isCollapsed: isCollapsed.value,
      height: isCollapsed.value ? 0 : height.value + 24, // 加上按鈕的高度
    },
  });
  window.dispatchEvent(event);
}

// 監聽視窗大小變化，確保高度不超過新的限制
function handleResize() {
  const maxHeight = getMaxHeight();
  if (height.value > maxHeight) {
    height.value = maxHeight;
    lastExpandedHeight.value = maxHeight;
    notifyStateChange();
  }
}

// 監聽全局鼠標事件和視窗大小變化
onMounted(() => {
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  window.removeEventListener("resize", handleResize);
});

// 導出方法供其他組件使用
defineExpose({
  addLog,
  clearLogs,
});
</script>

<style lang="scss" scoped>
.session-log {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  transition: height 0.3s ease;
  z-index: 1000;

  &.collapsed {
    height: 24px !important;
  }

  .resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    cursor: ns-resize;
    background: transparent;

    &:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
  }

  .toggle-area {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1001;

    .toggle-button {
      height: 18px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 9px;
      display: flex;
      align-items: center;
      padding: 0 1px 0 8px;
      gap: 2px;
      cursor: pointer;

      .toggle-title {
        font-size: 11px;
        color: #666;
        user-select: none;
        white-space: nowrap;
      }

      &:hover {
        background-color: #f0f0f0;
      }
    }
  }

  .log-content {
    height: 100%;
    padding: 8px;
    display: flex;
    flex-direction: column;

    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
    }

    .log-scroll-area {
      flex: 1;

      .log-text {
        margin: 0;
        padding: 8px;
        font-family: monospace;
        font-size: 12px;
        white-space: pre-wrap;
        color: #666;
      }
    }
  }
}
</style>
