<script setup lang="ts">
import type { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import type {
  ExamLayoutDocument,
  ExamLayoutGenerateQuestionRequest,
} from '@/apis/mark/exam-layout-design'
import LayoutEntryGateway from '@/components/mark/layout-designer/LayoutEntryGateway.vue'

withDefaults(
  defineProps<{
  document: ExamLayoutDocument | null
  examId: string
  materialLayoutMode?: ExamMaterialLayoutModeCode
  generating?: boolean
  detecting?: boolean
  readonly?: boolean
  hasPages: boolean
}>(),
  {
    readonly: true,
  },
)

defineEmits<{
  'generate-sheet': [paperSpec: string, questions: ExamLayoutGenerateQuestionRequest[]]
  'auto-detect': [sourcePdfFileId: string]
  "patch": [document: ExamLayoutDocument]
  'focus-upload': []
}>()
</script>

<template>
  <div class="layout-design-source-phase">
    <LayoutEntryGateway
      :document="document"
      :exam-id="examId"
      :material-layout-mode="materialLayoutMode"
      :generating="generating"
      :detecting="detecting"
      :readonly="readonly"
      @generate-sheet="(...args) => $emit('generate-sheet', ...args)"
      @auto-detect="(...args) => $emit('auto-detect', ...args)"
      @patch="$emit('patch', $event)"
    />
  </div>
</template>

<style scoped lang="scss">
.layout-design-source-phase {
  width: 100%;
}
</style>
