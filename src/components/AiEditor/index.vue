<!-- 通用AiEditor组件 - 支持可编辑和只读模式 -->
<template>
  <div ref="divRef" class="ai-editor-container"></div>
</template>

<script lang="ts" setup>
import type { AiEditorOptions } from 'aieditor'
import { AiEditor } from 'aieditor'
import { uploadFile } from '@/apis/edu/file-management'
import { createOptimizedAiEditorConfig } from '@/config/aieditor'

import 'aieditor/dist/style.css'

defineOptions({ name: 'AiEditor' })

const props = withDefaults(defineProps<Props>(), {
  editable: true,
  placeholder: '请输入内容',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

interface Props {
  /** 编辑器内容 */
  modelValue: string
  /** 是否可编辑，默认为true */
  editable?: boolean
  /** 占位符文本 */
  placeholder?: string
  /** 自定义编辑器配置 */
  options?: Partial<AiEditorOptions>
}

const divRef = ref<HTMLElement>()
const aieditor = shallowRef<AiEditor | null>(null)

// 编辑器配置（固定使用浅色主题）
const editorConfig = computed(() => {
  const baseConfig = createOptimizedAiEditorConfig({
    element: divRef.value,
    theme: 'light',
    placeholder: props.placeholder,
    content: props.modelValue,
    editable: props.editable,
    draggable: false,
    // 配置 AI 功能
    ai: {
      bubblePanelEnable: true,
    },
    // 配置图片上传
    image: {
      allowBase64: true,
      uploadUrl: '/api/storage/filesystem/file',
      uploader: async (file: File) => {
        const result = await uploadFile(file, { businessType: 'editor-image' })
        return {
          errorCode: 0,
          data: {
            src: `/api/storage/filesystem/download?nodeId=${result.id}`,
            alt: result.nodeName,
          },
        }
      },
      uploaderEvent: {
        onSuccess: (_file: File, response: unknown) => {
          const res = response as { data?: { src?: string } }
          return res?.data?.src || ''
        },
        onError: (_file: File, _err: unknown) => {},
      },
    },
    onChange: props.editable
      ? (editor: AiEditor) => {
          emit('update:modelValue', editor.getHtml())
        }
      : undefined,
  })

  // 合并自定义配置
  return { ...baseConfig, ...props.options } as AiEditorOptions
})

// 初始化编辑器
const init = () => {
  if (!divRef.value) return

  aieditor.value?.destroy()
  aieditor.value = new AiEditor(editorConfig.value)
}

// 监听内容变化
watch(
  () => props.modelValue,
  (value) => {
    if (value !== aieditor.value?.getHtml()) {
      aieditor.value?.setContent(value || '')
    }
  },
)

// 监听可编辑状态变化
watch(
  () => props.editable,
  () => {
    if (aieditor.value) {
      init()
    }
  },
)

// 挂载阶段
onMounted(() => {
  nextTick(() => {
    init()
  })
})

// 销毁阶段
onUnmounted(() => {
  aieditor.value?.destroy()
})

// 暴露编辑器实例方法
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

  // AiEditor 内部样式覆盖
  :deep(.aie-container) {
    border: 1px solid var(--ant-color-border-secondary) !important;
    border-radius: var(--dp-radius-xs);
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  // 工具栏样式
  :deep(.aie-container-header) {
    border-bottom: 1px solid var(--ant-color-border-secondary);
    background: var(--ant-color-fill-quaternary);
  }

  // 内容区域
  :deep(.aie-container-main) {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }
}
</style>
