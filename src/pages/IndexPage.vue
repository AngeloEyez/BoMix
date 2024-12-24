<template>
  <q-page class="index-page">
    <ExcelDropZone />
  </q-page>
</template>

<script setup>
import ExcelDropZone from "src/components/ExcelDropZone.vue";
import { inject } from "vue";

const bomix = inject("BoMix");
bomix.test("indexPage.vue");

defineOptions({
  name: "IndexPage",
});
</script>

<style lang="scss" scoped>
.index-page {
  min-height: 100%;
  background: white;
}
</style>
