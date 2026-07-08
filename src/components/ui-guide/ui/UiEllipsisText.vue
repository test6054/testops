<template>
  <span ref="hostRef" class="ui-ellipsis-text-host">
    <UiTooltip
      v-if="showTooltipBinding"
      :title="tooltipTitle"
      :placement="props.placement"
      popup-mount="body"
      overlay-class-name="ui-ellipsis-tooltip-overlay"
    >
      <span ref="textRef" class="ui-ellipsis-text" :class="toneClass" :style="lineClampStyle">
        <slot>{{ displayText }}</slot>
      </span>
    </UiTooltip>
    <span v-else ref="textRef" class="ui-ellipsis-text" :class="toneClass" :style="lineClampStyle">
      <slot>{{ displayText }}</slot>
    </span>
  </span>
</template>

<script lang="ts" setup>
import type { TooltipProps } from 'ant-design-vue/es/tooltip'
import type { CSSProperties } from 'vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import UiTooltip from './UiTooltip.vue'

defineOptions({ name: 'UiEllipsisText' })

const props = withDefaults(
  defineProps<{
    /** 展示文本；也可使用默认 slot */
    text?: string | number | null
    /** Tooltip 全文，默认与展示文本一致 */
    title?: string
    /** 空值占位 */
    emptyText?: string
    /** 是否启用 hover 全文提示（仅文本实际溢出时展示） */
    tooltip?: boolean
    /** 视觉色调：mono 用于 JSON / ID 类详情 */
    tone?: 'default' | 'secondary' | 'mono'
    /** 最大行数，默认单行省略 */
    lines?: 1 | 2
    /** Tooltip 方位；表格长文本列默认 topLeft，避免遮挡右侧 fixed 操作列 */
    placement?: TooltipProps['placement']
  }>(),
  {
    text: undefined,
    title: undefined,
    emptyText: '—',
    tooltip: true,
    tone: 'default',
    lines: 1,
    placement: 'topLeft',
  },
)

const slots = useSlots()
const hostRef = ref<HTMLElement>()
const textRef = ref<HTMLElement>()
const isOverflowing = ref(false)
let resizeObserver: ResizeObserver | undefined

const displayText = computed(() => {
  if (slots.default) {
    return ''
  }
  if (props.text === undefined || props.text === null || props.text === '') {
    return props.emptyText
  }
  return String(props.text)
})

const tooltipTitle = computed(() => {
  if (props.title !== undefined && props.title !== '') {
    return props.title
  }
  if (slots.default) {
    return ''
  }
  if (displayText.value === props.emptyText) {
    return ''
  }
  return displayText.value
})

const hasTooltipContent = computed(() => {
  if (props.tooltip === false) {
    return false
  }
  if (slots.default) {
    return Boolean(tooltipTitle.value)
  }
  return displayText.value !== props.emptyText && tooltipTitle.value.length > 0
})

/** 仅在内容溢出且存在全文时绑定 Tooltip，避免空 tooltip 与遮挡操作列。 */
const showTooltipBinding = computed(() => {
  return hasTooltipContent.value && isOverflowing.value
})

const toneClass = computed(() => `ui-ellipsis-text--${props.tone}`)

const lineClampStyle = computed<CSSProperties>(() => {
  if (props.lines === 2) {
    return {
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      display: '-webkit-box',
      whiteSpace: 'normal',
    }
  }
  return {}
})

/** 检测文本是否被 ellipsis 截断，未截断则不弹出 Tooltip。 */
function updateOverflowState() {
  const el = textRef.value
  if (!el) {
    isOverflowing.value = false
    return
  }
  if (props.lines === 2) {
    isOverflowing.value = el.scrollHeight > el.clientHeight + 1
    return
  }
  isOverflowing.value = el.scrollWidth > el.clientWidth + 1
}

function bindResizeObserver() {
  resizeObserver?.disconnect()
  const el = textRef.value
  if (!el) {
    return
  }
  resizeObserver = new ResizeObserver(() => {
    updateOverflowState()
  })
  resizeObserver.observe(el)
}

watch(
  () => [props.text, props.lines, displayText.value, hasTooltipContent.value],
  () => {
    nextTick(() => {
      updateOverflowState()
      bindResizeObserver()
    })
  },
)

watch(showTooltipBinding, () => {
  nextTick(() => {
    updateOverflowState()
    bindResizeObserver()
  })
})

onMounted(() => {
  nextTick(() => {
    updateOverflowState()
    bindResizeObserver()
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.ui-ellipsis-text-host {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.ui-ellipsis-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-ellipsis-text--secondary {
  color: var(--dp-text-secondary);
}

.ui-ellipsis-text--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  color: var(--dp-text-secondary);
}
</style>

<style>
/* 表格 ellipsis：挂载 body + 不拦截鼠标；需高于 global/_overrides.scss 浅色 tooltip */
.ant-tooltip.ui-tooltip-overlay.ui-ellipsis-tooltip-overlay {
  pointer-events: none;
}

.ant-tooltip.ui-tooltip-overlay.ui-ellipsis-tooltip-overlay .ant-tooltip-inner {
  max-width: 320px;
  min-height: auto;
  height: auto;
  border-radius: var(--dp-radius-overlay);
  padding: 8px 12px;
  color: #f8fafc !important;
  background-color: rgb(15 23 42 / 92%) !important;
  border: none !important;
  box-shadow: 0 12px 32px rgb(15 23 42 / 18%) !important;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
  text-align: left;
}

.ant-tooltip.ui-tooltip-overlay.ui-ellipsis-tooltip-overlay .ant-tooltip-arrow::before {
  background-color: rgb(15 23 42 / 92%) !important;
  border: none !important;
}
</style>
