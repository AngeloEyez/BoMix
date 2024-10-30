<template>
  <q-page class="flex flex-center">
    <ExcelDropZone />
    <img
      alt="Quasar logo"
      src="~assets/quasar-logo-vertical.svg"
      style="width: 200px; height: 200px"
    />
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
