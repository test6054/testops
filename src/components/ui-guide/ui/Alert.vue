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
  --alert-bg: var(--dp-blue-50);
  --alert-border: var(--dp-blue-200);
  --alert-icon: var(--dp-blue-600);
  display: flex;
  gap: 8px;
  align-items: flex-start;
  border: 1px solid var(--alert-border);
  background: var(--alert-bg);
  border-radius: var(--dp-radius-panel);
  padding: 8px 10px;
  color: var(--dp-text-primary);
}

.ui-alert--info {
  --alert-bg: var(--dp-blue-50);
  --alert-border: var(--dp-blue-200);
  --alert-icon: var(--dp-blue-600);
}

.ui-alert--success {
  --alert-bg: var(--dp-green-50);
  --alert-border: var(--dp-green-200);
  --alert-icon: var(--dp-green-500);
}

.ui-alert--warning {
  --alert-bg: var(--dp-orange-50);
  --alert-border: var(--dp-orange-200);
  --alert-icon: var(--dp-orange-500);
}

.ui-alert--error {
  --alert-bg: var(--dp-red-50);
  --alert-border: var(--dp-red-200);
  --alert-icon: var(--dp-red-500);
}

.ui-alert__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-top: 1px;
  font-size: 14px;
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
  color: var(--dp-text-primary);
}

.ui-alert__description {
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
}
</style>
