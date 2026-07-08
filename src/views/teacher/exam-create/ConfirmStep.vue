<template>
  <div id="exam-create-confirm" class="form-section">
    <div class="section-header">
      <h3 class="section-title">确认创建</h3>
    </div>
    <p class="section-desc">请核对以下信息，确认无误后点击底部「创建考试」。</p>

    <div class="create-form-summary">
      <section class="create-form-summary__group">
        <h4 class="create-form-summary__group-title">考务信息</h4>
        <dl class="create-form-summary__rows">
          <div class="create-form-summary__row">
            <dt>考试性质</dt>
            <dd>{{ examKindText }}</dd>
          </div>
          <div v-if="examForm.sourceExamId" class="create-form-summary__row">
            <dt>原考试</dt>
            <dd>{{ examForm.sourceExamName || examForm.sourceExamId }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>课程</dt>
            <dd>{{ examForm.courseName || '—' }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>考试名称</dt>
            <dd>{{ examForm.examName || '—' }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>考务编号</dt>
            <dd>{{ examForm.examNo || '—' }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>学年学期</dt>
            <dd>{{ academicTermText }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>考试时间</dt>
            <dd>{{ examWindowText }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>成绩构成</dt>
            <dd>{{ scoreCompositionText }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>涉密场次</dt>
            <dd>{{ examForm.confidential ? '是（强制水印）' : '否' }}</dd>
          </div>
        </dl>
      </section>

      <section class="create-form-summary__group">
        <h4 class="create-form-summary__group-title">阅卷队伍</h4>
        <dl class="create-form-summary__rows">
          <div class="create-form-summary__row">
            <dt>主考教师</dt>
            <dd>{{ markingTeamForm.chiefExaminerNickName }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>匿名阅卷</dt>
            <dd>{{ markingTeamForm.anonymousMode ? '启用' : '关闭' }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>阅卷教师</dt>
            <dd>{{ reviewerText }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>阅卷策略</dt>
            <dd>{{ ExamGradingStrategyDescription[ExamGradingStrategyCode.SINGLE] }}</dd>
          </div>
        </dl>
      </section>

      <section class="create-form-summary__group">
        <h4 class="create-form-summary__group-title">考生范围</h4>
        <dl class="create-form-summary__rows">
          <div class="create-form-summary__row">
            <dt>纳入方式</dt>
            <dd>{{ selectionModeText }}</dd>
          </div>
          <div class="create-form-summary__row">
            <dt>参考班级</dt>
            <dd>
              {{ rosterForm.classIds.length ? `${rosterForm.classIds.length} 个班级` : '未设置' }}
            </dd>
          </div>
          <div class="create-form-summary__row">
            <dt>考生人数</dt>
            <dd>
              {{
                rosterForm.candidates.length ? `${rosterForm.candidates.length} 人` : '创建后补录'
              }}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ExamGradingStrategyCode,
  ExamGradingStrategyDescription,
  ExamKindDescription,
  ExamRosterScopeModeDescription,
} from '@/apis/mark/exam'
import { formatSemester } from '@/types/enums/semester-enum'
import { formatDateTime } from '@/utils/format'
import {
  useInjectedExamCreateBasicForm,
  useInjectedExamCreateMarkingTeamForm,
  useInjectedExamCreateRosterForm,
} from './exam-create-context'

const examForm = useInjectedExamCreateBasicForm()
const markingTeamForm = useInjectedExamCreateMarkingTeamForm()
const rosterForm = useInjectedExamCreateRosterForm()

const examKindText = computed(() => ExamKindDescription[examForm.examKind])

const academicTermText = computed(() => {
  const year = examForm.academicYear?.trim()
  const semester = examForm.semester ? formatSemester(examForm.semester) : ''
  if (year && semester) return `${year} · ${semester}`
  if (year) return year
  if (semester) return semester
  return '未设置'
})

const examWindowText = computed(() => {
  const [start, end] = examForm.examWindow ?? []
  if (!start || !end) return '未设置'
  return `${formatDateTime(start)} ~ ${formatDateTime(end)}`
})

const scoreCompositionText = computed(() => {
  if (examForm.scoreCompositionMode === 'EXAM_WITH_DAILY') {
    const full = examForm.dailyScoreFull
    return full != null ? `考试 + 平时（满分 ${full}）` : '考试 + 平时'
  }
  return '仅考试成绩'
})

const selectionModeText = computed(() => {
  if (!rosterForm.candidates.length) {
    return '创建后补录'
  }
  return ExamRosterScopeModeDescription[rosterForm.scopeMode]
})

const reviewerText = computed(() => {
  const names = markingTeamForm.reviewerNickNames.filter(Boolean)
  if (names.length) {
    return names.join('、')
  }
  if (markingTeamForm.reviewerUserIds.length) {
    return `${markingTeamForm.reviewerUserIds.length} 人`
  }
  return '—'
})
</script>
