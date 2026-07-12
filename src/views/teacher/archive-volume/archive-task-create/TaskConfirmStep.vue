<template>
  <div id="archive-task-confirm" class="form-section">
    <div class="section-header">
      <h3 class="section-title">确认创建</h3>
    </div>
    <p class="section-desc">
      请核对以下信息，确认无误后点击底部「创建归档任务」；创建后将进入任务详情登记材料。
    </p>

    <div class="archive-create-summary">
      <section class="archive-create-summary__group">
        <h4 class="archive-create-summary__group-title">任务来源</h4>
        <dl class="archive-create-summary__rows">
          <div class="archive-create-summary__row">
            <dt>来源类型</dt>
            <dd>{{ provenanceText }}</dd>
          </div>
        </dl>
      </section>
      <section class="archive-create-summary__group">
        <h4 class="archive-create-summary__group-title">任务信息</h4>
        <dl class="archive-create-summary__rows">
          <div class="archive-create-summary__row">
            <dt>课程</dt>
            <dd>{{ basicForm.courseName || '—' }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>归档标题</dt>
            <dd>{{ basicForm.archiveTitle || '—' }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>档案编号</dt>
            <dd>{{ basicForm.archiveNo.trim() || '自动生成' }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>学年学期</dt>
            <dd>{{ academicTermText }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>授课班级</dt>
            <dd>{{ basicForm.teachingClassName.trim() || '—' }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>院系</dt>
            <dd>{{ basicForm.departmentName.trim() || '—' }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>关联考试</dt>
            <dd>{{ basicForm.relatedExamName.trim() || '—' }}</dd>
          </div>
        </dl>
      </section>
      <section class="archive-create-summary__group">
        <h4 class="archive-create-summary__group-title">归档方案</h4>
        <dl class="archive-create-summary__rows">
          <div class="archive-create-summary__row">
            <dt>目录模板套</dt>
            <dd>{{ planForm.templateSetName || planForm.templateSetCode || '—' }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>考核形式</dt>
            <dd>{{ examFormText }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>成绩事实源</dt>
            <dd>{{ scoreSourceText }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>密级</dt>
            <dd>{{ securityLevelText }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>归档责任人</dt>
            <dd>{{ planForm.responsibleUserName || '—' }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>保管策略</dt>
            <dd>{{ retentionText }}</dd>
          </div>
          <div class="archive-create-summary__row">
            <dt>归档截止</dt>
            <dd>{{ archiveDueText }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ArchiveExamFormDescription,
  ArchiveScoreSourceDescription,
  ArchiveSecurityLevelDescription,
} from '@/apis/mark/archive-volume'
import { ArchiveTaskProvenanceDescription } from '@/types/enums/archive-task-provenance-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { composeAcademicYear } from '@/utils/academic-year'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import {
  useInjectedArchiveTaskCreateBasicForm,
  useInjectedArchiveTaskCreatePlanForm,
  useInjectedArchiveTaskCreateWizardState,
} from './archive-task-create-context'

defineProps<{
  provenanceLabel: string
}>()

const basicForm = useInjectedArchiveTaskCreateBasicForm()
const planForm = useInjectedArchiveTaskCreatePlanForm()
const wizardState = useInjectedArchiveTaskCreateWizardState()

const provenanceText = computed(() => {
  if (!wizardState.provenance) return '未选择'
  return strictEnumLabel(ArchiveTaskProvenanceDescription, wizardState.provenance, '归档任务来源')
})

const academicTermText = computed(() => {
  const year = composeAcademicYear(basicForm.academicYearStartYear)
  const semester = basicForm.semester ? formatSemester(basicForm.semester) : ''
  if (year && semester) return `${year} · ${semester}`
  if (year) return year
  if (semester) return semester
  return '未设置'
})

const examFormText = computed(() =>
  planForm.examForm
    ? strictEnumLabel(ArchiveExamFormDescription, planForm.examForm, '考试形式')
    : '—',
)

const scoreSourceText = computed(() =>
  strictEnumLabel(ArchiveScoreSourceDescription, planForm.scoreSource, '成绩来源'),
)

const securityLevelText = computed(() =>
  strictEnumLabel(ArchiveSecurityLevelDescription, planForm.securityLevel, '密级'),
)

const retentionText = computed(() => {
  if (planForm.permanentRetention) return '永久保管'
  if (planForm.retentionYears != null) return `${planForm.retentionYears} 年`
  return '—'
})

const archiveDueText = computed(() =>
  planForm.archiveDueTimeOverride
    ? formatDateTime(planForm.archiveDueTimeOverride)
    : '按法规策略自动计算',
)
</script>
