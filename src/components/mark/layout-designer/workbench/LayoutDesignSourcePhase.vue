<script setup lang="ts">
import type { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import type {
  ExamLayoutDocument,
} from '@/apis/mark/exam-layout-design'
import type { AnswerBookletSourceModeCode } from '@/types/enums/answer-booklet-source-mode-enum'
import type { ExamLayoutPaperSpecCode } from '@/types/enums/exam-layout-paper-spec-enum'
import LayoutEntryGateway from '@/components/mark/layout-designer/LayoutEntryGateway.vue'

withDefaults(
  defineProps<{
  document: ExamLayoutDocument | null
  examId: string
  materialLayoutMode?: ExamMaterialLayoutModeCode
  answerBookletSourceMode?: AnswerBookletSourceModeCode
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
  'generate-sheet': [paperSpec: ExamLayoutPaperSpecCode]
  'import-institution-answer-booklet': [sourceFileId: string]
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
      :answer-booklet-source-mode="answerBookletSourceMode"
      :generating="generating"
      :detecting="detecting"
      :readonly="readonly"
      @generate-sheet="(...args) => $emit('generate-sheet', ...args)"
      @import-institution-answer-booklet="(...args) => $emit('import-institution-answer-booklet', ...args)"
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
