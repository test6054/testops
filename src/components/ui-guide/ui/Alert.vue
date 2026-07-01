<template>
  <div class="ui-alert" :class="`ui-alert--${props.type}`" v-bind="$attrs">
    <div v-if="props.showIcon" class="ui-alert__icon">
      <component :is="iconComponent" />
    </div>
    <div class="ui-alert__content">
      <template v-if="props.title || props.description">
        <div v-if="props.title" class="ui-alert__title">{{ props.title }}</div>
        <div v-if="props.description" class="ui-alert__description">{{ props.description }}</div>
      </template>
      <slot v-else />
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
} from '@ant-design/icons-vue'
import { computed } from 'vue'

defineOptions({ name: 'UiAlert' })

const props = withDefaults(
  defineProps<{
    type?: 'info' | 'success' | 'warning' | 'error'
    title?: string
    description?: string
    showIcon?: boolean
  }>(),
  {
    type: 'info',
    title: '',
    description: '',
    showIcon: true,
  },
)

const iconComponent = computed(() => {
  const iconMap = {
    info: InfoCircleFilled,
    success: CheckCircleFilled,
    warning: ExclamationCircleFilled,
    error: CloseCircleFilled,
  }
  return iconMap[props.type]
})
</script>

<style scoped>
.ui-alert {
  --alert-bg: var(--dp-blue-50, #eff6ff);
  --alert-border: var(--dp-blue-200, #bfdbfe);
  --alert-icon: var(--dp-blue-600, #2563eb);
  display: flex;
  gap: 12px;
  align-items: flex-start;
  border: 1px solid var(--alert-border);
  background: var(--alert-bg);
  border-radius: var(--dp-radius-panel, 4px);
  padding: 14px 16px;
  color: var(--dp-text-primary, #0f172a);
}

.ui-alert--info {
  --alert-bg: var(--dp-blue-50, #eff6ff);
  --alert-border: var(--dp-blue-200, #bfdbfe);
  --alert-icon: var(--dp-blue-600, #2563eb);
}

.ui-alert--success {
  --alert-bg: var(--dp-green-50, #ecfdf3);
  --alert-border: var(--dp-green-200, #bbf7d0);
  --alert-icon: var(--dp-green-500, #22c55e);
}

.ui-alert--warning {
  --alert-bg: var(--dp-orange-50, #fff7ed);
  --alert-border: var(--dp-orange-200, #fed7aa);
  --alert-icon: var(--dp-orange-500, #f97316);
}

.ui-alert--error {
  --alert-bg: var(--dp-red-50, #fef2f2);
  --alert-border: var(--dp-red-200, #fecdd3);
  --alert-icon: var(--dp-red-500, #ef4444);
}

.ui-alert__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-top: 1px;
  font-size: 16px;
  color: var(--alert-icon);
}

.ui-alert__content {
  min-width: 0;
  flex: 1;
}

.ui-alert__title {
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-alert__description {
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary, #475569);
}
</style>
