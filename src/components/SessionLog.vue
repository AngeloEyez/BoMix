<!-- 系統日誌組件 -->
<template>
  <div class="session-log" :class="{ collapsed: isCollapsed }">
    <!-- 上邊界拖拽區域 -->
    <div v-show="!isCollapsed" class="resize-handle" @mousedown="startResize" />

    <!-- 展開/收合按鈕 -->
    <div class="toggle-area">
      <div class="toggle-button" @click="toggleCollapse">
        <span class="toggle-title">Session Log</span>
        <q-icon :name="isCollapsed ? 'expand_less' : 'expand_more'" size="18px" />
      </div>
    </div>

    <!-- 日誌內容區域 -->
    <template v-if="isCollapsed">
      <div class="collapsed-log" :class="lastLog?.level">
        {{ lastLog?.message || "" }}
      </div>
    </template>
    <template v-else>
      <div class="log-content">
        <div class="log-scroll-container">
          <q-scroll-area class="log-scroll-area">
            <div class="log-text">
              <div v-for="(log, index) in logs" :key="index" class="log-line" :class="log.level">
                <span class="log-timestamp">{{ log.timestamp }}</span>
                {{ log.message }}
              </div>
            </div>
          </q-scroll-area>
          <q-btn class="clear-btn" flat dense round icon="delete" size="sm" @click="clearLogs" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, computed, inject } from "vue";

  const bomix = inject("BoMix");
  const MIN_HEIGHT = 100;
  const DEFAULT_HEIGHT = 100;
  const LOG_AREA_HEIGHT = 20; // Log區域高度
  const LOG_BUTTON_HEIGHT = 24; // SessionLog button高度

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

  // 獲取日誌數據
  const logs = computed(() => bomix.getSessionLogs().value);
  const lastLog = computed(() => logs.value[0]);

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
      const newHeight = Math.min(Math.max(MIN_HEIGHT, startHeight.value + diff), getMaxHeight());
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
    bomix.clearSessionLogs();
  }

  // 通知狀態變化
  function notifyStateChange() {
    bomix.sessionLogState.value = {
      isCollapsed: isCollapsed.value,
      height: isCollapsed.value ? LOG_AREA_HEIGHT : height.value + LOG_BUTTON_HEIGHT,
    };
    console.log(bomix.sessionLogState.value);
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
</script>

<style lang="scss" scoped>
  .session-log {
    height: 100%;
    width: 100%;
    background: white;
    border-top: 1px solid rgba(0, 0, 0, 0.12);
    transition: height 0s linear;
    position: relative;

    &.collapsed {
      height: 24px !important;

      .collapsed-log {
        padding: 3px 10px 2px 10px; /* top | right | bottom | left */
        font-family: calibri;
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 100px;

        &.information {
          color: #666;
        }

        &.warning {
          color: var(--q-warning);
        }

        &.error {
          color: var(--q-negative);
        }
      }
    }

    .resize-handle {
      position: absolute;
      top: -3px;
      left: 0;
      right: 0;
      height: 6px;
      cursor: ns-resize;
      background: transparent;
      z-index: 1000;

      &:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
    }

    .toggle-area {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1002;
      pointer-events: auto;

      .toggle-button {
        height: 14px;
        background: white;
        color: #666;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 9px;
        display: flex;
        align-items: center;
        padding: 1px 0 0 8px;
        gap: 2px;
        cursor: pointer;
        transition: background-color 0.2s;
        z-index: 1;

        .toggle-title {
          font-size: 10px;
          color: #666;
          user-select: none;
          white-space: nowrap;
        }

        &:hover {
          background-color: #f0f0f0;
        }

        &:active {
          background-color: #e0e0e0;
        }
      }
    }

    .log-content {
      height: calc(100% - 4px);
      margin-top: 4px;
      position: relative;

      .log-scroll-container {
        height: 100%;
        position: relative;
        padding: 2px 8px 8px 8px; //T/R/B/L

        .log-scroll-area {
          height: 100%;
          padding-right: 36px;

          .log-text {
            margin: 0;
            padding: 0px;
            font-family: calibri;
            font-size: 11px;

            .log-line {
              white-space: pre;
              margin-bottom: 2px;

              .log-timestamp {
                color: #999;
                margin-right: 4px;
              }

              &.information {
                color: #666;
              }

              &.warning {
                color: var(--q-warning);
              }

              &.error {
                color: var(--q-negative);
              }
            }
          }
        }

        .clear-btn {
          position: absolute;
          top: 8px;
          right: 20px;
          z-index: 2;
          background: white;
          opacity: 0.8;
          transition: opacity 0.3s;

          &:hover {
            opacity: 1;
          }
        }
      }
    }
  }
</style>
