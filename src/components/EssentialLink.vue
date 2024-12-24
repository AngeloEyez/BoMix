<template>
  <q-item clickable @click="navigate" v-ripple>
    <q-item-section avatar>
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section v-show="!mini">
      <q-item-label>{{ title }}</q-item-label>
      <q-item-label caption>{{ caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup>
import { useRouter } from "vue-router";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    default: "",
  },
  link: {
    type: String,
    default: "#",
  },
  icon: {
    type: String,
    default: "",
  },
  mini: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["navigate"]);
const router = useRouter();

function navigate() {
  const path = props.link.replace(/^#/, "");
  router.push(path);
  emit("navigate");
}
</script>

<style lang="scss" scoped>
.q-item {
  min-height: 48px;
  padding: 8px 12px;
  margin: 4px 8px;
  border-radius: 8px;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  &.q-router-link-active {
    background: var(--q-primary);
    color: white;
  }
}
</style>
