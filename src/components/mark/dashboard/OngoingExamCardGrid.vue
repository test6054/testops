<template>
  <UiEmpty v-if="!exams.length" description="当前筛选下暂无考试" />
  <div v-else class="ongoing-exam-card-grid">
    <article
      v-for="exam in exams"
      :key="exam.examId"
      class="ongoing-exam-card"
      :class="{ 'ongoing-exam-card--blocking': (exam.blockingTodoCount ?? 0) > 0 }"
      tabindex="0"
      role="button"
      @click="emitNavigate(exam.recommendedWorkspacePath, exam.examId)"
      @keydown.enter="emitNavigate(exam.recommendedWorkspacePath, exam.examId)"
    >
      <div class="ongoing-exam-card__header">
        <div class="ongoing-exam-card__title-block">
          <div class="ongoing-exam-card__name">{{ exam.examName }}</div>
          <div v-if="examMeta(exam)" class="ongoing-exam-card__meta">{{ examMeta(exam) }}</div>
        </div>
        <UiTag :tone="stageTagTone(exam.currentStageKey)" size="sm">
          {{ stageTagLabel(exam) }}
        </UiTag>
      </div>

      <div class="ongoing-exam-card__progress">
        <div class="ongoing-exam-card__progress-track">
          <div
            class="ongoing-exam-card__progress-fill"
            :class="progressFillClass(exam.progressPercent ?? 0)"
            :style="{ width: `${Math.min(exam.progressPercent ?? 0, 100)}%` }"
          />
        </div>
        <div class="ongoing-exam-card__progress-label">
          <span>{{ progressFractionLabel(exam) }}</span>
          <span>{{ exam.progressPercent ?? 0 }}%</span>
        </div>
      </div>

      <div class="ongoing-exam-card__stats">
        <div class="ongoing-exam-card__stat">
          <span class="ongoing-exam-card__stat-label">考生数</span>
          <span class="ongoing-exam-card__stat-value">{{ formatCount(exam.candidateCount) }}</span>
        </div>
        <div class="ongoing-exam-card__stat">
          <span class="ongoing-exam-card__stat-label">扫描关注</span>
          <span
            class="ongoing-exam-card__stat-value"
            :class="{ 'ongoing-exam-card__stat-value--alert': (exam.scanAttentionCount ?? 0) > 0 }"
          >
            {{ formatCount(exam.scanAttentionCount) }}
          </span>
        </div>
        <div class="ongoing-exam-card__stat">
          <span class="ongoing-exam-card__stat-label">待复核</span>
          <span
            class="ongoing-exam-card__stat-value"
            :class="{
              'ongoing-exam-card__stat-value--warn': (exam.pendingReviewTaskCount ?? 0) > 0,
            }"
          >
            {{ formatCount(exam.pendingReviewTaskCount) }}
          </span>
        </div>
        <div class="ongoing-exam-card__stat">
          <span class="ongoing-exam-card__stat-label">待确认题</span>
          <span
            class="ongoing-exam-card__stat-value"
            :class="{ 'ongoing-exam-card__stat-value--warn': (exam.pendingGradeCount ?? 0) > 0 }"
          >
            {{ formatCount(exam.pendingGradeCount) }}
          </span>
        </div>
      </div>

      <footer class="ongoing-exam-card__footer">
        <UiTag v-if="formatAcademicYearSemester(exam.academicYear, exam.semester)" tone="gray" size="sm">
          {{ formatAcademicYearSemester(exam.academicYear, exam.semester) }}
        </UiTag>
        <UiButton
          size="sm"
          class="ongoing-exam-card__enter"
          @click.stop="emitNavigate(exam.recommendedWorkspacePath, exam.examId)"
        >
          进入考试
        </UiButton>
      </footer>
    </article>
  </div>
</template>

