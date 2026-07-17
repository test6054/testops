<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { getFileArrayBuffer } from '@/apis/edu/file-management'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
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
    showUserError(error, '预览便携文档加载失败')
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
  <UiDrawer v-model:open="open" title="制卷预览" width="min(920px, 96vw)" destroy-on-close>
    <UiSpin :spinning="loading">
      <UiAlertStrip
        v-if="!previewPdfFileId"
        tone="info"
        size="sm"
        dense
        inline
        :show-icon="false"
        class="layout-preview-drawer__gate"
      >
        <template #default>
          <span class="layout-preview-drawer__gate-row">
            <UiTag tone="blue" size="sm">待生成预览</UiTag>
            <span class="layout-preview-drawer__gate-text">请先生成预览便携文档</span>
          </span>
        </template>
      </UiAlertStrip>
      <iframe
        v-else-if="previewUrl"
        :src="previewUrl"
        title="制卷预览便携文档"
        class="layout-preview-drawer__frame"
      />
      <UiAlertStrip
        v-else
        tone="warning"
        size="sm"
        dense
        inline
        :show-icon="false"
        class="layout-preview-drawer__gate"
      >
        <template #default>
          <span class="layout-preview-drawer__gate-row">
            <UiTag tone="orange" size="sm">预览未就绪</UiTag>
            <span class="layout-preview-drawer__gate-text">预览便携文档尚未就绪</span>
          </span>
        </template>
      </UiAlertStrip>
    </UiSpin>
  </UiDrawer>
</template>

<style scoped lang="scss">
.layout-preview-drawer__gate {
  margin: var(--dp-space-2) 0;
  max-width: 100%;
}

.layout-preview-drawer__gate-row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
}

.layout-preview-drawer__gate-text {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.layout-preview-drawer__frame {
  width: 100%;
  min-height: 72vh;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  background: var(--dp-bg-container);
}
</style>
