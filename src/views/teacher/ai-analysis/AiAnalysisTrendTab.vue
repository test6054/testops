<script setup lang="ts">
import type { ClassInfoDto } from '@/apis/edu/class'
import type { CourseListVO, TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { computed, inject } from 'vue'
import AnalysisOrgScopeBar from '@/components/mark/AnalysisOrgScopeBar.vue'
import {
  AI_ANALYSIS_ACADEMIC_YEAR_KEY,
  AI_ANALYSIS_CLASS_ID_KEY,
  AI_ANALYSIS_CLASS_LABEL_KEY,
  AI_ANALYSIS_COURSE_ID_KEY,
  AI_ANALYSIS_EXAM_LOCKED_KEY,
  AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY,
  AI_ANALYSIS_REFERENCE_DEPARTMENT_LABEL_KEY,
  AI_ANALYSIS_SCOPE_COURSE_LABEL_KEY,
  AI_ANALYSIS_SEMESTER_KEY,
} from '@/composables/useAiAnalysisScope'
import { formatSemester } from '@/types/enums/semester-enum'
import CourseAchievementCard from '@/views/teacher/ai-analysis/cards/CourseAchievementCard.vue'
import CrossExamTrendCard from '@/views/teacher/ai-analysis/cards/CrossExamTrendCard.vue'
import SemesterGrowthCard from '@/views/teacher/ai-analysis/cards/SemesterGrowthCard.vue'

const injectedReferenceDepartmentId = inject(AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY, null)
const injectedScopeCourseId = inject(AI_ANALYSIS_COURSE_ID_KEY, null)
const injectedScopeClassId = inject(AI_ANALYSIS_CLASS_ID_KEY, null)
const injectedScopeClassLabel = inject(AI_ANALYSIS_CLASS_LABEL_KEY, null)
const injectedAcademicYear = inject(AI_ANALYSIS_ACADEMIC_YEAR_KEY, null)
const injectedSemester = inject(AI_ANALYSIS_SEMESTER_KEY, null)
const injectedDepartmentLabel = inject(AI_ANALYSIS_REFERENCE_DEPARTMENT_LABEL_KEY, null)
const injectedCourseLabel = inject(AI_ANALYSIS_SCOPE_COURSE_LABEL_KEY, null)
const examLocked = inject(AI_ANALYSIS_EXAM_LOCKED_KEY, null)

if (
  !injectedReferenceDepartmentId
  || !injectedScopeCourseId
  || !injectedScopeClassId
  || !injectedScopeClassLabel
  || !injectedAcademicYear
  || !injectedSemester
  || !examLocked
  || !injectedDepartmentLabel
  || !injectedCourseLabel
) {
  throw new Error('AI 分析中心未提供 scope')
}

const referenceDepartmentId = injectedReferenceDepartmentId
const scopeCourseId = injectedScopeCourseId
const scopeClassId = injectedScopeClassId
const scopeClassLabel = injectedScopeClassLabel
const academicYear = injectedAcademicYear
const semester = injectedSemester
const referenceDepartmentLabel = injectedDepartmentLabel
const scopeCourseLabel = injectedCourseLabel

const departmentLocked = computed(
  () => examLocked.value || Boolean(referenceDepartmentId.value?.trim()),
)
const courseLocked = computed(() => examLocked.value || Boolean(scopeCourseId.value?.trim()))
const orgScopeReady = computed(() =>
  Boolean(referenceDepartmentId.value?.trim() && scopeCourseId.value?.trim()),
)
const termLabel = computed(() => {
  const year = academicYear.value
  const semesterCode = semester.value
  if (!year || !semesterCode) {
    return '—'
  }
  return `${year} · ${formatSemester(semesterCode)}`
})

function handleDepartmentChange(_value: string | null, option?: TenantSchoolDepartmentDto): void {
  referenceDepartmentLabel.value = option?.deptName?.trim() ?? ''
}

function handleCourseChange(_value: string | null, option?: CourseListVO): void {
  scopeCourseLabel.value = option?.courseName?.trim() ?? ''
}

function handleClassChange(value: string | null, option?: ClassInfoDto): void {
  scopeClassLabel.value = option?.className ?? ''
  if (!value) {
    scopeClassLabel.value = ''
  }
}
</script>

<template>
  <div class="ai-analysis-trend-tab">
    <div class="ai-analysis-tab__scope-bar">
      <AnalysisOrgScopeBar
        v-model:department-id="referenceDepartmentId"
        v-model:course-id="scopeCourseId"
        v-model:class-id="scopeClassId"
        require-org-scope
        :department-locked="departmentLocked"
        :course-locked="courseLocked"
        :department-label="referenceDepartmentLabel"
        :course-label="scopeCourseLabel"
        @department-change="handleDepartmentChange"
        @course-change="handleCourseChange"
        @class-change="handleClassChange"
      />
    </div>
    <template v-if="orgScopeReady">
      <CrossExamTrendCard
        :scope-reference-department-id="referenceDepartmentId"
        :scope-org-course-id="scopeCourseId"
        :scope-org-class-id="scopeClassId"
        :drill-class-id="scopeClassId"
        :drill-class-label="scopeClassLabel"
        :scope-academic-year="academicYear"
        :scope-semester="semester"
        :scope-term-label="termLabel"
      />
      <SemesterGrowthCard
        :default-recent-semester-count="2"
        :scope-reference-department-id="referenceDepartmentId"
        :scope-org-course-id="scopeCourseId"
        :scope-org-class-id="scopeClassId"
        :drill-class-id="scopeClassId"
        :drill-class-label="scopeClassLabel"
        :scope-academic-year="academicYear"
        :scope-semester="semester"
        :scope-course-label="scopeCourseLabel"
      />
      <CourseAchievementCard
        :scope-reference-department-id="referenceDepartmentId"
        :scope-org-course-id="scopeCourseId"
        :scope-org-class-id="scopeClassId"
        :scope-academic-year="academicYear"
        :scope-semester="semester"
        :scope-term-label="termLabel"
        :scope-course-label="scopeCourseLabel"
      />
    </template>
    <p v-else class="ai-analysis-trend-tab__hint">
      请先选定院系与课程；趋势分析禁止跨院系、跨课程。
    </p>
  </div>
</template>

<style scoped lang="scss">
.ai-analysis-tab__scope-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px 16px;
  margin-bottom: 16px;
}

.ai-analysis-trend-tab__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-muted);
}
</style>
