<template>
  <a-result
    class="ui-load-failure"
    status="error"
    :title="title"
    :sub-title="description"
  />
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiLoadFailure' })

withDefaults(
  defineProps<{
    title?: string
    description: string
  }>(),
  {
    title: '加载失败',
  },
)
</script>

<style scoped>
.ui-load-failure {
  padding: var(--dp-space-8) var(--dp-space-4);
}
</style>
