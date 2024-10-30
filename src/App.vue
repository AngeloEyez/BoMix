<template>
  <router-view />
</template>

<script setup>
import log from "app/bomix/utils/logger"; // Initialize electron-log on renderer process
import { provide } from "vue";
import { BoMixR } from "app/bomix/bomixR";

const bomix = new BoMixR();
provide("BoMix", bomix);

defineOptions({
  name: "App",
});
</script>
