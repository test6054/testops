<template>
  <div class="ui-platform-file-field" :class="{ 'ui-platform-file-field--disabled': props.disabled }">
    <div v-if="fileNodeId" class="ui-platform-file-field__file">
      <FileOutlined />
      <span class="ui-platform-file-field__name" :title="displayName">{{ displayName }}</span>
      <span v-if="fileSize" class="ui-platform-file-field__size">{{ formatFileSize(fileSize) }}</span>
      <UiButton v-if="props.removable" variant="ghost" size="sm" :disabled="props.disabled || uploading" @click="remove">
        移除
      </UiButton>
    </div>
    <div v-else class="ui-platform-file-field__empty">
      <UiButton variant="outline" size="sm" :loading="uploading" :disabled="props.disabled" @click="openPicker">
        {{ props.buttonText }}
      </UiButton>
      <span v-if="props.tip" class="ui-platform-file-field__tip">{{ props.tip }}</span>
      <input
        ref="inputRef"
        type="file"
        class="sr-only"
        :accept="props.accept"
        @change="onFileChange"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileUploadSceneKeyValue } from '@/apis/platform/scene-keys'
import { FileOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { stagePlatformFile } from '@/apis/platform/file'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { formatFileSize } from '@/utils/format'
import { getUserErrorMessage } from '@/utils/error-handler'

const props = withDefaults(defineProps<{
  sceneKey: FileUploadSceneKeyValue
  accept?: string
  buttonText?: string
  tip?: string
  disabled?: boolean
  removable?: boolean
}>(), {
  accept: '',
  buttonText: '选择文件',
  disabled: false,
  removable: true,
})

const fileNodeId = defineModel<string | undefined>('fileNodeId')
const fileName = defineModel<string | undefined>('fileName')
const fileSize = defineModel<number | undefined>('fileSize')

const inputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const displayName = computed(() => fileName.value ?? '已上传文件')

function openPicker() {
  inputRef.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  uploading.value = true
  try {
    const staged = await stagePlatformFile(props.sceneKey, file)
    fileNodeId.value = staged.fileNodeId
    fileName.value = staged.fileName
    fileSize.value = staged.fileSize
  } catch (error) {
    message.error(getUserErrorMessage(error, '文件上传失败'))
  } finally {
    uploading.value = false
    if (inputRef.value) {
      inputRef.value.value = ''
    }
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
    gap: 8px;
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
    font-size: 12px;
  }
}
</style>
