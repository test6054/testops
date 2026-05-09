<template>
  <section
    v-if="visible"
    class="ui-alert-strip"
    :class="[
      `ui-alert-strip--${props.tone}`,
      `ui-alert-strip--${props.size}`,
      { 'ui-alert-strip--dense': props.dense },
    ]"
    v-bind="$attrs"
  >
    <div v-if="props.showIcon" class="ui-alert-strip__icon">
      <component :is="iconComponent" />
    </div>

    <div class="ui-alert-strip__main">
      <div class="ui-alert-strip__head">
        <div class="ui-alert-strip__title-wrap">
          <div class="ui-alert-strip__title">{{ props.title }}</div>
          <div v-if="$slots.meta" class="ui-alert-strip__meta">
            <slot name="meta" />
          </div>
        </div>
      </div>

      <div v-if="props.description || $slots.default" class="ui-alert-strip__description">
        <slot>{{ props.description }}</slot>
      </div>
    </div>

    <div v-if="$slots.actions || props.closable" class="ui-alert-strip__actions">
      <slot name="actions" />

      <button
        v-if="props.closable"
        type="button"
        class="ui-alert-strip__close"
        @click="handleClose"
      >
        <CloseOutlined />
      </button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { UiAlertStripTone } from './types'
import {
  CheckCircleFilled,
  CloseCircleFilled,
  CloseOutlined,
  ExclamationCircleFilled,
  InfoCircleFilled,
} from '@ant-design/icons-vue'
import { computed, ref } from 'vue'

defineOptions({
  name: 'UiAlertStrip',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  tone?: UiAlertStripTone
  title?: string
  description?: string
  size?: 'sm' | 'md'
  showIcon?: boolean
  closable?: boolean
  dense?: boolean
}>(), {
  tone: 'info',
  title: '',
  description: '',
  size: 'md',
  showIcon: true,
  closable: false,
  dense: false,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const visible = ref(true)

const iconComponent = computed(() => {
  const iconMap: Record<UiAlertStripTone, unknown> = {
    info: InfoCircleFilled,
    success: CheckCircleFilled,
    warning: ExclamationCircleFilled,
    error: CloseCircleFilled,
  }

  return iconMap[props.tone]
})

const handleClose = () => {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.ui-alert-strip {
  --alert-border: #bfdbfe;
  --alert-surface: #eff6ff;
  --alert-icon: #2563eb;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--alert-border);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--alert-surface);
}

.ui-alert-strip--sm {
  padding: 14px 16px;
}

.ui-alert-strip--dense {
  gap: 12px;
  padding: 12px 14px;
}

.ui-alert-strip--info {
  --alert-border: #bfdbfe;
  --alert-surface: #eff6ff;
  --alert-icon: #2563eb;
}

.ui-alert-strip--success {
  --alert-border: #bbf7d0;
  --alert-surface: #ecfdf3;
  --alert-icon: #16a34a;
}

.ui-alert-strip--warning {
  --alert-border: #fed7aa;
  --alert-surface: #fff7ed;
  --alert-icon: #ea580c;
}

.ui-alert-strip--error {
  --alert-border: #fecdd3;
  --alert-surface: #fef2f2;
  --alert-icon: #dc2626;
}

.ui-alert-strip__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: var(--dp-radius-panel, 4px);
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(15, 23, 42, 0.06);
  color: var(--alert-icon);
  font-size: 18px;
}

.ui-alert-strip__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ui-alert-strip__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ui-alert-strip__title-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.ui-alert-strip__title {
  min-width: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.5;
  color: var(--dp-text-primary, #0f172a);
}

.ui-alert-strip__meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-alert-strip__description {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--dp-text-secondary, #475569);
}

.ui-alert-strip__actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}

.ui-alert-strip__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: var(--dp-radius-panel, 4px);
  background: rgba(255, 255, 255, 0.82);
  color: var(--dp-text-secondary, #475569);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.ui-alert-strip__close:hover {
  background: rgba(255, 255, 255, 0.96);
  color: var(--dp-text-primary, #0f172a);
}

@media (max-width: 900px) {
  .ui-alert-strip {
    flex-direction: column;
  }

  .ui-alert-strip__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
