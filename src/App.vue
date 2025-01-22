<template>
  <router-view v-if="isInitialized" />
  <div v-else class="loading-container">
    <q-spinner-dots color="primary" size="40" />
    <div class="text-subtitle1 q-mt-md">載入中...</div>
  </div>
</template>

<script setup>
  import log from "app/bomix/utils/logger";
  import { provide, ref, onMounted } from "vue";
  import { BoMixR } from "app/bomix/bomixR";

  log.log("BoMixR: initializing...");
  const bomix = new BoMixR();
  const isInitialized = ref(false);

  onMounted(async () => {
    try {
      await bomix.ensureInitialized();
      isInitialized.value = true;
      log.log("BoMixR: App initialized successfully");
    } catch (error) {
      log.error("BoMixR: Failed to initialize app:", error);
    }
  });

  provide("BoMix", bomix);

  defineOptions({
    name: "App",
  });
</script>

<style scoped>
  .loading-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
</style>
