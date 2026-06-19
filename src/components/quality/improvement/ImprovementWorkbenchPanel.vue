<script lang="ts" setup>
/**
 * 改进工作台列表区统一面板：空态 + UiCard 标题栏，承载各 Tab 筛选与表格。
 */
import { UiCard, UiEmpty } from '@/components/ui-guide/ui'

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
    :description="emptyDescription || '请先选择培养方案'"
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
    padding: 32px 0;
  }

  &__card {
    :deep(.ant-card-body) {
      padding-top: 0;
    }
  }
}
</style>
