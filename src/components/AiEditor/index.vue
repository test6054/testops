<!-- 通用AiEditor组件 - 支持可编辑和只读模式 -->
<template>
  <div ref="divRef" class="ai-editor-container"></div>
</template>

<script lang="ts" setup>
import type { AiEditorOptions } from 'aieditor'
import { AiEditor } from 'aieditor'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { createOptimizedAiEditorConfig } from '@/config/aieditor'

import 'aieditor/dist/style.css'

defineOptions({ name: 'AiEditor' })

const modelValue = defineModel<string>({ required: true })

const props = withDefaults(defineProps<{
  editable?: boolean
  placeholder?: string
  options?: Partial<AiEditorOptions>
}>(), {
  editable: true,
  placeholder: '请输入内容',
})

function readUploadSrc(response: unknown): string {
  if (typeof response !== 'object' || response === null || !('data' in response)) {
    return ''
  }
  const payload = response.data
  if (typeof payload !== 'object' || payload === null || !('src' in payload)) {
    return ''
  }
  const src = payload.src
  return typeof src === 'string' ? src : ''
}

const divRef = ref<HTMLElement>()
const aieditor = shallowRef<AiEditor | null>(null)

const editorConfig = computed((): Partial<AiEditorOptions> => {
  const baseConfig = createOptimizedAiEditorConfig({
    element: divRef.value,
    theme: 'light',
    placeholder: props.placeholder,
    content: modelValue.value,
    editable: props.editable,
    draggable: false,
    ai: {
      bubblePanelEnable: true,
    },
    image: {
      allowBase64: true,
      uploader: async (file: File) => {
        const result = await stageBusinessFile(FileUploadSceneKey.MARK_EXAM_TEMPLATE, file)
        return {
          errorCode: 0,
          data: {
            src: `/api/storage/filesystem/download?nodeId=${result.id}`,
            alt: result.nodeName,
          },
        }
      },
      uploaderEvent: {
        onSuccess: (_file: File, response: unknown) => readUploadSrc(response),
        onError: (_file: File, _err: unknown) => {},
      },
    },
    onChange: props.editable
      ? (editor: AiEditor) => {
          modelValue.value = editor.getHtml()
        }
      : undefined,
  })

  return { ...baseConfig, ...props.options }
})

const init = () => {
  const element = divRef.value
  if (!element) {
    return
  }

  aieditor.value?.destroy()
  aieditor.value = new AiEditor({
    ...editorConfig.value,
    element,
  })
}

watch(
  () => modelValue.value,
  (value) => {
    if (value !== aieditor.value?.getHtml()) {
      aieditor.value?.setContent(value || '')
    }
  },
)

watch(
  () => props.editable,
  () => {
    if (aieditor.value) {
      init()
    }
  },
)

onMounted(() => {
  nextTick(() => {
    init()
  })
})

onUnmounted(() => {
  aieditor.value?.destroy()
})

defineExpose({
  getEditor: () => aieditor.value,
  getHtml: () => aieditor.value?.getHtml() || '',
  setContent: (content: string) => aieditor.value?.setContent(content),
  destroy: () => aieditor.value?.destroy(),
})
</script>

<style lang="scss" scoped>
.ai-editor-container {
  height: 100%;
  width: 100%;
  box-sizing: border-box;

  :deep(.aie-container) {
    border: 1px solid var(--ant-color-border-secondary) !important;
    border-radius: var(--dp-radius-xs);
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :deep(.aie-container-header) {
    border-bottom: 1px solid var(--ant-color-border-secondary);
    background: var(--ant-color-fill-quaternary);
  }

  :deep(.aie-container-main) {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }
}
</style>
