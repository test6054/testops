<template>
  <span ref="tooltipRoot" class="ui-tooltip">
    <a-tooltip
      :title="props.title"
      :placement="props.placement"
      :trigger="props.trigger"
      :get-popup-container="getPopupContainer"
      :overlay-class-name="props.overlayClassName || 'ui-tooltip-overlay'"
      v-bind="$attrs"
    >
      <slot />
    </a-tooltip>
  </span>
</template>

<script lang="ts" setup>
import type { TooltipProps } from 'ant-design-vue/es/tooltip'
import { ref } from 'vue'
import { resolvePopupContainer } from './popup-container'

defineOptions({
  name: 'UiTooltip',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title?: string
  placement?: 'top' | 'left' | 'right' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom'
  trigger?: TooltipProps['trigger']
  overlayClassName?: string
}>(), {
  title: '',
  placement: 'top',
  trigger: () => ['hover'],
  overlayClassName: '',
})

const tooltipRoot = ref<HTMLElement>()

const getPopupContainer = (triggerNode?: HTMLElement) => {
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
  border-radius: var(--dp-radius-overlay, 4px);
  padding: 8px 12px;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.92);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
  font-size: 12px;
  line-height: 1.6;
}

.ui-tooltip-overlay .ant-tooltip-arrow::before {
  background: rgba(15, 23, 42, 0.92);
}
</style>
