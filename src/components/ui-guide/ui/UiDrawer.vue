<template>
  <a-drawer
    :open="props.open"
    :title="null"
    :closable="false"
    :mask-closable="props.maskClosable"
    :placement="props.placement"
    :width="props.width"
    root-class-name="ui-drawer-root"
    v-bind="$attrs"
    @close="handleClose"
  >
    <div class="ui-drawer">
      <header
        v-if="props.title || props.closable || $slots.header"
        class="ui-drawer__header"
        :class="{ 'ui-drawer__header--close-only': closeOnlyHeader }"
      >
        <div class="ui-drawer__header-main">
          <slot name="header">
            <h3 class="ui-drawer__title">{{ props.title }}</h3>
          </slot>
        </div>
        <button v-if="props.closable" class="ui-drawer__close" type="button" @click="handleClose">
          ×
        </button>
      </header>

      <section class="ui-drawer__body">
        <slot />
      </section>

      <footer v-if="!props.hideFooter || $slots.footer" class="ui-drawer__footer">
        <slot name="footer">
          <UiButton v-if="!props.hideCancel" variant="outline" @click="handleClose">
            {{ props.cancelText }}
          </UiButton>
          <UiButton :loading="props.confirmLoading" @click="handleOk">
            {{ props.okText }}
          </UiButton>
        </slot>
      </footer>
    </div>
  </a-drawer>
</template>

<script lang="ts" setup>
import { computed, useSlots } from 'vue'
import UiButton from './Button.vue'

defineOptions({
  name: 'UiDrawer',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: number | string
    placement?: 'left' | 'right' | 'top' | 'bottom'
    closable?: boolean
    maskClosable?: boolean
    confirmLoading?: boolean
    okText?: string
    cancelText?: string
    hideFooter?: boolean
    hideCancel?: boolean
  }>(),
  {
    title: '',
    width: 640,
    placement: 'right',
    closable: true,
    maskClosable: true,
    confirmLoading: false,
    okText: '确定',
    cancelText: '取消',
    hideFooter: true,
    hideCancel: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'ok'): void
  (e: 'confirm'): void
  (e: 'close'): void
}>()
const slots = useSlots()
const closeOnlyHeader = computed(() => props.closable && !props.title && !slots.header)

const handleClose = () => {
  emit('update:open', false)
  emit('close')
}

const handleOk = () => {
  emit('ok')
  emit('confirm')
}
</script>

<style scoped>
.ui-drawer {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.ui-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 24px 24px 0;
}

.ui-drawer__header--close-only {
  justify-content: flex-end;
  padding: 8px 8px 0;
}

.ui-drawer__header--close-only .ui-drawer__header-main {
  display: none;
}

.ui-drawer__header-main {
  min-width: 0;
  flex: 1;
}

.ui-drawer__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--dp-radius-control-inner, 4px);
  background: transparent;
  color: var(--dp-text-secondary, #475569);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ui-drawer__close:hover {
  background: var(--dp-gray-100, #f3f4f6);
  color: var(--dp-text-primary, #0f172a);
}

.ui-drawer__body {
  flex: 1;
  padding: 20px 24px 24px;
}

.ui-drawer__header--close-only + .ui-drawer__body {
  padding-top: 8px;
}

.ui-drawer__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 24px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}
</style>

<style lang="scss">
.ui-drawer-root {
  direction: ltr;

  .ant-drawer-content {
    background: var(--dp-surface, #fff) !important;
  }

  .ant-drawer-body {
    padding: 0 !important;
  }

  &.ant-drawer-right > .ant-drawer-content-wrapper {
    left: auto !important;
    right: 0 !important;
    inset-inline-start: auto !important;
    inset-inline-end: 0 !important;
    transform-origin: right center;
  }

  &.ant-drawer-right > .ant-drawer-content-wrapper.ant-drawer-panel-motion-right {
    transform: none !important;
    will-change: clip-path;
  }

  &.ant-drawer-right > .ant-drawer-content-wrapper.ant-drawer-panel-motion-right-enter,
  &.ant-drawer-right > .ant-drawer-content-wrapper.ant-drawer-panel-motion-right-appear {
    &.ant-drawer-panel-motion-right-enter-start,
    &.ant-drawer-panel-motion-right-appear-start {
      transform: none !important;
      clip-path: inset(0 0 0 100%);
    }

    &.ant-drawer-panel-motion-right-enter-active,
    &.ant-drawer-panel-motion-right-appear-active {
      transform: none !important;
      clip-path: inset(0 0 0 0);
      transition: clip-path 0.3s ease !important;
    }
  }

  &.ant-drawer-right > .ant-drawer-content-wrapper.ant-drawer-panel-motion-right-leave {
    transform: none !important;
    clip-path: inset(0 0 0 0);

    &.ant-drawer-panel-motion-right-leave-active {
      transform: none !important;
      clip-path: inset(0 0 0 100%);
      transition: clip-path 0.3s ease !important;
    }
  }

  &.ant-drawer-left > .ant-drawer-content-wrapper {
    left: 0 !important;
    right: auto !important;
    inset-inline-start: 0 !important;
    inset-inline-end: auto !important;
    transform-origin: left center;
  }
}
</style>
