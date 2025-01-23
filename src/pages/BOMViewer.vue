/** * BOM 檢視器頁面 * 用於查看和分析 BOM 資料 */

<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">BOM 檢視器</div>

    <div class="row q-gutter-md q-mb-lg">
      <q-btn color="primary" icon="playlist_add" label="選擇 Common BOM" @click="showSelector('common')" />
      <q-btn color="secondary" icon="playlist_add" label="選擇 Matrix BOM" @click="showSelector('matrix')" />
      <q-btn color="accent" icon="playlist_add" label="選擇 BCCL BOM" @click="showSelector('bccl')" />
    </div>

    <!-- 使用 Teleport 將選擇器移到 body 層級 -->
    <Teleport to="body">
      <div v-if="showSelectorDialog" class="selector-overlay">
        <MultiBOMSelector :bom-type="currentBomType" @close="showSelectorDialog = false" />
      </div>
    </Teleport>
  </q-page>
</template>

<script setup>
  import { ref } from "vue";
  import { defineOptions } from "vue";
  import MultiBOMSelector from "components/MultiBOMSelector.vue";

  defineOptions({
    name: "BOMViewer",
  });

  const showSelectorDialog = ref(false);
  const currentBomType = ref("");

  const showSelector = (type) => {
    currentBomType.value = type;
    showSelectorDialog.value = true;
  };
</script>

<style lang="scss" scoped>
  .q-page {
    max-width: 1200px;
    margin: 0 auto;
  }

  .selector-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 5000;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
