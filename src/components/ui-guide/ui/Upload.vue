<template>
  <div
    class="ui-upload"
    :class="[
      `ui-upload--${props.size}`,
      {
        'ui-upload--disabled': props.disabled,
        'ui-upload--drag': props.drag,
      },
    ]"
  >
    <a-upload
      :file-list="fileList"
      :accept="props.accept"
      :multiple="props.multiple"
      :disabled="props.disabled"
      :max-count="props.maxCount"
      :before-upload="props.beforeUpload"
      :custom-request="props.customRequest"
      :show-upload-list="props.showUploadList"
      :list-type="props.listType"
      v-bind="$attrs"
      @change="handleChange"
      @preview="handlePreview"
      @remove="handleRemove"
    >
      <slot>
        <div class="ui-upload__trigger">
          <div class="ui-upload__icon">↑</div>
          <div class="ui-upload__content">
            <div class="ui-upload__title">{{ props.title }}</div>
            <div v-if="props.description" class="ui-upload__description">
              {{ props.description }}
            </div>
          </div>
          <UiButton size="sm" variant="outline" :disabled="props.disabled">
            {{ props.buttonText }}
          </UiButton>
        </div>
      </slot>
    </a-upload>

    <div v-if="props.showSummary && fileList.length > 0" class="ui-upload__summary">
      <div
        v-for="file in fileList"
        :key="file.uid"
        class="ui-upload__file"
      >
        <span class="ui-upload__file-name">{{ file.name }}</span>
        <span class="ui-upload__file-status">{{ file.status || 'done' }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { UploadChangeParam, UploadFile } from 'ant-design-vue'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import type { UiComponentSize } from './types'
import UiButton from './Button.vue'

defineOptions({
  name: 'UiUpload',
  inheritAttrs: false,
})

const fileList = defineModel<UploadFile[]>('fileList', { default: () => [] })

const props = withDefaults(defineProps<{
  accept?: string
  multiple?: boolean
  disabled?: boolean
  maxCount?: number
  drag?: boolean
  listType?: 'text' | 'picture' | 'picture-card'
  showUploadList?: boolean
  showSummary?: boolean
  title?: string
  description?: string
  buttonText?: string
  size?: UiComponentSize
  beforeUpload?: (file: File, files: File[]) => boolean | Promise<boolean>
  customRequest?: (options: UploadRequestOption) => void | Promise<void>
}>(), {
  accept: undefined,
  multiple: false,
  disabled: false,
  maxCount: undefined,
  drag: false,
  listType: 'text',
  showUploadList: false,
  showSummary: true,
  title: '上传文件',
  description: '统一上传底座，后续业务页面统一走 UiUpload。',
  buttonText: '选择文件',
  size: 'md',
  beforeUpload: undefined,
  customRequest: undefined,
})

const emit = defineEmits<{
  (e: 'change', value: UploadChangeParam<UploadFile>): void
  (e: 'preview', file: UploadFile): void
  (e: 'remove', file: UploadFile): void
}>()

const handleChange = (info: UploadChangeParam<UploadFile>) => {
  fileList.value = info.fileList
  emit('change', info)
}

const handlePreview = (file: UploadFile) => {
  emit('preview', file)
}

const handleRemove = (file: UploadFile) => {
  fileList.value = fileList.value.filter(item => item.uid !== file.uid)
  emit('remove', file)
  return true
}
</script>

<style scoped>
.ui-upload {
  width: 100%;
}

.ui-upload :deep(.ant-upload-wrapper) {
  width: 100%;
}

.ui-upload :deep(.ant-upload-select) {
  width: 100%;
}

.ui-upload__trigger {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 88px;
  padding: 18px 20px;
  border: 1px dashed var(--dp-border-strong, #d0d5dd);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  cursor: pointer;
  box-sizing: border-box;
}

.ui-upload__trigger:hover {
  border-color: var(--dp-blue-600, #2563eb);
  box-shadow: var(--dp-shadow-soft, 0 6px 16px rgba(15, 23, 42, 0.05));
}

.ui-upload__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--dp-radius-control-inner, 4px);
  background: var(--dp-blue-50, #eff6ff);
  color: var(--dp-blue-700, #1d4ed8);
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.ui-upload__content {
  min-width: 0;
  flex: 1;
}

.ui-upload__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-upload__description {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary, #475569);
}

.ui-upload__summary {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.ui-upload__file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--dp-radius-control-inner, 4px);
  background: var(--dp-surface-subtle, #f8fafc);
  border: 1px solid var(--dp-border, #e5e7eb);
}

.ui-upload__file-name {
  min-width: 0;
  flex: 1;
  color: var(--dp-text-primary, #0f172a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-upload__file-status {
  color: var(--dp-text-muted, #6b7280);
  font-size: 12px;
  text-transform: uppercase;
}

.ui-upload--disabled {
  opacity: 0.7;
}

.ui-upload--disabled .ui-upload__trigger {
  cursor: not-allowed;
  background: var(--dp-bg-control-disabled, #eef2f7);
}
</style>
