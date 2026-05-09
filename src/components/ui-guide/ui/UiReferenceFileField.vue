<template>
  <div
    class="ui-reference-file-field"
    :class="{
      'ui-reference-file-field--disabled': props.disabled,
      'ui-reference-file-field--has-file': hasFile,
    }"
  >
    <template v-if="hasFile">
      <div class="ui-reference-file-field__file">
        <span class="ui-reference-file-field__icon">
          <FileOutlined />
        </span>

        <div class="ui-reference-file-field__main">
          <div class="ui-reference-file-field__name" :title="displayFileName">
            {{ displayFileName }}
          </div>
          <div v-if="props.tip" class="ui-reference-file-field__tip">
            {{ props.tip }}
          </div>
        </div>

        <div class="ui-reference-file-field__actions">
          <UiActionLink
            v-if="props.downloadable"
            class="ui-reference-file-field__action"
            :disabled="props.disabled"
            aria-label="下载参考文件"
            title="下载参考文件"
            @click="emit('download')"
          >
            <template #icon>
              <DownloadOutlined />
            </template>
          </UiActionLink>
          <UiActionLink
            v-if="props.removable"
            class="ui-reference-file-field__action"
            danger
            :disabled="props.disabled || props.uploading"
            aria-label="删除参考文件"
            title="删除参考文件"
            @click="emit('remove')"
          >
            <template #icon>
              <DeleteOutlined />
            </template>
          </UiActionLink>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="ui-reference-file-field__empty">
        <a-upload
          :show-upload-list="false"
          :disabled="props.disabled"
          :max-count="1"
          :before-upload="handleBeforeUpload"
          class="upload-trigger"
        >
          <UiButton
            size="sm"
            variant="outline"
            :loading="props.uploading"
            :disabled="props.disabled"
          >
            <template #icon>
              <UploadOutlined />
            </template>
            {{ props.uploadText }}
          </UiButton>
        </a-upload>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { UploadProps } from 'ant-design-vue'
import {
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import UiButton from './Button.vue'
import UiActionLink from './UiActionLink.vue'

defineOptions({
  name: 'UiReferenceFileField',
})

const props = withDefaults(
  defineProps<{
    fileId?: string | number
    fileName?: string
    uploading?: boolean
    disabled?: boolean
    removable?: boolean
    downloadable?: boolean
    uploadText?: string
    tip?: string
    emptyFileText?: string
    beforeUpload?: UploadProps['beforeUpload']
  }>(),
  {
    fileId: undefined,
    fileName: '',
    uploading: false,
    disabled: false,
    removable: true,
    downloadable: true,
    uploadText: '上传参考文件',
    tip: '可上传模板、示例等参考文件',
    emptyFileText: '当前未上传参考文件',
    beforeUpload: undefined,
  },
)

const emit = defineEmits<{
  (e: 'download'): void
  (e: 'remove'): void
}>()

const normalizedFileId = computed(() => {
  if (typeof props.fileId === 'string') {
    const trimmed = props.fileId.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  return props.fileId
})

const hasFile = computed(() => {
  return normalizedFileId.value !== undefined || !!props.fileName?.trim()
})

const displayFileName = computed(() => {
  return props.fileName?.trim() || '参考文件'
})

const handleBeforeUpload: UploadProps['beforeUpload'] = async (file, fileList) => {
  if (typeof props.beforeUpload === 'function') {
    return props.beforeUpload(file, fileList)
  }
  return false
}
</script>

<style scoped>
.ui-reference-file-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ui-reference-file-field__file {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-control, 4px);
  background: var(--dp-gray-50, #f8fafc);
}

.ui-reference-file-field__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--dp-blue-600, #2563eb);
  font-size: 14px;
}

.ui-reference-file-field__main {
  min-width: 0;
  flex: 1;
}

.ui-reference-file-field__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  color: var(--dp-text-primary, #0f172a);
}

.ui-reference-file-field__tip {
  display: none;
}

.ui-reference-file-field__actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ui-reference-file-field__action {
  width: 28px;
  height: 28px;
  justify-content: center;
  border-radius: var(--dp-radius-control-inner, 4px);
  background: var(--dp-surface, #fff);
  border: 1px solid var(--dp-border, #e5e7eb);
}

.ui-reference-file-field__action:hover:not(:disabled) {
  background: var(--dp-gray-50, #f8fafc);
}

.ui-reference-file-field__empty {
  display: inline-flex;
  align-items: center;
}

.ui-reference-file-field--disabled {
  opacity: 0.6;
}

/* 消除 a-upload 默认 block 渲染产生的多余占位 */
:deep(.upload-trigger) {
  display: inline-flex !important;
  line-height: 1;
}

:deep(.upload-trigger .ant-upload) {
  display: inline-flex !important;
  line-height: 1;
}

@media (max-width: 900px) {
  .ui-reference-file-field__file,
  .ui-reference-file-field__empty {
    align-items: flex-start;
    flex-direction: column;
  }

  .ui-reference-file-field__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
