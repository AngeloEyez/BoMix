<template>
  <q-page class="row justify-center items-center">
    <div
      class="q-pa-md q-gutter-md"
      style="
        border: 2px dashed #ddd;
        padding: 20px;
        width: 400px;
        text-align: center;
      "
      @drop.prevent="handleDrop"
      @dragover.prevent
    >
      <p>拖曳 Excel 檔案到此處</p>
    </div>
  </q-page>
</template>

<script setup>
import { inject } from "vue";
import { Notify } from "quasar";

const bomix = inject("BoMix");

const handleDrop = async (event) => {
  const files = event.dataTransfer.files;

  for (const file of files) {
    try {
      if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
        await bomix.importBOMfromXLS(file);
        Notify.create({
          type: "positive",
          message: `成功導入 ${file.name}`,
        });
      } else {
        Notify.create({
          type: "warning",
          message: `跳過非 Excel 檔案: ${file.name}`,
        });
      }
    } catch (error) {
      Notify.create({
        type: "negative",
        message: error.message || "導入失敗",
        caption: file.name,
      });
    }
  }
};
</script>

<style scoped>
.q-pa-md {
  margin-top: 50px;
}
</style>
