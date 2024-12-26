<template>
  <q-layout view="hHh LpR fFf" class="main-layout">
    <q-header elevated class="bg-white text-black">
      <q-toolbar class="header-toolbar">
        <q-toolbar-title class="text-primary text-bold">BoMix</q-toolbar-title>

        <div class="series-info" v-if="seriesInfo.name">
          <span class="series-name">{{ seriesInfo.name }}</span>
          <q-btn
            flat
            dense
            round
            icon="edit"
            size="sm"
            @click="showEditSeries = true"
          />
        </div>
        <q-btn
          v-else
          flat
          dense
          round
          icon="add"
          size="sm"
          @click="showEditSeries = true"
        />

        <div class="header-right">
          <span class="version-text">v{{ version }}</span>
          <q-btn
            flat
            dense
            round
            icon="settings"
            class="settings-btn"
            @click="showConfig = true"
          />
        </div>
      </q-toolbar>
    </q-header>

    <div class="left-sidebar" :style="{ width: sidebarWidth + 'px' }">
      <q-list padding class="sidebar-content">
        <!-- <q-item-label header class="text-grey-8"> Records </q-item-label> -->

        <EssentialLink
          v-for="link in linksList"
          :key="link.title"
          v-bind="link"
          :mini="isMiniMode"
          @navigate="handleNavigate"
        />
      </q-list>

      <div
        class="resize-handle"
        @mousedown="startResize"
        @click="toggleSidebarMode"
      >
        <q-icon
          :name="isMiniMode ? 'chevron_right' : 'chevron_left'"
          size="20px"
        />
      </div>
    </div>

    <q-page-container class="content-container" :style="contentStyle">
      <router-view />
    </q-page-container>

    <ConfigDialog v-model="showConfig" />
    <EditSeriesDialog v-model="showEditSeries" />
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import EssentialLink from "components/EssentialLink.vue";
import ConfigDialog from "components/ConfigDialog.vue";
import EditSeriesDialog from "components/EditSeriesDialog.vue";

defineOptions({
  name: "MainLayout",
});

const version = ref("");

onMounted(async () => {
  const response = await window.BoMixAPI.sendAction("get-app-version");
  if (response.status === "success") {
    version.value = response.content;
  }
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  await loadSeriesInfo();
});

onUnmounted(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
});

const MINI_WIDTH = 64;
const FULL_WIDTH = 240;
const sidebarWidth = ref(FULL_WIDTH);
const isMiniMode = computed(() => sidebarWidth.value <= MINI_WIDTH + 20);
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);

const contentStyle = computed(() => ({
  marginLeft: `${sidebarWidth.value}px`,
  width: `calc(100% - ${sidebarWidth.value}px)`,
}));

const linksList = [
  {
    title: "Dashboard",
    caption: "主控台",
    icon: "dashboard",
    link: "/",
  },
];

const showConfig = ref(false);
const showEditSeries = ref(false);
const seriesInfo = ref({ name: "", note: "" });

function startResize(e) {
  if (e.target.classList.contains("resize-handle")) {
    isResizing.value = true;
    startX.value = e.clientX;
    startWidth.value = sidebarWidth.value;
  }
}

function handleMouseMove(e) {
  if (!isResizing.value) return;
  const diff = e.clientX - startX.value;
  const newWidth = Math.max(MINI_WIDTH, Math.min(startWidth.value + diff, 400));
  sidebarWidth.value = newWidth;
}

function handleMouseUp() {
  isResizing.value = false;
}

function toggleSidebarMode() {
  sidebarWidth.value = isMiniMode.value ? FULL_WIDTH : MINI_WIDTH;
}

function handleNavigate() {
  if (window.innerWidth < 1024) {
    sidebarWidth.value = MINI_WIDTH;
  }
}

async function loadSeriesInfo() {
  try {
    const response = await window.BoMixAPI.sendAction("get-current-database");
    if (response.status === "success" && response.content) {
      seriesInfo.value = {
        name: response.content.name || "",
        note: response.content.note || "",
      };
    }
  } catch (error) {
    console.error("Load series info failed:", error);
  }
}
</script>

<style lang="scss">
.main-layout {
  background-color: #f5f5f5;

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

  .left-sidebar {
    position: fixed;
    top: 64px;
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
    }

    .resize-handle {
      position: absolute;
      top: 50%;
      right: -12px;
      width: 24px;
      height: 24px;
      background: white;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transform: translateY(-50%);
      z-index: 1001;
      transition: background-color 0.3s;

      &:hover {
        background-color: #f0f0f0;
      }

      &:active {
        background-color: #e0e0e0;
      }
    }
  }

  .content-container {
    background-color: #f5f5f5;
    transition: margin-left 0.3s ease, width 0.3s ease;
  }

  .series-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 16px;

    .series-name {
      font-size: 14px;
      color: #666;
    }
  }
}
</style>
