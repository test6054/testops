<template>
  <div
    class="ui-upload-single-field"
    :class="{
      'ui-upload-single-field--disabled': props.disabled,
      'ui-upload-single-field--has-file': hasFile,
    }"
    v-bind="$attrs"
  >
    <template v-if="hasFile">
      <div class="ui-upload-single-field__file">
        <span class="ui-upload-single-field__icon">
          <FileOutlined />
        </span>

        <div class="ui-upload-single-field__main">
          <div class="ui-upload-single-field__name" :title="displayFileName">
            {{ displayFileName }}
          </div>
          <div v-if="props.tip" class="ui-upload-single-field__tip">{{ props.tip }}</div>
        </div>

        <div class="ui-upload-single-field__actions">
          <UiActionLink
            v-if="props.downloadable"
            text="下载"
            :disabled="props.disabled"
            @click="emit('download')"
          />
          <UiActionLink
            v-if="props.removable"
            text="移除"
            danger
            :disabled="props.disabled || props.uploading"
            @click="emit('remove')"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="ui-upload-single-field__empty">
        <a-upload
          :show-upload-list="false"
          :disabled="props.disabled"
          :max-count="1"
          :accept="props.accept"
          :before-upload="handleBeforeUpload"
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
            {{ props.buttonText }}
          </UiButton>
        </a-upload>

        <div class="ui-upload-single-field__empty-content">
          <div class="ui-upload-single-field__empty-title">{{ props.emptyText }}</div>
          <div v-if="props.tip" class="ui-upload-single-field__tip">{{ props.tip }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { UploadProps } from 'ant-design-vue'
import { FileOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'
import UiButton from './Button.vue'
import UiActionLink from './UiActionLink.vue'

defineOptions({
  name: 'UiUploadSingleField',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  fileId?: string | number
  fileName?: string
  tip?: string
  accept?: string
  disabled?: boolean
  uploading?: boolean
  removable?: boolean
  downloadable?: boolean
  buttonText?: string
  emptyText?: string
  beforeUpload?: UploadProps['beforeUpload']
}>(), {
  fileId: undefined,
  fileName: '',
  tip: '支持上传模板、配置文件、导出文件等单文件场景。',
  accept: '',
  disabled: false,
  uploading: false,
  removable: true,
  downloadable: true,
  buttonText: '上传文件',
  emptyText: '当前未上传文件',
  beforeUpload: undefined,
})

const emit = defineEmits<{
  (e: 'download'): void
  (e: 'remove'): void
  (e: 'select', file: File): void
}>()

const hasFile = computed(() => {
  return props.fileId !== undefined || !!props.fileName
})

const displayFileName = computed(() => {
  return props.fileName || '已上传文件'
})

const handleBeforeUpload: UploadProps['beforeUpload'] = async (file, fileList) => {
  if (typeof props.beforeUpload === 'function') {
    return props.beforeUpload(file, fileList)
  }

  if (file instanceof File) {
    emit('select', file)
  }
  return false
}
</script>

<style scoped>
.ui-upload-single-field {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 56px;
  padding: 12px 14px;
  border: 1px dashed var(--dp-border-strong, #d0d5dd);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.ui-upload-single-field:hover {
  border-color: var(--dp-blue-600, #2563eb);
  box-shadow: var(--dp-shadow-soft, 0 6px 16px rgba(15, 23, 42, 0.05));
}

.ui-upload-single-field--has-file {
  border-style: solid;
  background: var(--dp-surface-subtle, #f8fafc);
}

.ui-upload-single-field--disabled {
  opacity: 0.72;
}

.ui-upload-single-field--disabled:hover {
  border-color: var(--dp-border-strong, #d0d5dd);
  box-shadow: none;
}

.ui-upload-single-field__file,
.ui-upload-single-field__empty {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.ui-upload-single-field__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-blue-50, #eff6ff);
  color: var(--dp-blue-700, #1d4ed8);
  font-size: 16px;
}

.ui-upload-single-field__main,
.ui-upload-single-field__empty-content {
  min-width: 0;
  flex: 1;
}

.ui-upload-single-field__name,
.ui-upload-single-field__empty-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-upload-single-field__tip {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary, #475569);
}

.ui-upload-single-field__actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .ui-upload-single-field__file,
  .ui-upload-single-field__empty {
    flex-direction: column;
    align-items: flex-start;
  }

  .ui-upload-single-field__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
