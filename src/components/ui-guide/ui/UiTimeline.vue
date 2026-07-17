<template>
  <a-timeline
    class="ui-timeline"
    :class="{ 'ui-timeline--compact': props.compact }"
    v-bind="$attrs"
  >
    <slot />
  </a-timeline>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiTimeline',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 紧凑轴：笔记本工作台 densify */
    compact?: boolean
  }>(),
  {
    compact: true,
  },
)
</script>

<style lang="scss" scoped>
.ui-timeline {
  margin: 0;
  padding: 0;
}

.ui-timeline :deep(.ant-timeline-item) {
  padding-bottom: 16px;
}

.ui-timeline--compact :deep(.ant-timeline-item) {
  padding-bottom: 12px;
}

.ui-timeline :deep(.ant-timeline-item-tail) {
  border-inline-start: 2px solid var(--dp-border);
}

.ui-timeline :deep(.ant-timeline-item-head) {
  border-color: var(--dp-primary);
  background: var(--dp-bg-elevated, var(--dp-surface));
}

.ui-timeline :deep(.ant-timeline-item-content) {
  color: var(--dp-text-primary);
  font-size: 13px;
  line-height: 1.55;
  margin-inline-start: 18px;
}
</style>
