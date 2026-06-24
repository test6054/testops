<template>
  <UiEmpty v-if="!exams.length" description="当前筛选下暂无考试" />
  <div v-else class="ongoing-exam-card-grid">
    <article
      v-for="exam in exams"
      :key="exam.examId"
      class="ongoing-exam-card"
      :class="{ 'ongoing-exam-card--blocking': (exam.blockingTodoCount ?? 0) > 0 }"
    >
      <button
        type="button"
        class="ongoing-exam-card__body"
        @click="emitNavigate(exam.recommendedWorkspacePath, exam.examId)"
      >
        <div class="ongoing-exam-card__head">
          <div class="ongoing-exam-card__title-block">
            <strong class="ongoing-exam-card__name">{{ exam.examName }}</strong>
            <span class="ongoing-exam-card__sub">
              <template v-if="exam.examNo">编号 {{ exam.examNo }}</template>
              <template v-if="exam.examNo && formatAcademicTerm(exam)"> · </template>
              <template v-if="formatAcademicTerm(exam)">{{ formatAcademicTerm(exam) }}</template>
            </span>
          </div>
          <UiTag :tone="examStatusTone(exam.status)" size="sm">
            {{ examStatusLabel(exam.status) }}
          </UiTag>
        </div>

        <div class="ongoing-exam-card__stage-rail" aria-hidden="true">
          <span
            v-for="(step, index) in journeySteps"
            :key="step.key"
            class="ongoing-exam-card__stage-dot"
            :class="`ongoing-exam-card__stage-dot--${resolveExamJourneyDotStatus(exam, index)}`"
            :title="step.title"
          />
        </div>

        <div class="ongoing-exam-card__stage-line">
          <span class="ongoing-exam-card__stage-title">{{ exam.currentStageTitle || '待进入主链' }}</span>
          <span class="ongoing-exam-card__progress-text">{{ exam.progressPercent ?? 0 }}%</span>
        </div>
        <a-progress
          :percent="exam.progressPercent ?? 0"
          :show-info="false"
          size="small"
          class="ongoing-exam-card__progress"
        />

        <div class="ongoing-exam-card__metrics">
          <div class="ongoing-exam-card__metric">
            <span class="ongoing-exam-card__metric-label">考生</span>
            <span class="ongoing-exam-card__metric-value">{{ exam.candidateCount ?? 0 }}</span>
          </div>
          <div class="ongoing-exam-card__metric">
            <span class="ongoing-exam-card__metric-label">扫描关注</span>
            <span
              class="ongoing-exam-card__metric-value"
              :class="{ 'ongoing-exam-card__metric-value--alert': (exam.scanAttentionCount ?? 0) > 0 }"
            >
              {{ exam.scanAttentionCount ?? 0 }}
            </span>
          </div>
          <div class="ongoing-exam-card__metric">
            <span class="ongoing-exam-card__metric-label">待复核</span>
            <span
              class="ongoing-exam-card__metric-value"
              :class="{ 'ongoing-exam-card__metric-value--warn': (exam.pendingReviewTaskCount ?? 0) > 0 }"
            >
              {{ exam.pendingReviewTaskCount ?? 0 }}
            </span>
          </div>
          <div class="ongoing-exam-card__metric">
            <span class="ongoing-exam-card__metric-label">待确认题</span>
            <span
              class="ongoing-exam-card__metric-value"
              :class="{ 'ongoing-exam-card__metric-value--warn': (exam.pendingGradeCount ?? 0) > 0 }"
            >
              {{ exam.pendingGradeCount ?? 0 }}
            </span>
          </div>
        </div>
      </button>

      <footer v-if="exam.pendingTodos?.length" class="ongoing-exam-card__footer">
        <button
          v-for="(todo, index) in exam.pendingTodos"
          :key="`${todo.todoType}-${index}`"
          type="button"
          class="ongoing-exam-card__todo"
          @click="emitNavigate(todo.workspacePath, todo.examId ?? exam.examId)"
        >
          {{ todo.label }}
          <UiTag v-if="todo.blocking" tone="red" size="sm">阻断</UiTag>
        </button>
      </footer>
    </article>
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { MarkTeacherDashboardOngoingExamItemVO } from '@/apis/mark/teacher-dashboard'
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE } from '@/apis/mark/exam'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { EXAM_JOURNEY_STEPS } from '@/constants/exam-journey'
import { formatSemester } from '@/types/enums/semester-enum'
import { resolveExamJourneyDotStatus } from '@/utils/mark-dashboard-stages'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'OngoingExamCardGrid' })

defineProps<{
  exams: MarkTeacherDashboardOngoingExamItemVO[]
}>()

const emit = defineEmits<{
  navigate: [routeName: string | undefined, examId: string | undefined]
}>()

const journeySteps = EXAM_JOURNEY_STEPS

function emitNavigate(routeName: string | undefined, examId: string | undefined) {
  emit('navigate', routeName, examId)
}

function examStatusLabel(status: ExamStatusCode): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, status, '考试状态')
}

function examStatusTone(status: ExamStatusCode): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, status, '考试状态')
}

function formatAcademicTerm(exam: MarkTeacherDashboardOngoingExamItemVO): string {
  if (!exam.academicYear && !exam.semester) return ''
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}
</script>

<style scoped>
.ongoing-exam-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.ongoing-exam-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: 8px;
  background: var(--ant-color-bg-container);
  overflow: hidden;
}

.ongoing-exam-card--blocking {
  border-color: var(--ant-color-error-border);
}

.ongoing-exam-card__body {
  display: block;
  width: 100%;
  padding: 14px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.ongoing-exam-card__body:hover {
  background: var(--ant-color-fill-quaternary);
}

.ongoing-exam-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.ongoing-exam-card__title-block {
  min-width: 0;
}

.ongoing-exam-card__name {
  display: block;
  font-size: 14px;
  line-height: 1.4;
}

.ongoing-exam-card__sub {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.ongoing-exam-card__stage-rail {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.ongoing-exam-card__stage-dot {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--ant-color-fill-secondary);
}

.ongoing-exam-card__stage-dot--done {
  background: var(--ant-color-success);
}

.ongoing-exam-card__stage-dot--current {
  background: var(--ant-color-primary);
}

.ongoing-exam-card__stage-line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.ongoing-exam-card__progress-text {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--ant-color-text);
}

.ongoing-exam-card__progress {
  margin-bottom: 12px;
}

.ongoing-exam-card__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.ongoing-exam-card__metric {
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--ant-color-fill-quaternary);
  text-align: center;
}

.ongoing-exam-card__metric-label {
  display: block;
  font-size: 11px;
  color: var(--ant-color-text-secondary);
}

.ongoing-exam-card__metric-value {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ongoing-exam-card__metric-value--alert {
  color: var(--ant-color-error);
}

.ongoing-exam-card__metric-value--warn {
  color: var(--ant-color-warning);
}

.ongoing-exam-card__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 14px 12px;
  border-top: 1px dashed var(--ant-color-border-secondary);
}

.ongoing-exam-card__todo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: 4px;
  background: var(--ant-color-bg-container);
  font-size: 12px;
  cursor: pointer;
}

.ongoing-exam-card__todo:hover {
  border-color: var(--ant-color-primary);
  color: var(--ant-color-primary);
}
</style>
