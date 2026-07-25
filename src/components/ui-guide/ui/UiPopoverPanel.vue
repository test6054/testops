<template>
  <span ref="popoverRoot" class="ui-popover-panel-trigger">
    <a-popover
      :open="props.disabled ? false : props.open"
      :trigger="resolvedTrigger"
      :placement="props.placement"
      :arrow="props.arrow"
      :destroy-tooltip-on-hide="props.destroyOnHide"
      :overlay-class-name="mergedOverlayClassName"
      :get-popup-container="getPopupContainer"
      v-bind="$attrs"
      @update:open="handleOpenChange"
    >
      <template #content>
        <div
          class="ui-popover-panel__surface"
          :class="{ 'ui-popover-panel__surface--compact': props.compact }"
          :style="surfaceStyle"
        >
          <div v-if="hasHeader" class="ui-popover-panel__header">
            <slot name="header">
              <div v-if="props.title" class="ui-popover-panel__title">{{ props.title }}</div>
              <p v-if="props.description" class="ui-popover-panel__description">
                {{ props.description }}
              </p>
            </slot>
          </div>

          <div class="ui-popover-panel__body" :style="bodyStyle">
            <slot name="content">
              <div v-if="props.content" class="ui-popover-panel__content-text">
                {{ props.content }}
              </div>
            </slot>
          </div>

          <div v-if="$slots.footer" class="ui-popover-panel__footer">
            <slot name="footer" />
          </div>
        </div>
      </template>

      <slot />
    </a-popover>
  </span>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { computed, ref, useSlots } from 'vue'
import { resolvePopupContainer } from './popup-container'

type PopoverTrigger = 'hover' | 'focus' | 'click' | 'contextmenu'
type PopoverPlacement
  = | 'topLeft'
    | 'top'
    | 'topRight'
    | 'leftTop'
    | 'left'
    | 'leftBottom'
    | 'rightTop'
    | 'right'
    | 'rightBottom'
    | 'bottomLeft'
    | 'bottom'
    | 'bottomRight'

defineOptions({
  name: 'UiPopoverPanel',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    open?: boolean
    title?: string
    description?: string
    content?: string
    trigger?: PopoverTrigger[]
    placement?: PopoverPlacement
    maxWidth?: string | number
    maxBodyHeight?: string | number
    compact?: boolean
    arrow?: boolean
    destroyOnHide?: boolean
    disabled?: boolean
    overlayClassName?: string
    getPopupContainer?: (triggerNode?: HTMLElement) => HTMLElement
  }>(),
  {
    open: undefined,
    title: '',
    description: '',
    content: '',
    trigger: () => ['hover'],
    placement: 'bottomLeft',
    maxWidth: 320,
    maxBodyHeight: '',
    compact: false,
    arrow: true,
    destroyOnHide: true,
    disabled: false,
    overlayClassName: '',
    getPopupContainer: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'open-change', value: boolean): void
}>()

const slots = useSlots()
const popoverRoot = ref<HTMLElement>()

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!slots.header
})

const resolvedTrigger = computed(() => {
  return props.disabled ? [] : props.trigger
})

const mergedOverlayClassName = computed(() => {
  return ['ui-popover-panel-overlay', props.overlayClassName].filter(Boolean).join(' ')
})

const surfaceStyle = computed<CSSProperties | undefined>(() => {
  const width = normalizeCssSize(props.maxWidth)
  if (!width) {
    return undefined
  }
  return {
    width,
  }
})

const bodyStyle = computed<CSSProperties | undefined>(() => {
  const maxHeight = normalizeCssSize(props.maxBodyHeight)
  if (!maxHeight) return undefined

  return {
    maxHeight,
    overflowY: 'auto',
  }
})

const getPopupContainer = (triggerNode?: HTMLElement) => {
  if (props.getPopupContainer) return props.getPopupContainer(triggerNode)

  return popoverRoot.value ?? resolvePopupContainer(triggerNode)
}

const handleOpenChange = (value: boolean) => {
  emit('update:open', value)
  emit('open-change', value)
}
</script>

<style scoped>
.ui-popover-panel-trigger {
  position: relative;
  display: inline-flex;
  max-width: 100%;
}

.ui-popover-panel__surface {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--dp-surface);
}

.ui-popover-panel__surface--compact {
  font-size: var(--dp-font-size-sm);
}

.ui-popover-panel__header {
  padding: var(--dp-space-3, 12px) var(--dp-space-3, 12px) 0;
}

.ui-popover-panel__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.4;
  color: var(--dp-text-primary);
}

.ui-popover-panel__description {
  margin: 6px 0 0;
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
  color: var(--dp-text-secondary);
}

.ui-popover-panel__body {
  min-width: 0;
  padding: var(--dp-space-3, 12px);
}

.ui-popover-panel__surface--compact .ui-popover-panel__header {
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px) 0;
}

.ui-popover-panel__surface--compact .ui-popover-panel__body {
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px) var(--dp-space-3, 12px);
}

.ui-popover-panel__content-text {
  font-size: var(--dp-font-size-sm);
  line-height: 1.7;
  color: var(--dp-text-secondary);
}

.ui-popover-panel__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
  padding: 0 var(--dp-space-3, 12px) var(--dp-space-3, 12px);
  border-top: 1px solid var(--dp-border);
}

.ui-popover-panel__surface--compact .ui-popover-panel__footer {
  padding: 0 var(--dp-space-3, 12px) var(--dp-space-2, 8px);
}
</style>

<style lang="scss">
.ui-popover-panel-overlay {
  .ant-popover-inner {
    padding: 0 !important;
    overflow: hidden !important;
    border-radius: var(--dp-radius-overlay) !important;
    box-shadow: var(--dp-shadow-dropdown) !important;
  }

  .ant-popover-inner-content {
    padding: 0 !important;
  }
}
</style>
