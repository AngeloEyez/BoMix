<template>
  <q-page class="index-page">
    <div class="statistics-container">
      <div class="stat-card">
        <div class="stat-header">
          <div
            class="title-container"
            :class="[
              'stat-title',
              { 'no-series': !bomix.getSeriesInfo().value.name },
            ]"
          >
            {{ bomix.getSeriesInfo().value.name || "Open/Create a Series" }}
            <q-btn
              flat
              dense
              round
              :icon="bomix.getSeriesInfo().value.name ? 'edit' : 'add'"
              class="series-edit-btn"
              @click="showEditSeries = true"
            />
          </div>
        </div>
        <div class="stat-content">
          <div class="stat-item">
            <div class="stat-label">Projects</div>
            <div class="stat-value">{{ statistics.projectCount }}</div>
            <div class="stat-tag accepted">Accepted</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Phase</div>
            <div class="stat-value">{{ statistics.phaseCount }}</div>
            <div class="stat-tag pending">Pending</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">BOMs</div>
            <div class="stat-value">{{ statistics.bomCount }}</div>
            <div class="stat-tag cancelled">Cancelled</div>
          </div>
        </div>
        <div class="stat-footer">
          <div class="time-info">
            {{ currentTime }}
          </div>
        </div>
      </div>
    </div>
    <div class="table-container">
      <DashboardBOMTable />
    </div>
    <EditSeriesDialog v-model="showEditSeries" />
  </q-page>
</template>

<script setup>
import DashboardBOMTable from "src/components/DashboardBOMTable.vue";
import EditSeriesDialog from "components/EditSeriesDialog.vue";
import { inject, onMounted, ref, watch } from "vue";

const bomix = inject("BoMix");
const statistics = bomix.getStatistics();
const showEditSeries = ref(false);
const seriesInfo = bomix.getSeriesInfo();

// 監聽 series 變化
watch(
  () => seriesInfo.value.path,
  async (newPath) => {
    if (newPath) {
      // 如果有開啟的 series...
    } else {
      // 如果沒有開啟的 series，清空列表?
    }
    bomix.updateStatistics();
  }
);

// 格式化當前時間
const currentTime = ref(formatCurrentTime());

function formatCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const date = now.getDate();
  const month = now.toLocaleString("default", { month: "long" });
  const year = now.getFullYear();

  return `${hours}:${minutes} ${date} ${month} ${year}`;
}

onMounted(async () => {
  await bomix.loadSeriesInfo();
  await bomix.updateStatistics();
});

defineOptions({
  name: "Dash-Board",
});
</script>

<style lang="scss" scoped>
.index-page {
  background: #f5f5f5;
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.statistics-container {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.table-container {
  flex: 1;
  overflow: hidden;
  width: 100%;
}

.stat-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;

  .stat-header {
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
    .title-container {
      display: flex;
      align-items: center;
      gap: 8px;

      .series-edit-btn {
        color: #666;
        transition: all 0.3s ease;

        &:hover {
          color: var(--q-primary);
        }
      }
    }

    .stat-title {
      font-size: 16px;
      font-weight: 500;
      color: #333;

      &.no-series {
        color: #999;
        font-style: italic;
      }
    }
  }

  .stat-content {
    padding: 20px;
    display: flex;
    gap: 40px;

    .stat-item {
      flex: 1;
      text-align: left;

      .stat-label {
        color: #666;
        font-size: 14px;
        margin-bottom: 8px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #333;
        margin-bottom: 8px;
      }

      .stat-tag {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;

        &.accepted {
          background: #e6f4ea;
          color: #1e8e3e;
        }

        &.pending {
          background: #fff4e5;
          color: #f5a623;
        }

        &.cancelled {
          background: #fce8e6;
          color: #d93025;
        }
      }
    }
  }

  .stat-footer {
    padding: 12px 20px;
    border-top: 1px solid #eee;

    .time-info {
      color: #666;
      font-size: 12px;
    }
  }
}
</style>
