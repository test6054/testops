<script lang="ts" setup>
import UiConfirmDialog from '@/components/ui-guide/ui/UiConfirmDialog.vue'
/**
 * 全局确认对话框宿主：在 App.vue 顶层挂一次，配合 confirmAsync() 实现 imperative 调用 UiConfirmDialog。
 *
 * 不要直接在业务页面里使用本组件；请使用 confirmAsync 工具函数。
 */
import {
  handleConfirmCancel,
  handleConfirmOk,
  useConfirmDialogState,
} from '@/composables/useConfirmDialog'

defineOptions({ name: 'GlobalConfirmDialog' })

const { state } = useConfirmDialogState()
</script>

<template>
  <UiConfirmDialog
    :open="state.open"
    :type="state.options.type"
    :title="state.options.title"
    :content="state.options.content"
    :width="state.options.width"
    :ok-text="state.options.okText"
    :cancel-text="state.options.cancelText"
    :hide-cancel="state.options.hideCancel"
    :confirm-loading="state.loading"
    @update:open="
      (value) => {
        if (!value) handleConfirmCancel()
      }
    "
    @ok="handleConfirmOk"
    @cancel="handleConfirmCancel"
  />
</template>
