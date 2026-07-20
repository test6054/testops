<template>
  <a-modal
    :open="props.open"
    :footer="null"
    :closable="false"
    :mask-closable="props.maskClosable"
    :width="props.width"
    wrap-class-name="ui-dialog-wrap"
    v-bind="$attrs"
    @cancel="handleCancel"
  >
    <div class="ui-dialog">
      <header v-if="props.title || props.closable || $slots.header" class="ui-dialog__header">
        <div class="ui-dialog__header-main">
          <slot name="header">
            <h3 class="ui-dialog__title">{{ props.title }}</h3>
          </slot>
        </div>
        <button v-if="props.closable" class="ui-dialog__close" type="button" @click="handleCancel">
          <CloseOutlined />
        </button>
      </header>

      <section class="ui-dialog__body">
        <slot />
      </section>

      <footer v-if="!props.hideFooter" class="ui-dialog__footer">
        <slot name="footer">
          <UiButton size="sm" v-if="!props.hideCancel" variant="outline" @click="handleCancel">
            {{ props.cancelText }}
          </UiButton>
          <UiButton variant="primary" size="sm" :loading="props.confirmLoading" @click="handleOk">
            {{ props.okText }}
          </UiButton>
        </slot>
      </footer>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import { CloseOutlined } from '@ant-design/icons-vue'
import UiButton from './Button.vue'

defineOptions({
  name: 'UiDialog',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: number | string
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
    width: 520,
    closable: true,
    maskClosable: true,
    confirmLoading: false,
    okText: '确定',
    cancelText: '取消',
    hideFooter: false,
    hideCancel: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'ok'): void
  (e: 'cancel'): void
}>()

const handleCancel = () => {
  emit('update:open', false)
  emit('cancel')
}

const handleOk = () => {
  emit('ok')
}
</script>

<style scoped>
.ui-dialog {
  display: flex;
  flex-direction: column;
}

.ui-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-2, 8px);
  padding: var(--dp-space-4, 16px) var(--dp-space-4, 16px) var(--dp-space-3, 12px);
  background: linear-gradient(
    180deg,
    var(--dp-surface-elevated) 0%,
    var(--dp-surface) 100%
  );
  border-bottom: 1px solid var(--dp-border);
}

.ui-dialog__header-main {
  min-width: 0;
  flex: 1;
}

.ui-dialog__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--dp-text-primary);
}

.ui-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--dp-radius-full, 999px);
  background: transparent;
  color: var(--dp-text-secondary);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.ui-dialog__close:hover {
  background: var(--dp-bg-control);
  color: var(--dp-text-primary);
  transform: scale(1.05);
}

.ui-dialog__close:active {
  transform: scale(0.95);
}

.ui-dialog__body {
  padding: var(--dp-space-4, 16px);
}

.ui-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--dp-space-2, 8px);
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px) var(--dp-space-4, 16px);
  border-top: 1px solid color-mix(in srgb, var(--dp-border) 60%, transparent);
}
</style>

<style lang="scss">
.ui-dialog-wrap {
  .ant-modal-content {
    padding: 0 !important;
    border-radius: calc(var(--dp-radius-overlay) + 4px) !important;
    overflow: hidden !important;
    box-shadow:
      0 8px 32px color-mix(in srgb, var(--dp-text-primary) 12%, transparent),
      0 2px 8px color-mix(in srgb, var(--dp-text-primary) 8%, transparent) !important;
    border: 1px solid color-mix(in srgb, var(--dp-border) 80%, transparent);
  }

  .ant-modal-close {
    display: none !important;
  }

  .ant-modal-body {
    padding: 0 !important;
  }

  .ant-modal-mask {
    background-color: color-mix(in srgb, var(--dp-text-primary) 35%, transparent);
    backdrop-filter: blur(4px);
  }
}
</style>
