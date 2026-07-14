<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { getFileArrayBuffer } from '@/apis/edu/file-management'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { showUserError } from '@/utils/error-handler'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  previewPdfFileId?: string
}>()

const loading = ref(false)
const previewUrl = ref('')

function revokePreviewUrl(): void {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

async function loadPreview(fileId: string): Promise<void> {
  loading.value = true
  revokePreviewUrl()
  try {
    const buffer = await getFileArrayBuffer({ nodeId: fileId })
    previewUrl.value = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))
  } catch (error) {
    showUserError(error, '预览 PDF 加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => ({ fileId: props.previewPdfFileId, visible: open.value }),
  (previewState) => {
    if (previewState.visible && previewState.fileId) {
      void loadPreview(previewState.fileId)
      return
    }
    if (!previewState.visible) {
      revokePreviewUrl()
    }
  },
)

onBeforeUnmount(() => {
  revokePreviewUrl()
})
</script>

<template>
  <a-drawer v-model:open="open" title="制卷预览" width="min(920px, 96vw)" destroy-on-close>
    <a-spin :spinning="loading">
      <UiEmpty v-if="!previewPdfFileId" description="请先生成预览 PDF" />
      <iframe
        v-else-if="previewUrl"
        :src="previewUrl"
        title="制卷预览 PDF"
        class="layout-preview-drawer__frame"
      />
      <UiEmpty v-else description="预览 PDF 尚未就绪" />
    </a-spin>
  </a-drawer>
</template>

<style scoped lang="scss">
.layout-preview-drawer__frame {
  width: 100%;
  min-height: 72vh;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  background: var(--ant-color-bg-container);
}
</style>
