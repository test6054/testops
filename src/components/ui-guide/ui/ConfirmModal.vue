<template>
  <UiConfirmDialog
    :open="props.open"
    :type="props.type"
    :title="props.title"
    :content="props.content"
    :width="props.width"
    :ok-text="props.okText"
    :cancel-text="props.cancelText"
    :hide-cancel="props.hideCancel"
    :closable="props.closable"
    :mask-closable="props.maskClosable"
    :confirm-loading="props.confirmLoading"
    v-bind="$attrs"
    @update:open="handleOpenUpdate"
    @ok="emit('ok')"
    @cancel="emit('cancel')"
  >
    <slot />
  </UiConfirmDialog>
</template>

<script lang="ts" setup>
import UiConfirmDialog from './UiConfirmDialog.vue'

defineOptions({
  name: 'UiConfirmModal',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  open: boolean
  type?: ModalType
  title?: string
  content?: string
  width?: number
  okText?: string
  cancelText?: string
  hideCancel?: boolean
  closable?: boolean
  maskClosable?: boolean
  confirmLoading?: boolean
}>(), {
  type: 'warning',
  title: '提示',
  content: '',
  width: 440,
  okText: '确认',
  cancelText: '取消',
  hideCancel: false,
  closable: true,
  maskClosable: true,
  confirmLoading: false,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'ok'): void
  (e: 'cancel'): void
}>()

function handleOpenUpdate(value: boolean) {
  emit('update:open', value)
}

type ModalType = 'warning' | 'info' | 'success' | 'error'
</script>
