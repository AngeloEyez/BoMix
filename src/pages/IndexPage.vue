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
    <ExcelDropZone />
    <EditSeriesDialog v-model="showEditSeries" />
  </q-page>
</template>

<script setup>
import ExcelDropZone from "src/components/ExcelDropZone.vue";
import EditSeriesDialog from "components/EditSeriesDialog.vue";
import { inject, onMounted, ref } from "vue";

const bomix = inject("BoMix");
const statistics = bomix.getStatistics();
const showEditSeries = ref(false);

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
  await bomix.updateStatistics();
});

defineOptions({
  name: "IndexPage",
});
</script>

<style lang="scss" scoped>
.index-page {
  min-height: 100%;
  background: #f5f5f5;
  padding: 20px;
}

.statistics-container {
  margin-bottom: 40px;
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
