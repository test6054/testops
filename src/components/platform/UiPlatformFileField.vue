<template>
  <div
    class="ui-platform-file-field"
    :class="{
      'ui-platform-file-field--disabled': props.disabled,
      'ui-platform-file-field--dragger': isDragger,
      'ui-platform-file-field--uploading': uploading,
    }"
  >
    <template v-if="isDragger">
      <UploadDragger
        name="file"
        :accept="props.accept"
        :disabled="props.disabled || uploading"
        :max-count="1"
        :multiple="false"
        :show-upload-list="false"
        :before-upload="beforeUpload"
        :custom-request="customRequest"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">{{ dragTitle }}</p>
        <p v-if="dragHint" class="ant-upload-hint">{{ dragHint }}</p>
      </UploadDragger>
      <div
        v-if="fileNodeId"
        class="ui-platform-file-field__file ui-platform-file-field__file--after-drag"
      >
        <FileOutlined />
        <span class="ui-platform-file-field__name" :title="displayName">{{ displayName }}</span>
        <span v-if="fileSize" class="ui-platform-file-field__size">{{
          formatFileSize(fileSize)
        }}</span>
        <UiButton
          v-if="props.removable"
          variant="ghost"
          size="sm"
          :disabled="props.disabled || uploading"
          @click="remove"
        >
          移除
        </UiButton>
      </div>
    </template>

    <template v-else>
      <div v-if="fileNodeId" class="ui-platform-file-field__file">
        <FileOutlined />
        <span class="ui-platform-file-field__name" :title="displayName">{{ displayName }}</span>
        <span v-if="fileSize" class="ui-platform-file-field__size">{{
          formatFileSize(fileSize)
        }}</span>
        <UiButton
          v-if="props.removable"
          variant="ghost"
          size="sm"
          :disabled="props.disabled || uploading"
          @click="remove"
        >
          移除
        </UiButton>
      </div>
      <div v-else class="ui-platform-file-field__empty">
        <UiButton
          variant="outline"
          size="sm"
          :loading="uploading"
          :disabled="props.disabled"
          @click="openPicker"
        >
          {{ props.buttonText }}
        </UiButton>
        <span v-if="props.tip" class="ui-platform-file-field__tip">{{ props.tip }}</span>
        <input
          ref="inputRef"
          type="file"
          class="sr-only"
          :accept="props.accept"
          @change="onFileChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import type { UploadProps } from 'ant-design-vue/es/upload'
import { UploadDragger } from 'ant-design-vue/es/upload'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import InboxOutlined from '@ant-design/icons-vue/InboxOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { stagePlatformFile } from '@/apis/platform/file'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { getUserErrorMessage } from '@/utils/error-handler'
import { formatFileSize } from '@/utils/format'

const fileNodeId = defineModel<string | undefined>('fileNodeId')

const fileName = defineModel<string | undefined>('fileName')

const fileSize = defineModel<number | undefined>('fileSize')

const props = withDefaults(
  defineProps<{
    sceneKey: FileUploadSceneKey
    accept?: string
    buttonText?: string
    tip?: string
    /** button：按钮选择；dragger：官方拖拽上传区 */
    variant?: 'button' | 'dragger'
    disabled?: boolean
    removable?: boolean
  }>(),
  {
    accept: '',
    buttonText: '选择文件',
    tip: '',
    variant: 'button',
    disabled: false,
    removable: true,
  },
)

const inputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const isDragger = computed(() => props.variant === 'dragger')
const displayName = computed(() => fileName.value ?? '已上传文件')
const dragTitle = computed(() =>
  uploading.value
    ? '正在上传…'
    : fileNodeId.value
      ? '点击或拖拽可更换文件'
      : '点击或将文件拖拽到此区域上传',
)
const dragHint = computed(() => props.tip || '支持单文件上传')

function openPicker() {
  inputRef.value?.click()
}

async function stageFile(file: File): Promise<void> {
  uploading.value = true
  try {
    const staged = await stagePlatformFile(props.sceneKey, file)
    fileNodeId.value = staged.fileNodeId
    fileName.value = staged.fileName
    fileSize.value = staged.fileSize
  } catch (error) {
    message.error(getUserErrorMessage(error, '文件上传失败'))
    throw error
  } finally {
    uploading.value = false
  }
}

async function onFileChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const file = input.files?.[0]
  if (!file) {
    return
  }
  try {
    await stageFile(file)
  } catch {
    // 错误已在 stageFile 中提示
  } finally {
    if (inputRef.value) {
      inputRef.value.value = ''
    }
  }
}

const beforeUpload: UploadProps['beforeUpload'] = () => {
  if (props.disabled || uploading.value) {
    return false
  }
  return true
}

async function customRequest(options: UploadRequestOption): Promise<void> {
  const raw = options.file
  if (!(raw instanceof File)) {
    options.onError?.(new Error('无效文件'))
    return
  }
  try {
    await stageFile(raw)
    options.onSuccess?.({})
  } catch (error) {
    options.onError?.(error instanceof Error ? error : new Error('文件上传失败'))
  }
}

function remove() {
  fileNodeId.value = undefined
  fileName.value = undefined
  fileSize.value = undefined
}
</script>

<style scoped lang="scss">
.ui-platform-file-field {
  &__file,
  &__empty {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
  }

  &__file--after-drag {
    margin-top: var(--dp-space-3);
    padding: var(--dp-space-2) var(--dp-space-3);
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-control);
    background: var(--dp-bg-container);
  }

  &__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__size,
  &__tip {
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
  }

  &--dragger :deep(.ant-upload.ant-upload-drag) {
    border-color: var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-fill-quaternary);
  }

  &--dragger :deep(.ant-upload.ant-upload-drag:not(.ant-upload-disabled):hover) {
    border-color: var(--dp-color-primary);
  }

  &--dragger :deep(.ant-upload-drag-icon .anticon) {
    color: var(--dp-color-primary);
    font-size: 40px;
  }

  &--dragger :deep(.ant-upload-text) {
    margin: 0 0 var(--dp-space-1);
    color: var(--dp-text-primary);
    font-size: var(--dp-font-size-md);
  }

  &--dragger :deep(.ant-upload-hint) {
    margin: 0;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
  }

  &--uploading :deep(.ant-upload.ant-upload-drag) {
    opacity: 0.85;
  }

  &--disabled {
    opacity: 0.72;
  }
}
</style>
