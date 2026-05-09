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
          <UiButton v-if="!props.hideCancel" variant="outline" @click="handleCancel">
            {{ props.cancelText }}
          </UiButton>
          <UiButton :loading="props.confirmLoading" @click="handleOk">
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
    width?: number
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
  gap: 12px;
  padding: 20px 24px;
  background: var(--dp-surface, #ffffff);
  border-bottom: 1px solid var(--dp-border, #f1f5f9);
}

.ui-dialog__header-main {
  min-width: 0;
  flex: 1;
}

.ui-dialog__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--dp-radius-sm, 6px);
  background: transparent;
  color: var(--dp-text-secondary, #475569);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.ui-dialog__close:hover {
  background: var(--dp-bg-control, #f1f5f9);
  color: var(--dp-text-primary, #0f172a);
}

.ui-dialog__body {
  padding: 24px;
}

.ui-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 24px;
}
</style>

<style lang="scss">
.ui-dialog-wrap {
  .ant-modal-content {
    padding: 0 !important;
    border-radius: var(--dp-radius-overlay, 8px) !important;
    overflow: hidden !important;
    box-shadow: var(--dp-shadow-modal) !important;
    border: 1px solid var(--dp-border, #f1f5f9);
  }

  .ant-modal-close {
    display: none !important;
  }

  .ant-modal-body {
    padding: 0 !important;
  }

  .ant-modal-mask {
    background-color: rgba(15, 23, 42, 0.4);
  }
}
</style>
