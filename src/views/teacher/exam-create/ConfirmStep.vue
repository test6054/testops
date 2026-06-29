<template>
  <section id="exam-create-confirm" class="form-section exam-create-form">
    <header class="section-header">
      <h2 class="section-title">确认创建</h2>
    </header>
    <dl class="exam-create-summary">
      <div class="exam-create-summary__row">
        <dt>课程</dt>
        <dd>{{ examForm.courseName || '—' }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>考试名称</dt>
        <dd>{{ examForm.examName || '—' }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>考务编号</dt>
        <dd>{{ examForm.examNo || '—' }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>学年学期</dt>
        <dd>{{ academicTermText }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>考试时间</dt>
        <dd>{{ examWindowText }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>阅卷策略</dt>
        <dd>{{ GRADING_STRATEGY_LABEL.SINGLE }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>成绩构成</dt>
        <dd>{{ scoreCompositionText }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>主考教师</dt>
        <dd>{{ markingTeamForm.chiefExaminerNickName }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>匿名阅卷</dt>
        <dd>{{ markingTeamForm.anonymousMode ? '启用' : '关闭' }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>阅卷教师</dt>
        <dd>{{ reviewerText }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>考生纳入</dt>
        <dd>{{ selectionModeText }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>参考班级</dt>
        <dd>{{ rosterForm.classIds.length ? `${rosterForm.classIds.length} 个班级` : '未设置' }}</dd>
      </div>
      <div class="exam-create-summary__row">
        <dt>考生人数</dt>
        <dd>{{ rosterForm.candidates.length ? `${rosterForm.candidates.length} 人` : '创建后补录' }}</dd>
      </div>
    </dl>
    <p class="exam-create-form__hint">
      创建后将进入考试工作台。未纳入的考生可在名册页继续编辑；已扫描或已有成绩的考生后续不可移除。
    </p>
  </section>
</template>

<script setup lang="ts">
import type { ExamBasicForm, ExamMarkingTeamForm, ExamRosterForm } from './useExamCreate'
import { EXAM_ROSTER_SCOPE_MODE_LABEL } from './useExamCreate'
import { computed } from 'vue'
import { GRADING_STRATEGY_LABEL } from '@/apis/mark/exam'
import { formatSemester } from '@/types/enums/semester-enum'
import { formatDateTime } from '@/utils/format'

const props = defineProps<{
  examForm: ExamBasicForm
  markingTeamForm: ExamMarkingTeamForm
  rosterForm: ExamRosterForm
}>()

const academicTermText = computed(() => {
  const year = props.examForm.academicYear?.trim()
  const semester = props.examForm.semester
  if (!year && !semester) return '未设置'
  if (!year || !semester) return '学年学期不完整'
  return `${year} ${formatSemester(semester)}`
})

const examWindowText = computed(() => {
  const [start, end] = props.examForm.examWindow ?? []
  if (!start || !end) return '未设置'
  return `${formatDateTime(start)} ~ ${formatDateTime(end)}`
})

const scoreCompositionText = computed(() => {
  if (props.examForm.scoreCompositionMode === 'EXAM_WITH_DAILY') {
    const full = props.examForm.dailyScoreFull
    return full != null ? `考试 + 平时（满分 ${full}）` : '考试 + 平时'
  }
  return '仅考试成绩'
})

const selectionModeText = computed(() => {
  if (!props.rosterForm.candidates.length) {
    return '创建后补录'
  }
  return EXAM_ROSTER_SCOPE_MODE_LABEL[props.rosterForm.scopeMode]
})

const reviewerText = computed(() => {
  const names = props.markingTeamForm.reviewerNickNames.filter(Boolean)
  if (names.length) {
    return names.join('、')
  }
  if (props.markingTeamForm.reviewerUserIds.length) {
    return `${props.markingTeamForm.reviewerUserIds.length} 人`
  }
  return '—'
})
</script>

<style scoped lang="scss">
.exam-create-summary {
  margin: 0;
  display: grid;
  gap: 12px;

  &__row {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 12px;
    align-items: baseline;
    font-size: 14px;
    line-height: 1.5;
  }

  dt {
    margin: 0;
    color: var(--dp-text-secondary, #64748b);
  }

  dd {
    margin: 0;
    color: var(--dp-text-primary, #0f172a);
    font-weight: 500;
  }
}

.exam-create-form__hint {
  margin-top: 20px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}
</style>
