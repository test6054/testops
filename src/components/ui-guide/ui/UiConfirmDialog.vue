<template>
  <UiDialog
    :open="props.open"
    :title="props.title"
    :width="props.width"
    :closable="props.closable"
    :mask-closable="props.maskClosable"
    :confirm-loading="props.confirmLoading"
    :ok-text="props.okText"
    :cancel-text="props.cancelText"
    :hide-cancel="props.hideCancel"
    @update:open="(value) => emit('update:open', value)"
    @ok="emit('ok')"
    @cancel="emit('cancel')"
  >
    <div class="ui-confirm-dialog">
      <div class="ui-confirm-dialog__icon" :class="`ui-confirm-dialog__icon--${props.type}`">
        <component :is="iconComponent" />
      </div>
      <div class="ui-confirm-dialog__content">
        <p v-if="props.content" class="ui-confirm-dialog__text">{{ props.content }}</p>
        <slot />
      </div>
    </div>
    <template #footer>
      <slot name="footer">
        <UiButton v-if="!props.hideCancel" variant="outline" @click="handleCancel">
          {{ props.cancelText }}
        </UiButton>
        <UiButton :variant="okVariant" :loading="props.confirmLoading" @click="emit('ok')">
          {{ props.okText }}
        </UiButton>
      </slot>
    </template>
  </UiDialog>
</template>

<script lang="ts" setup>
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import UiButton from './Button.vue'
import UiDialog from './UiDialog.vue'

defineOptions({ name: 'UiConfirmDialog' })

const props = withDefaults(defineProps<{
  open: boolean
  type?: ConfirmDialogType
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

type ConfirmDialogType = 'warning' | 'info' | 'success' | 'error'

const iconComponent = computed(() => {
  const iconMap = {
    warning: ExclamationCircleFilled,
    info: InfoCircleFilled,
    success: CheckCircleFilled,
    error: ExclamationCircleFilled,
  }
  return iconMap[props.type]
})

const okVariant = computed(() => props.type === 'error' ? 'destructive' : 'primary')

const handleCancel = () => {
  emit('update:open', false)
  emit('cancel')
}
</script>

<style scoped>
.ui-confirm-dialog {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.ui-confirm-dialog__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  flex-shrink: 0;
  font-size: 20px;
}

.ui-confirm-dialog__icon--warning {
  color: var(--dp-orange-500, #f97316);
  background: var(--dp-orange-50, #fff7ed);
}

.ui-confirm-dialog__icon--info {
  color: var(--dp-blue-600, #2563eb);
  background: var(--dp-blue-50, #eff6ff);
}

.ui-confirm-dialog__icon--success {
  color: var(--dp-green-500, #22c55e);
  background: var(--dp-green-50, #ecfdf3);
}

.ui-confirm-dialog__icon--error {
  color: var(--dp-red-500, #ef4444);
  background: var(--dp-red-50, #fef2f2);
}

.ui-confirm-dialog__content {
  flex: 1;
}

.ui-confirm-dialog__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--dp-text-secondary, #475569);
}
</style>
