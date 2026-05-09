<template>
  <a-tab-pane :key="props.tabKey" :tab="props.tab" :disabled="props.disabled">
    <slot />
  </a-tab-pane>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiTabPane',
})

const props = defineProps<{
  tabKey: string
  tab: string
  disabled?: boolean
}>()
</script>
