<template>
  <UiDialog
    :open="api.filePreviewOpen.value"
    :width="dialogWidth"
    hide-footer
    wrap-class-name="ui-dialog-wrap file-preview-dialog__wrap"
    destroy-on-close
    @update:open="handleDialogOpenChange"
    @cancel="api.closePreview"
  >
    <template #header>
      <div class="file-preview-dialog__header">
        <span
          class="file-preview-dialog__header-icon file-icon"
          :class="`file-icon--${resolveFileIconTheme(api.filePreviewTitle.value, api.currentPreviewTarget.value?.extension, api.currentPreviewTarget.value?.mimeType)}`"
        >
          <component
            :is="
              resolveFileIcon(
                api.filePreviewTitle.value,
                api.currentPreviewTarget.value?.extension,
                api.currentPreviewTarget.value?.mimeType,
              )
            "
          />
        </span>
        <span class="file-preview-dialog__header-main">
          <strong>{{ api.filePreviewTitle.value || '文件预览' }}</strong>
          <small>{{ api.filePreviewMeta.value }}</small>
        </span>
        <span class="file-preview-dialog__header-actions">
          <UiButton
            v-if="api.currentPreviewTarget.value"
            icon-only
            size="sm"
            variant="ghost"
            title="下载文件"
            @click="api.downloadCurrentTarget"
          >
            <template #icon>
              <DownloadOutlined />
            </template>
          </UiButton>
        </span>
      </div>
    </template>

    <div class="file-preview-dialog__body">
      <div v-if="api.filePreviewLoading.value" class="file-preview-dialog__state">
        <UiSpin size="lg" tip="正在打开文件..." />
      </div>

      <div v-else-if="api.filePreviewError.value" class="file-preview-dialog__state">
        <FileUnknownOutlined />
        <strong>{{ api.filePreviewError.value }}</strong>
        <UiButton
          v-if="api.currentPreviewTarget.value"
          size="sm"
          @click="api.downloadCurrentTarget"
        >
          <template #icon>
            <DownloadOutlined />
          </template>
          下载文件
        </UiButton>
      </div>

      <img
        v-else-if="api.filePreviewKind.value === 'image' && api.filePreviewUrl.value"
        :src="api.filePreviewUrl.value"
        :alt="api.filePreviewTitle.value"
        class="file-preview-dialog__image"
      />

      <iframe
        v-else-if="api.filePreviewKind.value === 'pdf' && api.filePreviewUrl.value"
        :src="api.filePreviewUrl.value"
        :title="api.filePreviewTitle.value"
        class="file-preview-dialog__frame"
      />

      <VueOfficeDocx
        v-else-if="api.filePreviewKind.value === 'docx' && api.filePreviewOfficeData.value"
        :src="api.filePreviewOfficeData.value"
        class="file-preview-dialog__office"
        @error="api.handleOfficePreviewError"
      />

      <VueOfficeExcel
        v-else-if="api.filePreviewKind.value === 'xlsx' && api.filePreviewOfficeData.value"
        :src="api.filePreviewOfficeData.value"
        class="file-preview-dialog__office"
        @error="api.handleOfficePreviewError"
      />

      <VueOfficePptx
        v-else-if="api.filePreviewKind.value === 'pptx' && api.filePreviewOfficeData.value"
        :src="api.filePreviewOfficeData.value"
        class="file-preview-dialog__office"
        @error="api.handleOfficePreviewError"
      />

      <pre v-else-if="api.filePreviewKind.value === 'text'" class="file-preview-dialog__text">{{
        api.filePreviewText.value
      }}</pre>

      <video
        v-else-if="api.filePreviewKind.value === 'video' && api.filePreviewUrl.value"
        :src="api.filePreviewUrl.value"
        class="file-preview-dialog__media"
        controls
      />

      <audio
        v-else-if="api.filePreviewKind.value === 'audio' && api.filePreviewUrl.value"
        :src="api.filePreviewUrl.value"
        class="file-preview-dialog__audio"
        controls
      />
    </div>
  </UiDialog>
</template>

<script setup lang="ts">
import type { FilePreviewApi } from '@/composables/useFilePreview'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'
import FileUnknownOutlined from '@ant-design/icons-vue/FileUnknownOutlined'
import { computed, defineAsyncComponent } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { resolveFileIcon, resolveFileIconTheme } from '@/utils/file-preview'

const props = defineProps<{
  api: FilePreviewApi
}>()

