<template>
  <div class="ongoing-exam-card-grid-wrap">
    <UiEmpty v-if="!exams.length" size="sm" description="当前筛选下暂无考试" />
    <div v-else class="ongoing-exam-card-grid">
      <div v-for="exam in exams" :key="exam.examId" class="ongoing-exam-card__tooltip-target">
        <div
          class="ongoing-exam-card"
          :class="{ 'ongoing-exam-card--blocking': (exam.blockingTodoCount ?? 0) > 0 }"
        >
          <div class="ongoing-exam-card__header">
            <div class="ongoing-exam-card__title-block">
              <div class="ongoing-exam-card__name">{{ exam.examName }}</div>
              <div v-if="examMeta(exam)" class="ongoing-exam-card__meta">
                {{ examMeta(exam) }}
              </div>
            </div>
            <UiTag :tone="stageTagTone(exam.currentStageKey)" size="sm">
              {{ stageTagLabel(exam) }}
            </UiTag>
          </div>

          <div class="ongoing-exam-card__progress">
            <div class="ongoing-exam-card__progress-track">
              <div
                class="ongoing-exam-card__progress-fill"
                :class="progressFillClass(exam)"
                :style="{
                  transform: `scaleX(${Math.max(0, Math.min(1, (exam.progressPercent ?? 0) / 100))})`,
                }"
              />
            </div>
            <div class="ongoing-exam-card__progress-label">
              <span>{{ resolveOngoingExamProgressFractionLabel(exam) }}</span>
              <span>{{ exam.progressPercent ?? 0 }}%</span>
            </div>
          </div>

          <div class="ongoing-exam-card__metrics" role="group" aria-label="考试关键指标">
            <div class="ongoing-exam-card__metric">
              <span class="ongoing-exam-card__metric-label">考生数</span>
              <span class="ongoing-exam-card__metric-value">{{
                formatCount(exam.candidateCount)
              }}</span>
            </div>
            <div class="ongoing-exam-card__metric">
              <span class="ongoing-exam-card__metric-label">扫描关注</span>
              <span
                class="ongoing-exam-card__metric-value"
                :class="{
                  'ongoing-exam-card__metric-value--alert': (exam.scanAttentionCount ?? 0) > 0,
                }"
              >
                {{ formatCount(exam.scanAttentionCount) }}
              </span>
            </div>
            <div class="ongoing-exam-card__metric">
              <span class="ongoing-exam-card__metric-label">待复核</span>
              <span
                class="ongoing-exam-card__metric-value"
                :class="{
                  'ongoing-exam-card__metric-value--warn': (exam.pendingReviewTaskCount ?? 0) > 0,
                }"
              >
                {{ formatCount(exam.pendingReviewTaskCount) }}
              </span>
            </div>
            <div class="ongoing-exam-card__metric">
              <span class="ongoing-exam-card__metric-label">待确认题</span>
              <span
                class="ongoing-exam-card__metric-value"
                :class="{
                  'ongoing-exam-card__metric-value--warn': (exam.pendingGradeCount ?? 0) > 0,
                }"
              >
                {{ formatCount(exam.pendingGradeCount) }}
              </span>
            </div>
          </div>

          <div class="ongoing-exam-card__footer">
            <UiTag
              v-if="formatAcademicYearSemester(exam.academicYear, exam.semester)"
              tone="gray"
              size="sm"
            >
              {{ formatAcademicYearSemester(exam.academicYear, exam.semester) }}
            </UiTag>
            <UiButton
              variant="outline"
              size="sm"
              class="ongoing-exam-card__enter"
              @click="emitNavigate(exam.recommendedWorkspacePath, exam.examId)"
            >
              进入考试
            </UiButton>
          </div>
        </div>
      </div>
    </div>
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
import {
  resolveOngoingExamProgressFractionLabel,
  resolveOngoingExamProgressTone,
} from '@/utils/mark-dashboard-stages'

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

function progressFillClass(exam: MarkTeacherDashboardOngoingExamItemVO): string {
  const tone = resolveOngoingExamProgressTone(exam.progressPercent ?? 0, exam.currentStageKey)
  if (tone === 'success') return 'ongoing-exam-card__progress-fill--success'
  if (tone === 'warning') return 'ongoing-exam-card__progress-fill--warning'
  return ''
}
</script>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

.ongoing-exam-card-grid-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ongoing-exam-card-grid-wrap > :deep(.ui-empty) {
  flex: 1;
  justify-content: center;
  padding: var(--dp-space-3) var(--dp-space-4);
  background: var(--dp-surface);
  min-height: 120px;
}

/* 考试卡网格：卡与卡明确分离，参考截图有空隙 */
.ongoing-exam-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-6);
}

