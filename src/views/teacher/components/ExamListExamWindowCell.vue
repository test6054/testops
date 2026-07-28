<template>
  <span
    v-if="windowText"
    class="exam-list-page__exam-window"
    :title="windowText.full"
  >
    {{ windowText.compact }}
  </span>
  <span v-else class="exam-list-page__exam-window-empty">未设置</span>
</template>

<script lang="ts" setup>
import type { ExamWorkbenchSummaryResponse } from '@/apis/mark/exam'
import { computed } from 'vue'
import {
  formatExamWindowCompactRange,
  formatExamWindowFullRange,
} from '@/utils/format'

defineOptions({ name: 'ExamListExamWindowCell' })

const props = defineProps<{
  exam: ExamWorkbenchSummaryResponse
}>()

/** 列表考试时间窗：单元格内纯文本；完整时间仅作原生 title，无浮层组件。 */
const windowText = computed(() => {
  const exam = props.exam
  if (!exam.examStartTime && !exam.examEndTime) {
    return null
  }
  return {
    compact: formatExamWindowCompactRange(exam.examStartTime, exam.examEndTime),
    full: formatExamWindowFullRange(exam.examStartTime, exam.examEndTime),
  }
})
</script>

<style lang="scss" scoped>
.exam-list-page__exam-window {
  display: inline-block;
  max-width: 100%;
  font-size: var(--dp-font-size-sm);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
}

.exam-list-page__exam-window-empty {
  color: var(--dp-text-muted);
}
</style>
