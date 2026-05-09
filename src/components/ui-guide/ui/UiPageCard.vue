<template>
  <UiCard
    class="ui-page-card"
    bordered
    :title="title"
    :show-header="showHeader"
    v-bind="$attrs"
  >
    <template v-if="$slots.title || title" #title>
      <slot name="title">{{ title }}</slot>
    </template>
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>
    <slot />
  </UiCard>
</template>

<script lang="ts" setup>
import UiCard from './Card.vue'

defineOptions({
  name: 'UiPageCard',
  inheritAttrs: false,
})

withDefaults(defineProps<{
  title?: string
  showHeader?: boolean
}>(), {
  title: '',
  showHeader: true,
})
</script>

<style scoped>
.ui-page-card {
  border-radius: var(--dp-radius-panel, 12px);
  background: var(--dp-surface, #fff);
  box-shadow: var(--dp-shadow-sm);
  border: 1px solid var(--dp-border, #f1f5f9);
}

.ui-page-card :deep(.dp-card__header) {
  padding: 20px 24px;
}

.ui-page-card :deep(.dp-card__body) {
  padding: 24px;
}
</style>
