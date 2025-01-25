<template>
  <q-item clickable @click="navigate" v-ripple :class="{ 'q-item--mini': mini }">
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
    min-height: 40px;
    padding: 4px 4px;
    margin: 2px 2px;
    border-radius: 8px;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    &.q-router-link-active {
      background: var(--q-primary);
      color: white;
    }

    .q-item__section--avatar {
      min-width: 24px;
      padding-right: 8px;
    }

    .q-item__section--main {
      padding-left: 0;
    }

    .q-item__label {
      font-size: 14px;
      line-height: 1.2;
    }

    .q-item__label--caption {
      font-size: 12px;
      margin-top: 2px;
    }
  }

  // 迷你模式下的樣式
  .q-item.q-item--mini {
    padding: 4px;
    margin: 2px 4px;
    justify-content: center;

    .q-item__section--avatar {
      min-width: unset;
      padding: 0;
    }
  }
</style>
