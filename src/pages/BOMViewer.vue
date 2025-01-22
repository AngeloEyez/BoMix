/** * BOM 檢視器頁面 * 用於查看和分析 BOM 資料 */

<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">BOM 檢視器</div>

    <div class="row q-gutter-md q-mb-lg">
      <q-btn color="primary" icon="playlist_add" label="選擇 Common BOM" @click="showSelector('common')" />
      <q-btn color="secondary" icon="playlist_add" label="選擇 Matrix BOM" @click="showSelector('matrix')" />
      <q-btn color="accent" icon="playlist_add" label="選擇 BCCL BOM" @click="showSelector('bccl')" />
    </div>

    <q-dialog v-model="showSelectorDialog">
      <MultiBOMSelector v-if="showSelectorDialog" :bom-type="currentBomType" />
    </q-dialog>
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
</style>
