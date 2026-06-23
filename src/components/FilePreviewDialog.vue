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
          <component :is="resolveFileIcon(api.filePreviewTitle.value, api.currentPreviewTarget.value?.extension, api.currentPreviewTarget.value?.mimeType)" />
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
        <a-spin size="large" tip="正在打开文件..." />
      </div>

      <div v-else-if="api.filePreviewError.value" class="file-preview-dialog__state">
        <FileUnknownOutlined />
        <strong>{{ api.filePreviewError.value }}</strong>
        <UiButton v-if="api.currentPreviewTarget.value" size="sm" @click="api.downloadCurrentTarget">
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
      >

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

      <pre v-else-if="api.filePreviewKind.value === 'text'" class="file-preview-dialog__text">{{ api.filePreviewText.value }}</pre>

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
import { resolveFileIcon, resolveFileIconTheme } from '@/utils/file-preview'
import '@vue-office/docx/lib/index.css'
import '@vue-office/excel/lib/index.css'

const props = defineProps<{
  api: FilePreviewApi
}>()

const VueOfficeDocx = defineAsyncComponent(() => import('@vue-office/docx'))
const VueOfficeExcel = defineAsyncComponent(() => import('@vue-office/excel'))
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
  gap: 10px;
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
    color: var(--ant-color-text);
    font-size: 14px;
    font-weight: 600;
    line-height: 19px;
  }

  small {
    color: var(--ant-color-text-secondary);
    font-size: 11px;
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
  min-height: 480px;
  display: flex;
  flex-direction: column;
  background: var(--ant-color-fill-quaternary);
  padding: 12px;
  overflow: hidden;
}

.file-preview-dialog__state {
  display: grid;
  place-items: center;
  gap: 12px;
  padding: 32px 24px;
  flex: 1;
  text-align: center;

  > .anticon {
    color: var(--ant-color-text-quaternary);
    font-size: 42px;
  }

  strong {
    color: var(--ant-color-text);
    font-size: 14px;
  }
}

.file-preview-dialog__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #0f172a;
  flex: 1;
}

.file-preview-dialog__frame {
  display: block;
  width: 100%;
  height: 100%;
  flex: 1;
  border: 0;
  background: var(--ant-color-bg-container);
}

.file-preview-dialog__office {
  display: block;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  border: 0;
  background: var(--ant-color-bg-container);
  overflow: auto;
}

.file-preview-dialog__text {
  flex: 1;
  margin: 0;
  padding: 18px 20px;
  background: var(--ant-color-bg-container);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ant-color-text);
  overflow: auto;
  white-space: pre-wrap;
}

.file-preview-dialog__media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #0f172a;
  flex: 1;
}

.file-preview-dialog__audio {
  display: block;
  width: min(720px, calc(100% - 48px));
  margin: 220px auto 0;
}

.file-icon {
  background: var(--ant-color-fill-quaternary);
  color: var(--ant-color-text-secondary);

  &.file-icon--pdf { background: #fff1f0; color: #cf1322; }
  &.file-icon--image { background: #f3e8ff; color: #7e22ce; }
  &.file-icon--word { background: #eaf2ff; color: #1d4ed8; }
  &.file-icon--excel { background: #eaf8ef; color: #16834a; }
  &.file-icon--ppt { background: #fff4e6; color: #d46b08; }
  &.file-icon--zip { background: #fff8db; color: #ad6800; }
  &.file-icon--audio { background: #eef2ff; color: #4f46e5; }
  &.file-icon--video { background: #fff0f6; color: #c41d7f; }
  &.file-icon--markdown,
  &.file-icon--code { background: #eef1f6; color: #344054; }
  &.file-icon--text,
  &.file-icon--document,
  &.file-icon--unknown { background: var(--ant-color-fill-quaternary); color: var(--ant-color-text-secondary); }
}
</style>

<style lang="scss">
.file-preview-dialog__wrap .ui-dialog__header {
  min-height: 0;
  padding: 8px 16px;
  background: var(--ant-color-bg-container);
}

.file-preview-dialog__wrap .ui-dialog__body {
  padding: 0;
}
</style>
