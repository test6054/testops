<template>
  <UiDialog
    :open="props.open"
    :width="props.width"
    :closable="props.closable"
    :mask-closable="props.maskClosable"
    :confirm-loading="props.confirmLoading"
    :ok-text="props.okText"
    :cancel-text="props.cancelText"
    v-bind="$attrs"
    @update:open="handleOpenUpdate"
    @ok="emit('ok')"
    @cancel="emit('cancel')"
  >
    <template #header>
      <div class="ui-form-modal__header">
        <div v-if="props.icon" class="ui-form-modal__icon">
          <component :is="props.icon" />
        </div>
        <h3 class="ui-form-modal__title">{{ props.title }}</h3>
      </div>
    </template>
    <slot />
  </UiDialog>
</template>

<script lang="ts" setup>
import type { Component } from 'vue'
import UiDialog from './UiDialog.vue'

defineOptions({
  name: 'UiFormModal',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    icon?: Component
    width?: number
    okText?: string
    cancelText?: string
    closable?: boolean
    maskClosable?: boolean
    confirmLoading?: boolean
  }>(),
  {
    title: '编辑',
    icon: undefined,
    width: 420,
    okText: '保存',
    cancelText: '取消',
    closable: true,
    maskClosable: true,
    confirmLoading: false,
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'ok'): void
  (e: 'cancel'): void
}>()

function handleOpenUpdate(value: boolean) {
  emit('update:open', value)
}
</script>

<style lang="scss" scoped>
.ui-form-modal__header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding-right: 40px;
}

.ui-form-modal__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: var(--dp-blue-600, #2563eb);
  background: var(--dp-blue-50, #eff6ff);
  font-size: 16px;
  flex-shrink: 0;
}

.ui-form-modal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}
</style>