// Office CSS 与组件同 chunk 懒加载，避免同步进任何挂 FilePreview 的列表页
const VueOfficeDocx = defineAsyncComponent(async () => {
  await import('@vue-office/docx/lib/index.css')
  return import('@vue-office/docx')
})
const VueOfficeExcel = defineAsyncComponent(async () => {
  await import('@vue-office/excel/lib/index.css')
  return import('@vue-office/excel')
})
const VueOfficePptx = defineAsyncComponent(() => import('@vue-office/pptx'))

/** 弹窗关闭时走 composable 清理 Blob URL 与预览状态，禁止直接改 prop 内 ref。 */
function handleDialogOpenChange(open: boolean) {
  if (!open) {
    props.api.closePreview()
  }
}

const dialogWidth = computed(() => {
  switch (props.api.filePreviewKind.value) {
    case 'docx':
    case 'text':
      return 920
    case 'xlsx':
    case 'pptx':
    case 'pdf':
      return 1100
    case 'image':
    case 'video':
      return 1280
    case 'audio':
      return 720
    default:
      return 560
  }
})
</script>

<style scoped lang="scss">
.file-preview-dialog__header {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--dp-space-component);
  min-width: 0;
}

.file-preview-dialog__header-icon {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  font-size: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.file-preview-dialog__header-main {
  display: grid;
  gap: 2px;
  min-width: 0;

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: var(--dp-text-primary);
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    line-height: 19px;
  }

  small {
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xxs);
    line-height: 16px;
  }
}

.file-preview-dialog__header-actions {
  display: inline-flex;
  gap: 2px;
}

.file-preview-dialog__body {
  box-sizing: border-box;
  height: min(76vh, 820px);
  min-height: 280px;
  display: flex;
  flex-direction: column;
  background: var(--dp-surface-subtle, var(--dp-surface-subtle));
  padding: var(--dp-space-component-tight);
  overflow: hidden;
}

.file-preview-dialog__state {
  display: grid;
  place-items: center;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-block) var(--dp-space-component);
  flex: 1;
  text-align: center;

  > .anticon {
    color: var(--dp-text-muted, var(--dp-text-muted));
    font-size: var(--dp-font-size-2xl);
  }

  strong {
    color: var(--dp-text-primary);
    font-size: var(--dp-font-size-md);
  }
}

.file-preview-dialog__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--dp-text-primary);
  flex: 1;
}

.file-preview-dialog__frame {
  display: block;
  width: 100%;
  height: 100%;
  flex: 1;
  border: 0;
  background: var(--dp-surface);
}

.file-preview-dialog__office {
  display: block;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  border: 0;
  background: var(--dp-surface);
  overflow: auto;
}

.file-preview-dialog__text {
  flex: 1;
  margin: 0;
  padding: var(--dp-space-component) var(--dp-space-block);
  background: var(--dp-surface, var(--dp-surface));
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
  color: var(--dp-text-primary);
  overflow: auto;
  white-space: pre-wrap;
}

.file-preview-dialog__media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--dp-text-primary);
  flex: 1;
}

.file-preview-dialog__audio {
  display: block;
  width: min(720px, calc(100% - 48px));
  margin: var(--dp-space-section) auto 0;
}

.file-icon {
  background: var(--dp-surface-subtle);
  color: var(--dp-text-secondary);

  &.file-icon--pdf {
    background: var(--dp-error-bg);
    color: var(--dp-danger);
  }
  &.file-icon--image {
    background: var(--dp-purple-50);
    color: var(--dp-purple-700);
  }
  &.file-icon--word {
    background: var(--dp-blue-50);
    color: var(--dp-color-primary-active);
  }
  &.file-icon--excel {
    background: var(--dp-success-bg);
    color: var(--dp-green-700);
  }
  &.file-icon--ppt {
    background: var(--dp-warning-bg);
    color: var(--dp-orange-500);
  }
  &.file-icon--zip {
    background: var(--dp-yellow-50);
    color: var(--dp-yellow-700);
  }
  &.file-icon--audio {
    background: var(--dp-purple-50);
    color: var(--dp-purple-700);
  }
  &.file-icon--video {
    background: var(--dp-error-bg);
    color: var(--dp-danger);
  }
  &.file-icon--markdown,
  &.file-icon--code {
    background: var(--dp-surface-subtle);
    color: var(--dp-text-secondary);
  }
  &.file-icon--text,
  &.file-icon--document,
  &.file-icon--unknown {
    background: var(--dp-surface-subtle);
    color: var(--dp-text-secondary);
  }
}
</style>

<style lang="scss">
.file-preview-dialog__wrap .ui-dialog__header {
  min-height: 0;
  padding: var(--dp-space-component-tight) var(--dp-space-block);
  background: var(--dp-surface);
}

.file-preview-dialog__wrap .ui-dialog__body {
  padding: 0;
}
</style>
