<template>
  <div class="dp-stat-grid" :class="[size && `dp-stat-grid--${size}`]">
    <div
      v-for="item in items"
      :key="item.key || item.label"
      class="dp-statcard"
      :class="{ clickable: !!item.onClick }"
      @click="item.onClick?.()"
    >
      <div class="dp-statcard__content">
        <p class="dp-statcard__label">{{ item.label }}</p>
        <p class="dp-statcard__value" :style="{ color: getToneStyle(item.tone).value }">
          <span>{{ item.value }}</span>
          <span v-if="item.unit" class="dp-statcard__unit">{{ item.unit }}</span>
        </p>
        <p v-if="item.subText" class="dp-statcard__sub">{{ item.subText }}</p>
      </div>
      <div
        class="dp-statcard__icon"
        :style="{
          color: getToneStyle(item.tone).icon,
          background: getToneStyle(item.tone).bg,
        }"
      >
        <component :is="item.icon || 'span'" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { StatItem, Tone } from './types'

type Size = 'default' | 'compact'

withDefaults(
  defineProps<{
    items: StatItem[]
    size?: Size
  }>(),
  {
    size: 'default',
  },
)

const toneMap: Record<Tone, { bg: string; icon: string; value: string }> = {
  blue: {
    bg: 'var(--ant-color-primary-bg)',
    icon: 'var(--ant-color-primary)',
    value: 'var(--ant-color-text)',
  },
  cyan: {
    bg: 'var(--ant-color-success-bg-hover)',
    icon: 'var(--ant-color-success-hover)',
    value: 'var(--ant-color-text)',
  },
  orange: {
    bg: 'var(--ant-color-warning-bg)',
    icon: 'var(--ant-color-warning)',
    value: 'var(--ant-color-text)',
  },
  pink: {
    bg: 'var(--ant-color-error-bg)',
    icon: 'var(--ant-color-error)',
    value: 'var(--ant-color-text)',
  },
  green: {
    bg: 'var(--ant-color-success-bg)',
    icon: 'var(--ant-color-success)',
    value: 'var(--ant-color-text)',
  },
  red: {
    bg: 'var(--ant-color-error-bg)',
    icon: 'var(--ant-color-error)',
    value: 'var(--ant-color-text)',
  },
  purple: {
    bg: 'var(--ant-color-primary-bg)',
    icon: 'var(--ant-color-primary-hover)',
    value: 'var(--ant-color-text)',
  },
}

// 安全获取tone样式，防止undefined错误
const getToneStyle = (tone?: Tone) => {
  return toneMap[tone as Tone] || toneMap.blue
}
</script>

<style scoped>
.dp-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.dp-statcard {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-lg);
  padding: 14px 16px;
  background: var(--ant-color-bg-container);
  box-shadow: var(--dp-shadow-sm);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
  cursor: default;
}

.dp-statcard.clickable {
  cursor: pointer;
}

.dp-statcard:hover {
  border-color: var(--dp-border-strong, #e2e8f0);
}

.dp-statcard__content {
  flex: 1;
}

.dp-statcard__label {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
  margin-bottom: 4px;
}

.dp-statcard__value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 22px;
  font-weight: 800;
  color: var(--ant-color-text);
  margin: 0;
}

.dp-statcard__unit {
  font-size: 13px;
  font-weight: 600;
  color: var(--ant-color-text-tertiary);
}

.dp-statcard__sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.dp-statcard__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--dp-radius-lg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

/* compact 模式 */
.dp-stat-grid--compact .dp-statcard {
  padding: 10px 14px;
  border-radius: var(--dp-radius-md, 6px);
}

.dp-stat-grid--compact .dp-statcard__label {
  font-size: 11px;
  margin-bottom: 2px;
}

.dp-stat-grid--compact .dp-statcard__value {
  font-size: 18px;
}

.dp-stat-grid--compact .dp-statcard__unit {
  font-size: 12px;
}

.dp-stat-grid--compact .dp-statcard__sub {
  font-size: 11px;
}

.dp-stat-grid--compact .dp-statcard__icon {
  width: 32px;
  height: 32px;
  font-size: 14px;
}
</style>
