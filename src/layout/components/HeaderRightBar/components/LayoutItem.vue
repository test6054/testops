<template>
  <div :class="`layout-item-${mode}`" class="layout-item" @click="emit('click')"></div>
</template>

<script lang="ts" setup>
interface Props {
  mode: 'left' | 'top' | 'mix'
}

withDefaults(defineProps<Props>(), {})

const emit = defineEmits(['click'])
</script>

<style lang="scss" scoped>
.layout-item {
  width: 60px;
  height: 50px;
  background-color: var(--ant-color-fill-secondary);
  border-radius: var(--dp-radius-xs);
  overflow: hidden;
  cursor: pointer;
  box-sizing: border-box;
  position: relative;

  &::before {
    content: '';
    width: 12px;
    height: 100%;
    background-color: var(--ant-color-text);
    position: absolute;
    top: 0;
    left: 0;
    display: none;
  }

  &::after {
    content: '';
    width: 100%;
    height: 10px;
    background-color: var(--ant-color-text);
    position: absolute;
    top: 0;
    left: 0;
    display: none;
  }

  &-left {
    &::before {
      display: block;
    }
  }

  &-top {
    &::after {
      display: block;
    }
  }

  &-mix {
    &::before,
    &::after {
      display: block;
    }
  }
}
</style>
