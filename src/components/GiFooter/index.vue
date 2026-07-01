<template>
  <div class="gi-footer">
    {{ appStore.getCopyright()
    }}{{ appStore.getForRecord() ? ` · ${appStore.getForRecord()}` : '' }}
  </div>
</template>

<script lang="ts" setup>
import { useAppStore } from '@/stores'

defineOptions({ name: 'GiFooter' })

const appStore = useAppStore()
</script>

<style lang="scss" scoped>
.gi-footer {
  height: 40px;
  font-size: 13px;
  color: var(--ant-color-text-tertiary);
  background-color: var(--ant-color-bg-container);
  border-top: 1px solid var(--ant-color-border-secondary);
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
