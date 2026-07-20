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
  <span v-else class="exam-list-page__exam-window-empty">未设置</span>
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

<style lang="scss" scoped>
.exam-list-page__exam-window {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
}

.exam-list-page__exam-window-range {
  font-size: 13px;
  white-space: nowrap;
}

.exam-list-page__exam-window-phase {
  font-size: 12px;
  line-height: 18px;
  color: var(--dp-text-tertiary);
}

.exam-list-page__exam-window-phase--upcoming {
  color: var(--dp-warning);
}

.exam-list-page__exam-window-phase--ongoing {
  color: var(--dp-success);
}

.exam-list-page__exam-window-phase--ended {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  padding: 0 6px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-surface-sunken);
  color: var(--dp-text-secondary);
  font-weight: 500;
}

.exam-list-page__exam-window-empty {
  color: var(--dp-text-tertiary);
}
</style>
