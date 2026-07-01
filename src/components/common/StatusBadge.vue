<template>
  <span class="status-badge" :style="badgeStyle">
    <slot>{{ label }}</slot>
  </span>
</template>

<script lang="ts" setup>
import type { StatusVariant } from '@/utils/status-style'
import { STATUS_VARIANT_STYLES } from '@/utils/status-style'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
    variant?: StatusVariant
  }>(),
  {
    label: '',
    variant: 'neutral',
  },
)

const badgeStyle = computed(() => {
  const style = STATUS_VARIANT_STYLES[props.variant] || STATUS_VARIANT_STYLES.neutral
  return {
    backgroundColor: style.bgColor,
    color: style.textColor,
    borderColor: style.borderColor,
  }
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: var(--dp-radius-full);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  box-sizing: border-box;
}
</style>
