<template>
  <section class="ui-attachment-manager" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :compact="props.compact"
      :divided="props.divided"
    >
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <div v-if="!props.readonly" class="ui-attachment-manager__upload">
      <UiUpload
        v-model:file-list="fileList"
        :accept="props.accept"
        :multiple="props.multiple"
        :disabled="props.disabled"
        :max-count="props.maxCount"
        :before-upload="props.beforeUpload"
        :custom-request="props.customRequest"
        :show-summary="false"
        :title="props.uploadTitle"
        :description="props.uploadDescription"
        :button-text="props.buttonText"
        @change="handleUploadChange"
        @preview="handlePreview"
      />
    </div>

    <div v-if="modelValue.length" class="ui-attachment-manager__list">
      <article
        v-for="item in modelValue"
        :key="item.id"
        class="ui-attachment-manager__item"
      >
        <div class="ui-attachment-manager__icon">
          <FileTextOutlined />
        </div>

        <div class="ui-attachment-manager__main">
          <div class="ui-attachment-manager__title-row">
            <div class="ui-attachment-manager__title">{{ item.name }}</div>
            <UiTag
              v-if="item.statusLabel"
              size="sm"
              :tone="item.statusTone || 'gray'"
            >
              {{ item.statusLabel }}
            </UiTag>
          </div>

          <div class="ui-attachment-manager__meta">
            <span v-if="item.type">{{ item.type }}</span>
            <span v-if="item.type && resolvedSizeText(item)">·</span>
            <span v-if="resolvedSizeText(item)">{{ resolvedSizeText(item) }}</span>
            <span v-if="item.helper">·</span>
            <span v-if="item.helper">{{ item.helper }}</span>
          </div>
        </div>

        <div class="ui-attachment-manager__actions">
          <UiActionLink text="下载" @click="emit('download', item)" />
          <UiActionLink text="预览" @click="emit('preview-item', item)" />
          <UiActionLink
            v-if="!props.readonly"
            text="移除"
            danger
            @click="handleRemove(item)"
          />
        </div>
      </article>
    </div>

    <UiEmpty v-else size="sm" :description="props.emptyText" />
  </section>
</template>

<script lang="ts" setup>
import type { UploadChangeParam, UploadFile } from 'ant-design-vue'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import type { UiAttachmentItem } from './types'
import { FileTextOutlined } from '@ant-design/icons-vue'
import { computed, useSlots, watch } from 'vue'
import { formatFileSize } from '@/utils'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'
import UiActionLink from './UiActionLink.vue'
import UiPanelHeader from './UiPanelHeader.vue'
import UiUpload from './Upload.vue'

interface UploadResponsePayload {
  id?: string | number
  fileId?: string | number
  fileName?: string
  nodeName?: string
  fileSize?: number
  fileType?: string
}

interface UploadResponseEnvelope {
  data?: UploadResponsePayload
}

type UiAttachmentUploadFile = UploadFile<UploadResponseEnvelope | UploadResponsePayload>

defineOptions({
  name: 'UiAttachmentManager',
  inheritAttrs: false,
})

const modelValue = defineModel<UiAttachmentItem[]>({ default: () => [] })
const fileList = defineModel<UiAttachmentUploadFile[]>('fileList', { default: () => [] })

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  readonly?: boolean
  disabled?: boolean
  accept?: string
  multiple?: boolean
  maxCount?: number
  compact?: boolean
  divided?: boolean
  emptyText?: string
  uploadTitle?: string
  uploadDescription?: string
  buttonText?: string
  beforeUpload?: (file: File, files: File[]) => boolean | Promise<boolean>
  customRequest?: (options: UploadRequestOption) => void | Promise<void>
}>(), {
  title: '',
  description: '',
  eyebrow: '',
  readonly: false,
  disabled: false,
  accept: undefined,
  multiple: true,
  maxCount: undefined,
  compact: false,
  divided: false,
  emptyText: '暂无附件',
  uploadTitle: '上传附件',
  uploadDescription: '支持拖拽或选择多个附件，统一附件上传和列表展示。',
  buttonText: '选择文件',
  beforeUpload: undefined,
  customRequest: undefined,
})

