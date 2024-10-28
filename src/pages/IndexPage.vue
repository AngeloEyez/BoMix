<template>
  <q-page class="flex flex-center">
    <img
      alt="Quasar logo"
      src="~assets/quasar-logo-vertical.svg"
      style="width: 200px; height: 200px"
    />
  </q-page>
</template>

<script setup>
defineOptions({
  name: "IndexPage",
});

// 获取当前窗口对象
import { BrowserWindow } from "@electron/remote";
const currentWindow = BrowserWindow.getCurrentWindow();
function handleKeyPress(event) {
  console.log(`You pressed ${event.key}`);
  if (event.key === "F12") {
    // 发送 hello-console 事件
    ipcRenderer.send("openDevTools", "");
  } else if (event.key === "F5") {
    window.location.reload();
  } else if (event.key === "F1") {
    currentWindow.webContents.openDevTools();
  }
}
window.addEventListener("keyup", handleKeyPress, true);
</script>
