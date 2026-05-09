<template>
  <section
    class="ui-state-block"
    :class="[
      `ui-state-block--${props.state}`,
      `ui-state-block--${props.size}`,
      { 'ui-state-block--compact': props.compact },
    ]"
    :style="containerStyle"
    v-bind="$attrs"
  >
    <div class="ui-state-block__icon-shell">
      <slot name="icon">
        <div class="ui-state-block__icon">
          <a-spin v-if="isLoading" />
          <component :is="iconComponent" v-else />
        </div>
      </slot>
    </div>

    <div class="ui-state-block__content">
      <div v-if="props.badgeLabel || $slots.badge" class="ui-state-block__badge">
        <slot name="badge">
          <UiBadge
            :tone="props.badgeTone"
            variant="soft"
            size="sm"
          >
            {{ props.badgeLabel }}
          </UiBadge>
        </slot>
      </div>

      <h3 class="ui-state-block__title">{{ mergedTitle }}</h3>
      <p class="ui-state-block__description">{{ mergedDescription }}</p>

      <p v-if="props.helper || $slots.helper" class="ui-state-block__helper">
        <slot name="helper">{{ props.helper }}</slot>
      </p>

      <div v-if="$slots.default" class="ui-state-block__body">
        <slot />
      </div>

      <div v-if="$slots.actions" class="ui-state-block__actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiStateBlockState } from './types'
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  InboxOutlined,
  InfoCircleFilled,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import UiBadge from './Badge.vue'

defineOptions({
  name: 'UiStateBlock',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  state?: UiStateBlockState
  title?: string
  description?: string
  helper?: string
  badgeLabel?: string
  badgeTone?: BadgeTone
  size?: 'sm' | 'md' | 'lg'
  minHeight?: string | number
  compact?: boolean
}>(), {
  state: 'empty',
  title: '',
  description: '',
  helper: '',
  badgeLabel: '',
  badgeTone: 'blue',
  size: 'md',
  minHeight: '',
  compact: false,
})

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null)
    return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const isLoading = computed(() => props.state === 'loading')

const iconComponent = computed(() => {
  const iconMap: Record<UiStateBlockState, unknown> = {
    empty: InboxOutlined,
    loading: InfoCircleFilled,
    success: CheckCircleFilled,
    warning: ExclamationCircleFilled,
    error: CloseCircleFilled,
    info: InfoCircleFilled,
  }

  return iconMap[props.state]
})

const mergedTitle = computed(() => {
  if (props.title)
    return props.title

  const titleMap: Record<UiStateBlockState, string> = {
    empty: '暂无内容',
    loading: '正在加载',
    success: '处理完成',
    warning: '需要关注',
    error: '处理失败',
    info: '待进一步处理',
  }

  return titleMap[props.state]
})

const mergedDescription = computed(() => {
  if (props.description)
    return props.description

  const descriptionMap: Record<UiStateBlockState, string> = {
    empty: '当前没有可展示的数据，可以调整筛选条件或稍后再试。',
    loading: '数据正在准备中，请稍候。',
    success: '当前结果已生成，可以继续查看详情或进入下一步。',
    warning: '当前结果存在风险项，建议先查看提示信息再继续操作。',
    error: '当前请求未成功完成，请检查参数或稍后重试。',
    info: '当前模块已准备就绪，可继续执行下一步操作。',
  }

  return descriptionMap[props.state]
})

const containerStyle = computed(() => {
  const minHeight = normalizeCssSize(props.minHeight)
  if (!minHeight)
    return undefined

  return {
    minHeight,
  }
})
</script>

<style scoped>
.ui-state-block {
  --state-border: var(--dp-border, #e5e7eb);
  --state-surface: var(--dp-surface, #fff);
  --state-icon-bg: #eff6ff;
  --state-icon-color: #2563eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-height: 220px;
  padding: 28px 24px;
  border: 1px solid var(--state-border);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--state-surface);
  text-align: center;
}

.ui-state-block--compact {
  gap: 14px;
  min-height: 180px;
  padding: 22px 18px;
}

.ui-state-block--sm {
  min-height: 180px;
}

.ui-state-block--lg {
  min-height: 260px;
  padding: 34px 28px;
}

.ui-state-block--empty {
  --state-icon-bg: #f8fafc;
  --state-icon-color: #64748b;
}

.ui-state-block--loading {
  --state-icon-bg: #eff6ff;
  --state-icon-color: #2563eb;
}

.ui-state-block--success {
  --state-icon-bg: #ecfdf3;
  --state-icon-color: #16a34a;
}

.ui-state-block--warning {
  --state-icon-bg: #fff7ed;
  --state-icon-color: #ea580c;
}

.ui-state-block--error {
  --state-icon-bg: #fef2f2;
  --state-icon-color: #dc2626;
}

.ui-state-block--info {
  --state-icon-bg: #eff6ff;
  --state-icon-color: #2563eb;
}

.ui-state-block__icon-shell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ui-state-block__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--state-icon-bg);
  border: 1px solid var(--dp-border, #e5e7eb);
  color: var(--state-icon-color);
  font-size: 30px;
}

.ui-state-block__icon :deep(.ant-spin-dot) {
  font-size: 28px;
}

.ui-state-block__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  max-width: 520px;
}

.ui-state-block__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ui-state-block__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.4;
  color: var(--dp-text-primary, #0f172a);
}

.ui-state-block__description {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--dp-text-secondary, #475569);
}

.ui-state-block__helper {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-muted, #64748b);
}

.ui-state-block__body {
  width: 100%;
}

.ui-state-block__actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}
</style>