const emit = defineEmits<{
  (e: 'preview', file: UiAttachmentUploadFile): void
  (e: 'preview-item', item: UiAttachmentItem): void
  (e: 'remove', item: UiAttachmentItem): void
  (e: 'download', item: UiAttachmentItem): void
  (e: 'change', value: UiAttachmentItem[]): void
}>()

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.actions
})

watch(modelValue, (items) => {
  if (fileList.value.length || !items.length)
    return

  fileList.value = items.map(item => ({
    uid: item.id,
    name: item.name,
    size: item.size,
    type: item.type,
    status: item.status || 'done',
  }))
}, { immediate: true })

function isUploadResponseEnvelope(
  response: UploadResponseEnvelope | UploadResponsePayload,
): response is UploadResponseEnvelope {
  return 'data' in response
}

function isUploadResponsePayload(response: unknown): response is UploadResponsePayload {
  return !!response && typeof response === 'object'
}

function extractUploadResponsePayload(
  response: UploadResponseEnvelope | UploadResponsePayload | undefined,
): UploadResponsePayload | undefined {
  if (!response) {
    return undefined
  }
  if (isUploadResponseEnvelope(response)) {
    return isUploadResponsePayload(response.data) ? response.data : undefined
  }
  return isUploadResponsePayload(response) ? response : undefined
}

const normalizeAttachment = (file: UiAttachmentUploadFile, index: number): UiAttachmentItem => {
  const responseData = extractUploadResponsePayload(file.response)
  const id = String(responseData?.id || responseData?.fileId || file.uid)
  const size = Number(responseData?.fileSize || file.size || 0)

  return {
    id,
    fileId: responseData?.id || responseData?.fileId,
    name: responseData?.fileName || responseData?.nodeName || file.name,
    size,
    type: responseData?.fileType || file.type || '',
    helper: `附件 ${index + 1}`,
    status: file.status === 'error' ? 'error' : (file.status === 'uploading' ? 'uploading' : 'done'),
    statusLabel: file.status === 'error' ? '失败' : (file.status === 'uploading' ? '上传中' : '已上传'),
    statusTone: file.status === 'error' ? 'red' : (file.status === 'uploading' ? 'orange' : 'green'),
  }
}

const handleUploadChange = (info: UploadChangeParam) => {
  const attachments = info.fileList.map(normalizeAttachment)
  modelValue.value = attachments
  emit('change', attachments)
}

const handlePreview = (file: UiAttachmentUploadFile) => {
  emit('preview', file)
}

const handleRemove = (item: UiAttachmentItem) => {
  fileList.value = fileList.value.filter(file => file.uid !== item.id)
  modelValue.value = modelValue.value.filter(current => current.id !== item.id)
  emit('remove', item)
  emit('change', modelValue.value)
}

const resolvedSizeText = (item: UiAttachmentItem) => {
  if (item.sizeText)
    return item.sizeText
  if (item.size)
    return formatFileSize(item.size)
  return ''
}
</script>

<style scoped>
.ui-attachment-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-attachment-manager__list {
  display: grid;
  gap: 10px;
}

.ui-attachment-manager__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
}

.ui-attachment-manager__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: var(--dp-radius-control-inner, 4px);
  background: var(--dp-blue-50, #eff6ff);
  color: var(--dp-blue-700, #1d4ed8);
  font-size: 18px;
}

.ui-attachment-manager__main {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 6px;
}

.ui-attachment-manager__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-attachment-manager__title {
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-attachment-manager__meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-attachment-manager__actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .ui-attachment-manager__item {
    flex-direction: column;
    align-items: flex-start;
  }

  .ui-attachment-manager__actions {
    width: 100%;
  }
}
</style>
