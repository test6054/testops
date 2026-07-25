<template>
  <div class="ongoing-exam-list-wrap">
    <ul class="ongoing-exam-list" aria-label="进行中考试">
      <li
        v-for="exam in exams"
        :key="exam.examId"
        class="ongoing-exam-row"
        :class="{ 'ongoing-exam-row--blocking': hasPositiveCount(exam.blockingTodoCount) }"
      >
        <div class="ongoing-exam-row__identity">
          <div class="ongoing-exam-row__name">{{ exam.examName }}</div>
          <div v-if="examMeta(exam)" class="ongoing-exam-row__meta">{{ examMeta(exam) }}</div>
        </div>

        <div class="ongoing-exam-row__stage">
          <UiTag :tone="stageTagTone(exam.currentStageKey)" size="sm">
            {{ stageTagLabel(exam) }}
          </UiTag>
          <UiTag v-if="hasPositiveCount(exam.blockingTodoCount)" tone="red" size="sm">阻断</UiTag>
        </div>

        <div class="ongoing-exam-row__progress" aria-label="阅卷进度">
          <div class="ongoing-exam-row__progress-track">
            <div
              class="ongoing-exam-row__progress-fill"
              :class="progressFillClass(exam)"
              :style="{ transform: `scaleX(${progressScale(exam.progressPercent)})` }"
            />
          </div>
          <span class="ongoing-exam-row__progress-text">
            {{ resolveOngoingExamProgressFractionShort(exam) }} · {{ formatProgressPercent(exam.progressPercent) }}
          </span>
        </div>

        <div class="ongoing-exam-row__signals" role="group" aria-label="比较指标">
          <span
            class="ongoing-exam-row__signal"
            :class="{
              'ongoing-exam-row__signal--alert': hasPositiveCount(exam.scanAttentionCount),
              'ongoing-exam-row__signal--missing': exam.scanAttentionCount == null,
            }"
          >
            扫描 {{ formatCount(exam.scanAttentionCount) }}
          </span>
          <span
            class="ongoing-exam-row__signal"
            :class="{
              'ongoing-exam-row__signal--warn': hasPositiveCount(exam.pendingReviewTaskCount),
              'ongoing-exam-row__signal--missing': exam.pendingReviewTaskCount == null,
            }"
          >
            复核 {{ formatCount(exam.pendingReviewTaskCount) }}
          </span>
          <span
            class="ongoing-exam-row__signal"
            :class="{
              'ongoing-exam-row__signal--warn': hasPositiveCount(exam.pendingGradeCount),
              'ongoing-exam-row__signal--missing': exam.pendingGradeCount == null,
            }"
          >
            待确认 {{ formatCount(exam.pendingGradeCount) }}
          </span>
        </div>

        <time class="ongoing-exam-row__updated" :datetime="exam.updateTime || undefined">
          {{ formatUpdateTime(exam.updateTime) }}
        </time>

        <UiButton
          variant="outline"
          size="sm"
          class="ongoing-exam-row__enter"
          @click="handleEnter(exam)"
        >
          进入考试
        </UiButton>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import type { MarkTeacherDashboardOngoingExamItemVO } from '@/apis/mark/teacher-dashboard'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { MarkStageKey } from '@/stores/modules/markStage'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { formatAcademicYearSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import {
  resolveOngoingExamProgressFractionShort,
  resolveOngoingExamProgressTone,
} from '@/utils/mark-dashboard-stages'

defineOptions({ name: 'OngoingExamCardGrid' })

defineProps<{
  exams: MarkTeacherDashboardOngoingExamItemVO[]
}>()

const emit = defineEmits<{
  navigate: [routeName: string, examId: string]
}>()

function handleEnter(exam: MarkTeacherDashboardOngoingExamItemVO): void {
  const routeName = exam.recommendedWorkspacePath?.trim()
  const examId = exam.examId?.trim()
  if (!routeName || !examId) {
    showUserError(null, `考试工作台入口合同缺失：examId=${exam.examId || '—'}，route=${routeName || '—'}`)
    return
  }
  emit('navigate', routeName, examId)
}

function formatCount(value: number | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('zh-CN')
}

function hasPositiveCount(value: number | undefined): boolean {
  return value != null && value > 0
}

function formatProgressPercent(value: number | undefined): string {
  return value == null ? '—' : `${value}%`
}

function progressScale(value: number | undefined): number {
  if (value == null) return 0
  return Math.max(0, Math.min(1, value / 100))
}

function formatUpdateTime(value: string | undefined): string {
  if (!value?.trim()) return '—'
  return formatDateTime(value, '—')
}

function examMeta(exam: MarkTeacherDashboardOngoingExamItemVO): string {
  const parts: string[] = []
  if (exam.examNo) parts.push(exam.examNo)
  const term = formatAcademicYearSemester(exam.academicYear, exam.semester)
  if (term) parts.push(term)
  if (exam.candidateCount != null) {
    parts.push(`考生 ${exam.candidateCount.toLocaleString('zh-CN')}`)
  } else {
    parts.push('考生 —')
  }
  return parts.join(' · ')
}

function stageTagLabel(exam: MarkTeacherDashboardOngoingExamItemVO): string {
  return exam.currentStageTitle || '待进入主链'
}

function stageTagTone(stageKey: MarkStageKey | undefined): BadgeTone {
  switch (stageKey) {
    case 'SCAN':
      return 'orange'
    case 'MARKING_ORG':
    case 'TRIAL_MARKING':
    case 'FORMAL_MARKING':
      return 'blue'
    case 'SCORE_PUBLISH':
      return 'green'
    default:
      return 'gray'
  }
}

function progressFillClass(exam: MarkTeacherDashboardOngoingExamItemVO): string {
  if (exam.progressPercent == null) return 'ongoing-exam-row__progress-fill--missing'
  const tone = resolveOngoingExamProgressTone(exam.progressPercent, exam.currentStageKey)
  if (tone === 'success') return 'ongoing-exam-row__progress-fill--success'
  if (tone === 'warning') return 'ongoing-exam-row__progress-fill--warning'
  return ''
}
</script>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

.ongoing-exam-list-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ongoing-exam-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ongoing-exam-row {
  display: grid;
  grid-template-columns:
    minmax(0, 1.5fr)
    auto
    minmax(112px, 0.7fr)
    minmax(0, 1fr)
    auto
    auto;
  column-gap: var(--dp-space-component);
  align-items: center;
  padding: var(--dp-space-component) var(--dp-space-block);
  border-bottom: 1px solid var(--dp-border);
}

.ongoing-exam-row:last-child {
  border-bottom: none;
}

.ongoing-exam-row--blocking {
  background: color-mix(in srgb, var(--dp-error, #cf1322) 4%, var(--dp-surface));
}

.ongoing-exam-row__identity {
  min-width: 0;
}

.ongoing-exam-row__name {
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  line-height: 1.4;
  color: var(--dp-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ongoing-exam-row__meta {
  margin-top: 2px;
  font-size: var(--dp-type-hint-size);
  line-height: 1.4;
  color: var(--dp-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ongoing-exam-row__stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-xs);
}

.ongoing-exam-row__progress {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ongoing-exam-row__progress-track {
  height: 4px;
  border-radius: var(--dp-radius-full);
  background: var(--dp-gray-200);
  overflow: hidden;
}

.ongoing-exam-row__progress-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  border-radius: inherit;
  background: var(--dp-color-primary);
}

.ongoing-exam-row__progress-fill--success {
  background: var(--dp-success);
}

.ongoing-exam-row__progress-fill--warning {
  background: var(--dp-warning);
}

.ongoing-exam-row__progress-fill--missing {
  background: var(--dp-gray-300, var(--dp-border));
}

.ongoing-exam-row__progress-text {
  font-size: var(--dp-type-hint-size);
  line-height: 1.3;
  color: var(--dp-text-secondary);
  font-variant-numeric: tabular-nums;
}

.ongoing-exam-row__signals {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  font-size: var(--dp-type-hint-size);
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-muted);
}

.ongoing-exam-row__signal--alert {
  color: var(--dp-orange-600, var(--dp-warning));
  font-weight: 600;
}

.ongoing-exam-row__signal--warn {
  color: var(--dp-blue-600, var(--dp-color-primary));
  font-weight: 600;
}

.ongoing-exam-row__signal--missing {
  font-weight: 500;
}

.ongoing-exam-row__updated {
  font-size: var(--dp-type-hint-size);
  line-height: 1.3;
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ongoing-exam-row__enter {
  justify-self: end;
}

@media (max-width: bp.$layout-mobile-max) {
  .ongoing-exam-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'identity enter'
      'stage stage'
      'progress progress'
      'signals signals'
      'updated updated';
    row-gap: var(--dp-space-component-tight);
  }

  .ongoing-exam-row__identity {
    grid-area: identity;
  }

  .ongoing-exam-row__stage {
    grid-area: stage;
  }

  .ongoing-exam-row__progress {
    grid-area: progress;
  }

  .ongoing-exam-row__signals {
    grid-area: signals;
  }

  .ongoing-exam-row__updated {
    grid-area: updated;
  }

  .ongoing-exam-row__enter {
    grid-area: enter;
    align-self: start;
  }

  .ongoing-exam-row__name {
    white-space: normal;
  }

  .ongoing-exam-row__meta {
    white-space: normal;
  }
}
</style>
