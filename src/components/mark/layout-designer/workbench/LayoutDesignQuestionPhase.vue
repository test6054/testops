<script setup lang="ts">
import type { ExamLayoutDocument, ExamLayoutQuestionDto } from '@/apis/mark/exam-layout-design'
import LayoutQuestionLedgerPanel from '@/components/mark/layout-designer/workbench/LayoutQuestionLedgerPanel.vue'

withDefaults(
  defineProps<{
  document: ExamLayoutDocument | null
  focusedQuestionId: string | null
  readonly?: boolean
}>(),
  {
    readonly: true,
  },
)

const emit = defineEmits<{
  "patch": [document: ExamLayoutDocument]
  'focus-question': [question: ExamLayoutQuestionDto | null]
  'locate-roi': [question: ExamLayoutQuestionDto]
}>()
</script>

<template>
  <LayoutQuestionLedgerPanel
    :document="document"
    :focused-question-id="focusedQuestionId"
    :readonly="readonly"
    @patch="emit('patch', $event)"
    @focus-question="emit('focus-question', $event)"
    @locate-roi="emit('locate-roi', $event)"
  />
</template>
