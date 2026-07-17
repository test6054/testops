<script lang="ts" setup>
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import InfoCircleOutlined from '@ant-design/icons-vue/InfoCircleOutlined'

defineOptions({ name: 'WorkbenchNoticeBanner' })

withDefaults(
  defineProps<{
    /** 横幅主标题；省略时仅展示说明文案 */
    title?: string
    /** 补充说明 */
    description?: string
    /** 视觉语义：warning 前置阻塞，info 流程提示 */
    tone?: 'warning' | 'info'
  }>(),
  {
    title: '',
    description: '',
    tone: 'warning',
  },
)

const iconMap = {
  warning: ExclamationCircleOutlined,
  info: InfoCircleOutlined,
} as const
</script>

<template>
  <div
    class="workbench-notice-banner"
    :class="`workbench-notice-banner--${tone}`"
    role="status"
    :aria-label="title || description"
  >
    <component :is="iconMap[tone]" class="workbench-notice-banner__icon" aria-hidden="true" />
    <p class="workbench-notice-banner__text">
      <span v-if="title" class="workbench-notice-banner__title">{{ title }}</span>
      <span v-if="title && description" class="workbench-notice-banner__sep" aria-hidden="true">·</span>
      <span
        class="workbench-notice-banner__description"
        :class="{ 'workbench-notice-banner__description--solo': !title }"
      >{{ description }}</span>
    </p>
    <div v-if="$slots.default" class="workbench-notice-banner__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.workbench-notice-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  padding: 4px 10px;
  border-radius: var(--dp-radius-panel);
}

.workbench-notice-banner--warning {
  border: 1px solid var(--dp-amber-200);
  background: var(--dp-amber-50);
}

.workbench-notice-banner--info {
  border: 1px solid var(--dp-blue-200);
  background: var(--dp-blue-50);
}

.workbench-notice-banner__icon {
  flex-shrink: 0;
  font-size: 14px;
}

.workbench-notice-banner--warning .workbench-notice-banner__icon {
  color: var(--dp-amber-700);
}

.workbench-notice-banner--info .workbench-notice-banner__icon {
  color: var(--dp-blue-700);
}

.workbench-notice-banner__text {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  min-width: 0;
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
}

.workbench-notice-banner__title {
  font-weight: 600;
  color: var(--dp-text-primary);
}

.workbench-notice-banner__sep {
  color: var(--dp-text-muted);
}

.workbench-notice-banner__description {
  color: var(--dp-text-secondary);
}

.workbench-notice-banner__actions {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}
</style>