.ongoing-exam-card__tooltip-target {
  display: block;
  min-width: 0;
  height: 100%;
}

.ongoing-exam-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-control-inner);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-xs);
  transition:
    border-color var(--dp-duration-normal) ease,
    box-shadow var(--dp-duration-normal) ease,
    transform var(--dp-duration-fast) ease;
}

.ongoing-exam-card:hover {
  border-color: var(--dp-color-primary-border);
  box-shadow: var(--dp-shadow-sm);
  transform: translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .ongoing-exam-card:hover {
    transform: none;
  }
}

.ongoing-exam-card--blocking {
  border-color: var(--dp-error-border);
}

.ongoing-exam-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3);
}

.ongoing-exam-card__title-block {
  min-width: 0;
  flex: 1;
}

.ongoing-exam-card__name {
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
  line-height: 1.35;
  color: var(--dp-text-primary);
  letter-spacing: -0.01em;
}

.ongoing-exam-card__meta {
  margin-top: var(--dp-space-1);
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-secondary);
}

/* 进度：独立一层，与指标分离 */
.ongoing-exam-card__progress {
  margin-top: var(--dp-space-3);
}

.ongoing-exam-card__progress-track {
  height: 6px;
  border-radius: var(--dp-radius-full);
  background: var(--dp-gray-200);
  overflow: hidden;
}

.ongoing-exam-card__progress-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  border-radius: inherit;
  background: var(--dp-color-primary);
  transition: transform var(--dp-duration-slow) ease;
}

@media (prefers-reduced-motion: reduce) {
  .ongoing-exam-card__progress-fill {
    transition: none;
  }
}

.ongoing-exam-card__progress-fill--success {
  background: var(--dp-success);
}

.ongoing-exam-card__progress-fill--warning {
  background: var(--dp-warning);
}

.ongoing-exam-card__progress-label {
  display: flex;
  justify-content: space-between;
  gap: var(--dp-space-2);
  margin-top: var(--dp-space-1);
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-secondary);
  font-variant-numeric: tabular-nums;
}

/*
 * 四指标一行：分隔格 + 色彩数字（Jira/飞书风格）
 * 非零项有语义色背景，零值静默灰。
 */
.ongoing-exam-card__metrics {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 1px;
  margin-top: var(--dp-space-3);
  padding: var(--dp-space-2);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--dp-border-subtle);
  border: 1px solid var(--dp-border-subtle);
}

.ongoing-exam-card__metric {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--dp-space-2) var(--dp-space-2);
  border-radius: var(--dp-radius-control-inner, 4px);
  background: var(--dp-surface);
  transition: background-color 0.15s ease;
}

.ongoing-exam-card__metric:first-child {
  padding-left: var(--dp-space-2);
}

.ongoing-exam-card__metric + .ongoing-exam-card__metric {
  border-left: none;
}

.ongoing-exam-card__metric-label {
  font-size: var(--dp-font-size-xxs);
  line-height: 1.35;
  color: var(--dp-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ongoing-exam-card__metric-value {
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-muted);
}

.ongoing-exam-card__metric-value--alert {
  color: var(--dp-orange-600, var(--dp-warning));
}

.ongoing-exam-card__metric-value--warn {
  color: var(--dp-blue-600, var(--dp-color-primary));
}

.ongoing-exam-card__metric:has(.ongoing-exam-card__metric-value--alert) {
  background: color-mix(in srgb, var(--dp-orange-500, var(--dp-warning)) 7%, var(--dp-surface));
}

.ongoing-exam-card__metric:has(.ongoing-exam-card__metric-value--warn) {
  background: color-mix(in srgb, var(--dp-color-primary) 6%, var(--dp-surface));
}

@media (prefers-reduced-motion: reduce) {
  .ongoing-exam-card__metric {
    transition: none;
  }
}

.ongoing-exam-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  margin-top: auto;
  padding-top: var(--dp-space-3);
  border-top: 1px solid var(--dp-border);
}

.ongoing-exam-card__enter {
  margin-left: auto;
}

@media (max-width: bp.$layout-mobile-max) {
  .ongoing-exam-card-grid {
    grid-template-columns: 1fr;
  }

  .ongoing-exam-card__metrics {
    flex-wrap: wrap;
  }

  .ongoing-exam-card__metric {
    flex: 1 1 calc(50% - var(--dp-space-2));
    min-width: calc(50% - var(--dp-space-2));
  }
}

@media (max-width: 1100px) and (min-width: bp.$layout-desktop-min) {
  .ongoing-exam-card__metric-value {
    font-size: var(--dp-font-size-md);
  }
}
</style>
