<template>
  <span ref="tooltipRoot" class="ui-tooltip">
    <a-tooltip
      :title="props.title"
      :placement="props.placement"
      :trigger="props.trigger"
      :get-popup-container="getPopupContainer"
      :overlay-class-name="resolvedOverlayClassName"
      v-bind="$attrs"
    >
      <slot />
    </a-tooltip>
  </span>
</template>

<script lang="ts" setup>
import type { TooltipProps } from 'ant-design-vue/es/tooltip'
import { computed, ref } from 'vue'
import { resolvePopupContainer } from './popup-container'

defineOptions({
  name: 'UiTooltip',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    placement?:
      | 'top'
      | 'left'
      | 'right'
      | 'bottom'
      | 'topLeft'
      | 'topRight'
      | 'bottomLeft'
      | 'bottomRight'
      | 'leftTop'
      | 'leftBottom'
      | 'rightTop'
      | 'rightBottom'
    trigger?: TooltipProps['trigger']
    overlayClassName?: string
    /** inline：挂载在触发器旁；body：挂载到 document.body（表格 ellipsis 必用，避免单元格裁剪与字阶污染） */
    popupMount?: 'inline' | 'body'
  }>(),
  {
    title: '',
    placement: 'top',
    trigger: () => ['hover'],
    overlayClassName: '',
    popupMount: 'inline',
  },
)

const tooltipRoot = ref<HTMLElement>()

const resolvedOverlayClassName = computed(() => {
  if (!props.overlayClassName) {
    return 'ui-tooltip-overlay'
  }
  return `ui-tooltip-overlay ${props.overlayClassName}`
})

const getPopupContainer = (triggerNode?: HTMLElement) => {
  if (props.popupMount === 'body' && typeof document !== 'undefined') {
    return document.body
  }
  return tooltipRoot.value ?? resolvePopupContainer(triggerNode)
}
</script>

<style scoped>
.ui-tooltip {
  position: relative;
  display: inline-flex;
  max-width: 100%;
}
</style>

<style>
.ui-tooltip-overlay .ant-tooltip-inner {
  max-width: 320px;
  border-radius: var(--dp-radius-overlay);
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
  color: var(--dp-text-inverse);
  background: color-mix(in srgb, var(--dp-text-primary) 92%, transparent);
  box-shadow: var(--dp-shadow-md);
  font-size: var(--dp-font-size-xs);
  line-height: 1.6;
}

.ui-tooltip-overlay .ant-tooltip-arrow::before {
  background: color-mix(in srgb, var(--dp-text-primary) 92%, transparent);
}
</style>
