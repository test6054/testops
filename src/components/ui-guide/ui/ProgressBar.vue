<template>
  <div class="ui-progress-bar" :class="[`ui-progress-bar--${size}`]">
    <div class="ui-progress-bar__track">
      <div
        class="ui-progress-bar__fill"
        :style="{ width: `${clampedPercent}%`, backgroundColor: computedColor }"
      />
    </div>
    <span v-if="showText" class="ui-progress-bar__text"> {{ clampedPercent }}% </span>
  </div>
</template>

<script lang="ts" setup>
/**
 * UiProgressBar - 统一进度条组件
 * @description 自动处理 0-100 的百分比，提供统一的样式和颜色
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 进度百分比 (0-100) */
    percent: number
    /** 尺寸 */
    size?: 'small' | 'medium' | 'large'
    /** 是否显示百分比文字 */
    showText?: boolean
    /** 自定义颜色，不传则根据进度自动计算 */
    color?: string
    /** 轨道颜色 */
    trackColor?: string
  }>(),
  {
    size: 'medium',
    showText: true,
    trackColor: 'var(--ant-color-fill-tertiary)',
  },
)

/** 限制百分比在 0-100 之间 */
const clampedPercent = computed(() => {
  return Math.max(0, Math.min(100, Math.round(props.percent || 0)))
})

/** 进度条颜色 */
const computedColor = computed(() => {
  if (props.color) return props.color
  return 'var(--ant-color-primary)'
})
</script>

<style lang="scss" scoped>
.ui-progress-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;

  &__track {
    flex: 1;
    height: 8px;
    background: v-bind(trackColor);
    border-radius: var(--dp-radius-xs);
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: var(--dp-radius-xs);
    transition:
      width 0.3s ease,
      background-color 0.3s ease;
  }

  &__text {
    flex-shrink: 0;
    min-width: 40px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ant-color-text-tertiary);
    text-align: right;
  }

  // 尺寸变体
  &--small {
    .ui-progress-bar__track {
      height: 6px;
    }
    .ui-progress-bar__text {
      font-size: 12px;
      min-width: 36px;
    }
  }

  &--large {
    .ui-progress-bar__track {
      height: 10px;
    }
    .ui-progress-bar__text {
      font-size: 14px;
      min-width: 44px;
    }
  }
}
</style>
