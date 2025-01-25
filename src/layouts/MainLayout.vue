<template>
  <q-layout view="hHh lpR lff" class="main-layout">
    <q-header :reveal="false" elevated class="bg-white text-black">
      <q-toolbar class="header-toolbar">
        <q-toolbar-title class="text-primary text-bold">BoMix</q-toolbar-title>

        <div class="series-info">
          <span class="series-label">Series:</span>
          <span :class="['series-name', { 'no-series': !seriesInfo.name }]">
            {{ seriesInfo.name || "NA" }}
          </span>
          <q-btn flat dense round :icon="seriesInfo.name ? 'edit' : 'add'" class="series-edit-btn" @click="showEditSeries = true" />
        </div>

        <div class="header-right">
          <span class="version-text">v{{ version }}</span>
          <q-btn flat dense round icon="settings" class="settings-btn" @click="showConfig = true" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawerOpen"
      :width="sidebarWidth"
      :mini="isMiniMode"
      :mini-width="MINI_WIDTH"
      :breakpoint="900"
      bordered
      :behavior="'desktop'"
      class="left-drawer bg-white"
    >
      <q-list padding class="sidebar-content">
        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" :mini="isMiniMode" />
      </q-list>

      <div class="resize-handle" @mousedown="startResize" @click="toggleSidebarMode">
        <q-icon :name="isMiniMode ? 'chevron_right' : 'chevron_left'" size="20px" />
      </div>
    </q-drawer>

    <q-page-container class="content-container" :style="contentStyle">
      <router-view />
    </q-page-container>

    <q-footer v-if="bomix.config.value.enableSessionLog" :style="footerStyle" :reveal="false" class="bg-white">
      <SessionLog ref="sessionLog" />
    </q-footer>

    <ConfigDialog v-model="showConfig" />
    <EditSeriesDialog v-model="showEditSeries" />
  </q-layout>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted, inject } from "vue";
  import EssentialLink from "components/EssentialLink.vue";
  import ConfigDialog from "components/ConfigDialog.vue";
  import EditSeriesDialog from "components/EditSeriesDialog.vue";
  import SessionLog from "components/SessionLog.vue";

  defineOptions({
    name: "MainLayout",
  });

  const version = ref("");
  const bomix = inject("BoMix");
  const seriesInfo = bomix.getSeriesInfo();

  const MINI_WIDTH = 40;
  const FULL_WIDTH = 150;
  const sidebarWidth = ref(FULL_WIDTH);
  const isMiniMode = computed(() => sidebarWidth.value <= MINI_WIDTH + 20);
  const isResizing = ref(false);
  const startX = ref(0);
  const startWidth = ref(0);

  const footerStyle = computed(() => ({
    height: bomix.sessionLogState.value.height + "px",
    padding: 0,
    minHeight: "unset",
  }));

  const contentStyle = computed(() => ({
    height: "100%",
  }));

  const linksList = [
    {
      title: "儀表板",
      caption: "系統概覽",
      icon: "dashboard",
      link: "/",
    },
    {
      title: "BOM 檢視器",
      caption: "查看和分析 BOM",
      icon: "description",
      link: "/bom-viewer",
    },
  ];

  const showConfig = ref(false);
  const showEditSeries = ref(false);
  const sessionLog = ref(null);
  const drawerOpen = ref(true);

  // 添加一個狀態來記錄是否是用戶手動收合
  const isUserCollapsed = ref(false);

  function startResize(e) {
    if (e.target.classList.contains("resize-handle")) {
      isResizing.value = true;
      startX.value = e.clientX;
      startWidth.value = sidebarWidth.value;
      e.stopPropagation();
    }
  }

  function handleMouseMove(e) {
    if (isResizing.value) {
      const diff = e.clientX - startX.value;
      const newWidth = Math.max(MINI_WIDTH, Math.min(startWidth.value + diff, 400));
      sidebarWidth.value = newWidth;
      isUserCollapsed.value = false; // 重置用戶收合狀態
    }
  }

  function handleMouseUp() {
    isResizing.value = false;
  }

  function toggleSidebarMode() {
    if (isMiniMode.value) {
      sidebarWidth.value = FULL_WIDTH;
      isUserCollapsed.value = false;
    } else {
      sidebarWidth.value = MINI_WIDTH;
      isUserCollapsed.value = true;
    }
  }

  // 修改 handleWindowResize 函數
  function handleWindowResize() {
    // 如果是用戶手動收合的，保持收合狀態
    if (isUserCollapsed.value) {
      sidebarWidth.value = MINI_WIDTH;
      return;
    }

    // 否則根據窗口寬度自動調整
    if (window.innerWidth < 900) {
      sidebarWidth.value = MINI_WIDTH;
    } else {
      sidebarWidth.value = FULL_WIDTH;
    }
  }

  onMounted(async () => {
    const response = await window.BoMixAPI.sendAction("get-app-version");
    if (response.status === "success") {
      version.value = response.content;
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("resize", handleWindowResize);
    handleWindowResize(); // 初始化時檢查窗口大小
    await bomix.loadSeriesInfo();
  });

  onUnmounted(() => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("resize", handleWindowResize);
  });
</script>

<style lang="scss">
  .main-layout {
    background-color: #f5f5f5;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .header-toolbar {
      height: 64px;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-right {
        display: flex;
        align-items: center;
        gap: 12px;

        .version-text {
          color: #666;
          font-size: 14px;
        }

        .settings-btn {
          color: #666;
          &:hover {
            color: var(--q-primary);
          }
        }
      }
    }

    .left-drawer {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      background: white;
      border-right: 1px solid rgba(0, 0, 0, 0.12);
      z-index: 1000;
      transition: width 0.3s ease;

      .sidebar-content {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        padding-top: 8px !important;
      }

      .resize-handle {
        position: absolute;
        top: 50%;
        right: -1px;
        width: 10px;
        height: 100px;
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transform: translateY(-50%);
        z-index: 1001;
        transition: background-color 0.3s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

        &:hover {
          background-color: #f0f0f0;
        }

        &:active {
          background-color: #e0e0e0;
        }

        .q-icon {
          font-size: 18px;
          color: #666;
          margin-right: 0px;
        }
      }
    }

    .content-container {
      background-color: #f5f5f5;
      transition: margin-left 0.2s ease, width 0.2s ease;
      height: 100%; /* 高度填满父容器 */
      display: flex; /* 确保支持子元素的布局调整 */
      flex-direction: column; /* 子元素从上到下排列 */
      overflow: hidden;
      position: relative;
    }

    .series-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 16px;

      .series-label {
        color: #666;
        font-size: 14px;
      }

      .series-name {
        font-size: 14px;
        color: #666;

        &.no-series {
          color: #999;
          font-style: italic;
        }
      }

      .series-edit-btn {
        color: #666;
        transition: all 0.3s ease;

        &:hover {
          color: var(--q-primary);
        }
      }
    }
  }
</style>
