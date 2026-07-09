<script setup lang="ts">
import type { CourseListVO, TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { computed, inject } from 'vue'
import AnalysisOrgScopeBar from '@/components/mark/AnalysisOrgScopeBar.vue'
import {
  AI_ANALYSIS_CLASS_ID_KEY,
  AI_ANALYSIS_COURSE_ID_KEY,
  AI_ANALYSIS_EXAM_LOCKED_KEY,
  AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY,
  AI_ANALYSIS_REFERENCE_DEPARTMENT_LABEL_KEY,
  AI_ANALYSIS_SCOPE_COURSE_LABEL_KEY,
} from '@/composables/useAiAnalysisScope'
import ExperienceEffectivenessCard from '@/views/teacher/ai-analysis/cards/ExperienceEffectivenessCard.vue'
import SchoolQualityCard from '@/views/teacher/ai-analysis/cards/SchoolQualityCard.vue'

const injectedReferenceDepartmentId = inject(AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY, null)
const injectedScopeCourseId = inject(AI_ANALYSIS_COURSE_ID_KEY, null)
const injectedScopeClassId = inject(AI_ANALYSIS_CLASS_ID_KEY, null)
const examLocked = inject(AI_ANALYSIS_EXAM_LOCKED_KEY, null)
const injectedReferenceDepartmentLabel = inject(AI_ANALYSIS_REFERENCE_DEPARTMENT_LABEL_KEY, null)
const injectedScopeCourseLabel = inject(AI_ANALYSIS_SCOPE_COURSE_LABEL_KEY, null)

if (
  !injectedReferenceDepartmentId
  || !injectedScopeCourseId
  || !injectedScopeClassId
  || !examLocked
  || !injectedReferenceDepartmentLabel
  || !injectedScopeCourseLabel
) {
  throw new Error('AI 分析中心未提供 scope')
}

const referenceDepartmentId = injectedReferenceDepartmentId
const scopeCourseId = injectedScopeCourseId
const scopeClassId = injectedScopeClassId
const referenceDepartmentLabel = injectedReferenceDepartmentLabel
const scopeCourseLabel = injectedScopeCourseLabel

const departmentLocked = computed(
  () => examLocked.value || Boolean(referenceDepartmentId.value?.trim()),
)
const courseLocked = computed(() => examLocked.value || Boolean(scopeCourseId.value?.trim()))
const orgScopeReady = computed(() =>
  Boolean(referenceDepartmentId.value?.trim() && scopeCourseId.value?.trim()),
)

function handleDepartmentChange(_value: string | null, option?: TenantSchoolDepartmentDto): void {
  referenceDepartmentLabel.value = option?.deptName?.trim() ?? ''
}

function handleCourseChange(_value: string | null, option?: CourseListVO): void {
  scopeCourseLabel.value = option?.courseName?.trim() ?? ''
}
</script>

<template>
  <div class="ai-analysis-school-tab">
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
      />
    </div>
    <div v-if="orgScopeReady" class="ai-analysis-school-tab__cards">
      <SchoolQualityCard
        :scope-reference-department-id="referenceDepartmentId"
        :scope-org-course-id="scopeCourseId"
        :scope-org-class-id="scopeClassId"
      />
      <ExperienceEffectivenessCard
        :scope-reference-department-id="referenceDepartmentId"
        :scope-org-course-id="scopeCourseId"
        :scope-org-class-id="scopeClassId"
      />
    </div>
    <p v-else class="ai-analysis-school-tab__hint">
      请先选定院系与课程；校级质量分析禁止跨院系、跨课程。
    </p>
  </div>
</template>

<style scoped lang="scss">
.ai-analysis-tab__scope-bar {
  margin-bottom: 16px;
}

.ai-analysis-school-tab__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-analysis-school-tab__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-muted);
}
</style>
