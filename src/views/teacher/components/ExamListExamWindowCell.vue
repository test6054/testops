<template>
  <span
    v-if="windowCell"
    class="exam-list-page__exam-window"
    :title="windowCell.full"
  >
    <span class="exam-list-page__exam-window-range">{{ windowCell.compact }}</span>
    <span
      v-if="windowCell.phase"
      class="exam-list-page__exam-window-phase"
      :class="windowCell.phase.modifier"
    >
      {{ windowCell.phase.label }}
    </span>
  </span>
  <span v-else class="muted">未设置</span>
</template>

<script lang="ts" setup>
import type { ExamWorkbenchSummaryResponse } from '@/apis/mark/exam'
import { computed } from 'vue'
import {
  formatExamWindowCompactRange,
  formatExamWindowFullRange,
  formatExamWindowPhaseLabel,
  resolveExamWindowPhase,
} from '@/utils/format'

defineOptions({ name: 'ExamListExamWindowCell' })

const props = defineProps<{
  exam: ExamWorkbenchSummaryResponse
}>()

/** 列表考试时间窗单元格：紧凑区间 + 相对阶段 + hover 完整时间。 */
const windowCell = computed(() => {
  const exam = props.exam
  if (!exam.examStartTime && !exam.examEndTime) {
    return null
  }
  const phase = resolveExamWindowPhase(exam.examStartTime, exam.examEndTime)
  return {
    compact: formatExamWindowCompactRange(exam.examStartTime, exam.examEndTime),
    full: formatExamWindowFullRange(exam.examStartTime, exam.examEndTime),
    phase: phase
      ? {
          modifier: `exam-list-page__exam-window-phase--${phase}`,
          label: formatExamWindowPhaseLabel(exam.examStartTime, exam.examEndTime),
        }
      : null,
  }
})
</script>
