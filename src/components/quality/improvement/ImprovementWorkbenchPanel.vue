<script lang="ts" setup>
/**
 * 改进工作台列表区统一面板：空态 + UiCard 标题栏，承载各 Tab 筛选与表格。
 */
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'

defineOptions({ name: 'ImprovementWorkbenchPanel' })

defineProps<{
  title: string
  empty?: boolean
  emptyDescription?: string
}>()
</script>

<template>
  <UiEmpty
    v-if="empty"
    size="sm"
    :description="emptyDescription || '当前列表暂无数据'"
    class="iwb-panel__empty"
  />
  <UiCard v-else class="iwb-panel__card">
    <template #title>{{ title }}</template>
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>
    <slot />
  </UiCard>
</template>

<style lang="scss" scoped>
.iwb-panel {
  &__empty {
    padding: var(--dp-space-component) 0;
  }

  &__card {
    :deep(.ant-card-body) {
      padding-top: 0;
    }
  }
}
</style>