<script lang="ts" setup>
import type { MarkTeacherDashboardOngoingExamItemVO } from '@/apis/mark/teacher-dashboard'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { MarkStageKey } from '@/stores/modules/markStage'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { formatAcademicYearSemester } from '@/types/enums/semester-enum'

defineOptions({ name: 'OngoingExamCardGrid' })

defineProps<{
  exams: MarkTeacherDashboardOngoingExamItemVO[]
}>()

const emit = defineEmits<{
  navigate: [routeName: string | undefined, examId: string | undefined]
}>()

function emitNavigate(routeName: string | undefined, examId: string | undefined) {
  emit('navigate', routeName, examId)
}

function formatCount(value: number | undefined): string {
  return (value ?? 0).toLocaleString('zh-CN')
}

function examMeta(exam: MarkTeacherDashboardOngoingExamItemVO): string {
  const parts: string[] = []
  if (exam.examNo) parts.push(exam.examNo)
  const term = formatAcademicYearSemester(exam.academicYear, exam.semester)
  if (term && !exam.examNo) parts.push(term)
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

function progressFractionLabel(exam: MarkTeacherDashboardOngoingExamItemVO): string {
  const total = exam.candidateCount ?? 0
  if (total <= 0) return exam.currentStageTitle || '进度'
  const published = exam.publishedScoreCount ?? 0
  return `${published.toLocaleString('zh-CN')} / ${total.toLocaleString('zh-CN')} 份`
}

function progressFillClass(progress: number): string {
  if (progress >= 100) return 'ongoing-exam-card__progress-fill--success'
  if (progress < 40) return 'ongoing-exam-card__progress-fill--warning'
  return ''
}
</script>

<style scoped>
.ongoing-exam-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4);
}

.ongoing-exam-card {
  display: flex;
  flex-direction: column;
  padding: var(--dp-space-5);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  cursor: pointer;
  transition:
    border-color var(--dp-duration-normal) ease,
    box-shadow var(--dp-duration-normal) ease;
}

.ongoing-exam-card:hover {
  border-color: var(--dp-blue-200);
  box-shadow: var(--dp-shadow-card-hover, 0 2px 8px rgba(0, 0, 0, 0.06));
}

.ongoing-exam-card:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.ongoing-exam-card--blocking {
  border-color: var(--ant-color-error-border);
}

.ongoing-exam-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-3);
}

.ongoing-exam-card__title-block {
  min-width: 0;
}

.ongoing-exam-card__name {
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--dp-text-primary);
  letter-spacing: -0.01em;
}

.ongoing-exam-card__meta {
  margin-top: 2px;
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
}

.ongoing-exam-card__progress {
  margin: var(--dp-space-3) 0;
}

.ongoing-exam-card__progress-track {
  height: 6px;
  border-radius: var(--dp-radius-full);
  background: var(--dp-gray-200);
  overflow: hidden;
}

.ongoing-exam-card__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--dp-blue-500);
  transition: width var(--dp-duration-slow) ease;
}

.ongoing-exam-card__progress-fill--success {
  background: var(--dp-green-500);
}

.ongoing-exam-card__progress-fill--warning {
  background: var(--dp-orange-500);
}

.ongoing-exam-card__progress-label {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.ongoing-exam-card__stats {
  display: flex;
  gap: var(--dp-space-4);
  margin-top: var(--dp-space-3);
  padding-top: var(--dp-space-3);
  border-top: 1px solid var(--dp-border);
}

.ongoing-exam-card__stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.ongoing-exam-card__stat-label {
  font-size: 11px;
  color: var(--dp-text-muted);
}

.ongoing-exam-card__stat-value {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-primary);
}

.ongoing-exam-card__stat-value--alert {
  color: var(--ant-color-error);
}

.ongoing-exam-card__stat-value--warn {
  color: var(--ant-color-warning);
}

.ongoing-exam-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  margin-top: var(--dp-space-3);
}

.ongoing-exam-card__enter {
  margin-left: auto;
}

@media (max-width: 991px) {
  .ongoing-exam-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
