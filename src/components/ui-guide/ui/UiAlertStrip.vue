<template>
  <section
    v-if="visible"
    class="ui-alert-strip"
    :class="[
      `ui-alert-strip--${props.tone}`,
      `ui-alert-strip--${props.size}`,
      {
        'ui-alert-strip--dense': props.dense,
        'ui-alert-strip--inline': props.inline,
      },
    ]"
    v-bind="$attrs"
  >
    <div v-if="props.showIcon" class="ui-alert-strip__icon" aria-hidden="true">
      <component :is="iconComponent" />
    </div>

    <div class="ui-alert-strip__main">
      <div class="ui-alert-strip__head">
        <div class="ui-alert-strip__title-wrap">
          <div v-if="props.title" class="ui-alert-strip__title">{{ props.title }}</div>
          <div
            v-if="props.inline && (props.description || $slots.default)"
            class="ui-alert-strip__inline-desc"
          >
            <slot>{{ props.description }}</slot>
          </div>
          <div v-if="$slots.meta" class="ui-alert-strip__meta">
            <slot name="meta" />
          </div>
        </div>
      </div>

      <div
        v-if="!props.inline && (props.description || $slots.default)"
        class="ui-alert-strip__description"
      >
        <slot>{{ props.description }}</slot>
      </div>
    </div>

    <div v-if="$slots.actions || props.closable" class="ui-alert-strip__actions">
      <slot name="actions" />

      <button
        v-if="props.closable"
        type="button"
        class="ui-alert-strip__close"
        aria-label="关闭提示"
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

const props = withDefaults(
  defineProps<{
    tone?: UiAlertStripTone
    title?: string
    description?: string
    size?: 'sm' | 'md'
    showIcon?: boolean
    closable?: boolean
    /** 紧凑块级（仍可多行，但 padding 更小） */
    dense?: boolean
    /**
     * 单行内联条：笔记本优先，标题与说明同一行省略，避免大框占屏。
     * 工作台阻断/合同错误默认用 inline。
     */
    inline?: boolean
  }>(),
  {
    tone: 'info',
    title: '',
    description: '',
    size: 'md',
    showIcon: true,
    closable: false,
    // 笔记本优先：默认紧凑单行，避免大框占屏；需要多行说明的页面显式关闭 inline
    dense: true,
    inline: true,
  },
)

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
  --alert-border: var(--dp-info-border);
  --alert-surface: var(--dp-info-bg);
  --alert-icon: var(--dp-info);
  display: flex;
  align-items: flex-start;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border: 1px solid var(--alert-border);
  border-radius: var(--dp-radius-control, 4px);
  background: var(--alert-surface);
  min-height: 0;
  /* 禁止被列表填满布局的 flex 子项规则撑成半屏 */
  flex: 0 0 auto;
  height: auto;
  align-self: stretch;
}

.ui-alert-strip--sm {
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  gap: var(--dp-space-component-tight);
}

.ui-alert-strip--dense {
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
}

.ui-alert-strip--inline {
  align-items: center;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-xs) var(--dp-space-component);
  min-height: 32px;
}

.ui-alert-strip--info {
  --alert-border: var(--dp-info-border);
  --alert-surface: var(--dp-info-bg);
  --alert-icon: var(--dp-info);
}

.ui-alert-strip--success {
  --alert-border: var(--dp-success-border);
  --alert-surface: var(--dp-success-bg);
  --alert-icon: var(--dp-success);
}

.ui-alert-strip--warning {
  --alert-border: var(--dp-warning-border);
  --alert-surface: var(--dp-warning-bg);
  --alert-icon: var(--dp-warning);
}

.ui-alert-strip--error {
  --alert-border: var(--dp-error-border);
  --alert-surface: var(--dp-error-bg);
  --alert-icon: var(--dp-danger);
}

.ui-alert-strip__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  color: var(--alert-icon);
  font-size: var(--dp-font-size-md);
  background: transparent;
  border: 0;
}

.ui-alert-strip--inline .ui-alert-strip__icon {
  margin-top: 0;
  width: 14px;
  height: 14px;
  font-size: var(--dp-font-size-sm);
}

.ui-alert-strip__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ui-alert-strip--inline .ui-alert-strip__main {
  flex-direction: row;
  align-items: center;
  gap: 0;
}

.ui-alert-strip__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  width: 100%;
}

.ui-alert-strip__title-wrap {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  width: 100%;
}

.ui-alert-strip:not(.ui-alert-strip--inline) .ui-alert-strip__title-wrap {
  flex-wrap: wrap;
}

.ui-alert-strip__title {
  min-width: 0;
  flex-shrink: 0;
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  line-height: 20px;
  color: var(--dp-text-primary, var(--dp-text-primary));
}

.ui-alert-strip--inline .ui-alert-strip__title {
  font-size: var(--dp-font-size-xs);
  line-height: 18px;
}

.ui-alert-strip__inline-desc {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--dp-font-size-xs);
  line-height: 18px;
  color: var(--dp-text-secondary, var(--dp-text-secondary));
}

.ui-alert-strip__meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  flex-shrink: 0;
}

.ui-alert-strip__description {
  margin: 0;
  font-size: var(--dp-font-size-xs);
  line-height: 1.5;
  color: var(--dp-text-secondary, var(--dp-text-secondary));
}

.ui-alert-strip__actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: var(--dp-space-component-tight);
  flex-shrink: 0;
}

.ui-alert-strip__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: var(--dp-radius-control, 4px);
  background: transparent;
  color: var(--dp-text-secondary, var(--dp-text-secondary));
  cursor: pointer;
}

.ui-alert-strip__close:hover {
  background: var(--dp-fill-tertiary);
  color: var(--dp-text-primary, var(--dp-text-primary));
}

@media (max-width: 900px) {
  .ui-alert-strip:not(.ui-alert-strip--inline) {
    flex-wrap: wrap;
  }

  .ui-alert-strip:not(.ui-alert-strip--inline) .ui-alert-strip__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .ui-alert-strip--inline .ui-alert-strip__inline-desc {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}
</style>
