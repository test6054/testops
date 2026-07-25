<script setup lang="ts">
import type { ExamQuestionIdentityRow } from '@/utils/mark-exam-question-table-columns'
import {
  EXAM_QUESTION_IDENTITY_COLUMN_KEYS,
  fmtExamQuestionScore,
  formatQuestionStemPreview,
  questionTypeLabel,
  resolveExamQuestionFullScore,
} from '@/utils/mark-exam-question-table-columns'

defineOptions({ name: 'ExamQuestionIdentityCells' })

defineProps<{
  columnKey: string
  record: ExamQuestionIdentityRow & { questionFullScore?: number }
}>()
</script>

<template>
  <template v-if="columnKey === EXAM_QUESTION_IDENTITY_COLUMN_KEYS.questionType">
    {{ questionTypeLabel(record.questionType) }}
  </template>
  <template v-else-if="columnKey === EXAM_QUESTION_IDENTITY_COLUMN_KEYS.questionStem">
    <div v-if="record.questionStem" class="exam-question-identity__stem">
      {{ formatQuestionStemPreview(record.questionStem) }}
    </div>
    <span v-else class="exam-question-identity__empty">—</span>
  </template>
  <template v-else-if="columnKey === EXAM_QUESTION_IDENTITY_COLUMN_KEYS.fullScore">
    {{ fmtExamQuestionScore(resolveExamQuestionFullScore(record)) }}
  </template>
</template>

<style scoped lang="scss">
.exam-question-identity__stem {
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-primary);
  line-height: 1.4;
}

.exam-question-identity__empty {
  color: var(--dp-text-muted);
}
</style>
